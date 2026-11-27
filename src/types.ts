// Shared data shapes. They mirror the tables proposed in HANDOFF.md section 14,
// so the Supabase adapter (Phase 3) can return the same shapes.

export type Lang = 'en' | 'es';
export const LANGS: Lang[] = ['en', 'es'];
export type Localized<T = string> = Record<Lang, T>;

export type TierId = 'academy' | 'review' | 'coaching';
export const TIERS: TierId[] = ['academy', 'review', 'coaching'];

export type Level = 'beginner' | 'intermediate' | 'advanced';
export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export type ContentType = 'technique' | 'lesson' | 'analysis' | 'sparring' | 'qa';
export const CONTENT_TYPES: ContentType[] = ['technique', 'lesson', 'analysis', 'sparring', 'qa'];

export type Belt = 'white' | 'blue' | 'purple' | 'brown' | 'black' | 'none';
export const BELTS: Belt[] = ['white', 'blue', 'purple', 'brown', 'black', 'none'];

export type Interest = 'competition' | 'selfDefence' | 'fitness' | 'coaching' | 'legLocks' | 'wrestling' | 'guard';
export const INTERESTS: Interest[] = ['competition', 'selfDefence', 'fitness', 'coaching', 'legLocks', 'wrestling', 'guard'];

export interface Category {
  id: string;
  name: Localized;
}

/** One language version of a video: its own title, description and file. */
export interface VideoVersion {
  title: string;
  description: string;
  durationSec: number;
  /** Id of the asset in the video service (Mux). Never a raw URL. */
  assetId: string | null;
}

export interface Video {
  id: string;
  categoryId: string;
  level: Level;
  type: ContentType;
  status: 'draft' | 'published';
  featured: boolean;
  createdAt: string; // ISO
  thumbHue: number; // demo thumbnails are drawn, not photos
  thumbnailName?: string | null;
  versions: Partial<Record<Lang, VideoVersion>>;
  isDemo?: boolean;
}

export interface CourseVersion {
  title: string;
  description: string;
  lessonIds: string[]; // ordered video ids
}

export interface Course {
  id: string;
  level: Level;
  status: 'draft' | 'published';
  coverHue: number;
  versions: Partial<Record<Lang, CourseVersion>>;
  isDemo?: boolean;
}

export type SubStatus = 'none' | 'active' | 'past_due' | 'paused' | 'canceled';

export interface Subscription {
  tier: TierId | null;
  status: SubStatus;
  /** End of the current paid month. */
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Downgrades wait until renewal. */
  pendingTier: TierId | null;
}

export interface Member {
  id: string;
  email: string;
  firstName: string;
  lang: Lang;
  belt: Belt;
  interests: Interest[];
  role: 'member' | 'admin';
  joinedAt: string;
  emailVerified: boolean;
  subscription: Subscription;
  isDemo?: boolean;
}

export type RequestType = 'question' | 'review' | 'call' | 'private';
export const REQUEST_TYPES: RequestType[] = ['question', 'review', 'call', 'private'];
export type RequestStatus = 'new' | 'in_progress' | 'answered' | 'declined';
export const REQUEST_STATUSES: RequestStatus[] = ['new', 'in_progress', 'answered', 'declined'];

export interface RequestReply {
  id: string;
  kind: 'text' | 'video' | 'lesson';
  body: string;
  link?: string;
  lessonId?: string;
  createdAt: string;
}

export interface AskRequest {
  id: string;
  memberId: string;
  type: RequestType;
  lang: Lang;
  privacy: 'private' | 'public';
  publicApproved: boolean;
  status: RequestStatus;
  subject: string;
  body: string;
  link?: string;
  videoId?: string;
  preferredTime?: string;
  paidOneOff?: boolean;
  createdAt: string;
  replies: RequestReply[];
  isDemo?: boolean;
}

export interface Progress {
  positionSec: number;
  completed: boolean;
  updatedAt: string;
}

export interface Notice {
  id: string;
  memberId: string;
  kind: 'reply' | 'waitlist' | 'billing';
  requestId?: string;
  createdAt: string;
  read: boolean;
}

export interface FaqItem {
  id: string;
  q: Localized;
  a: Localized;
}

export interface TierLimits {
  questionsPerMonth: number;
  reviewsPerMonth: number;
  callsPerWeek: number;
}

export interface SiteSettings {
  /** Prices in euro cents, VAT included (what customers see). */
  prices: Record<TierId, number> & { oneOffQuestion: number };
  limits: Record<TierId, TierLimits>;
  coachingPlaces: number;
  travelMode: boolean;
  achievements: Localized[];
  bio: Localized;
  philosophy: Localized;
  instagram: string;
  ibjjf: string;
  heroHeadline: Localized;
  announcement: Localized | null;
  faq: FaqItem[];
  logoName: string | null;
  heroImageName: string | null;
  portraitName: string | null;
}

export interface WaitlistEntry {
  memberId: string;
  createdAt: string;
  invited: boolean;
}

export interface OutboxEmail {
  id: string;
  to: string;
  template: string;
  lang: Lang;
  subject: string;
  createdAt: string;
}
