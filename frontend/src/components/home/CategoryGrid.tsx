'use client';

import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { DeviceArt, type DeviceKind } from '@/components/product/ProductVisual';
import { useTranslation } from '@/context/LanguageContext';

const CATEGORIES: { slug: string; key: string; kind?: DeviceKind; tint?: string }[] = [
  { slug: 'phone',     key: 'category.phone',     kind: 'phone',      tint: '#BFA48F' },
  { slug: 'tablet',    key: 'category.tablet',    kind: 'tablet',     tint: '#E3E3E3' },
  { slug: 'accessory', key: 'category.accessory', kind: 'headphones', tint: '#6B8FAD' },
  { slug: 'all',       key: 'category.all' },
];

/** Apple Store–style row of category icons. */
export default function CategoryGrid() {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('nav.categories')} className="page-width">
      <ul className="-mx-2 flex gap-2 overflow-x-auto py-8 [scrollbar-width:none] md:gap-6">
        {CATEGORIES.map((cat) => (
          <li key={cat.slug} className="flex-shrink-0">
            <Link href={`/category/${cat.slug}`}
              className="group flex w-[104px] flex-col items-center gap-3 rounded-control px-2 py-2 text-center">
              <span className="flex h-[78px] items-end justify-center transition-transform duration-300 group-hover:-translate-y-1">
                {cat.kind ? (
                  <DeviceArt kind={cat.kind} tint={cat.tint} className="h-[72px] w-auto" />
                ) : (
                  <span className="flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-card shadow-card">
                    <LayoutGrid className="h-7 w-7 text-ink-2" strokeWidth={1.5} />
                  </span>
                )}
              </span>
              <span className="text-[14px] font-semibold text-ink group-hover:text-link">{t(cat.key)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
