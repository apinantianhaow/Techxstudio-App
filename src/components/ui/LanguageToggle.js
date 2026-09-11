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
      className="h-9 px-2 flex items-center gap-1
        text-white/60 hover:text-white transition-colors"
      aria-label="Switch language"
    >
      <Globe className="w-[14px] h-[14px]" />
      <span className="text-xs font-medium">
        {locale === 'en' ? 'EN' : 'TH'}
      </span>
    </motion.button>
  );
}
