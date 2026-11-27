import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, video as videoService } from '../adapters';
import type { Playback } from '../adapters/video';
import { beltToLevel } from '../lib/access';
import { localCourses, localVideo, localVideos, lp, useLang, type LocalVideo } from '../lib/content';
import { clock, longDate, totalTime } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { Icon } from '../components/Icon';
import { BookmarkButton, Empty, SectionHead, Thumb, VideoCard, usePageMeta } from '../components/ui';
import { CONTENT_TYPES, LEVELS, type Member } from '../types';

function useMemberBits(me: Member) {
  const data = db.useData();
  const lang = useLang();
  const videos = useMemo(() => localVideos(data.videos, lang), [data.videos, lang]);
  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name[lang] ?? '';
  const progress = data.progress[me.id] ?? {};
  const saved = data.bookmarks[me.id] ?? [];
  return { data, lang, videos, catName, progress, saved };
}

function Rail({ items, me }: { items: LocalVideo[]; me: Member }) {
  const { catName, progress } = useMemberBits(me);
  return (
    <div className="rail">
      {items.map((it) => <VideoCard key={it.video.id} item={it} wide categoryName={catName(it.video.categoryId)} progress={progress[it.video.id]} />)}
    </div>
  );
}

export function StatusLine({ me }: { me: Member }) {
  const { t } = useTranslation();
  const lang = useLang();
  const s = me.subscription;
  if (me.role === 'admin') return <span>{t('demo.admin')}</span>;
  if (!s.tier) return <span>{t('account.status.none')}</span>;
  return (
    <span>
      <b className="font-semibold">{t(`tiers.${s.tier}.name`)}</b>
      {' · '}
      {s.status === 'active' && s.periodEnd && (s.cancelAtPeriodEnd ? t('account.ends', { date: longDate(s.periodEnd, lang) }) : t('account.renews', { date: longDate(s.periodEnd, lang) }))}
      {s.status !== 'active' && t(`account.status.${s.status}`)}
      {s.pendingTier && s.periodEnd && <> · {t('account.pending', { tier: t(`tiers.${s.pendingTier}.name`), date: longDate(s.periodEnd, lang) })}</>}
    </span>
  );
}

export function DashboardPage({ me }: { me: Member }) {
  const { t } = useTranslation();
  usePageMeta('meta.member', { index: false });
  const { data, lang, videos, progress, saved } = useMemberBits(me);
  const byId = (id: string) => videos.find((v) => v.video.id === id);
  const cont = Object.entries(progress).filter(([, p]) => !p.completed).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
    .map(([id]) => byId(id)).filter((x): x is LocalVideo => !!x);
  const fresh = [...videos].sort((a, b) => b.video.createdAt.localeCompare(a.video.createdAt)).slice(0, 8);
  const featured = videos.filter((v) => v.video.featured);
  const level = beltToLevel(me.belt);
  const recommended = videos.filter((v) => v.video.level === level && !progress[v.video.id]?.completed).slice(0, 8);
  const savedItems = saved.map(byId).filter((x): x is LocalVideo => !!x);
  const cats = data.categories.filter((c) => videos.some((v) => v.video.categoryId === c.id));
  const answers = data.requests.filter((r) => r.memberId === me.id && r.status === 'answered').slice(0, 3);
  const ann = data.settings.announcement?.[lang];
  return (
    <div className="wrap space-y-10 py-8">
      <div>
        <h1 className="text-[clamp(36px,8vw,56px)] font-extrabold">{me.firstName ? t('dashboard.welcome', { name: me.firstName }) : t('dashboard.welcomeNoName')}</h1>
        <p className="mt-1 text-sm text-muted">{t('dashboard.status')}: <StatusLine me={me} /></p>
        {!me.emailVerified && <p className="mt-3 rounded-[4px] border border-line bg-surface p-3 text-sm">{t('account.verifyBanner')}</p>}
        {ann && <p className="mt-3 rounded-[4px] border border-gold/40 bg-gold/[0.07] p-3 text-sm">{ann}</p>}
        {data.settings.travelMode && <p className="mt-3 flex items-center gap-2 text-sm text-gold"><Icon name="plane" size={16} />{t('ask.travel')}</p>}
      </div>
      {cont.length > 0 && <section><SectionHead title={t('dashboard.continue')} /><Rail items={cont} me={me} /></section>}
      <section><SectionHead title={t('dashboard.new')} to={lp(lang, '/library')} /><Rail items={fresh} me={me} /></section>
      {featured.length > 0 && <section><SectionHead title={t('dashboard.featured')} /><Rail items={featured} me={me} /></section>}
      {recommended.length > 0 && <section><SectionHead title={t('dashboard.recommended')} to={lp(lang, `/library?level=${level}`)} /><Rail items={recommended} me={me} /></section>}
      <section>
        <SectionHead title={t('dashboard.browse')} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <Link key={c.id} to={lp(lang, `/library?cat=${c.id}`)} className="card flex min-h-16 items-center justify-between gap-2 px-4 py-3 font-display text-lg font-semibold uppercase leading-tight hover:border-gold/60">
              {c.name[lang]}<Icon name="chevronRight" size={18} className="shrink-0 text-gold" />
            </Link>
          ))}
        </div>
      </section>
      <section>
        <SectionHead title={t('dashboard.saved')} />
        {savedItems.length ? <Rail items={savedItems} me={me} /> : <Empty>{t('dashboard.emptySaved')}</Empty>}
      </section>
      <section>
        <SectionHead title={t('dashboard.answers')} to={lp(lang, '/ask?tab=mine')} />
        {answers.length ? (
          <ul className="grid gap-3 md:grid-cols-3">
            {answers.map((r) => (
              <li key={r.id} className="card p-4">
                <p className="text-xs text-muted">{t('ask.jeanReplied')} · {longDate(r.replies.at(-1)?.createdAt ?? r.createdAt, lang)}</p>
                <p className="mt-1 font-semibold">{r.subject}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted">{r.replies.at(-1)?.body}</p>
              </li>
            ))}
          </ul>
        ) : <Empty><Link className="text-gold" to={lp(lang, '/ask')}>{t('dashboard.emptyAnswers')}</Link></Empty>}
      </section>
    </div>
  );
}

