import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../adapters';
import { hasAccess } from '../lib/access';
import { lp, useLang } from '../lib/content';
import { Link, useRouter } from '../lib/router';
import { rememberLang } from '../i18n';
import type { Lang } from '../types';
import { Icon } from './Icon';
import { Modal, Tricolour, Wordmark } from './ui';

const DEMO_ACCOUNTS = [
  { id: '', key: 'visitor' },
  { id: 'm-academy', key: 'academy' },
  { id: 'm-review', key: 'review' },
  { id: 'm-coaching', key: 'coaching' },
  { id: 'm-admin', key: 'admin' },
];

function DemoBar() {
  const { t } = useTranslation();
  const me = auth.useSession();
  const lang = useLang();
  const { navigate } = useRouter();
  if (!auth.demoSwitch) return null;
  return (
    <div className="safe-top border-b border-gold/30 bg-[#141006] text-[13px]">
      <div className="wrap flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
        <span className="rounded-[2px] bg-gold px-1.5 text-[11px] font-bold uppercase tracking-wider text-ink">{t('common.demo')}</span>
        <span className="hidden text-muted sm:inline">{t('demo.banner')}</span>
        <label className="ml-auto flex items-center gap-2 text-muted">
          <span>{t('demo.viewAs')}</span>
          <select
            className="min-h-8 rounded-[3px] border border-line bg-surface-2 px-2 text-[13px] text-fg"
            value={me?.isDemo && DEMO_ACCOUNTS.some((a) => a.id === me.id) ? me.id : me ? '__other' : ''}
            onChange={(e) => {
              const id = e.target.value || null;
              auth.demoSwitch?.(id);
              navigate(lp(lang, id === 'm-admin' ? '/admin' : id ? '/dashboard' : ''));
            }}
          >
            {DEMO_ACCOUNTS.map((a) => <option key={a.key} value={a.id}>{t(`demo.${a.key}`)}</option>)}
            {me && !DEMO_ACCOUNTS.some((a) => a.id === me.id) && <option value="__other">{me.email}</option>}
          </select>
        </label>
      </div>
    </div>
  );
}

