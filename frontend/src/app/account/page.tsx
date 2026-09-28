'use client';

import { useState, type FormEvent } from 'react';
import { LogOut, Package, Heart, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';
import { errorMessage } from '@/lib/utils';
import OtpStep from '@/components/auth/OtpStep';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import type { OtpChallenge } from '@/types';

const spinner = 'h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent';

export default function AccountPage() {
  const { user, isLoggedIn, loading, login, signup, loginWithGoogle, logout, updateProfile, deleteAccount } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set once the password is accepted and a code has been emailed.
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const favCount = useFavoritesCount();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      setChallenge(mode === 'signup' ? await signup(email, password, fullName) : await login(email, password));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerified = () => {
    setChallenge(null);
    setPassword('');
    if (mode === 'signup') toast.success(t('account.signupSuccess'), { icon: toastIcons.celebrate });
    else toast.success(t('account.loginSuccess'), { icon: toastIcons.welcome });
    setMode('login'); // after logging out, offer "log in" rather than "sign up" again
  };

  const handleGoogle = async (credential: string) => {
    try {
      await loginWithGoogle(credential);
      toast.success(t('account.loginSuccess'), { icon: toastIcons.welcome });
    } catch (err) {
      toast.error(errorMessage(err) || t('account.googleFailed'));
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updates: { full_name?: string; phone?: string } = {};
      if (editName.trim()) updates.full_name = editName.trim();
      if (editPhone !== undefined) updates.phone = editPhone.trim();
      await updateProfile(updates);
      setIsEditing(false);
      toast.success(t('account.profileUpdated'), { icon: toastIcons.edit });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success(t('account.accountDeleted'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32 text-ink-3">
        <span className={spinner} />
      </div>
    );
  }

  // Logged in — Profile view (iOS Settings style)
  if (isLoggedIn) {
    const menuItems = [
      { icon: Package, label: t('account.myOrders'), href: '/orders', badge: null, tile: 'bg-[#0071e3]' },
      { icon: Heart, label: t('account.myWishlist'), href: '/wishlist', badge: favCount || null, tile: 'bg-[#ff375f]' },
    ];

    return (
      <div className="min-h-[calc(100dvh-2.75rem)] bg-canvas-alt">
        <div className="mx-auto max-w-[560px] space-y-8 px-5 py-12 md:py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-[#a1a1a6] to-[#6e6e73]">
              <span className="text-[40px] font-semibold text-white">
                {(editName || user?.full_name)?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-6 space-y-3 text-left">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('account.fullName')} aria-label={t('account.fullName')} className="field" />
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder={t('account.phone')} aria-label={t('account.phone')} className="field" />
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary flex-1">
                    {saving ? <span className={spinner} /> : t('common.save')}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditName(user?.full_name || ''); setEditPhone(user?.phone || ''); }}
                    className="btn btn-tinted">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="t-title mt-5 text-ink">{user?.full_name}</h1>
                <p className="mt-1 text-[17px] text-ink-2">{user?.email}</p>
                {user?.phone && <p className="text-[14px] text-ink-3">{user.phone}</p>}
                <button
                  onClick={() => { setIsEditing(true); setEditName(user?.full_name || ''); setEditPhone(user?.phone || ''); }}
                  className="link mt-3 text-[15px]">
                  {t('account.editProfile')}
                </button>
              </>
            )}
          </motion.div>

          {/* Inset grouped list */}
          <ul className="overflow-hidden rounded-card bg-card">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center gap-3.5 pl-4 transition-colors hover:bg-fill">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tile}`}>
                      <Icon className="h-[18px] w-[18px] text-white" />
                    </span>
                    <span className={`flex flex-1 items-center justify-between py-3.5 pr-4 ${i > 0 ? 'border-t border-hairline' : ''}`}>
                      <span className="text-[17px] text-ink">{item.label}</span>
                      <span className="flex items-center gap-2 text-ink-3">
                        {item.badge && <span className="text-[17px]">{item.badge}</span>}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => { logout(); toast(t('account.loggedOut')); }}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-card py-3.5 text-[17px] text-danger transition-colors hover:bg-fill">
            <LogOut className="h-4 w-4" />
            {t('account.logout')}
          </button>

          {/* Delete Account */}
          {showDeleteConfirm ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-3 rounded-card bg-card p-5">
              <p className="text-[17px] font-semibold text-danger">{t('account.deleteWarning')}</p>
              <p className="text-[14px] text-ink-2">{t('account.deleteWarningDesc')}</p>
              <div className="flex gap-3 pt-1">
                <button onClick={handleDeleteAccount} disabled={deleting}
                  className="btn flex-1 bg-danger text-white hover:opacity-90">
                  {deleting ? <span className={spinner} /> : t('account.confirmDelete')}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-tinted">
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-center text-[14px] text-ink-2 transition-colors hover:text-danger">
              {t('account.deleteAccount')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Password accepted — enter the emailed code
  if (challenge) {
    return (
      <div className="mx-auto max-w-[440px] px-5 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <OtpStep challenge={challenge} onVerified={handleVerified} onBack={() => setChallenge(null)} />
        </motion.div>
      </div>
    );
  }

  // Not logged in — Sign in / Sign up
  return (
    <div className="mx-auto max-w-[440px] px-5 py-16 md:py-24">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-ink">
            <span className="text-[22px] font-semibold tracking-tight text-canvas">TX</span>
          </div>
          <h1 className="t-title text-ink">
            {mode === 'login' ? t('account.welcomeBack') : t('account.createAccount')}
          </h1>
          <p className="mt-2 text-[17px] text-ink-2">
            {mode === 'login' ? t('account.loginDesc') : t('account.signupDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-3">
          {mode === 'signup' && (
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder={t('account.fullName')} aria-label={t('account.fullName')} required
              autoComplete="name" className="field" />
          )}

          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t('account.email')} aria-label={t('account.email')} required
            autoComplete="email" className="field" />

          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t('account.password')} aria-label={t('account.password')} required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary btn-block !mt-6">
            {submitting ? <span className={spinner} /> : mode === 'login' ? t('account.login') : t('account.signup')}
          </button>
        </form>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-3 text-[13px] text-ink-3" aria-hidden="true">
            <span className="h-px flex-1 bg-hairline" />{t('account.or')}<span className="h-px flex-1 bg-hairline" />
          </div>
          <GoogleSignInButton onCredential={handleGoogle} text={mode === 'signup' ? 'signup_with' : 'signin_with'} />
        </div>

        <div className="mt-6 text-center">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="link text-[15px]">
            {mode === 'login' ? t('account.noAccount') : t('account.hasAccount')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
