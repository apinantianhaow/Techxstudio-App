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
    <div className="grid grid-cols-3 gap-3 md:gap-5">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div key={cat.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={`/category/${cat.slug}`}>
              <div className="glass-card p-5 md:p-8 text-center hover:shadow-card-hover
                transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br ${cat.gradient}
                  flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <p className="text-sm md:text-base font-semibold text-surface-700 dark:text-surface-300">
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
