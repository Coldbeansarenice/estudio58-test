import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, demoWebhook, payments } from '../adapters';
import { hasAccess, TIER_RANK } from '../lib/access';
import { localCourses, localVideos, lp, useLang } from '../lib/content';
import { useRouter, Link } from '../lib/router';
import { rememberLang } from '../i18n';
import { Field, Modal, usePageMeta, useToast, VideoCard, Empty } from '../components/ui';
import { StatusLine } from './Member';
import { BELTS, INTERESTS, TIERS, type Belt, type Interest, type Lang, type Member, type TierId } from '../types';

function DemoPortal({ me, open, onClose }: { me: Member; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const s = me.subscription;
  const say = (k: string) => toast(t(k));
  return (
    <Modal open={open} onClose={onClose} title={t('portal.title')}>
      <p className="mb-4 rounded-[4px] border border-gold/40 bg-gold/[0.06] p-3 text-sm">{t('portal.demo')}</p>
      <p className="mb-4 text-sm"><StatusLine me={me} /></p>
      {db.mode === 'supabase' && <p className="text-sm text-muted">{t('membership.serverOnly')}</p>}
      {s.tier && db.mode === 'demo' && (
        <>
          <p className="label">{t('portal.changeTo')}</p>
          <div className="grid gap-2">
            {TIERS.filter((x) => x !== s.tier).map((x: TierId) => (
              <button key={x} className="btn-ghost justify-between" onClick={() => {
                const r = demoWebhook.changeTier(me, x);
                if (r !== 'none') say(`portal.${r}`);
              }}>
                <span>{t(`tiers.${x}.name`)}</span>
                <span className="text-xs text-muted">{TIER_RANK[x] > TIER_RANK[s.tier!] ? t('portal.upgrade') : t('portal.downgrade')}</span>
              </button>
            ))}
          </div>
          <p className="hint">{t('portal.upgradeNote')}</p>
          <div className="mt-4">
            {s.cancelAtPeriodEnd
              ? <button className="btn-gold w-full" onClick={() => demoWebhook.cancelAtPeriodEnd(me.id, false)}>{t('portal.resume')}</button>
              : <button className="btn-danger w-full" onClick={() => demoWebhook.cancelAtPeriodEnd(me.id, true)}>{t('portal.cancel')}</button>}
          </div>
          <details className="mt-5 rounded-[4px] border border-dashed border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted">{t('portal.simulate')}</summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-ghost !min-h-10 !px-2 text-xs" onClick={() => demoWebhook.paymentFailed(me)}>{t('portal.failed')}</button>
              <button className="btn-ghost !min-h-10 !px-2 text-xs" onClick={() => demoWebhook.retriesExhausted(me.id)}>{t('portal.exhausted')}</button>
              <button className="btn-ghost !min-h-10 !px-2 text-xs" onClick={() => demoWebhook.paymentFixed(me.id)}>{t('portal.fixed')}</button>
              <button className="btn-ghost !min-h-10 !px-2 text-xs" onClick={() => demoWebhook.renewalPassed(me)}>{t('portal.renewal')}</button>
            </div>
          </details>
        </>
      )}
    </Modal>
  );
}

export function AccountPage({ me }: { me: Member }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { navigate } = useRouter();
  const toast = useToast();
  const data = db.useData();
  usePageMeta('meta.member', { index: false, title: t('account.title') });
  const [name, setName] = useState(me.firstName);
  const [belt, setBelt] = useState<Belt>(me.belt);
  const [ints, setInts] = useState<Interest[]>(me.interests);
  const [prefLang, setPrefLang] = useState<Lang>(me.lang);
  const [portal, setPortal] = useState(false);
  const [del, setDel] = useState(false);
  const [delText, setDelText] = useState('');

  useEffect(() => {
    if (window.location.hash === '#subscription') document.getElementById('subscription')?.scrollIntoView();
  }, []);

  const access = hasAccess(me);
  const videos = localVideos(data.videos, lang);
  const savedItems = (data.bookmarks[me.id] ?? []).map((id) => videos.find((v) => v.video.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const prog = data.progress[me.id] ?? {};
  const courses = localCourses(data.courses, data.videos, lang);
  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name[lang] ?? '';
  const word = lang === 'es' ? 'ELIMINAR' : 'DELETE';

  const saveProfile = async () => {
    try { await db.updateProfile(me.id, { firstName: name.trim(), belt, interests: ints, lang: prefLang }); }
    catch { toast(t('auth.errors.generic')); return; }
    toast(t('common.saved'));
    if (prefLang !== lang) { rememberLang(prefLang); navigate(lp(prefLang, '/account'), { replace: true }); }
  };

  const openPortal = async () => {
    const r = await payments.openPortal(me.id);
    if (r.kind === 'redirect') window.location.href = r.url; else setPortal(true);
  };

  return (
    <div className="wrap max-w-3xl space-y-10 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(40px,9vw,64px)] font-extrabold">{t('account.title')}</h1>
          <p className="text-sm text-muted">{me.email}</p>
        </div>
        <button className="btn-ghost" onClick={async () => { await auth.signOut(); navigate(lp(lang, '')); }}>{t('account.logout')}</button>
      </div>

      <section id="subscription" className="card scroll-mt-24 p-5">
        <h2 className="text-2xl font-bold">{t('account.subscription')}</h2>
        <p className="mt-2"><StatusLine me={me} /></p>
        <div className="mt-4 flex flex-wrap gap-2">
          {me.subscription.tier ? <button className="btn-gold" onClick={openPortal}>{t('account.manage')}</button>
            : me.role !== 'admin' && <Link className="btn-gold" to={lp(lang, '/membership')}>{t('account.choose')}</Link>}
          {me.subscription.status === 'paused' && <span className="self-center text-sm text-error">{t('auth.paused')}</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t('account.profile')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('onboarding.firstName')}>{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label={t('lang.label')}>{(id) => (
            <select id={id} className="input" value={prefLang} onChange={(e) => setPrefLang(e.target.value as Lang)}>
              <option value="en">English</option><option value="es">Español</option>
            </select>
          )}</Field>
          <Field label={t('onboarding.belt')}>{(id) => (
            <select id={id} className="input" value={belt} onChange={(e) => setBelt(e.target.value as Belt)}>
              {BELTS.map((b) => <option key={b} value={b}>{t(`belts.${b}`)}</option>)}
            </select>
          )}</Field>
        </div>
        <fieldset className="mt-4">
          <legend className="label">{t('onboarding.interests')}</legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button key={i} type="button" className="chip" aria-pressed={ints.includes(i)} onClick={() => setInts((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}>{t(`interests.${i}`)}</button>
            ))}
          </div>
        </fieldset>
        <button className="btn-gold mt-5" onClick={saveProfile}>{t('account.saveProfile')}</button>
      </section>

      {access && (
        <>
          <section>
            <h2 className="mb-4 text-2xl font-bold">{t('account.progress')}</h2>
            <ul className="space-y-3">
              {courses.map(({ course, c, lessons }) => {
                const done = lessons.filter((l) => prog[l.video.id]?.completed).length;
                return (
                  <li key={course.id}>
                    <Link to={lp(lang, `/courses/${course.id}`)} className="flex items-center justify-between gap-3 text-sm hover:text-gold">
                      <span>{c.title}</span><span className="tabular-nums text-muted">{done}/{lessons.length}</span>
                    </Link>
                    <div className="mt-1.5 h-1 bg-surface-2"><div className="h-full bg-gold" style={{ width: `${(done / lessons.length) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h2 className="mb-4 text-2xl font-bold">{t('account.savedVideos')}</h2>
            {savedItems.length ? (
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {savedItems.map((it) => <VideoCard key={it.video.id} item={it} categoryName={catName(it.video.categoryId)} progress={prog[it.video.id]} />)}
              </div>
            ) : <Empty>{t('dashboard.emptySaved')}</Empty>}
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-bold">{t('account.requests')}</h2>
            <Link className="text-gold" to={lp(lang, '/ask?tab=mine')}>{t('ask.tabs.mine')} →</Link>
          </section>
        </>
      )}

      <section className="border-t border-line pt-8">
        <h2 className="mb-3 text-2xl font-bold">{t('account.data')}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => toast(t('account.exportSent'))}>{t('account.export')}</button>
          <button className="btn-danger" onClick={() => { setDelText(''); setDel(true); }}>{t('account.deleteAccount')}</button>
        </div>
      </section>

      <DemoPortal me={me} open={portal} onClose={() => setPortal(false)} />
      <Modal open={del} onClose={() => setDel(false)} title={t('account.deleteAccount')}>
        <p className="text-sm text-muted">{t('account.deleteBody')}</p>
        <div className="mt-4">
          <Field label={t('account.deleteConfirm')}>{(id) => <input id={id} className="input" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" />}</Field>
        </div>
        <button className="btn-danger mt-4 w-full" disabled={delText.trim().toUpperCase() !== word || (access && !me.subscription.cancelAtPeriodEnd && me.role !== 'admin')}
          onClick={async () => {
            try { await db.deleteAccount(me.id); } catch { toast(t('auth.errors.generic')); return; }
            setDel(false); navigate(lp(lang, ''));
          }}>
          {t('account.deleteButton')}
        </button>
      </Modal>
    </div>
  );
}
