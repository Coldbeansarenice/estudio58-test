// SUPABASE DATABASE: profiles, progress, bookmarks, Ask JLM requests, waitlist, admin edits.
// Row-level security (supabase/migrations/) is the real guard: members can only change their
// own profile, progress, bookmarks and waitlist place; everything admin-only is refused for others.
// New Ask JLM requests go ONLY through create_request(), which checks tier limits on the server.
// Subscriptions are never written from here: the Stripe webhook (Phase 5) owns them.
import type { DatabaseAdapter } from '../database';
import type { Course, Video } from '../../types';
import { supabase } from './client';
import { refresh, sbStore, useSbState } from './data';

const sb = () => supabase!;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The admin editors make ids like "v-abc-101"; the database wants uuids. */
const dbId = (id: string) => (UUID.test(id) ? id : crypto.randomUUID());

/** Throw on failure so pages don't announce "Saved" when nothing was saved. */
function check(label: string, res: { error: { message: string; code?: string } | null }) {
  if (res.error) {
    console.error(`[supabase] ${label}:`, res.error.code, res.error.message);
    throw new Error(`${label}: ${res.error.message}`);
  }
}

const me = () => {
  const id = sbStore.get().sessionMemberId;
  if (!id) throw new Error('Not signed in');
  return id;
};

