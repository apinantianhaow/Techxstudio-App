'use client';

import Link from 'next/link';
import { useTranslation } from '@/context/LanguageContext';

const SHOP_LINKS = [
  { href: '/category/phone', key: 'category.phone' },
  { href: '/category/tablet', key: 'category.tablet' },
  { href: '/category/accessory', key: 'category.accessory' },
  { href: '/category/all', key: 'category.all' },
];

const ACCOUNT_LINKS = [
  { href: '/account', key: 'nav.account' },
  { href: '/orders', key: 'orders.title' },
  { href: '/wishlist', key: 'wishlist.title' },
  { href: '/cart', key: 'nav.cart' },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    // Bottom padding keeps content clear of the mobile tab bar
    <footer className="bg-canvas-alt pb-[calc(52px+env(safe-area-inset-bottom))] text-[12px] leading-[1.33] text-ink-2 md:pb-0">
      <div className="mx-auto max-w-[1024px] px-5 pt-8 pb-6">
        <p className="border-b border-line pb-4">{t('footer.disclaimer')}</p>

        <div className="grid grid-cols-2 gap-6 border-b border-line py-6 sm:grid-cols-4">
          {[
            { title: t('footer.shop'), links: SHOP_LINKS },
            { title: t('footer.account'), links: ACCOUNT_LINKS },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="mb-2 font-semibold text-ink">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-ink hover:underline">{t(l.key)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="pt-4">Copyright © {new Date().getFullYear()} {t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
