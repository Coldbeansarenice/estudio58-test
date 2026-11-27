import type { Lang } from '../types';

const locale = (lang: Lang) => (lang === 'es' ? 'es-ES' : 'en-IE');

export function money(cents: number, lang: Lang) {
  return new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function shortDate(iso: string | Date, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function longDate(iso: string | Date, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function totalTime(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
