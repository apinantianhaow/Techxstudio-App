'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, Heart, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartTotalItems } from '@/stores/useCartStore';
import { useFavoritesCount } from '@/stores/useWishlistStore';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'หน้าหลัก' },
  { href: '/category/all', icon: Grid3X3, label: 'หมวดหมู่' },
  { href: '/wishlist', icon: Heart, label: 'ชอบ' },
  { href: '/cart', icon: ShoppingBag, label: 'ตะกร้า' },
  { href: '/account', icon: User, label: 'บัญชี' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const totalItems = useCartTotalItems();
  const favCount = useFavoritesCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] glass shadow-bottom-nav md:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);

          const badge =
            label === 'ตะกร้า' && totalItems > 0
              ? totalItems
              : label === 'ชอบ' && favCount > 0
              ? favCount
              : null;

          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-0.5 py-1 px-3">
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="relative"
              >
                <Icon
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-surface-400 dark:text-surface-500'
                  }`}
                  fill={isActive && label === 'ชอบ' ? 'currentColor' : 'none'}
                />
                {badge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] gradient-primary rounded-full
                      flex items-center justify-center text-[10px] font-bold text-white px-1"
                  >
                    {badge > 9 ? '9+' : badge}
                  </motion.span>
                )}
              </motion.div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-surface-400 dark:text-surface-500'
                }`}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 w-8 h-0.5 rounded-full gradient-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
