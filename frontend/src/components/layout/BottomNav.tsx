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

  const getBadge = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.badgeStore === 'cart') return cartCount;
    if (item.badgeStore === 'wishlist') return favCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] glass md:hidden">
      <div className="flex items-center justify-around h-[56px] max-w-[500px] mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const badge = getBadge(item);

          return (
            <Link key={item.href} href={item.href}
              className="relative flex flex-col items-center justify-center w-14 h-full">
              <div className="relative">
                <Icon className={`w-5 h-5 transition-colors
                  ${isActive ? 'text-primary-400' : 'text-white/40'}`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px]
                    bg-error text-white text-[8px] font-bold
                    flex items-center justify-center px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] mt-0.5 font-medium
                ${isActive ? 'text-primary-400' : 'text-white/40'}`}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
