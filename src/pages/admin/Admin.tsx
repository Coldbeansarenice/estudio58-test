import { useTranslation } from 'react-i18next';
import { db, serviceStatus } from '../../adapters';
import { coachingPlacesUsed } from '../../lib/access';
import { lp, useLang } from '../../lib/content';
import { longDate, money, shortDate } from '../../lib/format';
import { useRouter } from '../../lib/router';
import { DemoTag, Empty, usePageMeta } from '../../components/ui';
import { TIERS } from '../../types';
import { AdminVideos, AdminCourses } from './AdminContent';
import { AdminInbox } from './AdminInbox';
import { AdminSettings } from './AdminSettings';

const TABS = ['overview', 'videos', 'courses', 'inbox', 'members', 'settings'] as const;
type Tab = (typeof TABS)[number];

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="card min-w-0 overflow-hidden p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 whitespace-nowrap font-display text-[clamp(28px,8vw,40px)] font-bold leading-none tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Overview() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const s = data.settings;
  const members = data.members.filter((m) => m.role !== 'admin');
  const active = members.filter((m) => m.subscription.tier && (m.subscription.status === 'active' || m.subscription.status === 'past_due'));
  const byTier = TIERS.map((id) => [id, active.filter((m) => m.subscription.tier === id).length] as const);
  const mrr = byTier.reduce((sum, [id, n]) => sum + n * s.prices[id], 0);
  const waiting = data.requests.filter((r) => r.status === 'new' || r.status === 'in_progress').length;
  const since = Date.now() - 30 * 86400000;
  const fresh = members.filter((m) => new Date(m.joinedAt).getTime() >= since).length;
  const used = coachingPlacesUsed(data);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('admin.overview.active')} value={active.length} note={byTier.map(([id, n]) => `${t(`tiers.${id}.name`)} ${n}`).join(' · ')} />
        <Stat label={t('admin.overview.mrr')} value={money(mrr, lang)} note={t('admin.overview.mrrNote')} />
        <Stat label={t('admin.overview.waiting')} value={waiting} />
        <Stat label={t('admin.overview.places')} value={`${used} / ${s.coachingPlaces}`} />
        <Stat label={t('admin.overview.published')} value={data.videos.filter((v) => v.status === 'published').length} />
        <Stat label={t('admin.overview.drafts')} value={data.videos.filter((v) => v.status === 'draft').length} />
        <Stat label={t('admin.overview.newMembers')} value={fresh} />
      </div>
      <p className="-mt-4 text-xs text-muted">{t('common.demoData')}</p>

      <section>
        <h2 className="mb-3 text-2xl font-bold">{t('admin.overview.services')}</h2>
        <ul className="divide-y divide-line rounded-[6px] border border-line">
          {serviceStatus.map((x) => (
            <li key={x.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{x.service}</span>
              <span className="flex items-center gap-2 text-muted">{x.mode === 'demo' ? t('admin.overview.serviceDemo', { phase: x.phase }) : x.mode}{x.mode === 'demo' && <DemoTag />}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">{t('admin.overview.waitlist')}</h2>
        {data.waitlist.length === 0 ? <Empty>{t('admin.overview.waitlistEmpty')}</Empty> : (
          <ul className="divide-y divide-line rounded-[6px] border border-line">
            {data.waitlist.map((w) => {
              const m = data.members.find((x) => x.id === w.memberId);
              return (
                <li key={w.memberId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{m?.email} <span className="text-muted">· {shortDate(w.createdAt, lang)}</span></span>
                  <button className="btn-ghost !min-h-9" disabled={w.invited || used >= s.coachingPlaces} onClick={() => db.inviteFromWaitlist(w.memberId)}>
                    {w.invited ? t('admin.overview.invited') : t('admin.overview.invite')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">{t('admin.overview.outbox')} <DemoTag /></h2>
        {data.outbox.length === 0 ? <Empty>{t('admin.overview.outboxEmpty')}</Empty> : (
          <ul className="divide-y divide-line rounded-[6px] border border-line text-sm">
            {data.outbox.slice(0, 20).map((e) => (
              <li key={e.id} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[1fr_auto]">
                <span><span className="text-muted">{e.to} · {e.lang.toUpperCase()} ·</span> {e.subject}</span>
                <span className="text-xs text-muted">{longDate(e.createdAt, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Members() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  return (
    <div>
      <p className="mb-3 text-sm text-muted">{t('admin.members.noCards')} · {t('common.demoData')}</p>
      <div className="overflow-x-auto rounded-[6px] border border-line">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>{['name', 'email', 'plan', 'status', 'lang', 'joined'].map((k) => <th key={k} className="p-3 font-medium">{t(`admin.members.${k}`)}</th>)}</tr>
          </thead>
          <tbody>
            {data.members.filter((m) => m.role !== 'admin').map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="p-3">{m.firstName || '—'}</td>
                <td className="p-3 text-muted">{m.email}</td>
                <td className="p-3">{m.subscription.tier ? t(`tiers.${m.subscription.tier}.name`) : '—'}</td>
                <td className="p-3">{t(`account.status.${m.subscription.status}`).split(':')[0]}{m.subscription.cancelAtPeriodEnd ? ' ↘' : ''}</td>
                <td className="p-3">{m.lang.toUpperCase()}</td>
                <td className="p-3 tabular-nums text-muted">{shortDate(m.joinedAt, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { query, navigate } = useRouter();
  usePageMeta('meta.admin', { index: false });
  const tab = (TABS.includes(query.get('tab') as Tab) ? query.get('tab') : 'overview') as Tab;
  const data = db.useData();
  const waiting = data.requests.filter((r) => r.status === 'new').length;
  return (
    <div className="wrap py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(40px,8vw,56px)] font-extrabold">{t('admin.title')}</h1>
        <p className="flex items-center gap-2 text-sm text-muted"><DemoTag />{t('admin.demoNote')}</p>
      </div>
      <div className="rail mt-4 border-b border-line !pb-0" role="tablist">
        {TABS.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => navigate(lp(lang, `/admin?tab=${x}`), { replace: true })}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${tab === x ? 'border-gold text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
            {t(`admin.tabs.${x}`)}{x === 'inbox' && waiting > 0 && <span className="ml-1.5 rounded-full bg-gold px-1.5 text-xs text-ink">{waiting}</span>}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {tab === 'overview' && <Overview />}
        {tab === 'videos' && <AdminVideos />}
        {tab === 'courses' && <AdminCourses />}
        {tab === 'inbox' && <AdminInbox />}
        {tab === 'members' && <Members />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
}
