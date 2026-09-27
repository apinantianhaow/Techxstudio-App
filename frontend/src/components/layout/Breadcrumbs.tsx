'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items = [] }: { items?: BreadcrumbItem[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto py-3 text-[12px] [scrollbar-width:none]">
      <Link href="/" className="flex-shrink-0 text-ink-2 transition-colors hover:text-ink">
        {t('breadcrumbs.home')}
      </Link>

      {items.map((item, i) => (
        <span key={i} className="flex flex-shrink-0 items-center gap-1">
          <ChevronRight className="h-3 w-3 text-ink-3" />
          {item.href ? (
            <Link href={item.href} className="text-ink-2 transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="max-w-[220px] truncate text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
