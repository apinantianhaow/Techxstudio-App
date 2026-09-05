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
      className="relative h-9 px-2.5 flex items-center gap-1.5 
        hover:bg-white/10 transition-colors duration-200"
      aria-label="Switch language"
    >
      <Globe className="w-[16px] h-[16px] text-white/60" />
      <motion.span
        key={locale}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 6, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-xs font-semibold text-white/80"
      >
        {locale === 'en' ? 'EN' : 'TH'}
      </motion.span>
    </motion.button>
  );
}
