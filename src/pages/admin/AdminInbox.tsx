import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../adapters';
import { useLang } from '../../lib/content';
import { longDate } from '../../lib/format';
import { Empty, Field, useToast } from '../../components/ui';
import { StatusPill } from '../Ask';
import { LANGS, REQUEST_STATUSES, REQUEST_TYPES, TIERS, type AskRequest, type RequestReply } from '../../types';

function ReplyBox({ r }: { r: AskRequest }) {
  const { t } = useTranslation();
  const toast = useToast();
  const data = db.useData();
  const [kind, setKind] = useState<RequestReply['kind']>('text');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [lessonId, setLessonId] = useState('');
  const lessons = data.videos.filter((v) => v.versions[r.lang] && v.status === 'published');
  const ok = kind === 'text' ? !!body.trim() : kind === 'video' ? /^https?:\/\/\S+/.test(link.trim()) : !!lessonId;
  const send = async () => {
    await db.replyToRequest(r.id, { kind, body: body.trim(), link: kind === 'video' ? link.trim() : undefined, lessonId: kind === 'lesson' ? lessonId : undefined });
    toast(t('admin.inbox.replied'));
    setBody(''); setLink(''); setLessonId('');
  };
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <p className="text-sm text-gold">{t('admin.inbox.answerIn', { lang: t(`lang.${r.lang}`) })}</p>
      <div role="radiogroup" aria-label={t('admin.inbox.replyAs')} className="flex flex-wrap gap-2">
        {(['text', 'video', 'lesson'] as const).map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{t(`admin.inbox.kinds.${k}`)}</button>)}
      </div>
      {kind === 'video' && <Field label={t('admin.inbox.videoLink')}>{(id) => <input id={id} className="input" type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />}</Field>}
      {kind === 'lesson' && <Field label={t('admin.inbox.chooseLesson')}>{(id) => (
        <select id={id} className="input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
          <option value="">—</option>
          {lessons.map((v) => <option key={v.id} value={v.id}>{v.versions[r.lang]!.title}</option>)}
        </select>)}</Field>}
      <Field label={t('admin.inbox.kinds.text')} optional={kind !== 'text'}>{(id) => <textarea id={id} lang={r.lang} className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />}</Field>
      <div className="flex flex-wrap gap-2">
        <button className="btn-gold" disabled={!ok} onClick={send}>{t('admin.inbox.sendReply')}</button>
        {r.status === 'new' && <button className="btn-ghost" onClick={() => db.setRequestStatus(r.id, 'in_progress')}>{t('admin.inbox.inProgress')}</button>}
        {r.status !== 'declined' && r.status !== 'answered' && <button className="btn-danger" onClick={() => db.setRequestStatus(r.id, 'declined')}>{t('admin.inbox.decline')}</button>}
      </div>
    </div>
  );
}

export function AdminInbox() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const [f, setF] = useState({ type: '', lang: '', status: '', privacy: '', tier: '' });
  const [open, setOpen] = useState<string | null>(null);
  const member = (id: string) => data.members.find((m) => m.id === id);
  const list = data.requests.filter((r) => (!f.type || r.type === f.type) && (!f.lang || r.lang === f.lang) && (!f.status || r.status === f.status)
    && (!f.privacy || r.privacy === f.privacy) && (!f.tier || member(r.memberId)?.subscription.tier === f.tier));
  const sel = (key: keyof typeof f, options: [string, string][]) => (
    <label className="min-w-0"><span className="label">{t(`admin.inbox.${key}`)}</span>
      <select className="input" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}>
        <option value="">{t('common.all')}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {sel('type', REQUEST_TYPES.map((x) => [x, (t(`ask.types.${x}`, { returnObjects: true }) as unknown as string[])[0]]))}
        {sel('lang', LANGS.map((x) => [x, t(`lang.${x}`)]))}
        {sel('status', REQUEST_STATUSES.map((x) => [x, t(`ask.status.${x}`)]))}
        {sel('privacy', [['private', t('ask.private')], ['public', t('ask.public')]])}
        {sel('tier', TIERS.map((x) => [x, t(`tiers.${x}.name`)]))}
      </div>
      {list.length === 0 ? <Empty>{t('admin.inbox.empty')}</Empty> : (
        <ul className="space-y-3">
          {list.map((r) => {
            const m = member(r.memberId);
            const v = r.videoId ? data.videos.find((x) => x.id === r.videoId) : null;
            const isOpen = open === r.id;
            return (
              <li key={r.id} className={`card p-4 ${r.status === 'new' ? 'border-gold/40' : ''}`}>
                <button className="w-full text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusPill status={r.status} />
                    <span>{(t(`ask.types.${r.type}`, { returnObjects: true }) as unknown as string[])[0]}</span>
                    <span>· {r.lang.toUpperCase()}</span>
                    <span>· {t(`ask.${r.privacy}`)}</span>
                    {m?.subscription.tier && <span>· {t(`tiers.${m.subscription.tier}.name`)}</span>}
                    {r.paidOneOff && <span className="tag !text-gold">{t('admin.inbox.oneOff')}</span>}
                    <span className="ml-auto">{longDate(r.createdAt, lang)}</span>
                  </div>
                  <p className="mt-2 font-semibold">{r.subject}</p>
                  <p className="text-sm text-muted">{t('admin.inbox.from')}: {m?.firstName || m?.email}</p>
                </button>
                {isOpen && (
                  <div className="mt-3">
                    <p lang={r.lang} className="whitespace-pre-line">{r.body}</p>
                    <dl className="mt-3 grid gap-1 text-sm">
                      {r.link && <div><dt className="inline text-muted">{t('admin.inbox.footage')}: </dt><dd className="inline"><a className="text-gold underline" href={r.link} target="_blank" rel="noreferrer">{r.link}</a></dd></div>}
                      {r.preferredTime && <div><dt className="inline text-muted">{t('admin.inbox.preferred')}: </dt><dd className="inline">{r.preferredTime}</dd></div>}
                      {v && <div><dt className="inline text-muted">{t('admin.inbox.linked')}: </dt><dd className="inline">{v.versions[r.lang]?.title ?? v.versions.en?.title}</dd></div>}
                    </dl>
                    {r.replies.map((rp) => (
                      <div key={rp.id} className="mt-3 border-l-2 border-gold pl-3 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gold">{t(`admin.inbox.kinds.${rp.kind}`)} · {longDate(rp.createdAt, lang)}</p>
                        <p className="mt-1">{rp.body || rp.link}</p>
                      </div>
                    ))}
                    {r.privacy === 'public' && r.status === 'answered' && (
                      <button className="btn-ghost mt-3 !min-h-10" onClick={() => db.setPublicApproved(r.id, !r.publicApproved)}>
                        {r.publicApproved ? t('admin.inbox.unapprove') : t('admin.inbox.approve')}
                      </button>
                    )}
                    {r.status !== 'declined' && <ReplyBox r={r} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
