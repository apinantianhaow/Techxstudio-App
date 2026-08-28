'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User, Heart, Home, Grid3X3 } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { useCartTotalItems } from '@/stores/useCartStore';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { useTranslation } from '@/context/LanguageContext';

const DESKTOP_NAV = [
  { href: '/', icon: Home, key: 'nav.home' },
  { href: '/category/phone', key: 'category.phone' },
  { href: '/category/tablet', key: 'category.tablet' },
  { href: '/category/accessory', key: 'category.accessory' },
];

export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const totalItems = useCartTotalItems();
  const favCount = useFavoritesCount();
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[var(--z-sticky)] glass">
        <div className="px-4 md:px-8 lg:px-12 h-14 md:h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">TX</span>
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">
              TechXStudio
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {DESKTOP_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'gradient-primary text-white shadow-md'
                      : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Search */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full
                bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-surface-600 dark:text-surface-300" />
            </motion.button>

            {/* Language */}
            <LanguageToggle />

            {/* Theme */}
            <ThemeToggle />

            {/* Wishlist — desktop only */}
            <Link href="/wishlist" className="hidden md:block">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative w-10 h-10 flex items-center justify-center rounded-full
                  bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                  transition-colors"
              >
                <Heart className="w-5 h-5 text-surface-600 dark:text-surface-300" />
                {favCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full
                      flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {favCount > 9 ? '9+' : favCount}
                  </motion.span>
                )}
              </motion.div>
            </Link>

            {/* Cart */}
            <Link href="/cart">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative w-10 h-10 flex items-center justify-center rounded-full
                  bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                  transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-surface-600 dark:text-surface-300" />
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 gradient-primary rounded-full
                      flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </motion.span>
                )}
              </motion.div>
            </Link>

            {/* Profile */}
            <Link href="/account">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center rounded-full
                  bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                  transition-colors"
              >
                <User className="w-5 h-5 text-surface-600 dark:text-surface-300" />
              </motion.div>
            </Link>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
