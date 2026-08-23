'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Grid3X3, Heart, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartTotalItems } from '@/stores/useCartStore';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { useTranslation } from '@/context/LanguageContext';

const NAV_ITEMS = [
  { href: '/', icon: Home, key: 'nav.home' },
  { href: '/category/all', icon: Grid3X3, key: 'nav.categories' },
  { href: '/wishlist', icon: Heart, key: 'nav.wishlist', badgeStore: 'wishlist' },
  { href: '/cart', icon: ShoppingBag, key: 'nav.cart', badgeStore: 'cart' },
  { href: '/account', icon: User, key: 'nav.account' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const cartCount = useCartTotalItems();
  const favCount = useFavoritesCount();
  const { t } = useTranslation();

  const getBadge = (item) => {
    if (item.badgeStore === 'cart') return cartCount;
    if (item.badgeStore === 'wishlist') return favCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] glass
      shadow-bottom-nav md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const badge = getBadge(item);

          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center w-16 h-full">
              <div className="relative">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200
                    ${isActive
                      ? 'gradient-primary shadow-md'
                      : 'hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-surface-400'}`} />
                </motion.div>

                {badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full
                      flex items-center justify-center text-[9px] font-bold text-white"
                  >
                    {badge > 9 ? '9+' : badge}
                  </motion.span>
                )}
              </div>

              <span className={`text-[10px] mt-0.5 font-medium transition-colors
                ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'}`}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
