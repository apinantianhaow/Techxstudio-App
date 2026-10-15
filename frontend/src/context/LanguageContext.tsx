'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { translations, type Locale } from '@/lib/i18n/translations';

/**
 * Look up a translation by dot-separated key (e.g. 'cart.title').
 * Returns a string by default; pass a type argument for object entries,
 * e.g. t<{ title: string; desc: string }>('home.features.authentic').
 */
export interface TranslateFn {
  (key: string, fallback?: string): string;
  <T>(key: string, fallback?: string): T;
}

interface LanguageContextValue {
  locale: Locale;
  t: TranslateFn;
  switchLanguage: (lang: string) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLocale(value: string): value is Locale {
  return value in translations;
}

/** The entry at a dot-separated key in one language, or undefined. */
function lookup(locale: Locale, key: string): unknown {
  let value: unknown = translations[locale];
  for (const k of key.split('.')) {
    if (!value || typeof value !== 'object' || !(k in value)) return undefined;
    value = (value as Record<string, unknown>)[k];
  }
  return value;
}

/**
 * Translate outside React (e.g. in a store), in the language the page is
 * showing: LanguageProvider keeps <html lang> set to the current locale.
 */
export function translate(key: string): string {
  const lang = typeof document === 'undefined' ? '' : document.documentElement.lang;
  return String(lookup(isLocale(lang) ? lang : 'en', key) ?? key);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('techx-lang');
    if (saved && isLocale(saved)) {
      setLocale(saved);
    }
  }, []);

  // Lets CSS adapt to the script (e.g. taller line-height for Thai)
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (<T,>(key: string, fallback?: string): T => (lookup(locale, key) ?? (fallback || key)) as T) as TranslateFn,
    [locale]
  );

  const switchLanguage = useCallback((lang: string) => {
    if (isLocale(lang)) {
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

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within LanguageProvider');
  return context;
}
