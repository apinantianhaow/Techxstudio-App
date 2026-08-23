'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { locale, toggleLanguage } = useTranslation();

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={toggleLanguage}
      className="relative h-10 px-3 flex items-center gap-1.5 rounded-full
        bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
        transition-colors duration-300"
      aria-label="Switch language"
    >
      <Languages className="w-4 h-4 text-surface-500" />
      <motion.span
        key={locale}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase"
      >
        {locale === 'en' ? 'EN' : 'TH'}
      </motion.span>
    </motion.button>
  );
}
