import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, video as videoService } from '../../adapters';
import { newId } from '../../demo/store';
import { useLang } from '../../lib/content';
import { clock } from '../../lib/format';
import { Icon } from '../../components/Icon';
import { DemoTag, Field, Modal, Thumb, useToast } from '../../components/ui';
import { CONTENT_TYPES, LANGS, LEVELS, type Course, type CourseVersion, type Lang, type Video, type VideoVersion } from '../../types';

const blankVersion = (): VideoVersion => ({ title: '', description: '', durationSec: 180, assetId: null });

function FileField({ label, accept, onFile, chosen }: { label: string; accept: string; onFile: (f: File) => void; chosen?: string | null }) {
  const { t } = useTranslation();
  return (
    <Field label={label} hint={chosen ? t('admin.videos.chosen', { name: chosen }) : undefined}>
      {(id) => <input id={id} type="file" accept={accept} className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-[4px] file:border-0 file:bg-surface-2 file:px-4 file:text-fg"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />}
    </Field>
  );
}

function VideoEditor({ initial, onClose }: { initial: Video; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const toast = useToast();
  const [v, setV] = useState<Video>(initial);
  const [ver, setVer] = useState<Record<Lang, VideoVersion>>({
    en: initial.versions.en ?? blankVersion(), es: initial.versions.es ?? blankVersion(),
  });
  const [files, setFiles] = useState<Record<Lang, string | null>>({ en: null, es: null });
  const setLangField = (l: Lang, k: keyof VideoVersion, val: string) => setVer((s) => ({ ...s, [l]: { ...s[l], [k]: val } }));
  const save = async () => {
    const versions: Video['versions'] = {};
    for (const l of LANGS) if (ver[l].title.trim()) versions[l] = { ...ver[l], title: ver[l].title.trim(), description: ver[l].description.trim() };
    await db.saveVideo({ ...v, versions });
    toast(t('common.saved'));
    onClose();
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('admin.videos.category')}>{(id) => (
          <select id={id} className="input" value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })}>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
          </select>)}</Field>
        <Field label={t('admin.videos.level')}>{(id) => (
          <select id={id} className="input" value={v.level} onChange={(e) => setV({ ...v, level: e.target.value as Video['level'] })}>
            {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
          </select>)}</Field>
        <Field label={t('admin.videos.type')}>{(id) => (
          <select id={id} className="input" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as Video['type'] })}>
            {CONTENT_TYPES.map((c) => <option key={c} value={c}>{t(`types.${c}`)}</option>)}
          </select>)}</Field>
      </div>
      <FileField label={t('admin.videos.thumbnail')} accept="image/*" chosen={v.thumbnailName} onFile={(f) => setV({ ...v, thumbnailName: f.name })} />
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#F2B90F]" checked={v.status === 'published'} onChange={(e) => setV({ ...v, status: e.target.checked ? 'published' : 'draft' })} />{t('admin.videos.published')}</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#F2B90F]" checked={v.featured} onChange={(e) => setV({ ...v, featured: e.target.checked })} />{t('admin.videos.featured')}</label>
      </div>
      {LANGS.map((l) => (
        <fieldset key={l} className="space-y-3 rounded-[6px] border border-line p-4">
          <legend className="px-1 font-display text-lg font-bold uppercase">{l === 'en' ? t('admin.videos.versionEn') : t('admin.videos.versionEs')}</legend>
          {!ver[l].title.trim() && <p className="text-sm text-gold">{t('admin.videos.missing', { lang: t(`lang.${l}`) })}</p>}
          <Field label={t('admin.videos.titleField')}>{(id) => <input id={id} lang={l} className="input" value={ver[l].title} onChange={(e) => setLangField(l, 'title', e.target.value)} />}</Field>
          <Field label={t('admin.videos.description')}>{(id) => <textarea id={id} lang={l} className="input" rows={3} value={ver[l].description} onChange={(e) => setLangField(l, 'description', e.target.value)} />}</Field>
          <FileField label={t('admin.videos.file')} accept="video/*" chosen={files[l]} onFile={async (f) => {
            setFiles((s) => ({ ...s, [l]: f.name }));
            const r = await videoService.upload(f);
            setVer((s) => ({ ...s, [l]: { ...s[l], assetId: r.assetId } }));
          }} />
          <p className="hint">{t('admin.videos.durationAuto')} {ver[l].title && `(${clock(ver[l].durationSec)})`}</p>
        </fieldset>
      ))}
      {videoService.mode === 'demo' && <p className="flex items-center gap-2 text-sm text-muted"><DemoTag />{t('admin.videos.fileDemo')}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn-gold" onClick={save}>{t('common.save')}</button>
      </div>
    </div>
  );
}

