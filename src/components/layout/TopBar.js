'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { useCartTotalItems } from '@/stores/useCartStore';

export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const totalItems = useCartTotalItems();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[var(--z-sticky)] glass">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">TX</span>
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">
              TechXStudio
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
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
