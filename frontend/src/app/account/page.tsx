'use client';

import { useState, type FormEvent } from 'react';
import { User, Mail, Lock, LogOut, Package, Heart, ChevronRight, Eye, EyeOff, Pencil, Save, Trash2, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';
import { errorMessage } from '@/lib/utils';

export default function AccountPage() {
  const { user, isLoggedIn, loading, login, signup, logout, updateProfile, deleteAccount } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      if (mode === 'signup') {
        await signup(email, password, fullName);
        toast.success(t('account.signupSuccess'), { icon: toastIcons.celebrate });
      } else {
        await login(email, password);
        toast.success(t('account.loginSuccess'), { icon: toastIcons.welcome });
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
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
      <div className="max-w-md mx-auto px-4 py-20 flex justify-center">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Logged in — Profile view
  if (isLoggedIn) {
    const menuItems = [
      { icon: Package, label: t('account.myOrders'), href: '/orders', badge: null },
      { icon: Heart, label: t('account.myWishlist'), href: '/wishlist', badge: favCount || null },
    ];

    return (
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <Breadcrumbs items={[{ label: t('account.title') }]} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full gradient-primary flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">
              {(editName || user?.full_name)?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          {isEditing ? (
            <div className="space-y-3 mt-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('account.fullName')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800
                    border border-surface-200 dark:border-surface-700 text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder={t('account.phone')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800
                    border border-surface-200 dark:border-surface-700 text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" />
              </div>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveProfile} disabled={saving}
                  className="flex-1 gradient-primary text-white py-2.5 rounded-xl font-semibold text-sm
                    disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                    <><Save className="w-4 h-4" /> {t('common.save')}</>
                  )}
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => { setIsEditing(false); setEditName(user?.full_name || ''); setEditPhone(user?.phone || ''); }}
                  className="px-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm font-medium
                    text-surface-600 dark:text-surface-400">
                  {t('common.cancel')}
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-surface-800 dark:text-surface-200">{user?.full_name}</h2>
              <p className="text-sm text-surface-400">{user?.email}</p>
              {user?.phone && <p className="text-xs text-surface-400 mt-0.5">{user.phone}</p>}
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setIsEditing(true); setEditName(user?.full_name || ''); setEditPhone(user?.phone || ''); }}
                className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline
                  flex items-center gap-1 mx-auto">
                <Pencil className="w-3.5 h-3.5" /> {t('account.editProfile')}
              </motion.button>
            </>
          )}
        </motion.div>

        <div className="glass-card rounded-xl overflow-hidden divide-y divide-surface-100 dark:divide-surface-800">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-[10px] font-bold text-primary-600 dark:text-primary-400">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-surface-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => { logout(); toast(t('account.loggedOut')); }}
          className="w-full py-3 rounded-xl bg-error/10 text-error font-semibold text-sm
            flex items-center justify-center gap-2 hover:bg-error/20 transition-colors">
          <LogOut className="w-4 h-4" />
          {t('account.logout')}
        </motion.button>

        {/* Delete Account */}
        {showDeleteConfirm ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-xl p-4 border-2 border-error/30 space-y-3">
            <p className="text-sm font-semibold text-error">{t('account.deleteWarning')}</p>
            <p className="text-xs text-surface-400">{t('account.deleteWarningDesc')}</p>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleDeleteAccount} disabled={deleting}
                className="flex-1 bg-error text-white py-2.5 rounded-xl font-semibold text-sm
                  disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  <><Trash2 className="w-4 h-4" /> {t('account.confirmDelete')}</>
                )}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm font-medium
                  text-surface-600 dark:text-surface-400">
                {t('common.cancel')}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-center text-xs text-surface-400 hover:text-error transition-colors py-2">
            {t('account.deleteAccount')}
          </button>
        )}
      </div>
    );
  }

  // Not logged in — Login/Signup form
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Breadcrumbs items={[{ label: mode === 'login' ? t('account.login') : t('account.signup') }]} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-white">TX</span>
          </div>
          <h1 className="text-xl font-bold text-surface-800 dark:text-surface-200">
            {mode === 'login' ? t('account.welcomeBack') : t('account.createAccount')}
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {mode === 'login' ? t('account.loginDesc') : t('account.signupDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={t('account.fullName')} required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800
                  border border-surface-200 dark:border-surface-700 text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t('account.email')} required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800
                border border-surface-200 dark:border-surface-700 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t('account.password')} required minLength={6}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-50 dark:bg-surface-800
                border border-surface-200 dark:border-surface-700 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting}
            className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold
              disabled:opacity-50 btn-ripple shadow-lg hover:shadow-xl transition-shadow">
            {submitting ? (
              <div className="w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? t('account.login') : t('account.signup')}
          </motion.button>
        </form>

        <div className="text-center">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
            {mode === 'login' ? t('account.noAccount') : t('account.hasAccount')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
