import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { Link } from '../lib/router';
import { lp, useLang, type LocalVideo } from '../lib/content';
import { clock } from '../lib/format';
import { db } from '../adapters';
import type { Lang, Progress } from '../types';

export const Tricolour = ({ className = '' }: { className?: string }) => (
  <span className={`tricolour ${className}`} aria-hidden="true"><i /><i /><i /></span>
);

export function Wordmark({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex flex-col leading-none" aria-label="Estudio 58">
      <span className="font-display text-[22px] font-extrabold uppercase tracking-[0.04em]">Estudio 58</span>
      <Tricolour className="mt-1 !h-[2px]" />
    </Link>
  );
}

export const DemoTag = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation();
  return <span className={`tag border border-gold/40 !bg-transparent !text-gold ${className}`}>{t('common.demo')}</span>;
};

/** Sets the page title, description and hreflang links (public pages are localised for search engines). */
export function usePageMeta(titleKey: string, opts: { descKey?: string; index?: boolean; title?: string } = {}) {
  const { t } = useTranslation();
  const lang = useLang();
  useEffect(() => {
    document.title = opts.title ? `${opts.title} · Estudio 58` : t(titleKey);
    document.documentElement.lang = lang;
    const set = (sel: string, make: () => HTMLElement, attr: string, val: string) => {
      let el = document.head.querySelector(sel) as HTMLElement | null;
      if (!el) { el = make(); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    const meta = (name: string, prop = false) => () => { const m = document.createElement('meta'); m.setAttribute(prop ? 'property' : 'name', name); return m; };
    const desc = t(opts.descKey ?? 'meta.homeDesc');
    set('meta[name="description"]', meta('description'), 'content', desc);
    set('meta[property="og:title"]', meta('og:title', true), 'content', document.title);
    set('meta[property="og:description"]', meta('og:description', true), 'content', desc);
    set('meta[property="og:locale"]', meta('og:locale', true), 'content', lang === 'es' ? 'es_ES' : 'en_IE');
    // Private member pages are not indexed.
    set('meta[name="robots"]', meta('robots'), 'content', opts.index === false ? 'noindex, nofollow' : 'index, follow');
    document.head.querySelectorAll('link[data-hreflang]').forEach((n) => n.remove());
    if (opts.index !== false) {
      const rest = window.location.pathname.replace(/^\/(en|es)/, '');
      (['en', 'es', 'x-default'] as const).forEach((h) => {
        const l = document.createElement('link');
        l.rel = 'alternate'; l.hreflang = h; l.dataset.hreflang = '1';
        l.href = `${window.location.origin}/${h === 'x-default' ? 'en' : h}${rest}`;
        document.head.appendChild(l);
      });
    }
  }, [t, titleKey, lang, opts.descKey, opts.index, opts.title]);
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={`safe-bottom max-h-[92dvh] w-full overflow-y-auto rounded-t-[10px] border border-line bg-surface sm:rounded-[8px] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn-quiet -mr-2 !min-h-10 !px-2" onClick={onClose} aria-label={t('common.close')}><Icon name="close" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 md:bottom-6">
        {msg && <div className="pointer-events-auto max-w-md rounded-[6px] border border-gold/50 bg-surface-2 px-4 py-3 text-sm shadow-2xl shadow-black">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Form field ----------
export function Field({ label, hint, error, children, optional }: { label: string; hint?: string; error?: string | null; optional?: boolean; children: (id: string) => ReactNode }) {
  const id = useId();
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="label">{label}{optional && <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>}</label>
      {children(id)}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

// ---------- Thumbnails (drawn, never photos presented as Jean) ----------
export function Thumb({ hue, label, className = '', ratio = 'aspect-video' }: { hue: number; label?: string; className?: string; ratio?: string }) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  return (
    <div className={`relative overflow-hidden rounded-[4px] bg-surface-2 ${ratio} ${className}`}>
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 30% 16%)`} />
            <stop offset="1" stopColor="#0d0d0d" />
          </linearGradient>
        </defs>
        <rect width="160" height="90" fill={`url(#g${id})`} />
        <circle cx="118" cy="58" r="44" fill={`hsl(${hue} 40% 30% / .35)`} />
        <path d="M0 78 Q50 60 90 70 T160 62 V90 H0Z" fill="#000" opacity=".45" />
        <path d="M18 64 l10 -26 l9 8 l9 -16" stroke="#F2B90F" strokeOpacity=".55" strokeWidth="1.4" fill="none" />
      </svg>
      {label && <span className="absolute bottom-2 left-2 right-10 truncate font-display text-[13px] font-semibold uppercase tracking-wide text-fg/85">{label}</span>}
      <span className="absolute right-1.5 top-1.5 rounded-[2px] bg-black/60 px-1 text-[10px] font-semibold uppercase tracking-wider text-gold">{t('demo.thumb')}</span>
    </div>
  );
}

// ---------- Video card ----------
export function VideoCard({ item, progress, categoryName, wide = false }: { item: LocalVideo; progress?: Progress; categoryName: string; wide?: boolean }) {
  const { t } = useTranslation();
  const lang = useLang();
  const pct = progress ? Math.min(100, (progress.positionSec / item.v.durationSec) * 100) : 0;
  return (
    <Link to={lp(lang, `/video/${item.video.id}`)} className={`group block ${wide ? 'w-[72vw] max-w-[300px] shrink-0 sm:w-[280px]' : ''}`}>
      <div className="relative">
        <Thumb hue={item.video.thumbHue} label={categoryName} className="transition-opacity group-hover:opacity-90" />
        <span className="absolute bottom-2 right-2 rounded-[2px] bg-black/75 px-1.5 text-xs tabular-nums">{clock(item.v.durationSec)}</span>
        {progress && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
            <span className="block h-full bg-gold" style={{ width: `${progress.completed ? 100 : pct}%` }} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-start gap-2">
        <h3 className="line-clamp-2 flex-1 font-sans text-[15px] font-semibold normal-case leading-snug tracking-normal">{item.v.title}</h3>
        {progress?.completed && <Icon name="check" size={18} className="mt-0.5 text-gold" />}
      </div>
      <p className="mt-0.5 text-xs text-muted">{t(`levels.${item.video.level}`)} · {t(`types.${item.video.type}`)}</p>
    </Link>
  );
}

export function SectionHead({ title, to, action }: { title: string; to?: string; action?: string }) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold sm:text-[28px]">{title}</h2>
      {to && <Link to={to} className="shrink-0 text-sm text-muted hover:text-gold">{action ?? t('common.viewAll')} →</Link>}
    </div>
  );
}

export function BookmarkButton({ memberId, videoId, saved }: { memberId: string; videoId: string; saved: boolean }) {
  const { t } = useTranslation();
  return (
    <button className={saved ? 'btn-gold' : 'btn-ghost'} aria-pressed={saved} onClick={() => db.toggleBookmark(memberId, videoId)}>
      <Icon name="bookmark" size={18} /> {saved ? t('video.saved') : t('video.save')}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[6px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

export function langName(t: (k: string) => string, l: Lang) { return t(`lang.${l}`); }
