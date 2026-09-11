'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import SearchOverlay from '@/components/layout/SearchOverlay';
import { useCartTotalItems } from '@/stores/useCartStore';
import { useTranslation } from '@/context/LanguageContext';

const NAV_LINKS = [
  { href: '/', key: 'nav.home' },
  { href: '/category/phone', key: 'category.phone' },
  { href: '/category/tablet', key: 'category.tablet' },
  { href: '/category/accessory', key: 'category.accessory' },
];

export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = useCartTotalItems();
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <header className="topbar fixed top-0 left-0 right-0 z-[var(--z-sticky)]">
        <nav className="w-full h-12 px-6 md:px-10
          flex items-center justify-between gap-4">

          {/* Logo — white on dark purple */}
          <Link href="/" className="text-white text-[15px] font-semibold tracking-tight
            hover:opacity-80 transition-opacity flex-shrink-0 whitespace-nowrap">
            TechXStudio
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs transition-colors whitespace-nowrap
                    ${isActive
                      ? 'text-white font-medium'
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <LanguageToggle />
            <ThemeToggle />

            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center
                text-white/60 hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <Link href="/cart"
              className="relative w-9 h-9 flex items-center justify-center
                text-white/60 hover:text-white transition-colors">
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-0 min-w-[16px] h-4
                  bg-primary-500 text-white text-[9px] font-bold
                  flex items-center justify-center px-0.5">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center
                text-white/60 hover:text-white transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="px-6 py-2">
                {NAV_LINKS.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-3 text-sm border-b border-white/5
                        ${isActive ? 'text-white font-medium' : 'text-white/60'}`}
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
