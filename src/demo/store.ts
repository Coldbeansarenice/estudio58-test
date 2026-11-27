// In-memory demo store. Lives only in this browser tab: a reload resets it.
// The demo adapters read and write here; the real adapters will not.
import { useSyncExternalStore } from 'react';
import type {
  AskRequest, Category, Course, Member, Notice, OutboxEmail, Progress, SiteSettings, Video, WaitlistEntry,
} from '../types';
import {
  seedBookmarks, seedCategories, seedCourses, seedMembers, seedNotices, seedProgress, seedRequests,
  seedSettings, seedVideos, seedWaitlist,
} from './seed';

export interface DemoState {
  categories: Category[];
  videos: Video[];
  courses: Course[];
  members: Member[];
  requests: AskRequest[];
  progress: Record<string, Record<string, Progress>>;
  bookmarks: Record<string, string[]>;
  notices: Notice[];
  waitlist: WaitlistEntry[];
  settings: SiteSettings;
  outbox: OutboxEmail[];
  sessionMemberId: string | null;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

let state: DemoState = {
  categories: clone(seedCategories),
  videos: clone(seedVideos),
  courses: clone(seedCourses),
  members: clone(seedMembers),
  requests: clone(seedRequests),
  progress: clone(seedProgress),
  bookmarks: clone(seedBookmarks),
  notices: clone(seedNotices),
  waitlist: clone(seedWaitlist),
  settings: clone(seedSettings),
  outbox: [],
  sessionMemberId: null,
};

const listeners = new Set<() => void>();

export const demoStore = {
  get: () => state,
  set(update: (s: DemoState) => Partial<DemoState>) {
    state = { ...state, ...update(state) };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

export function useDemoState(): DemoState {
  return useSyncExternalStore(demoStore.subscribe, demoStore.get, demoStore.get);
}

let counter = 100;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter++}`;
