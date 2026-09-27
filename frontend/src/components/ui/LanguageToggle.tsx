'use client';

import { useTranslation } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { locale, toggleLanguage } = useTranslation();

  return (
    <button
      onClick={toggleLanguage}
      className="flex h-11 items-center gap-1 px-2 text-ink/80 transition-colors hover:text-ink"
      aria-label="Switch language"
    >
      <Globe className="h-[15px] w-[15px]" strokeWidth={1.75} />
      <span className="text-[12px]">{locale === 'en' ? 'EN' : 'TH'}</span>
    </button>
  );
}
