'use client';

import { useState } from 'react';
import { User, Mail, Lock, LogOut, Package, Heart, Settings, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { useCartTotalItems } from '@/stores/useCartStore';
import { toast } from 'sonner';

export default function AccountPage() {
  const { user, isLoggedIn, loading, login, signup, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const favCount = useFavoritesCount();
  const cartCount = useCartTotalItems();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, fullName);
        toast.success('สมัครสมาชิกสำเร็จ! 🎉');
      } else {
        await login(email, password);
        toast.success('เข้าสู่ระบบสำเร็จ! 👋');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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
      { icon: Package, label: 'คำสั่งซื้อ', href: '/orders', badge: null },
      { icon: Heart, label: 'สินค้าที่ชอบ', href: '/wishlist', badge: favCount || null },
    ];

    return (
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <Breadcrumbs items={[{ label: 'บัญชี' }]} />

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full gradient-primary flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-surface-800 dark:text-surface-200">{user?.full_name}</h2>
          <p className="text-sm text-surface-400">{user?.email}</p>
        </motion.div>

        {/* Menu */}
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

        {/* Logout */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { logout(); toast('ออกจากระบบแล้ว'); }}
          className="w-full py-3 rounded-xl bg-error/10 text-error font-semibold text-sm
            flex items-center justify-center gap-2 hover:bg-error/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </motion.button>
      </div>
    );
  }

  // Not logged in — Login/Signup form
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Breadcrumbs items={[{ label: mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก' }]} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 space-y-5"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-white">TX</span>
          </div>
          <h1 className="text-xl font-bold text-surface-800 dark:text-surface-200">
            {mode === 'login' ? 'ยินดีต้อนรับกลับ' : 'สร้างบัญชีใหม่'}
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {mode === 'login' ? 'เข้าสู่ระบบเพื่อจัดการคำสั่งซื้อ' : 'สมัครสมาชิก TechXStudio ฟรี'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800
                  border border-surface-200 dark:border-surface-700 text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมล"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800
                border border-surface-200 dark:border-surface-700 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-50 dark:bg-surface-800
                border border-surface-200 dark:border-surface-700 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={submitting}
            className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold
              disabled:opacity-50 btn-ripple shadow-lg hover:shadow-xl transition-shadow"
          >
            {submitting ? (
              <div className="w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </motion.button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            {mode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
