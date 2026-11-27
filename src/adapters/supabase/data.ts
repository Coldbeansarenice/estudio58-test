// SUPABASE DATA STORE
// Keeps what the signed-in member may see (row-level security decides) in the same
// shape as the demo store, so pages work unchanged in both modes.
// Reloaded whenever the session changes and after each write.
import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './client';
import type { DemoState } from '../../demo/store';
import { seedSettings } from '../../demo/seed';
import type {
  AskRequest, Belt, Category, Course, Interest, Lang, Level, Member, Notice, Progress, RequestReply,
  SiteSettings, SubStatus, TierId, Video, WaitlistEntry, ContentType,
} from '../../types';

// ---------- Row shapes (supabase/migrations/20261127_estudio58_core.sql) ----------
interface ProfileRow { id: string; email: string; first_name: string; lang: Lang; belt: Belt; interests: string[]; is_demo: boolean; created_at: string }
interface RoleRow { user_id: string; role: 'admin' }
interface SubRow { user_id: string; tier: TierId | null; status: SubStatus; period_end: string | null; cancel_at_period_end: boolean; pending_tier: TierId | null }
interface CategoryRow { id: string; name_en: string; name_es: string; sort: number }
interface VideoVersionRow { lang: Lang; title: string; description: string; duration_sec: number }
interface VideoRow {
  id: string; category_id: string | null; level: Level; type: ContentType; status: 'draft' | 'published';
  featured: boolean; thumbnail_path: string | null; is_demo: boolean; created_at: string; video_versions: VideoVersionRow[];
}
interface CourseRow {
  id: string; level: Level; status: 'draft' | 'published'; is_demo: boolean;
  course_versions: { lang: Lang; title: string; description: string }[];
  course_lessons: { lang: Lang; position: number; video_id: string }[];
}
interface ReplyRow { id: string; kind: RequestReply['kind']; body: string; link: string | null; lesson_video_id: string | null; created_at: string }
interface RequestRow {
  id: string; user_id: string; type: AskRequest['type']; lang: Lang; privacy: 'private' | 'public'; public_approved: boolean;
  status: AskRequest['status']; subject: string; body: string; link: string | null; video_id: string | null;
  preferred_time: string | null; paid_one_off: boolean; is_demo: boolean; created_at: string; request_replies: ReplyRow[];
}
interface ProgressRow { user_id: string; video_id: string; position_sec: number; completed: boolean; updated_at: string }
interface BookmarkRow { user_id: string; video_id: string; created_at: string }
interface NoticeRow { id: string; user_id: string; kind: Notice['kind']; request_id: string | null; read: boolean; created_at: string }
interface WaitlistRow { user_id: string; invited: boolean; created_at: string }

/** Defaults until site_settings loads (same values the migration inserts). The FAQ lives in the database. */
const DEFAULT_SETTINGS: SiteSettings = { ...JSON.parse(JSON.stringify(seedSettings)), faq: [] };

const empty = (): DemoState => ({
  categories: [], videos: [], courses: [], members: [], requests: [], progress: {}, bookmarks: {},
  notices: [], waitlist: [], settings: DEFAULT_SETTINGS, outbox: [], sessionMemberId: null, coachingUsed: null,
});