export function AdminVideos() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Video | null>(null);
  const [confirmDel, setConfirmDel] = useState<Video | null>(null);
  const title = (v: Video) => v.versions[lang]?.title ?? v.versions.en?.title ?? v.versions.es?.title ?? t('admin.videos.untitled');
  const list = data.videos.filter((v) => !q || `${v.versions.en?.title} ${v.versions.es?.title}`.toLowerCase().includes(q.toLowerCase()));
  const fresh = (): Video => ({ id: newId('v'), categoryId: data.categories[0]?.id ?? '', level: 'beginner', type: 'technique', status: 'draft', featured: false, createdAt: new Date().toISOString(), thumbHue: Math.floor(Math.random() * 360), versions: {}, isDemo: true });
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs flex-1" type="search" placeholder={t('admin.videos.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-gold" onClick={() => setEditing(fresh())}><Icon name="plus" size={18} />{t('admin.videos.new')}</button>
      </div>
      <ul className="divide-y divide-line rounded-[6px] border border-line">
        {list.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 p-3">
            <Thumb hue={v.thumbHue} className="w-24 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{title(v)}</p>
              <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                {LANGS.map((l) => <span key={l} className={`tag ${v.versions[l] ? '' : '!text-error line-through'}`}>{l.toUpperCase()}</span>)}
                <span className={`tag ${v.status === 'published' ? '!text-gold' : ''}`}>{t(`admin.videos.${v.status}`)}</span>
                {v.featured && <span className="tag !text-gold">★ {t('admin.videos.featured')}</span>}
              </p>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost !min-h-9 !px-3" onClick={() => db.saveVideo({ ...v, status: v.status === 'published' ? 'draft' : 'published' })}>
                {v.status === 'published' ? t('admin.videos.unpublish') : t('admin.videos.publish')}
              </button>
              <button className="btn-ghost !min-h-9 !px-3" onClick={() => setEditing(v)}>{t('common.edit')}</button>
              <button className="btn-quiet !min-h-9 !px-2" aria-label={t('common.delete')} onClick={() => setConfirmDel(v)}><Icon name="trash" size={18} /></button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!editing} wide onClose={() => setEditing(null)} title={editing && data.videos.some((x) => x.id === editing.id) ? t('admin.videos.edit') : t('admin.videos.new')}>
        {editing && <VideoEditor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={t('common.delete')}>
        {confirmDel && (
          <>
            <p>{t('admin.videos.deleteConfirm', { title: title(confirmDel) })}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={async () => { await db.deleteVideo(confirmDel.id); setConfirmDel(null); }}>{t('common.delete')}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function LessonList({ l, ids, onChange }: { l: Lang; ids: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const data = db.useData();
  const [drag, setDrag] = useState<number | null>(null);
  const withLang = data.videos.filter((v) => v.versions[l]);
  const name = (id: string) => data.videos.find((v) => v.id === id)?.versions[l]?.title ?? id;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <div>
      {ids.length === 0 ? <p className="text-sm text-muted">{t('admin.courses.noLessons')}</p> : (
        <ol className="space-y-1.5">
          {ids.map((id, i) => (
            <li key={id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
              className={`flex items-center gap-2 rounded-[4px] border bg-surface-2 px-2 py-1.5 text-sm ${drag === i ? 'border-gold' : 'border-line'}`}>
              <Icon name="grip" className="cursor-grab text-muted" strokeWidth={3} />
              <span className="w-5 text-right tabular-nums text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{name(id)}</span>
              <button className="btn-quiet !min-h-8 !px-1.5" aria-label={t('common.moveUp')} onClick={() => move(i, i - 1)}><Icon name="up" size={16} /></button>
              <button className="btn-quiet !min-h-8 !px-1.5" aria-label={t('common.moveDown')} onClick={() => move(i, i + 1)}><Icon name="down" size={16} /></button>
              <button className="btn-quiet !min-h-8 !px-1.5" aria-label={t('common.remove')} onClick={() => onChange(ids.filter((x) => x !== id))}><Icon name="close" size={16} /></button>
            </li>
          ))}
        </ol>
      )}
      <select className="input mt-2" value="" onChange={(e) => { if (e.target.value) onChange([...ids, e.target.value]); }}>
        <option value="">+ {t('admin.courses.addLesson')}</option>
        {withLang.filter((v) => !ids.includes(v.id)).map((v) => <option key={v.id} value={v.id}>{v.versions[l]!.title}</option>)}
      </select>
      <p className="hint">{t('admin.courses.onlyWithLang', { lang: t(`lang.${l}`) })} {t('admin.courses.dragHint')}</p>
    </div>
  );
}

function CourseEditor({ initial, onClose }: { initial: Course; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [c, setC] = useState<Course>(initial);
  const [ver, setVer] = useState<Record<Lang, CourseVersion>>({
    en: initial.versions.en ?? { title: '', description: '', lessonIds: [] },
    es: initial.versions.es ?? { title: '', description: '', lessonIds: [] },
  });
  const setL = (l: Lang, patch: Partial<CourseVersion>) => setVer((s) => ({ ...s, [l]: { ...s[l], ...patch } }));
  const save = async () => {
    const versions: Course['versions'] = {};
    for (const l of LANGS) if (ver[l].title.trim()) versions[l] = { ...ver[l], title: ver[l].title.trim() };
    await db.saveCourse({ ...c, versions });
    toast(t('common.saved'));
    onClose();
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Field label={t('admin.videos.level')}>{(id) => (
          <select id={id} className="input" value={c.level} onChange={(e) => setC({ ...c, level: e.target.value as Course['level'] })}>
            {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
          </select>)}</Field>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#F2B90F]" checked={c.status === 'published'} onChange={(e) => setC({ ...c, status: e.target.checked ? 'published' : 'draft' })} />{t('admin.videos.published')}</label>
      </div>
      {LANGS.map((l) => (
        <fieldset key={l} className="space-y-3 rounded-[6px] border border-line p-4">
          <legend className="px-1 font-display text-lg font-bold uppercase">{l === 'en' ? t('admin.courses.lessonsEn') : t('admin.courses.lessonsEs')}</legend>
          <Field label={t('admin.videos.titleField')}>{(id) => <input id={id} lang={l} className="input" value={ver[l].title} onChange={(e) => setL(l, { title: e.target.value })} />}</Field>
          <Field label={t('admin.videos.description')}>{(id) => <textarea id={id} lang={l} className="input" rows={2} value={ver[l].description} onChange={(e) => setL(l, { description: e.target.value })} />}</Field>
          <LessonList l={l} ids={ver[l].lessonIds} onChange={(lessonIds) => setL(l, { lessonIds })} />
        </fieldset>
      ))}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn-gold" onClick={save}>{t('common.save')}</button>
      </div>
    </div>
  );
}

export function AdminCourses() {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const [editing, setEditing] = useState<Course | null>(null);
  const [confirmDel, setConfirmDel] = useState<Course | null>(null);
  const title = (c: Course) => c.versions[lang]?.title ?? c.versions.en?.title ?? c.versions.es?.title ?? '';
  return (
    <div>
      <button className="btn-gold mb-4" onClick={() => setEditing({ id: newId('c'), level: 'beginner', status: 'draft', coverHue: Math.floor(Math.random() * 360), versions: {}, isDemo: true })}>
        <Icon name="plus" size={18} />{t('admin.courses.new')}
      </button>
      <ul className="divide-y divide-line rounded-[6px] border border-line">
        {data.courses.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
            <Thumb hue={c.coverHue} className="w-24 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{title(c)}</p>
              <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                {LANGS.map((l) => <span key={l} className={`tag ${c.versions[l] ? '' : '!text-error line-through'}`}>{l.toUpperCase()} {c.versions[l]?.lessonIds.length ?? 0}</span>)}
                <span className={`tag ${c.status === 'published' ? '!text-gold' : ''}`}>{t(`admin.videos.${c.status}`)}</span>
              </p>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost !min-h-9 !px-3" onClick={() => setEditing(c)}>{t('common.edit')}</button>
              <button className="btn-quiet !min-h-9 !px-2" aria-label={t('common.delete')} onClick={() => setConfirmDel(c)}><Icon name="trash" size={18} /></button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!editing} wide onClose={() => setEditing(null)} title={editing && data.courses.some((x) => x.id === editing.id) ? t('admin.courses.edit') : t('admin.courses.new')}>
        {editing && <CourseEditor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={t('common.delete')}>
        {confirmDel && (
          <>
            <p>{t('admin.courses.deleteConfirm', { title: title(confirmDel) })}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={async () => { await db.deleteCourse(confirmDel.id); setConfirmDel(null); }}>{t('common.delete')}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