export const supabaseDb: DatabaseAdapter = {
  mode: 'supabase',
  useData: useSbState,
  snapshot: sbStore.get,

  async updateProfile(memberId, patch) {
    const cols: Record<string, unknown> = {};
    if (patch.firstName !== undefined) cols.first_name = patch.firstName.slice(0, 100);
    if (patch.lang !== undefined) cols.lang = patch.lang;
    if (patch.belt !== undefined) cols.belt = patch.belt;
    if (patch.interests !== undefined) cols.interests = patch.interests;
    if (!Object.keys(cols).length) return;
    check('update profile', await sb().from('profiles').update(cols).eq('id', memberId));
    sbStore.set((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) }));
  },

  async deleteAccount(memberId) {
    // Deleting a login needs the server's secret key, so a Vercel function does it (api/delete-account.ts).
    if (memberId !== me()) throw new Error('You can only delete your own account');
    const { data } = await sb().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not signed in');
    const res = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`delete account: ${res.status}`);
    await sb().auth.signOut({ scope: 'local' });
    await refresh(null);
  },

  async saveProgress(memberId, videoId, positionSec, completed) {
    const prev = sbStore.get().progress[memberId]?.[videoId];
    const done = completed || !!prev?.completed;
    const updatedAt = new Date().toISOString();
    check('save progress', await sb().from('watch_progress').upsert({
      user_id: memberId, video_id: videoId, position_sec: Math.max(0, Math.floor(positionSec)), completed: done, updated_at: updatedAt,
    }));
    sbStore.set((s) => ({
      progress: { ...s.progress, [memberId]: { ...(s.progress[memberId] ?? {}), [videoId]: { positionSec, completed: done, updatedAt } } },
    }));
  },

  async toggleBookmark(memberId, videoId) {
    const saved = (sbStore.get().bookmarks[memberId] ?? []).includes(videoId);
    if (saved) check('remove bookmark', await sb().from('bookmarks').delete().eq('user_id', memberId).eq('video_id', videoId));
    else check('add bookmark', await sb().from('bookmarks').insert({ user_id: memberId, video_id: videoId }));
    sbStore.set((s) => {
      const cur = s.bookmarks[memberId] ?? [];
      return { bookmarks: { ...s.bookmarks, [memberId]: saved ? cur.filter((v) => v !== videoId) : [videoId, ...cur] } };
    });
  },

  async markNoticesRead(memberId) {
    if (!sbStore.get().notices.some((n) => n.memberId === memberId && !n.read)) return;
    check('mark notices read', await sb().from('notifications').update({ read: true }).eq('user_id', memberId).eq('read', false));
    sbStore.set((s) => ({ notices: s.notices.map((n) => (n.memberId === memberId ? { ...n, read: true } : n)) }));
  },

  async createRequest(input) {
    // One-off paid questions are created by the Stripe webhook once payment is confirmed (Phase 5).
    if (input.paidOneOff) return { ok: false, error: 'notAllowed' };
    const { data, error } = await sb().rpc('create_request', {
      p_type: input.type,
      p_lang: input.lang,
      p_privacy: input.privacy,
      p_subject: input.subject,
      p_body: input.body,
      p_link: input.link ?? null,
      p_video_id: input.videoId ?? null,
      p_preferred_time: input.preferredTime ?? null,
    });
    if (error) {
      if (error.message.includes('limit_reached')) return { ok: false, error: 'limitReached' };
      if (error.message.includes('not_allowed') || error.message.includes('not_signed_in')) return { ok: false, error: 'notAllowed' };
      console.error('[supabase] create_request:', error.code, error.message);
      return { ok: false, error: 'failed' };
    }
    await refresh();
    return { ok: true, id: data as string };
  },

  async joinWaitlist(memberId) {
    if (sbStore.get().waitlist.some((w) => w.memberId === memberId)) return;
    const res = await sb().from('waitlist').insert({ user_id: memberId });
    if (res.error?.code !== '23505') check('join waitlist', res); // 23505 = already on it
    await refresh();
  },

  // ---------- Admin (row-level security refuses these for anyone without the admin role) ----------
  async replyToRequest(requestId, reply) {
    const req = sbStore.get().requests.find((r) => r.id === requestId);
    if (!req) return;
    check('reply', await sb().from('request_replies').insert({
      request_id: requestId, kind: reply.kind, body: reply.body, link: reply.link ?? null, lesson_video_id: reply.lessonId ?? null,
    }));
    check('mark answered', await sb().from('requests').update({ status: 'answered' }).eq('id', requestId));
    check('notify member', await sb().from('notifications').insert({ user_id: req.memberId, kind: 'reply', request_id: requestId }));
    await refresh();
  },

  async setRequestStatus(requestId, status) {
    check('set status', await sb().from('requests').update({ status }).eq('id', requestId));
    sbStore.set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? { ...r, status } : r)) }));
  },

  async setPublicApproved(requestId, approved) {
    check('approve public', await sb().from('requests').update({ public_approved: approved }).eq('id', requestId));
    sbStore.set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? { ...r, publicApproved: approved } : r)) }));
  },

  async saveVideo(video: Video) {
    const id = dbId(video.id);
    check('save video', await sb().from('videos').upsert({
      id, category_id: video.categoryId || null, level: video.level, type: video.type, status: video.status,
      featured: video.featured, thumbnail_path: video.thumbnailName ?? null,
    }));
    const present = (['en', 'es'] as const).filter((l) => video.versions[l]);
    const absent = (['en', 'es'] as const).filter((l) => !video.versions[l]);
    if (present.length) {
      check('save video versions', await sb().from('video_versions').upsert(present.map((l) => {
        const v = video.versions[l]!;
        return { video_id: id, lang: l, title: v.title, description: v.description, duration_sec: Math.max(0, Math.floor(v.durationSec)) };
      })));
    }
    if (absent.length) check('remove video versions', await sb().from('video_versions').delete().eq('video_id', id).in('lang', absent));
    await refresh();
  },

  async deleteVideo(videoId) {
    check('delete video', await sb().from('videos').delete().eq('id', videoId));
    await refresh();
  },

  async saveCourse(course: Course) {
    const id = dbId(course.id);
    check('save course', await sb().from('courses').upsert({ id, level: course.level, status: course.status }));
    for (const l of ['en', 'es'] as const) {
      const v = course.versions[l];
      check('clear lessons', await sb().from('course_lessons').delete().eq('course_id', id).eq('lang', l));
      if (!v) {
        check('remove course version', await sb().from('course_versions').delete().eq('course_id', id).eq('lang', l));
        continue;
      }
      check('save course version', await sb().from('course_versions').upsert({ course_id: id, lang: l, title: v.title, description: v.description }));
      if (v.lessonIds.length) {
        check('save lessons', await sb().from('course_lessons').insert(
          v.lessonIds.map((videoId, position) => ({ course_id: id, lang: l, position, video_id: videoId })),
        ));
      }
    }
    await refresh();
  },

  async deleteCourse(courseId) {
    check('delete course', await sb().from('courses').delete().eq('id', courseId));
    await refresh();
  },

  async saveCategories(categories) {
    const removed = sbStore.get().categories.filter((c) => !categories.some((x) => x.id === c.id)).map((c) => c.id);
    if (categories.length) {
      check('save categories', await sb().from('categories').upsert(
        categories.map((c, i) => ({ id: c.id, name_en: c.name.en, name_es: c.name.es, sort: i + 1 })),
      ));
    }
    if (removed.length) check('remove categories', await sb().from('categories').delete().in('id', removed));
    await refresh();
  },

  async saveSettings(patch) {
    const data = { ...sbStore.get().settings, ...patch };
    check('save settings', await sb().from('site_settings').update({ data }).eq('id', 1));
    sbStore.set(() => ({ settings: data }));
  },

  async inviteFromWaitlist(memberId) {
    // The invite email is sent by the server in Phase 7 (Resend).
    check('invite', await sb().from('waitlist').update({ invited: true }).eq('user_id', memberId));
    sbStore.set((s) => ({ waitlist: s.waitlist.map((w) => (w.memberId === memberId ? { ...w, invited: true } : w)) }));
  },
};