// ---------- Store ----------
let state: DemoState = empty();
let ready = false;
let currentUser: User | null = null;
let recovery = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const sbStore = {
  get: () => state,
  set(update: (s: DemoState) => Partial<DemoState>) { state = { ...state, ...update(state) }; emit(); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  user: () => currentUser,
  /** True after arriving from a password-reset link, until a new password is saved. */
  inRecovery: () => recovery,
  endRecovery() { recovery = false; emit(); },
};

export const useSbState = () => useSyncExternalStore(sbStore.subscribe, sbStore.get, sbStore.get);
export const useSbReady = () => useSyncExternalStore(sbStore.subscribe, () => ready, () => ready);

// ---------- Mapping ----------
function hue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function toVideo(r: VideoRow): Video {
  const versions: Video['versions'] = {};
  for (const v of r.video_versions ?? []) {
    versions[v.lang] = { title: v.title, description: v.description, durationSec: v.duration_sec, assetId: null };
  }
  return {
    id: r.id, categoryId: r.category_id ?? '', level: r.level, type: r.type, status: r.status, featured: r.featured,
    createdAt: r.created_at, thumbHue: hue(r.id), thumbnailName: r.thumbnail_path, versions, isDemo: r.is_demo,
  };
}

function toCourse(r: CourseRow): Course {
  const versions: Course['versions'] = {};
  for (const v of r.course_versions ?? []) {
    const lessonIds = (r.course_lessons ?? []).filter((l) => l.lang === v.lang)
      .sort((a, b) => a.position - b.position).map((l) => l.video_id);
    versions[v.lang] = { title: v.title, description: v.description, lessonIds };
  }
  return { id: r.id, level: r.level, status: r.status, coverHue: hue(r.id), versions, isDemo: r.is_demo };
}

function toRequest(r: RequestRow): AskRequest {
  const replies: RequestReply[] = (r.request_replies ?? [])
    .slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((x) => ({ id: x.id, kind: x.kind, body: x.body, link: x.link ?? undefined, lessonId: x.lesson_video_id ?? undefined, createdAt: x.created_at }));
  return {
    id: r.id, memberId: r.user_id, type: r.type, lang: r.lang, privacy: r.privacy, publicApproved: r.public_approved,
    status: r.status, subject: r.subject, body: r.body, link: r.link ?? undefined, videoId: r.video_id ?? undefined,
    preferredTime: r.preferred_time ?? undefined, paidOneOff: r.paid_one_off || undefined, createdAt: r.created_at,
    replies, isDemo: r.is_demo,
  };
}

function toMembers(profiles: ProfileRow[], roles: RoleRow[], subs: SubRow[], me: User): Member[] {
  return profiles.map((p) => {
    const s = subs.find((x) => x.user_id === p.id);
    return {
      id: p.id, email: p.email, firstName: p.first_name, lang: p.lang, belt: p.belt,
      interests: (p.interests ?? []) as Interest[],
      role: roles.some((r) => r.user_id === p.id && r.role === 'admin') ? 'admin' : 'member',
      joinedAt: p.created_at,
      // Only known for yourself; Supabase won't let anyone sign in before confirming.
      emailVerified: p.id === me.id ? !!me.email_confirmed_at : true,
      subscription: {
        tier: s?.tier ?? null, status: s?.status ?? 'none', periodEnd: s?.period_end ?? null,
        cancelAtPeriodEnd: s?.cancel_at_period_end ?? false, pendingTier: s?.pending_tier ?? null,
      },
      isDemo: p.is_demo,
    };
  });
}

function rows<T>(label: string, res: { data: unknown; error: { message: string } | null }): T[] {
  if (res.error) { console.error(`[supabase] ${label}:`, res.error.message); return []; }
  return (res.data as T[] | null) ?? [];
}

// ---------- Loading ----------
async function loadPublic(): Promise<Partial<DemoState>> {
  const sb = supabase!;
  const [cats, settings, places] = await Promise.all([
    sb.from('categories').select('*').order('sort'),
    sb.from('site_settings').select('data').eq('id', 1).maybeSingle(),
    sb.rpc('coaching_places_used'),
  ]);
  const categories: Category[] = rows<CategoryRow>('categories', cats).map((c) => ({ id: c.id, name: { en: c.name_en, es: c.name_es } }));
  if (settings.error) console.error('[supabase] site_settings:', settings.error.message);
  const data = (settings.data as { data: Partial<SiteSettings> } | null)?.data ?? {};
  if (places.error) console.error('[supabase] coaching_places_used:', places.error.message);
  return {
    categories,
    settings: { ...DEFAULT_SETTINGS, ...data },
    coachingUsed: typeof places.data === 'number' ? places.data : null,
  };
}

async function loadMember(me: User): Promise<Partial<DemoState>> {
  const sb = supabase!;
  const [profiles, roles, subs, videos, courses, requests, progress, bookmarks, notices, waitlist] = await Promise.all([
    sb.from('profiles').select('*'),
    sb.from('user_roles').select('user_id, role'),
    sb.from('subscriptions').select('user_id, tier, status, period_end, cancel_at_period_end, pending_tier'),
    sb.from('videos').select('*, video_versions(*)').order('created_at', { ascending: false }),
    sb.from('courses').select('*, course_versions(*), course_lessons(*)').order('created_at', { ascending: true }),
    sb.from('requests').select('*, request_replies(*)').order('created_at', { ascending: false }),
    sb.from('watch_progress').select('*'),
    sb.from('bookmarks').select('*').order('created_at', { ascending: false }),
    sb.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }),
    sb.from('waitlist').select('*').order('created_at', { ascending: true }),
  ]);
  const progressMap: DemoState['progress'] = {};
  for (const p of rows<ProgressRow>('watch_progress', progress)) {
    const entry: Progress = { positionSec: p.position_sec, completed: p.completed, updatedAt: p.updated_at };
    (progressMap[p.user_id] ??= {})[p.video_id] = entry;
  }
  const bookmarkMap: DemoState['bookmarks'] = {};
  for (const b of rows<BookmarkRow>('bookmarks', bookmarks)) (bookmarkMap[b.user_id] ??= []).push(b.video_id);
  return {
    members: toMembers(rows<ProfileRow>('profiles', profiles), rows<RoleRow>('user_roles', roles), rows<SubRow>('subscriptions', subs), me),
    videos: rows<VideoRow>('videos', videos).map(toVideo),
    courses: rows<CourseRow>('courses', courses).map(toCourse),
    requests: rows<RequestRow>('requests', requests).map(toRequest),
    progress: progressMap,
    bookmarks: bookmarkMap,
    notices: rows<NoticeRow>('notifications', notices).map((n) => ({
      id: n.id, memberId: n.user_id, kind: n.kind, requestId: n.request_id ?? undefined, read: n.read, createdAt: n.created_at,
    })),
    waitlist: rows<WaitlistRow>('waitlist', waitlist).map((w): WaitlistEntry => ({ memberId: w.user_id, invited: w.invited, createdAt: w.created_at })),
  };
}

let seq = 0;
/** Load everything for this user (or the public data when signed out). Later calls win. */
export async function refresh(user: User | null = currentUser): Promise<void> {
  const mine = ++seq;
  const [pub, priv] = await Promise.all([loadPublic(), user ? loadMember(user) : Promise.resolve({})]);
  if (mine !== seq) return;
  currentUser = user;
  state = { ...empty(), ...pub, ...priv, sessionMemberId: user?.id ?? null };
  ready = true;
  emit();
}

let started = false;
/** Follow Supabase's session (sign-in, sign-out, confirmation and reset links). */
export function start() {
  if (started || !supabase) return;
  started = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') { currentUser = session?.user ?? currentUser; return; }
    if (event === 'PASSWORD_RECOVERY') recovery = true;
    const user = session?.user ?? null;
    // Tabs re-announce SIGNED_IN on focus; skip a reload when nothing changed.
    if (event === 'SIGNED_IN' && ready && user?.id === currentUser?.id) return;
    // Supabase advises not to call it again inside this callback, so defer.
    setTimeout(() => { void refresh(user); }, 0);
  });
}
