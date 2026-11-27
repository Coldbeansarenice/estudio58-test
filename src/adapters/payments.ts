// PAYMENTS ADAPTER (Stripe Billing)
// Phase 1 (now): demo. No Stripe calls, no card fields, nothing charged.
// Phase 5: replace `demoPayments` with a Stripe version:
//   - startCheckout → server function creates a Checkout Session (test mode) and redirects.
//   - openPortal → server function creates a Customer Portal session.
//   - Access changes ONLY in the Stripe webhook handler on the server, never on the
//     checkout redirect. The demo mirrors this: `demoWebhook` is the only place that
//     changes a subscription, and the UI has to call it explicitly ("simulate webhook").
import { demoStore } from '../demo/store';
import { coachingFull, TIER_RANK } from '../lib/access';
import type { Member, Subscription, TierId } from '../types';
import { email, OWNER_INBOX } from './email';

export type CheckoutResult =
  | { kind: 'demo'; tier: TierId }
  | { kind: 'redirect'; url: string }
  | { kind: 'refused'; reason: 'coachingFull' | 'notSignedIn' | 'alreadySubscribed' };

export interface PaymentsAdapter {
  readonly mode: 'demo' | 'stripe-test' | 'stripe-live';
  startCheckout(memberId: string | null, tier: TierId): Promise<CheckoutResult>;
  /** Academy members: €18.99 one-off technique question. */
  payOneOffQuestion(memberId: string): Promise<{ kind: 'demo' } | { kind: 'redirect'; url: string }>;
  /** Stripe customer portal. In demo mode the app shows its own stand-in. */
  openPortal(memberId: string): Promise<{ kind: 'demo' } | { kind: 'redirect'; url: string }>;
  joinWaitlist(memberId: string): Promise<void>;
}

const monthFromNow = () => new Date(Date.now() + 30 * 86400000).toISOString();

function patchSub(memberId: string, patch: Partial<Subscription>) {
  demoStore.set((s) => ({
    members: s.members.map((m) => (m.id === memberId ? { ...m, subscription: { ...m.subscription, ...patch } } : m)),
  }));
}

/** Stand-in for Stripe webhook events. Demo only. */
export const demoWebhook = {
  checkoutCompleted(memberId: string, tier: TierId) {
    const s = demoStore.get();
    // Server re-checks places at the moment of payment.
    if (tier === 'coaching' && coachingFull(s.members, s.settings)) return false;
    patchSub(memberId, { tier, status: 'active', periodEnd: monthFromNow(), cancelAtPeriodEnd: false, pendingTier: null });
    const m = s.members.find((x) => x.id === memberId);
    if (m) void email.send('welcome', m.email, m.lang);
    return true;
  },
  changeTier(member: Member, tier: TierId) {
    const cur = member.subscription.tier;
    if (!cur || cur === tier) return 'none' as const;
    if (TIER_RANK[tier] > TIER_RANK[cur]) {
      const s = demoStore.get();
      if (tier === 'coaching' && coachingFull(s.members, s.settings)) return 'coachingFull' as const;
      patchSub(member.id, { tier, pendingTier: null }); // upgrade: now, pay the difference
      return 'upgraded' as const;
    }
    patchSub(member.id, { pendingTier: tier }); // downgrade: at renewal
    return 'downgradeScheduled' as const;
  },
  cancelAtPeriodEnd(memberId: string, cancel: boolean) { patchSub(memberId, { cancelAtPeriodEnd: cancel }); },
  paymentFailed(member: Member) {
    patchSub(member.id, { status: 'past_due' });
    void email.send('paymentFailed', member.email, member.lang);
  },
  retriesExhausted(memberId: string) { patchSub(memberId, { status: 'paused' }); },
  paymentFixed(memberId: string) { patchSub(memberId, { status: 'active', periodEnd: monthFromNow() }); },
  /** Renewal date passes: apply pending downgrade or end a cancelled plan. */
  renewalPassed(member: Member) {
    const sub = member.subscription;
    if (sub.cancelAtPeriodEnd) patchSub(member.id, { tier: null, status: 'canceled', cancelAtPeriodEnd: false, pendingTier: null, periodEnd: null });
    else patchSub(member.id, { tier: sub.pendingTier ?? sub.tier, pendingTier: null, periodEnd: monthFromNow() });
  },
};

const demoPayments: PaymentsAdapter = {
  mode: 'demo',
  async startCheckout(memberId, tier) {
    if (!memberId) return { kind: 'refused', reason: 'notSignedIn' };
    const s = demoStore.get();
    const m = s.members.find((x) => x.id === memberId);
    if (m?.subscription.tier && (m.subscription.status === 'active' || m.subscription.status === 'past_due')) {
      return { kind: 'refused', reason: 'alreadySubscribed' };
    }
    // Server-side rule: refuse Coaching checkout when places are full, however the page was reached.
    if (tier === 'coaching' && coachingFull(s.members, s.settings)) return { kind: 'refused', reason: 'coachingFull' };
    return { kind: 'demo', tier };
  },
  async payOneOffQuestion() { return { kind: 'demo' }; },
  async openPortal() { return { kind: 'demo' }; },
  async joinWaitlist(memberId) {
    const s = demoStore.get();
    if (s.waitlist.some((w) => w.memberId === memberId)) return;
    demoStore.set((st) => ({ waitlist: [...st.waitlist, { memberId, createdAt: new Date().toISOString(), invited: false }] }));
    const m = s.members.find((x) => x.id === memberId);
    await email.send('waitlistOwner', OWNER_INBOX, 'es', { email: m?.email ?? '' });
  },
};

export const payments: PaymentsAdapter = demoPayments;
