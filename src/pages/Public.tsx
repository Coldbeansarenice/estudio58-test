import { useTranslation } from 'react-i18next';
import { auth, db } from '../adapters';
import { hasAccess } from '../lib/access';
import { lp, useLang } from '../lib/content';
import { Link, useRouter } from '../lib/router';
import { TierCards } from '../components/Tiers';
import { Icon } from '../components/Icon';
import { Tricolour, usePageMeta } from '../components/ui';
import { TIERS, type TierId } from '../types';
import { money } from '../lib/format';

/** Placeholder for real sports photography. Never presented as Jean. */
function PhotoPlaceholder({ className = '', label }: { className?: string; label: string }) {
  const { t } = useTranslation();
  return (
    <div className={`relative overflow-hidden bg-[#0f0f0f] ${className}`} role="img" aria-label={`${label}. ${t('demo.notJean')}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="spot" cx="62%" cy="30%" r="70%">
            <stop offset="0" stopColor="#2a2a2a" /><stop offset="1" stopColor="#0b0b0b" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#spot)" />
        {Array.from({ length: 9 }, (_, i) => <line key={i} x1={-40 + i * 60} y1="300" x2={120 + i * 40} y2="150" stroke="#1e1e1e" strokeWidth="1" />)}
        <path d="M0 230 L400 190 L400 300 L0 300Z" fill="#121212" />
        <path d="M60 228 L340 194" stroke="#F2B90F" strokeOpacity=".35" strokeWidth="1.5" />
      </svg>
      <span className="absolute bottom-3 right-3 rounded-[2px] border border-line bg-black/70 px-2 py-1 text-[11px] text-muted">
        {label} · {t('demo.notJean')}
      </span>
    </div>
  );
}

function Achievements() {
  const data = db.useData();
  const lang = useLang();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.settings.achievements.map((a, i) => (
        <li key={i} className="card relative overflow-hidden p-4 pl-5">
          <span className="absolute inset-y-0 left-0 flex w-[3px] flex-col" aria-hidden="true">
            <i className="flex-1 bg-gold" /><i className="flex-1 bg-vblue" /><i className="flex-1 bg-vred" />
          </span>
          <p className="font-display text-xl font-semibold uppercase leading-tight">{a[lang]}</p>
        </li>
      ))}
    </ul>
  );
}

function FaqList({ limit }: { limit?: number }) {
  const data = db.useData();
  const lang = useLang();
  const items = limit ? data.settings.faq.slice(0, limit) : data.settings.faq;
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.id} className="group py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold">
            {f.q[lang]}
            <Icon name="plus" className="shrink-0 text-gold transition-transform group-open:rotate-45" />
          </summary>
          <p className="pb-4 pr-8 text-muted">{f.a[lang]}</p>
        </details>
      ))}
    </div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const lang = useLang();
  const me = auth.useSession();
  const data = db.useData();
  const member = hasAccess(me);
  usePageMeta('meta.home', { descKey: 'meta.homeDesc' });
  const what = ['library', 'courses', 'reviews', 'ask', 'coaching', 'languages'] as const;
  const [l1, l2] = data.settings.heroHeadline[lang].split(/(?<=\.)\s+/);
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        <PhotoPlaceholder className="absolute inset-0 -z-10" label={t('demo.placeholderPhoto')} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div className="wrap flex min-h-[78dvh] flex-col justify-end pb-12 pt-24 sm:min-h-[70vh] sm:pb-16">
          <h1 className="max-w-4xl text-[clamp(44px,11vw,104px)] font-extrabold leading-[0.92]">
            {l1}<br /><span className="text-gold">{l2}</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] text-fg/85">{t('home.sub')}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {member ? (
              <Link to={lp(lang, '/dashboard')} className="btn-gold">{t('home.ctaDashboard')}</Link>
            ) : (
              <>
                <Link to={lp(lang, '/membership')} className="btn-gold">{t('home.ctaJoin')}</Link>
                <a href="#tiers" className="btn-ghost" onClick={(e) => { e.preventDefault(); document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth' }); }}>{t('home.ctaTiers')}</a>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="wrap py-14">
        <h2 className="text-[40px] font-extrabold">{t('home.achievementsTitle')}</h2>
        <p className="mb-6 mt-1 text-muted">{t('home.achievementsSub')}</p>
        <Achievements />
      </section>

      <section className="border-y border-line bg-surface/40">
        <div className="wrap py-14">
          <h2 className="mb-8 text-[40px] font-extrabold">{t('home.whatTitle')}</h2>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {what.map((k) => {
              const [title, body] = t(`home.what.${k}`, { returnObjects: true }) as unknown as [string, string];
              return (
                <div key={k} className="border-t-2 border-gold/70 pt-4">
                  <h3 className="text-2xl font-bold">{title}</h3>
                  <p className="mt-1.5 text-muted">{body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="tiers" className="wrap scroll-mt-20 py-14">
        <h2 className="text-[40px] font-extrabold">{t('home.tiersTitle')}</h2>
        <p className="mb-6 mt-1 text-muted">{t('home.tiersSub')}</p>
        <TierCards />
        <p className="mt-4 text-sm text-muted">{t('membership.billing')}</p>
      </section>

      <section className="wrap grid items-center gap-8 py-14 md:grid-cols-2">
        <PhotoPlaceholder className="aspect-[4/5] rounded-[6px] border border-line" label={t('about.portrait')} />
        <div>
          <h2 className="text-[40px] font-extrabold">{t('home.aboutTitle')}</h2>
          <p className="mt-2 text-muted">{t('about.sub')}</p>
          <p className="mt-4">{data.settings.bio[lang] || t('about.pending')}</p>
          <Link to={lp(lang, '/about')} className="btn-ghost mt-6">{t('home.aboutCta')}</Link>
        </div>
      </section>

      <section className="wrap py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-[40px] font-extrabold">{t('home.faqTitle')}</h2>
          <Link to={lp(lang, '/faq')} className="text-sm text-muted hover:text-gold">{t('home.faqAll')} →</Link>
        </div>
        <FaqList limit={4} />
      </section>
    </>
  );
}

export function AboutPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  usePageMeta('meta.about');
  const s = data.settings;
  return (
    <div className="wrap py-10 sm:py-14">
      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12">
        <PhotoPlaceholder className="aspect-[4/5] rounded-[6px] border border-line" label={t('about.portrait')} />
        <div>
          <h1 className="text-[clamp(48px,9vw,84px)] font-extrabold">{t('about.title')}</h1>
          <Tricolour className="mt-3 max-w-[120px]" />
          <p className="mt-4 text-muted">{t('about.sub')}</p>
          <h2 className="mt-10 text-2xl font-bold">{t('about.bio')}</h2>
          <p className="mt-2 whitespace-pre-line">{s.bio[lang] || <span className="text-muted">{t('about.pending')}</span>}</p>
          <h2 className="mt-8 text-2xl font-bold">{t('about.philosophy')}</h2>
          <p className="mt-2 whitespace-pre-line">{s.philosophy[lang] || <span className="text-muted">{t('about.pending')}</span>}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="btn-ghost" href={s.instagram} target="_blank" rel="noreferrer">{t('about.instagram')} @jeanlucajj <Icon name="external" size={16} /></a>
            <a className="btn-ghost" href={s.ibjjf} target="_blank" rel="noreferrer">{t('about.ibjjf')} <Icon name="external" size={16} /></a>
          </div>
        </div>
      </div>
      <h2 className="mb-5 mt-14 text-[36px] font-extrabold">{t('about.achievements')}</h2>
      <Achievements />
    </div>
  );
}

export function MembershipPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { query } = useRouter();
  const data = db.useData();
  usePageMeta('meta.membership');
  const s = data.settings;
  const q = query.get('tier');
  const auto = (TIERS as string[]).includes(q ?? '') ? (q as TierId) : null;
  const rows: [string, (id: TierId) => string][] = [
    [t('membership.rows.price'), (id) => money(s.prices[id], lang)],
    [t('membership.rows.library'), () => '✓'],
    [t('membership.rows.questions'), (id) => (id === 'academy' ? t('membership.perQuestion', { price: money(s.prices.oneOffQuestion, lang) }) : String(s.limits[id].questionsPerMonth))],
    [t('membership.rows.reviews'), (id) => (s.limits[id].reviewsPerMonth ? String(s.limits[id].reviewsPerMonth) : '—')],
    [t('membership.rows.calls'), (id) => (s.limits[id].callsPerWeek ? t('membership.callValue') : '—')],
  ];
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-[clamp(48px,9vw,84px)] font-extrabold">{t('membership.title')}</h1>
      <p className="mb-8 mt-2 text-muted">{t('membership.intro')}</p>
      <div className="mb-6 flex gap-3 rounded-[6px] border border-gold/40 bg-gold/[0.06] p-4 text-sm">
        <Icon name="info" className="shrink-0 text-gold" />
        <p>{t('membership.billing')}</p>
      </div>
      <TierCards autoOpen={auto} />
      <p className="mt-4 text-sm text-muted">{t('membership.oneOff', { price: money(s.prices.oneOffQuestion, lang) })}</p>

      <h2 className="mb-4 mt-14 text-[32px] font-extrabold">{t('membership.compare')}</h2>
      <div className="overflow-x-auto rounded-[6px] border border-line">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead className="bg-surface">
            <tr><th className="p-3" />{TIERS.map((id) => <th key={id} className="p-3 font-display text-lg font-bold uppercase">{t(`tiers.${id}.name`)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([label, val]) => (
              <tr key={label} className="border-t border-line">
                <th scope="row" className="p-3 font-medium text-muted">{label}</th>
                {TIERS.map((id) => <td key={id} className="p-3 tabular-nums">{val(id) === '✓' ? <Icon name="check" className="text-gold" /> : val(id)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-12 text-2xl font-bold">{t('membership.fineTitle')}</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-muted">
        {(t('membership.fine', { returnObjects: true }) as unknown as string[]).map((f) => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}

export function FaqPage() {
  const { t } = useTranslation();
  usePageMeta('meta.faq');
  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <h1 className="text-[clamp(48px,9vw,84px)] font-extrabold">{t('faq.title')}</h1>
      <p className="mb-8 mt-2 text-muted">{t('faq.intro')}</p>
      <FaqList />
      <p className="mt-8 text-sm text-muted">{t('footer.disclaimer')}</p>
    </div>
  );
}

export function LegalPage({ doc }: { doc: 'terms' | 'privacy' | 'cancellation' }) {
  const { t } = useTranslation();
  usePageMeta('meta.legal', { title: t(`legal.${doc}.title`) });
  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <h1 className="text-[clamp(40px,8vw,64px)] font-extrabold">{t(`legal.${doc}.title`)}</h1>
      <p className="mt-4 rounded-[4px] border border-gold/40 bg-gold/[0.06] p-3 text-sm">{t('legal.placeholder')}</p>
      <div className="mt-6 space-y-4">
        {(t(`legal.${doc}.body`, { returnObjects: true }) as unknown as string[]).map((p) => <p key={p}>{p}</p>)}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  const lang = useLang();
  usePageMeta('meta.member', { index: false, title: t('notFound.title') });
  return (
    <div className="wrap py-24 text-center">
      <h1 className="text-[64px] font-extrabold">404</h1>
      <p className="mt-2 text-xl">{t('notFound.title')}</p>
      <p className="text-muted">{t('notFound.body')}</p>
      <Link to={lp(lang, '')} className="btn-gold mt-6">{t('notFound.home')}</Link>
    </div>
  );
}
