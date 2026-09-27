'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, LayoutGrid, Heart, ShoppingBag, User } from 'lucide-react';
import { useCartTotalItems } from '@/stores/useCartStore';
import { useFavoritesCount } from '@/stores/useWishlistStore';
import { useTranslation } from '@/context/LanguageContext';

const NAV_ITEMS = [
  { href: '/', icon: Home, key: 'nav.home' },
  { href: '/category/all', icon: LayoutGrid, key: 'nav.categories' },
  { href: '/wishlist', icon: Heart, key: 'nav.wishlist', badgeStore: 'wishlist' },
  { href: '/cart', icon: ShoppingBag, key: 'nav.cart', badgeStore: 'cart' },
  { href: '/account', icon: User, key: 'nav.account' },
];

/** iOS-style tab bar (mobile only). */
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
    <nav className="glass-nav fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-hairline pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex h-[52px] max-w-[500px] items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const badge = getBadge(item);

          return (
            <Link key={item.href} href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex h-full w-16 flex-col items-center justify-center gap-0.5
                ${isActive ? 'text-accent dark:text-link' : 'text-ink-3'}`}>
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2 : 1.6}
                  fill={isActive && item.icon !== LayoutGrid ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.15 : 0} />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center
                    rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
