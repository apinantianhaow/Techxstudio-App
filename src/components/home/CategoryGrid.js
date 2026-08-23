'use client';

import Link from 'next/link';
import { Smartphone, Tablet, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { slug: 'phone', label: 'iPhone', icon: Smartphone, gradient: 'from-blue-500 to-indigo-600' },
  { slug: 'tablet', label: 'iPad', icon: Tablet, gradient: 'from-purple-500 to-pink-600' },
  { slug: 'accessory', label: 'อุปกรณ์เสริม', icon: Headphones, gradient: 'from-orange-500 to-rose-600' },
];

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/category/${cat.slug}`}>
              <div className="glass-card p-4 md:p-6 text-center hover:shadow-card-hover
                transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto rounded-xl bg-gradient-to-br ${cat.gradient}
                  flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <p className="text-xs md:text-sm font-semibold text-surface-700 dark:text-surface-300">
                  {cat.label}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
