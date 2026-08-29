'use client';

import Link from 'next/link';
import { Smartphone, Tablet, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';

const CATEGORIES = [
  { slug: 'phone', key: 'category.phone', icon: Smartphone, gradient: 'from-blue-500 to-indigo-600' },
  { slug: 'tablet', key: 'category.tablet', icon: Tablet, gradient: 'from-purple-500 to-pink-600' },
  { slug: 'accessory', key: 'category.accessory', icon: Headphones, gradient: 'from-orange-500 to-rose-600' },
];

export default function CategoryGrid() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-4 md:gap-6 lg:gap-8">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div key={cat.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={`/category/${cat.slug}`}>
              <div className="glass-card p-8 md:p-12 lg:p-14 text-center
                hover:shadow-card-hover transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className={`w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mx-auto bg-gradient-to-br ${cat.gradient}
                  flex items-center justify-center mb-4 md:mb-6 group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" />
                </div>
                <p className="text-sm md:text-lg lg:text-xl font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wide">
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
