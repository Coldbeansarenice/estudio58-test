// Central i18n (i18next). Every visible string comes from ./locales/en.ts and ./locales/es.ts.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import es from './locales/es';
import type { Lang } from '../types';

export const LANG_KEY = 'e58.lang';

/** Saved choice first, then the browser: Spanish browsers get /es, everything else /en. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch { /* storage blocked: fall through */ }
  const langs = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  return langs.some((l) => l?.toLowerCase().startsWith('es')) ? 'es' : 'en';
}

export function rememberLang(lang: Lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  interpolation: { escapeValue: false }, // React escapes already
  returnNull: false,
});

export default i18n;
