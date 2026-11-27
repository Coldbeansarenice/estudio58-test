import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { db, payments } from '../adapters';
import { allowance } from '../lib/access';
import { localVideo, lp, useLang } from '../lib/content';
import { longDate, money, shortDate } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { Icon } from '../components/Icon';
import { Empty, Field, usePageMeta, useToast } from '../components/ui';
import { REQUEST_TYPES, type AskRequest, type Member, type RequestType } from '../types';

export function StatusPill({ status }: { status: AskRequest['status'] }) {
  const { t } = useTranslation();
  const cls = status === 'answered' ? 'bg-gold text-ink' : status === 'declined' ? 'border border-error/60 text-error' : status === 'in_progress' ? 'border border-gold/60 text-gold' : 'border border-line text-muted';
  return <span className={`inline-flex rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>{t(`ask.status.${status}`)}</span>;
}

function Replies({ r }: { r: AskRequest }) {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  if (!r.replies.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {r.replies.map((rp) => {
        const lesson = rp.lessonId ? localVideo(data.videos.find((v) => v.id === rp.lessonId), lang) : null;
        return (
          <div key={rp.id} className="border-l-2 border-gold pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">{t('ask.jeanReplied')} · {shortDate(rp.createdAt, lang)}</p>
            {rp.body && <p className="mt-1 whitespace-pre-line">{rp.body}</p>}
            {rp.kind === 'video' && rp.link && <a className="btn-ghost mt-2 !min-h-10" href={rp.link} target="_blank" rel="noreferrer"><Icon name="play" size={14} />{t('ask.openVideoReply')}</a>}
            {rp.kind === 'lesson' && lesson && <Link className="btn-ghost mt-2 !min-h-10" to={lp(lang, `/video/${lesson.video.id}`)}><Icon name="play" size={14} />{t('ask.watchLesson')}: {lesson.v.title}</Link>}
          </div>
        );
      })}
    </div>
  );
}

function NewRequest({ me }: { me: Member }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { query, navigate } = useRouter();
  const toast = useToast();
  const data = db.useData();
  const s = data.settings;
  const [type, setType] = useState<RequestType>('question');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [time, setTime] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
  const [videoId, setVideoId] = useState<string | null>(query.get('video'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const linked = videoId ? localVideo(data.videos.find((v) => v.id === videoId), lang) : null;

  const a = allowance(me, type, data.requests, s);
  const oneOff = !a.allowed && a.oneOffAvailable;
  const blocked = !a.allowed && !oneOff;
  const canChoosePrivacy = type === 'question' || type === 'review';

  const status = () => {
    if (type === 'private' || a.limit === null) return null;
    if (a.limit === 0) return oneOff ? t('ask.oneOff', { price: money(s.prices.oneOffQuestion, lang) }) : t('ask.notIncluded');
    const date = a.resetsAt ? longDate(a.resetsAt, lang) : '';
    if (type === 'call') return a.allowed ? t('ask.leftWeek', { left: a.remaining, limit: a.limit, date }) : t('ask.reachedWeek', { date });
    return a.allowed ? t('ask.left', { left: a.remaining, limit: a.limit, date }) : t('ask.reached', { limit: a.limit, date });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!subject.trim()) errs.subject = t('auth.errors.required');
    if (!body.trim()) errs.body = t('auth.errors.required');
    if (type === 'review' && !/^https:\/\/\S+\.\S+/.test(link.trim())) errs.link = t('ask.linkInvalid');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (oneOff) {
      const pay = await payments.payOneOffQuestion(me.id);
      if (pay.kind === 'redirect') { window.location.href = pay.url; return; }
    }
    const res = await db.createRequest({
      memberId: me.id, type, lang, privacy: canChoosePrivacy ? privacy : 'private', subject: subject.trim(), body: body.trim(),
      link: type === 'review' ? link.trim() : undefined, preferredTime: type === 'call' ? time.trim() : undefined,
      videoId: linked ? linked.video.id : undefined, paidOneOff: oneOff || undefined,
    });
    if (!res.ok) { toast(t(`ask.errors.${res.error}`)); return; }
    toast(t('ask.sent'));
    setSubject(''); setBody(''); setLink(''); setTime(''); setVideoId(null);
    navigate(lp(lang, '/ask?tab=mine'), { replace: true });
  };

  const st = status();
  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="label">{t('ask.typeLabel')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REQUEST_TYPES.map((rt) => {
            const [title, desc] = t(`ask.types.${rt}`, { returnObjects: true }) as unknown as [string, string];
            const on = rt === type;
            return (
              <label key={rt} className={`flex cursor-pointer gap-3 rounded-[6px] border p-3.5 ${on ? 'border-gold bg-gold/[0.06]' : 'border-line bg-surface hover:border-muted'}`}>
                <input type="radio" name="type" className="mt-1 h-4 w-4 accent-[#F2B90F]" checked={on} onChange={() => setType(rt)} />
                <span><span className="block font-semibold">{title}</span><span className="block text-sm text-muted">{desc}</span></span>
              </label>
            );
          })}
        </div>
        {st && <p className={`mt-3 text-sm ${blocked ? 'text-error' : 'text-muted'}`}>{st}</p>}
        {blocked && <Link to={lp(lang, '/membership')} className="btn-ghost mt-3 !min-h-10">{t('ask.upgrade')}</Link>}
      </fieldset>

      {!blocked && (
        <>
          {linked && (
            <div className="flex items-center justify-between gap-3 rounded-[4px] border border-line bg-surface-2 px-3 py-2 text-sm">
              <span>{t('ask.about', { title: linked.v.title })}</span>
              <button type="button" className="text-muted hover:text-fg" onClick={() => setVideoId(null)}>{t('ask.removeAbout')}</button>
            </div>
          )}
          <Field label={t('ask.subject')} error={errors.subject}>{(id) => <input id={id} className="input" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} />}</Field>
          {type === 'review' && (
            <Field label={t('ask.link')} hint={t('ask.linkHint')} error={errors.link}>{(id) => <input id={id} className="input" type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />}</Field>
          )}
          {type === 'call' && (
            <Field label={t('ask.preferredTime')} hint={t('ask.callNote')} optional>{(id) => <input id={id} className="input" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
          )}
          <Field label={type === 'question' ? t('ask.bodyQuestion') : t('ask.body')} error={errors.body} hint={type === 'private' ? t('ask.privateNote') : undefined}>
            {(id) => <textarea id={id} className="input" rows={5} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} />}
          </Field>
          {canChoosePrivacy && (
            <fieldset>
              <legend className="label">{t('ask.privacy')}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['private', 'public'] as const).map((p) => (
                  <label key={p} className={`flex cursor-pointer gap-3 rounded-[6px] border p-3 ${privacy === p ? 'border-gold' : 'border-line'}`}>
                    <input type="radio" name="privacy" className="mt-1 h-4 w-4 accent-[#F2B90F]" checked={privacy === p} onChange={() => setPrivacy(p)} />
                    <span><span className="block font-semibold">{t(`ask.${p}`)}</span><span className="block text-sm text-muted">{t(`ask.${p}Desc`)}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {type === 'review' && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {(t('membership.fine', { returnObjects: true }) as unknown as string[]).map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
          <div>
            <button className="btn-gold w-full sm:w-auto">{oneOff ? t('ask.oneOffPay', { price: money(s.prices.oneOffQuestion, lang) }) : t('ask.send')}</button>
            {oneOff && payments.mode === 'demo' && <p className="hint">{t('ask.demoPay')}</p>}
          </div>
        </>
      )}
    </form>
  );
}

export function AskPage({ me }: { me: Member }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { query, navigate } = useRouter();
  usePageMeta('meta.member', { index: false, title: t('ask.title') });
  const data = db.useData();
  const tab = (['new', 'mine', 'public'].includes(query.get('tab') ?? '') ? query.get('tab') : 'new') as 'new' | 'mine' | 'public';
  const mine = data.requests.filter((r) => r.memberId === me.id);
  const pub = data.requests.filter((r) => r.privacy === 'public' && r.publicApproved && r.lang === lang && r.status === 'answered');
  const setTab = (x: string) => {
    const q = new URLSearchParams(query);
    q.set('tab', x);
    navigate(lp(lang, `/ask?${q.toString()}`), { replace: true });
  };
  return (
    <div className="wrap max-w-3xl py-8">
      <h1 className="text-[clamp(40px,9vw,64px)] font-extrabold">{t('ask.title')}</h1>
      <p className="mt-1 text-muted">{t('ask.intro')}</p>
      <p className={`mt-4 flex items-start gap-2 rounded-[4px] border p-3 text-sm ${data.settings.travelMode ? 'border-gold/50 text-gold' : 'border-line text-muted'}`}>
        <Icon name={data.settings.travelMode ? 'plane' : 'info'} size={18} className="mt-0.5 shrink-0" />
        {data.settings.travelMode ? t('ask.travel') : t('ask.async')}
      </p>
      <div role="tablist" className="mt-6 flex gap-1 border-b border-line">
        {(['new', 'mine', 'public'] as const).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)}
            className={`-mb-px min-h-11 border-b-2 px-3 text-sm font-semibold ${tab === x ? 'border-gold text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
            {t(`ask.tabs.${x}`)}{x === 'mine' && mine.length > 0 && <span className="ml-1.5 text-muted">{mine.length}</span>}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {tab === 'new' && <NewRequest me={me} />}
        {tab === 'mine' && (mine.length === 0 ? <Empty>{t('ask.emptyMine')}</Empty> : (
          <ul className="space-y-3">
            {mine.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusPill status={r.status} />
                  <span>{(t(`ask.types.${r.type}`, { returnObjects: true }) as unknown as string[])[0]}</span>
                  <span>· {shortDate(r.createdAt, lang)}</span>
                  <span>· {t(`ask.${r.privacy}`)}</span>
                  {r.privacy === 'public' && !r.publicApproved && <span>· {t('ask.publicPending')}</span>}
                </div>
                <p className="mt-2 font-semibold">{r.subject}</p>
                <p className="mt-1 text-sm text-muted">{r.body}</p>
                <Replies r={r} />
              </li>
            ))}
          </ul>
        ))}
        {tab === 'public' && (pub.length === 0 ? <Empty>{t('ask.emptyPublic')}</Empty> : (
          <ul className="space-y-3">
            {pub.map((r) => (
              <li key={r.id} className="card p-4">
                <p className="font-semibold">{r.subject}</p>
                <p className="mt-1 text-sm text-muted">{r.body}</p>
                <Replies r={r} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