type Dur = 'any' | 'short' | 'medium' | 'long';

export function LibraryPage({ me }: { me: Member }) {
  const { t } = useTranslation();
  usePageMeta('meta.member', { index: false, title: t('library.title') });
  const { data, lang, videos, catName, progress } = useMemberBits(me);
  const { query } = useRouter();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(query.get('cat') ?? '');
  const [level, setLevel] = useState(query.get('level') ?? '');
  const [type, setType] = useState('');
  const [dur, setDur] = useState<Dur>('any');
  const [sort, setSort] = useState<'recent' | 'featured'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => { setCat(query.get('cat') ?? ''); setLevel(query.get('level') ?? ''); }, [query.get('cat'), query.get('level')]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos
      .filter((x) => !cat || x.video.categoryId === cat)
      .filter((x) => !level || x.video.level === level)
      .filter((x) => !type || x.video.type === type)
      .filter((x) => dur === 'any' || (dur === 'short' ? x.v.durationSec < 180 : dur === 'medium' ? x.v.durationSec <= 300 && x.v.durationSec >= 180 : x.v.durationSec > 300))
      .filter((x) => !needle || `${x.v.title} ${x.v.description} ${catName(x.video.categoryId)}`.toLowerCase().includes(needle))
      .sort((a, b) => (sort === 'featured' ? Number(b.video.featured) - Number(a.video.featured) : 0) || b.video.createdAt.localeCompare(a.video.createdAt));
  }, [videos, q, cat, level, type, dur, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = data.categories.filter((c) => videos.some((v) => v.video.categoryId === c.id));
  const active = [cat, level, type, dur !== 'any' ? dur : ''].filter(Boolean).length;
  const clear = () => { setCat(''); setLevel(''); setType(''); setDur('any'); setQ(''); };

  return (
    <div className="wrap py-8">
      <h1 className="text-[clamp(40px,9vw,64px)] font-extrabold">{t('library.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('library.langNote')}</p>
      <div className="mt-5 flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t('library.search')}</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" type="search" placeholder={t('library.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn-ghost !px-3 sm:!px-5" aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>
          <Icon name="filter" size={18} /><span className="hidden sm:inline">{t('library.filters')}</span>{active > 0 && <span className="rounded-full bg-gold px-1.5 text-xs text-ink">{active}</span>}
        </button>
      </div>
      <div className="rail mt-3">
        <button className="chip" aria-pressed={!cat} onClick={() => setCat('')}>{t('common.all')}</button>
        {cats.map((c) => <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? '' : c.id)}>{c.name[lang]}</button>)}
      </div>
      {showFilters && (
        <div className="card mt-3 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="label">{t('library.level')}</span>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">{t('common.all')}</option>{LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
            </select></label>
          <label><span className="label">{t('library.type')}</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('common.all')}</option>{CONTENT_TYPES.map((c) => <option key={c} value={c}>{t(`types.${c}`)}</option>)}
            </select></label>
          <label><span className="label">{t('library.duration')}</span>
            <select className="input" value={dur} onChange={(e) => setDur(e.target.value as Dur)}>
              {(['any', 'short', 'medium', 'long'] as Dur[]).map((d) => <option key={d} value={d}>{t(`library.durations.${d}`)}</option>)}
            </select></label>
          <label><span className="label">{t('library.sort')}</span>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'featured')}>
              <option value="recent">{t('library.sorts.recent')}</option><option value="featured">{t('library.sorts.featured')}</option>
            </select></label>
        </div>
      )}
      <div className="mb-4 mt-5 flex items-center justify-between text-sm text-muted">
        <span>{t('library.results', { count: list.length })}</span>
        {(active > 0 || q) && <button className="btn-quiet !min-h-9" onClick={clear}>{t('common.clear')}</button>}
      </div>
      {list.length === 0 ? <Empty>{t('library.empty')}</Empty> : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((it) => <VideoCard key={it.video.id} item={it} categoryName={catName(it.video.categoryId)} progress={progress[it.video.id]} />)}
        </div>
      )}
    </div>
  );
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function Player({ me, item }: { me: Member; item: LocalVideo }) {
  const { t } = useTranslation();
  const lang = useLang();
  const data = db.useData();
  const saved = data.progress[me.id]?.[item.video.id];
  const dur = item.v.durationSec;
  const [pos, setPos] = useState(() => (saved && !saved.completed ? saved.positionSec : 0));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fs, setFs] = useState(false);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    let alive = true;
    void videoService.getPlayback(item.video.id, lang).then((p) => { if (alive) setPlayback(p); });
    return () => { alive = false; };
  }, [item.video.id, lang]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPos((p) => {
        const n = Math.min(dur, p + 0.25 * speed);
        if (n >= dur) { setPlaying(false); void db.saveProgress(me.id, item.video.id, dur, true); }
        return n;
      });
    }, 250);
    const save = window.setInterval(() => void db.saveProgress(me.id, item.video.id, posRef.current, false), 5000);
    return () => { window.clearInterval(id); window.clearInterval(save); };
  }, [playing, speed, dur, me.id, item.video.id]);

  useEffect(() => () => { if (posRef.current > 1) void db.saveProgress(me.id, item.video.id, posRef.current, false); }, [me.id, item.video.id]);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await box.current?.requestFullscreen();
    } catch { /* not allowed here (for example inside a preview frame) */ }
  };

  if (playback?.kind === 'signed') {
    return <video className="aspect-video w-full rounded-[6px] bg-black" src={playback.src} controls playsInline />;
  }

  return (
    <div ref={box} className={`relative overflow-hidden bg-black ${fs ? 'flex h-full flex-col justify-center' : 'rounded-[6px] border border-line'}`}>
      <button className="relative block w-full" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t('video.pause') : t('video.play')}>
        <Thumb hue={item.video.thumbHue} label={item.v.title} className="!rounded-none" />
        {!playing && <span className="absolute inset-0 grid place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-gold text-ink"><Icon name="play" size={28} /></span></span>}
        {playing && <span className="absolute left-3 top-3 rounded-[2px] bg-black/70 px-2 py-0.5 text-xs tabular-nums text-gold">▶ {speed}×</span>}
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface px-3 py-2">
        <button className="btn-quiet !min-h-10 !px-2" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t('video.pause') : t('video.play')}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <span className="text-xs tabular-nums text-muted">{clock(pos)} / {clock(dur)}</span>
        <input type="range" min={0} max={dur} step={1} value={pos} aria-label={t('video.seek')}
          onChange={(e) => setPos(Number(e.target.value))} className="order-last h-6 w-full accent-[#F2B90F] sm:order-none sm:w-auto sm:flex-1" />
        <label className="ml-auto flex items-center gap-1 text-xs text-muted sm:ml-0">
          <span className="sr-only">{t('video.speed')}</span>
          <select className="min-h-9 rounded-[3px] border border-line bg-surface-2 px-1.5 text-xs text-fg" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        <button className="btn-quiet !min-h-10 !px-2" onClick={toggleFs} aria-label={fs ? t('video.exitFullscreen') : t('video.fullscreen')}><Icon name="expand" /></button>
      </div>
      {!fs && <p className="border-t border-line bg-surface px-3 py-2 text-xs text-muted">{t('video.demoPlayer')}</p>}
    </div>
  );
}

