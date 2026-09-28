'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, History, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { toastIcons } from '@/components/ui/toastIcons';
import { errorMessage, formatDate } from '@/lib/utils';
import { squarePhoto, UnsupportedImageError } from '@/lib/image';
import type { UsernameChange } from '@/types';

const spinner = 'h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent';
const USERNAME = /^[A-Za-z0-9][A-Za-z0-9_.]{2,29}$/; // same rule as the API

type Availability = { state: 'idle' | 'checking' | 'ok' } | { state: 'bad'; reason: string };

/** Profile photo, name and @username with inline editing, plus past usernames. */
export default function ProfileHeader() {
  const { user, authFetch, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<UsernameChange[]>([]);

  // Reloaded after every rename (the username is in the dependencies).
  useEffect(() => {
    let cancelled = false;
    authFetch('/api/auth/me/username-history')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setHistory(data?.history ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authFetch, user?.username]);

  // Check a new username as it's typed.
  useEffect(() => {
    if (!isEditing) return;
    const name = editUsername.trim();
    if (!name || name === user?.username) {
      setAvailability({ state: 'idle' });
      return;
    }
    if (!USERNAME.test(name)) {
      setAvailability({ state: 'bad', reason: t('account.usernameRules') });
      return;
    }
    setAvailability({ state: 'checking' });
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/auth/username-available?username=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (cancelled) return;
        setAvailability(data.available ? { state: 'ok' } : { state: 'bad', reason: data.reason || data.error });
      } catch {
        if (!cancelled) setAvailability({ state: 'idle' });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [editUsername, isEditing, user?.username, authFetch, t]);

  if (!user) return null;

  const startEditing = () => {
    setEditUsername(user.username);
    setEditName(user.full_name || '');
    setEditPhone(user.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: { username?: string; full_name?: string; phone?: string } = { phone: editPhone.trim() };
      if (editName.trim()) updates.full_name = editName.trim();
      if (editUsername.trim() !== user.username) updates.username = editUsername.trim();
      await updateProfile(updates);
      setIsEditing(false);
      toast.success(t('account.profileUpdated'), { icon: toastIcons.edit });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      await uploadAvatar(await squarePhoto(file));
      toast.success(t('account.photoUpdated'), { icon: toastIcons.edit });
    } catch (err) {
      toast.error(err instanceof UnsupportedImageError ? t('account.photoUnsupported') : errorMessage(err) || t('account.photoFailed'));
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeAvatar();
      toast(t('account.photoRemoved'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const displayName = (isEditing ? editName : user.full_name) || user.username || 'U';

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="relative mx-auto h-24 w-24">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="h-24 w-24 rounded-full bg-fill object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-[#a1a1a6] to-[#6e6e73]">
              <span className="text-[40px] font-semibold text-white">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {photoBusy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white">
              <span className={spinner} />
            </div>
          )}
          <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy}
            aria-label={user.avatar_url ? t('account.changePhoto') : t('account.addPhoto')}
            title={user.avatar_url ? t('account.changePhoto') : t('account.addPhoto')}
            className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white ring-4 ring-canvas-alt transition-colors hover:bg-accent-hover disabled:opacity-60">
            <Camera className="h-[17px] w-[17px]" />
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" aria-hidden="true" tabIndex={-1}
            onChange={(e) => handlePhoto(e.target.files?.[0])} />
        </div>
        {user.avatar_url && (
          <button type="button" onClick={handleRemovePhoto} disabled={photoBusy}
            className="mt-3 text-[13px] text-ink-3 transition-colors hover:text-danger disabled:opacity-50">
            {t('account.removePhoto')}
          </button>
        )}

        {isEditing ? (
          <div className="mt-6 space-y-4 text-left">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-[13px] text-ink-2">{t('account.username')}</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-ink-3">@</span>
                <input id="username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={30}
                  aria-describedby="username-status" className="field pl-9 pr-11" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  {availability.state === 'checking' && <span className={`${spinner} block h-4 w-4 text-ink-3`} />}
                  {availability.state === 'ok' && <Check className="h-5 w-5 text-success" />}
                  {availability.state === 'bad' && <X className="h-5 w-5 text-danger" />}
                </span>
              </div>
              <p id="username-status" aria-live="polite"
                className={`mt-1.5 text-[13px] ${availability.state === 'bad' ? 'text-danger' : availability.state === 'ok' ? 'text-success' : 'text-ink-3'}`}>
                {availability.state === 'bad' ? availability.reason
                  : availability.state === 'ok' ? t('account.usernameAvailable') : t('account.usernameHint')}
              </p>
            </div>
            <div>
              <label htmlFor="full-name" className="mb-1.5 block text-[13px] text-ink-2">{t('account.fullName')}</label>
              <input id="full-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-[13px] text-ink-2">{t('account.phone')}</label>
              <input id="phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="field" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleSave} disabled={saving || availability.state === 'bad' || availability.state === 'checking'}
                className="btn btn-primary flex-1">
                {saving ? <span className={spinner} /> : t('common.save')}
              </button>
              <button onClick={() => setIsEditing(false)} className="btn btn-tinted">{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="t-title mt-5 text-ink">{user.full_name || `@${user.username}`}</h1>
            {user.full_name && <p className="mt-1 text-[17px] font-medium text-ink-2">@{user.username}</p>}
            <p className="mt-0.5 text-[15px] text-ink-3">{user.email}</p>
            {user.phone && <p className="text-[14px] text-ink-3">{user.phone}</p>}
            <button onClick={startEditing} className="link mt-3 text-[15px]">{t('account.editProfile')}</button>
          </>
        )}
      </motion.div>

      {history.length > 0 && (
        <section className="rounded-card bg-card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <History className="h-4 w-4 text-ink-3" /> {t('account.usernameHistory')}
          </h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {history.map((h) => (
              <li key={h.changed_at + h.new_username} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 truncate text-ink-3">
                  @{h.old_username} <span aria-hidden="true">→</span> <span className="text-ink">@{h.new_username}</span>
                </span>
                <span className="shrink-0 text-[13px] text-ink-3">{formatDate(h.changed_at)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-3">{t('account.usernameHistoryNote')}</p>
        </section>
      )}
    </>
  );
}
