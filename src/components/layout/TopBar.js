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
        <div className="px-6 md:px-12 lg:px-20 xl:px-28 h-16 md:h-20 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-wider">TX</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-surface-900 dark:text-surface-100 hidden sm:block">
              TechXStudio
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {DESKTOP_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-5 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 uppercase
                    ${isActive
                      ? 'text-surface-900 dark:text-white bg-surface-100 dark:bg-surface-800'
                      : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                    }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center
                hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-surface-600 dark:text-surface-400" />
            </motion.button>

            <LanguageToggle />
            <ThemeToggle />

            <Link href="/wishlist" className="hidden md:block">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative w-10 h-10 flex items-center justify-center
                  hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <Heart className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                {favCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-error
                    flex items-center justify-center text-[9px] font-bold text-white">
                    {favCount > 9 ? '9+' : favCount}
                  </span>
                )}
              </motion.div>
            </Link>

            <Link href="/cart">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative w-10 h-10 flex items-center justify-center
                  hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 gradient-primary
                    flex items-center justify-center text-[9px] font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </motion.div>
            </Link>

            <Link href="/account">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center
                  hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <User className="w-5 h-5 text-surface-600 dark:text-surface-400" />
              </motion.div>
            </Link>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