export function VideoPage({ me, id }: { me: Member; id: string }) {
  const { t } = useTranslation();
  const { data, lang, videos, catName, progress, saved } = useMemberBits(me);
  const item = localVideo(data.videos.find((v) => v.id === id), lang, me.role === 'admin');
  usePageMeta('meta.member', { index: false, title: item?.v.title });
  if (!item) {
    return (
      <div className="wrap max-w-xl py-16 text-center">
        <h1 className="text-4xl font-extrabold">{t('video.notAvailable')}</h1>
        <p className="mt-2 text-muted">{t('video.notAvailableBody')}</p>
        <Link to={lp(lang, '/library')} className="btn-gold mt-6">{t('video.toLibrary')}</Link>
      </div>
    );
  }
  const p = progress[item.video.id];
  const course = localCourses(data.courses, data.videos, lang).find((c) => c.lessons.some((l) => l.video.id === item.video.id));
  const nextLesson = course ? course.lessons[course.lessons.findIndex((l) => l.video.id === item.video.id) + 1] : undefined;
  const related = videos.filter((v) => v.video.id !== item.video.id && v.video.categoryId === item.video.categoryId)
    .concat(videos.filter((v) => v.video.id !== item.video.id && v.video.categoryId !== item.video.categoryId && v.video.level === item.video.level))
    .slice(0, 6);
  return (
    <div className="wrap py-6 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Player key={`${item.video.id}-${lang}`} me={me} item={item} />
          {p && !p.completed && p.positionSec > 0 && <p className="mt-2 text-xs text-muted">{t('video.resume', { time: clock(p.positionSec) })}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="tag">{catName(item.video.categoryId)}</span>
            <span className="tag">{t(`levels.${item.video.level}`)}</span>
            <span className="tag">{t(`types.${item.video.type}`)}</span>
            <span className="tag tabular-nums">{t('common.min', { count: Math.round(item.v.durationSec / 60) })}</span>
          </div>
          <h1 className="mt-3 text-[clamp(30px,6vw,44px)] font-extrabold">{item.v.title}</h1>
          <p className="mt-2 max-w-2xl text-fg/85">{item.v.description}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button className={p?.completed ? 'btn-gold' : 'btn-ghost'} aria-pressed={!!p?.completed}
              onClick={() => db.saveProgress(me.id, item.video.id, item.v.durationSec, true)}>
              <Icon name="check" size={18} /> {p?.completed ? t('video.completed') : t('video.markComplete')}
            </button>
            <BookmarkButton memberId={me.id} videoId={item.video.id} saved={saved.includes(item.video.id)} />
            <Link to={lp(lang, `/ask?video=${item.video.id}`)} className="btn-ghost col-span-2"><Icon name="ask" size={18} />{t('video.ask')}</Link>
          </div>
          {course && (
            <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
              <Link to={lp(lang, `/courses/${course.course.id}`)} className="text-sm hover:text-gold">{t('video.inCourse', { course: course.c.title })}</Link>
              {nextLesson && <Link to={lp(lang, `/video/${nextLesson.video.id}`)} className="btn-gold !min-h-10">{t('video.next')} →</Link>}
            </div>
          )}
          <p className="mt-6 text-xs text-muted">{t('footer.disclaimer')}</p>
        </div>
        <aside>
          <h2 className="mb-3 text-2xl font-bold">{t('video.related')}</h2>
          <div className="grid gap-5 min-[420px]:grid-cols-2 lg:grid-cols-1">
            {related.map((r) => <VideoCard key={r.video.id} item={r} categoryName={catName(r.video.categoryId)} progress={progress[r.video.id]} />)}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CoursesPage({ me }: { me: Member }) {
  const { t } = useTranslation();
  usePageMeta('meta.member', { index: false, title: t('courses.title') });
  const { data, lang, progress } = useMemberBits(me);
  const courses = localCourses(data.courses, data.videos, lang);
  return (
    <div className="wrap py-8">
      <h1 className="text-[clamp(40px,9vw,64px)] font-extrabold">{t('courses.title')}</h1>
      <p className="mb-6 mt-1 text-muted">{t('courses.intro')}</p>
      {courses.length === 0 ? <Empty>{t('courses.empty')}</Empty> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ course, c, lessons }) => {
            const done = lessons.filter((l) => progress[l.video.id]?.completed).length;
            const total = lessons.reduce((s, l) => s + l.v.durationSec, 0);
            return (
              <Link key={course.id} to={lp(lang, `/courses/${course.id}`)} className="card group block overflow-hidden hover:border-gold/60">
                <Thumb hue={course.coverHue} className="!rounded-none" ratio="aspect-[16/8]" />
                <div className="p-4">
                  <p className="text-xs text-muted">{t(`levels.${course.level}`)} · {t('courses.lessons', { count: lessons.length })} · {t('courses.total', { time: totalTime(total) })}</p>
                  <h2 className="mt-1 text-2xl font-bold group-hover:text-gold">{c.title}</h2>
                  <p className="mt-1 text-sm text-muted">{c.description}</p>
                  <div className="mt-4 h-1 bg-surface-2"><div className="h-full bg-gold" style={{ width: `${(done / lessons.length) * 100}%` }} /></div>
                  <p className="mt-1.5 text-xs text-muted">{t('courses.progress', { done, total: lessons.length })}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CoursePage({ me, id }: { me: Member; id: string }) {
  const { t } = useTranslation();
  const { data, lang, progress } = useMemberBits(me);
  const course = localCourses(data.courses, data.videos, lang).find((c) => c.course.id === id);
  usePageMeta('meta.member', { index: false, title: course?.c.title });
  if (!course) {
    return <div className="wrap py-16 text-center"><p>{t('courses.notAvailable')}</p><Link className="btn-gold mt-6" to={lp(lang, '/courses')}>{t('courses.title')}</Link></div>;
  }
  const { c, lessons } = course;
  const done = lessons.filter((l) => progress[l.video.id]?.completed).length;
  const next = lessons.find((l) => !progress[l.video.id]?.completed) ?? lessons[0];
  const total = lessons.reduce((s, l) => s + l.v.durationSec, 0);
  return (
    <div className="wrap max-w-4xl py-8">
      <Thumb hue={course.course.coverHue} ratio="aspect-[16/7]" className="border border-line" />
      <p className="mt-5 text-sm text-muted">{t(`levels.${course.course.level}`)} · {t('courses.lessons', { count: lessons.length })} · {t('courses.total', { time: totalTime(total) })}</p>
      <h1 className="mt-1 text-[clamp(36px,8vw,56px)] font-extrabold">{c.title}</h1>
      <p className="mt-2 text-fg/85">{c.description}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link to={lp(lang, `/video/${next.video.id}`)} className="btn-gold"><Icon name="play" size={16} />{done ? t('courses.continue') : t('courses.start')}</Link>
        <span className="text-sm text-muted">{t('courses.progress', { done, total: lessons.length })}</span>
      </div>
      <h2 className="mb-3 mt-10 text-2xl font-bold">{t('courses.lessonList')}</h2>
      <ol className="divide-y divide-line border-y border-line">
        {lessons.map((l, i) => {
          const pr = progress[l.video.id];
          return (
            <li key={l.video.id}>
              <Link to={lp(lang, `/video/${l.video.id}`)} className="flex min-h-16 items-center gap-4 py-3 hover:text-gold">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold tabular-nums ${pr?.completed ? 'border-gold bg-gold text-ink' : 'border-line text-muted'}`}>
                  {pr?.completed ? <Icon name="check" size={16} /> : i + 1}
                </span>
                <span className="flex-1 font-medium">{l.v.title}</span>
                <span className="text-sm tabular-nums text-muted">{clock(l.v.durationSec)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
