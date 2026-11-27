// DATABASE ADAPTER (content, profiles, progress, Ask JLM, settings)
// Phase 1 (now): demo, backed by the in-memory store in src/demo.
// Phase 3: replace `demoDb` with a Supabase version (Postgres + row-level security).
//   Rules the real version must keep (HANDOFF.md section 14):
//   - RLS on every table with member data or restricted content.
//   - Members change only their own profile, bookmarks, progress and requests.
//   - Private requests are never visible to other members.
//   - Tier limits are checked on the server (an RPC / edge function), as `createRequest` does here.
import { demoStore, newId, useDemoState, type DemoState } from '../demo/store';
import { allowance } from '../lib/access';
import type {
  AskRequest, Category, Course, Member, RequestReply, RequestStatus, SiteSettings, Video,
} from '../types';
import { email, OWNER_INBOX } from './email';

export type CreateRequestInput = Omit<AskRequest, 'id' | 'status' | 'createdAt' | 'replies' | 'publicApproved'>;

export interface DatabaseAdapter {
  readonly mode: 'demo' | 'supabase';
  /** Reactive read of everything this member may see (the real version caches query results). */
  useData(): DemoState;
  updateProfile(memberId: string, patch: Partial<Pick<Member, 'firstName' | 'lang' | 'belt' | 'interests'>>): Promise<void>;
  deleteAccount(memberId: string): Promise<void>;
  saveProgress(memberId: string, videoId: string, positionSec: number, completed: boolean): Promise<void>;
  toggleBookmark(memberId: string, videoId: string): Promise<void>;
  markNoticesRead(memberId: string): Promise<void>;
  createRequest(input: CreateRequestInput): Promise<{ ok: true; id: string } | { ok: false; error: 'limitReached' | 'notAllowed' }>;
  // Admin only (the real version checks the admin role on the server):
  replyToRequest(requestId: string, reply: Omit<RequestReply, 'id' | 'createdAt'>): Promise<void>;
  setRequestStatus(requestId: string, status: RequestStatus): Promise<void>;
  setPublicApproved(requestId: string, approved: boolean): Promise<void>;
  saveVideo(video: Video): Promise<void>;
  deleteVideo(videoId: string): Promise<void>;
  saveCourse(course: Course): Promise<void>;
  deleteCourse(courseId: string): Promise<void>;
  saveCategories(categories: Category[]): Promise<void>;
  saveSettings(patch: Partial<SiteSettings>): Promise<void>;
  inviteFromWaitlist(memberId: string): Promise<void>;
}

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

const demoDb: DatabaseAdapter = {
  mode: 'demo',
  useData: useDemoState,
  async updateProfile(memberId, patch) {
    demoStore.set((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) }));
  },
  async deleteAccount(memberId) {
    demoStore.set((s) => ({
      members: s.members.filter((m) => m.id !== memberId),
      requests: s.requests.filter((r) => r.memberId !== memberId),
      notices: s.notices.filter((n) => n.memberId !== memberId),
      waitlist: s.waitlist.filter((w) => w.memberId !== memberId),
      sessionMemberId: null,
    }));
  },
  async saveProgress(memberId, videoId, positionSec, completed) {
    demoStore.set((s) => {
      const mine = { ...(s.progress[memberId] ?? {}) };
      const prev = mine[videoId];
      mine[videoId] = { positionSec, completed: completed || !!prev?.completed, updatedAt: new Date().toISOString() };
      return { progress: { ...s.progress, [memberId]: mine } };
    });
  },
  async toggleBookmark(memberId, videoId) {
    demoStore.set((s) => {
      const cur = s.bookmarks[memberId] ?? [];
      const next = cur.includes(videoId) ? cur.filter((v) => v !== videoId) : [videoId, ...cur];
      return { bookmarks: { ...s.bookmarks, [memberId]: next } };
    });
  },
  async markNoticesRead(memberId) {
    demoStore.set((s) => ({ notices: s.notices.map((n) => (n.memberId === memberId ? { ...n, read: true } : n)) }));
  },
  async createRequest(input) {
    const s = demoStore.get();
    const m = s.members.find((x) => x.id === input.memberId);
    if (!m) return { ok: false, error: 'notAllowed' };
    if (!input.paidOneOff) {
      const a = allowance(m, input.type, s.requests, s.settings);
      if (!a.allowed) return { ok: false, error: a.limit === 0 ? 'notAllowed' : 'limitReached' };
    }
    const id = newId('r');
    const req: AskRequest = { ...input, id, status: 'new', publicApproved: false, createdAt: new Date().toISOString(), replies: [], isDemo: true };
    demoStore.set((st) => ({ requests: [req, ...st.requests] }));
    await email.send('requestReceived', m.email, input.lang);
    await email.send('requestReceived', OWNER_INBOX, 'es');
    return { ok: true, id };
  },
  async replyToRequest(requestId, reply) {
    const s = demoStore.get();
    const req = s.requests.find((r) => r.id === requestId);
    if (!req) return;
    const full: RequestReply = { ...reply, id: newId('rp'), createdAt: new Date().toISOString() };
    demoStore.set((st) => ({
      requests: st.requests.map((r) => (r.id === requestId ? { ...r, status: 'answered', replies: [...r.replies, full] } : r)),
      notices: [{ id: newId('n'), memberId: req.memberId, kind: 'reply', requestId, createdAt: full.createdAt, read: false }, ...st.notices],
    }));
    const m = s.members.find((x) => x.id === req.memberId);
    if (m) await email.send('reply', m.email, req.lang); // answered in the language asked
  },
  async setRequestStatus(requestId, status) {
    demoStore.set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? { ...r, status } : r)) }));
  },
  async setPublicApproved(requestId, approved) {
    demoStore.set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? { ...r, publicApproved: approved } : r)) }));
  },
  async saveVideo(video) { demoStore.set((s) => ({ videos: upsert(s.videos, video) })); },
  async deleteVideo(videoId) {
    demoStore.set((s) => ({
      videos: s.videos.filter((v) => v.id !== videoId),
      courses: s.courses.map((c) => ({
        ...c,
        versions: Object.fromEntries(Object.entries(c.versions).map(([l, v]) => [l, v && { ...v, lessonIds: v.lessonIds.filter((id) => id !== videoId) }])),
      })),
    }));
  },
  async saveCourse(course) { demoStore.set((s) => ({ courses: upsert(s.courses, course) })); },
  async deleteCourse(courseId) { demoStore.set((s) => ({ courses: s.courses.filter((c) => c.id !== courseId) })); },
  async saveCategories(categories) { demoStore.set(() => ({ categories })); },
  async saveSettings(patch) { demoStore.set((s) => ({ settings: { ...s.settings, ...patch } })); },
  async inviteFromWaitlist(memberId) {
    const s = demoStore.get();
    demoStore.set((st) => ({ waitlist: st.waitlist.map((w) => (w.memberId === memberId ? { ...w, invited: true } : w)) }));
    const m = s.members.find((x) => x.id === memberId);
    if (m) await email.send('waitlistInvite', m.email, m.lang);
  },
};

export const db: DatabaseAdapter = demoDb;
