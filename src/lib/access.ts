// Membership rules from HANDOFF.md section 5 and 8, in one place.
// The demo adapters call these to act like the server. In Phase 3+ the same
// checks run on the server (Supabase functions / Stripe webhooks), never only here.
import type { AskRequest, Member, RequestType, SiteSettings, TierId } from '../types';

export const TIER_RANK: Record<TierId, number> = { academy: 1, review: 2, coaching: 3 };

/** Paid access comes only from the (webhook-confirmed) subscription status. */
export function hasAccess(m: Member | null | undefined): boolean {
  if (!m) return false;
  if (m.role === 'admin') return true;
  const s = m.subscription;
  if (!s.tier) return false;
  // active (incl. cancelled-at-period-end) and past_due (Stripe retry period) keep access.
  return s.status === 'active' || s.status === 'past_due';
}

export function activeTier(m: Member | null | undefined): TierId | null {
  if (!m) return null;
  if (m.role === 'admin') return 'coaching'; // Jean sees everything
  return hasAccess(m) ? m.subscription.tier : null;
}

type PlacesData = { members: Member[]; coachingUsed?: number | null };

/** Coaching places taken. With Supabase, members can't see each other's plans,
 *  so the server's count (coaching_places_used()) is used when it is known. */
export function coachingPlacesUsed(data: PlacesData): number {
  if (typeof data.coachingUsed === 'number') return data.coachingUsed;
  return data.members.filter((m) => m.role !== 'admin' && m.subscription.tier === 'coaching'
    && (m.subscription.status === 'active' || m.subscription.status === 'past_due')).length;
}

export function coachingFull(data: PlacesData, settings: SiteSettings): boolean {
  return coachingPlacesUsed(data) >= settings.coachingPlaces;
}

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function nextMonthStart(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
function startOfWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
export function nextWeekStart(d = new Date()) { const s = startOfWeek(d); s.setDate(s.getDate() + 7); return s; }

export interface Allowance {
  allowed: boolean;
  /** null = unlimited */
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: Date | null;
  /** Academy members can pay for a one-off technique question. */
  oneOffAvailable: boolean;
}

export function allowance(m: Member, type: RequestType, requests: AskRequest[], settings: SiteSettings): Allowance {
  const tier = activeTier(m);
  const mine = requests.filter((r) => r.memberId === m.id && r.type === type && !r.paidOneOff);
  if (type === 'private') {
    return { allowed: !!tier, limit: null, used: 0, remaining: null, resetsAt: null, oneOffAvailable: false };
  }
  if (!tier) return { allowed: false, limit: 0, used: 0, remaining: 0, resetsAt: null, oneOffAvailable: false };
  const lim = settings.limits[tier];
  if (type === 'call') {
    const since = startOfWeek();
    const used = mine.filter((r) => new Date(r.createdAt) >= since && r.status !== 'declined').length;
    const limit = lim.callsPerWeek;
    return { allowed: limit > 0 && used < limit, limit, used, remaining: Math.max(0, limit - used), resetsAt: nextWeekStart(), oneOffAvailable: false };
  }
  const since = startOfMonth();
  const used = mine.filter((r) => new Date(r.createdAt) >= since).length;
  const limit = type === 'question' ? lim.questionsPerMonth : lim.reviewsPerMonth;
  return {
    allowed: limit > 0 && used < limit,
    limit, used, remaining: Math.max(0, limit - used), resetsAt: nextMonthStart(),
    oneOffAvailable: type === 'question' && tier === 'academy',
  };
}

export function beltToLevel(belt: Member['belt']) {
  if (belt === 'purple') return 'intermediate' as const;
  if (belt === 'brown' || belt === 'black') return 'advanced' as const;
  return 'beginner' as const;
}
