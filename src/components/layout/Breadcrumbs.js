'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm overflow-x-auto py-2">
      <Link
        href="/"
        className="flex items-center gap-1 text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex-shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span>หน้าหลัก</span>
      </Link>

      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-surface-300 dark:text-surface-600" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-surface-400 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-surface-700 dark:text-surface-200 font-medium truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
