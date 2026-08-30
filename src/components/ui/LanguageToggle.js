'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { locale, toggleLanguage } = useTranslation();

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggleLanguage}
      className="relative h-9 px-3 flex items-center gap-1.5 rounded-full
        hover:bg-surface-100/80 dark:hover:bg-surface-800/50
        transition-colors duration-200"
      aria-label="Switch language"
    >
      <Globe className="w-[16px] h-[16px] text-surface-500" />
      <motion.span
        key={locale}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 6, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-xs font-semibold text-primary-600 dark:text-primary-400"
      >
        {locale === 'en' ? 'EN' : 'TH'}
      </motion.span>
    </motion.button>
  );
}
