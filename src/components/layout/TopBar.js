'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingCart, User, Heart, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = useCartTotalItems();
  const favCount = useFavoritesCount();
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      {/* ── Main Header ── */}
      <header className="fixed top-0 left-0 right-0 z-[var(--z-sticky)]" style={{ background: '#1e1b4b' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 h-14 flex items-center gap-3">

          {/* Mobile menu icon */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 text-white/80 hover:text-white transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          {/* Search pill — center on mobile, left on desktop */}
          <div className="flex-1 md:flex-none md:w-72 lg:w-96">
            <button
              onClick={() => setSearchOpen(true)}
              className="search-pill w-full flex items-center gap-2.5 px-4 h-9 text-left"
              aria-label="Search"
            >
              <span className="text-white/50 text-sm flex-1 truncate">{t('search.placeholder') || 'Search products…'}</span>
              <Search className="w-4 h-4 text-white/60 flex-shrink-0" />
            </button>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {DESKTOP_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5  text-[13px] font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 ml-auto">
            <LanguageToggle />
            <ThemeToggle />

            <Link href="/wishlist" className="hidden md:block">
              <motion.div whileTap={{ scale: 0.9 }}
                className="relative w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <Heart className="w-[18px] h-[18px]" />
                {favCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4  bg-pink-500
                    flex items-center justify-center text-[9px] font-bold text-white px-1">
                    {favCount > 9 ? '9+' : favCount}
                  </span>
                )}
              </motion.div>
            </Link>

            {/* Cart icon — key feature from screenshot */}
            <Link href="/cart">
              <motion.div whileTap={{ scale: 0.9 }}
                className="relative w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <ShoppingCart className="w-[18px] h-[18px]" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4  gradient-primary
                    flex items-center justify-center text-[9px] font-bold text-white px-1">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </motion.div>
            </Link>

            <Link href="/account" className="hidden md:block">
              <motion.div whileTap={{ scale: 0.9 }}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <User className="w-[18px] h-[18px]" />
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden border-t border-white/10"
              style={{ background: '#1e1b4b' }}
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {DESKTOP_NAV.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2.5  text-sm font-medium transition-colors
                        ${isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                      {t(item.key)}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
