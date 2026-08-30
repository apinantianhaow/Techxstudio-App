'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { useCartTotalItems } from '@/stores/useCartStore';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { useTranslation } from '@/context/LanguageContext';

const DESKTOP_NAV = [
  { href: '/', key: 'nav.home' },
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
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-14 md:h-[60px] flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center
              shadow-md group-hover:shadow-lg transition-shadow duration-300">
              <span className="text-white font-bold text-sm">TX</span>
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-surface-900 dark:text-surface-100 hidden sm:block">
              TechXStudio
            </span>
          </Link>

          {/* Desktop Nav — Apple-style minimal */}
          <nav className="hidden md:flex items-center gap-0.5">
            {DESKTOP_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300
                    ${isActive
                      ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                      : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
                    }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          {/* Actions — clean icon row */}
          <div className="flex items-center gap-0.5">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full
                hover:bg-surface-100/80 dark:hover:bg-surface-800/50 transition-colors duration-200"
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px] text-surface-600 dark:text-surface-400" />
            </motion.button>

            <LanguageToggle />
            <ThemeToggle />

            <Link href="/wishlist" className="hidden md:block">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="relative w-9 h-9 flex items-center justify-center rounded-full
                  hover:bg-surface-100/80 dark:hover:bg-surface-800/50 transition-colors duration-200"
              >
                <Heart className="w-[18px] h-[18px] text-surface-600 dark:text-surface-400" />
                {favCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full gradient-primary
                    flex items-center justify-center text-[10px] font-bold text-white px-1">
                    {favCount > 9 ? '9+' : favCount}
                  </span>
                )}
              </motion.div>
            </Link>

            <Link href="/cart">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="relative w-9 h-9 flex items-center justify-center rounded-full
                  hover:bg-surface-100/80 dark:hover:bg-surface-800/50 transition-colors duration-200"
              >
                <ShoppingBag className="w-[18px] h-[18px] text-surface-600 dark:text-surface-400" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full gradient-primary
                    flex items-center justify-center text-[10px] font-bold text-white px-1">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </motion.div>
            </Link>

            <Link href="/account">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="w-9 h-9 flex items-center justify-center rounded-full
                  hover:bg-surface-100/80 dark:hover:bg-surface-800/50 transition-colors duration-200"
              >
                <User className="w-[18px] h-[18px] text-surface-600 dark:text-surface-400" />
              </motion.div>
            </Link>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