export function LangSwitch({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { pathname, query, navigate } = useRouter();
  const me = auth.useSession();
  const go = (l: Lang) => {
    if (l === lang) return;
    rememberLang(l);
    if (me) void db.updateProfile(me.id, { lang: l });
    const rest = pathname.replace(/^\/(en|es)/, '');
    const q = query.toString();
    navigate(`/${l}${rest}${q ? `?${q}` : ''}`, { replace: true });
  };
  return (
    <div role="group" aria-label={t('lang.label')} className={`inline-flex rounded-[4px] border border-line p-0.5 ${className}`}>
      {(['en', 'es'] as Lang[]).map((l) => (
        <button key={l} lang={l} onClick={() => go(l)} aria-pressed={l === lang}
          className={`min-h-8 min-w-10 rounded-[3px] px-2 text-xs font-bold tracking-wider ${l === lang ? 'bg-gold text-ink' : 'text-muted hover:text-fg'}`}>
          {t(`lang.short.${l}`)}
        </button>
      ))}
    </div>
  );
}

function Bell() {
  const { t } = useTranslation();
  const me = auth.useSession();
  const data = db.useData();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  const mine = data.notices.filter((n) => n.memberId === me.id);
  const unread = mine.filter((n) => !n.read).length;
  return (
    <>
      <button className="btn-quiet relative !min-h-10 !px-2" aria-label={t('nav.notifications')} onClick={() => { setOpen(true); void db.markNoticesRead(me.id); }}>
        <Icon name="bell" />
        {unread > 0 && <span className="absolute right-1 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">{unread}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('nav.notifications')}>
        {mine.length === 0 ? <p className="text-muted">{t('nav.noNotifications')}</p> : (
          <ul className="divide-y divide-line">
            {mine.map((n) => {
              const r = data.requests.find((x) => x.id === n.requestId);
              return (
                <li key={n.id} className="py-3">
                  <Link to={lp(lang, '/ask?tab=mine')} onClick={() => setOpen(false)} className="hover:text-gold">
                    {t('nav.replyNotice', { subject: r?.subject ?? '' })}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}

function NavLink({ to, children, exact = false }: { to: string; children: ReactNode; exact?: boolean }) {
  const { pathname } = useRouter();
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link to={to} aria-current={active ? 'page' : undefined}
      className={`relative py-2 text-sm font-medium transition-colors ${active ? 'text-fg after:absolute after:inset-x-0 after:-bottom-[13px] after:h-[2px] after:bg-gold' : 'text-muted hover:text-fg'}`}>
      {children}
    </Link>
  );
}

function Header() {
  const { t } = useTranslation();
  const lang = useLang();
  const me = auth.useSession();
  const member = hasAccess(me);
  const [menu, setMenu] = useState(false);
  const L = (p: string) => lp(lang, p);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/92 backdrop-blur">
      <div className="wrap flex h-14 items-center gap-6">
        <Wordmark to={member ? L('/dashboard') : L('')} />
        <nav aria-label={t('nav.main')} className="hidden flex-1 items-center gap-6 md:flex">
          {member ? (
            <>
              <NavLink to={L('/dashboard')}>{t('nav.dashboard')}</NavLink>
              <NavLink to={L('/library')}>{t('nav.library')}</NavLink>
              <NavLink to={L('/courses')}>{t('nav.courses')}</NavLink>
              <NavLink to={L('/ask')}>{t('nav.ask')}</NavLink>
              {me?.role === 'admin' && <NavLink to={L('/admin')}>{t('nav.admin')}</NavLink>}
            </>
          ) : (
            <>
              <NavLink to={L('/about')}>{t('nav.about')}</NavLink>
              <NavLink to={L('/membership')}>{t('nav.membership')}</NavLink>
              <NavLink to={L('/faq')}>{t('nav.faq')}</NavLink>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <LangSwitch className="mr-1" />
          {me && <Bell />}
          {me ? (
            <Link to={L('/account')} className="btn-quiet hidden !min-h-10 !px-2 md:inline-flex" aria-label={t('nav.account')}><Icon name="user" /></Link>
          ) : (
            <>
              <Link to={L('/login')} className="btn-quiet hidden md:inline-flex">{t('nav.login')}</Link>
              <Link to={L('/membership')} className="btn-gold hidden !min-h-10 md:inline-flex">{t('nav.join')}</Link>
              <button className="btn-quiet !min-h-10 !px-2 md:hidden" onClick={() => setMenu(true)} aria-label={t('nav.menu')} aria-expanded={menu}><Icon name="menu" /></button>
            </>
          )}
        </div>
      </div>
      {menu && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink md:hidden">
          <div className="wrap flex h-14 items-center justify-between">
            <Wordmark to={L('')} />
            <button className="btn-quiet !px-2" onClick={() => setMenu(false)} aria-label={t('nav.closeMenu')}><Icon name="close" /></button>
          </div>
          <nav className="wrap flex flex-1 flex-col gap-1 pt-6" onClick={() => setMenu(false)}>
            {[['', 'home'], ['/about', 'about'], ['/membership', 'membership'], ['/faq', 'faq'], ['/login', 'login']].map(([p, k]) => (
              <Link key={k} to={L(p)} className="border-b border-line py-4 font-display text-3xl font-bold uppercase">{t(`nav.${k}`)}</Link>
            ))}
            <Link to={L('/membership')} className="btn-gold mt-6 w-full">{t('nav.join')}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function TabBar() {
  const { t } = useTranslation();
  const lang = useLang();
  const { pathname } = useRouter();
  const me = auth.useSession();
  if (!hasAccess(me)) return null;
  const tabs = [
    ['/dashboard', 'home', 'dashboard'], ['/library', 'library', 'library'], ['/courses', 'courses', 'courses'],
    ['/ask', 'ask', 'ask'], [me?.role === 'admin' ? '/admin' : '/account', me?.role === 'admin' ? 'shield' : 'user', me?.role === 'admin' ? 'admin' : 'account'],
  ] as const;
  return (
    <nav aria-label={t('nav.main')} className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(([p, icon, k]) => {
          const to = lp(lang, p);
          const on = pathname === to || pathname.startsWith(`${to}/`) || (p === '/library' && pathname.includes('/video/'));
          return (
            <li key={k}>
              <Link to={to} aria-current={on ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${on ? 'text-gold' : 'text-muted'}`}>
                <Icon name={icon} size={22} />
                {t(`nav.${k}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Footer() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const me = auth.useSession();
  return (
    <footer className={`mt-20 border-t border-line ${hasAccess(me) ? 'pb-20 md:pb-0' : ''}`}>
      <Tricolour />
      <div className="wrap grid gap-8 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-extrabold uppercase">Estudio 58</p>
          <p className="mt-1 text-sm text-muted">{t('footer.tagline')}</p>
          <p className="mt-4 max-w-sm text-xs text-muted">{t('footer.disclaimer')}</p>
        </div>
        <ul className="space-y-2 text-sm text-muted">
          <li><Link className="hover:text-fg" to={lp(lang, '/about')}>{t('nav.about')}</Link></li>
          <li><Link className="hover:text-fg" to={lp(lang, '/membership')}>{t('nav.membership')}</Link></li>
          <li><Link className="hover:text-fg" to={lp(lang, '/faq')}>{t('nav.faq')}</Link></li>
          <li><a className="hover:text-fg" href={data.settings.instagram} target="_blank" rel="noreferrer">Instagram @jeanlucajj</a></li>
        </ul>
        <ul className="space-y-2 text-sm text-muted">
          <li><Link className="hover:text-fg" to={lp(lang, '/legal/terms')}>{t('footer.terms')}</Link></li>
          <li><Link className="hover:text-fg" to={lp(lang, '/legal/privacy')}>{t('footer.privacy')}</Link></li>
          <li><Link className="hover:text-fg" to={lp(lang, '/legal/cancellation')}>{t('footer.cancellation')}</Link></li>
          <li className="pt-2 text-xs">{t('footer.rights', { year: new Date().getFullYear() })}</li>
        </ul>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const me = auth.useSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[80] focus:bg-gold focus:px-3 focus:py-2 focus:text-ink">{t('nav.skip')}</a>
      <DemoBar />
      <Header />
      <main id="main" className={`flex-1 ${hasAccess(me) ? 'pb-16 md:pb-0' : ''}`}>{children}</main>
      <Footer />
      <TabBar />
    </div>
  );
}
