'use client';

import Link from 'next/link';
import { Smartphone, Tablet, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';

const CATEGORIES = [
  { slug: 'phone',     key: 'category.phone',     icon: Smartphone, color: 'text-primary-500' },
  { slug: 'tablet',    key: 'category.tablet',     icon: Tablet,     color: 'text-primary-600' },
  { slug: 'accessory', key: 'category.accessory',  icon: Headphones, color: 'text-primary-400' },
];

export default function CategoryGrid() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-4 md:gap-6">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
          >
            <Link href={`/category/${cat.slug}`}>
              <div className="group cursor-pointer text-center py-8 md:py-10
                bg-white dark:bg-surface-800
                border border-surface-200 dark:border-surface-700
                hover:border-primary-400 hover:shadow-[0_4px_20px_rgba(124,58,237,0.1)]
                transition-all duration-300">
                <Icon className={`w-8 h-8 md:w-10 md:h-10 mx-auto mb-3 ${cat.color}
                  group-hover:scale-110 transition-transform duration-300`}
                  strokeWidth={1.5} />
                <p className="text-sm font-semibold text-surface-600 dark:text-surface-300
                  uppercase tracking-wide">
                  {t(cat.key)}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
