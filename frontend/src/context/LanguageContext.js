'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '@/lib/i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('en');

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('techx-lang');
    if (saved && translations[saved]) {
      setLocale(saved);
    }
  }, []);

  // Get translation by dot-separated key (e.g. 'cart.title')
  const t = useCallback(
    (key, fallback) => {
      const keys = key.split('.');
      let value = translations[locale];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return fallback || key;
        }
      }

      return value ?? fallback ?? key;
    },
    [locale]
  );

  const switchLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLocale(lang);
      localStorage.setItem('techx-lang', lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = locale === 'en' ? 'th' : 'en';
    switchLanguage(next);
  }, [locale, switchLanguage]);

  return (
    <LanguageContext.Provider value={{ locale, t, switchLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within LanguageProvider');
  return context;
}
