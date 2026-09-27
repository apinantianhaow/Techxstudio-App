'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User } from 'lucide-react';
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
  { href: '/category/all', key: 'category.all' },
];

const iconLink = 'flex h-11 w-9 items-center justify-center text-ink/80 transition-colors hover:text-ink';

export default function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = useCartTotalItems();
  const pathname = usePathname();
  const { t } = useTranslation();
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Lock page scroll behind the full-screen mobile menu
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-[var(--z-sticky)] ${mobileMenuOpen ? 'bg-canvas' : 'glass-nav'}`}>
        <nav className="mx-auto flex h-11 max-w-[1024px] items-center justify-between gap-4 px-4">
          <Link href="/" className="flex-shrink-0 text-[15px] font-semibold tracking-tight text-ink/90 transition-opacity hover:opacity-70">
            TechXStudio
          </Link>

          {/* Desktop nav */}
          <ul className="hidden flex-1 items-center justify-center gap-8 md:flex">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`whitespace-nowrap text-[12px] transition-colors
                    ${isActive(item.href) ? 'text-ink' : 'text-ink/75 hover:text-ink'}`}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right icons */}
          <div className="flex flex-shrink-0 items-center">
            <LanguageToggle />
            <ThemeToggle />
            <button onClick={() => setSearchOpen(true)} className={iconLink} aria-label={t('nav.search')}>
              <Search className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
            <Link href="/account" className={`${iconLink} hidden md:flex`} aria-label={t('nav.account')}>
              <User className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </Link>
            <Link href="/cart" className={`${iconLink} relative`} aria-label={t('nav.cart')}>
              <ShoppingBag className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {totalItems > 0 && (
                <span className="absolute bottom-2 right-0.5 flex h-[15px] min-w-[15px] items-center justify-center
                  rounded-full bg-ink px-1 text-[9px] font-semibold text-canvas">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>

            {/* Mobile menu (two-line "hamburger" like Apple's) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`${iconLink} md:hidden`}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="relative block h-3 w-4">
                <span className={`absolute left-0 block h-[1.5px] w-4 rounded bg-current transition-transform duration-300
                  ${mobileMenuOpen ? 'top-[5px] rotate-45' : 'top-0.5'}`} />
                <span className={`absolute left-0 block h-[1.5px] w-4 rounded bg-current transition-transform duration-300
                  ${mobileMenuOpen ? 'top-[5px] -rotate-45' : 'top-2'}`} />
              </span>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100dvh-2.75rem)] overflow-y-auto bg-canvas md:hidden"
            >
              <ul className="px-10 pt-6">
                {NAV_LINKS.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-2 text-[28px] font-semibold tracking-tight
                        ${isActive(item.href) ? 'text-ink' : 'text-ink/80'}`}
                    >
                      {t(item.key)}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
    </>
  );
}
