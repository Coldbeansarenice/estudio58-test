// AUTH ADAPTER (sign up, log in, password reset, session)
// Supabase Auth when VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set
// (see ./supabase/auth.ts); otherwise the demo below, where any 8+ character password
// works and nothing leaves the browser.
// Admin roles come from the user_roles table on the server, never from anything the browser sends.
import { demoStore, newId, useDemoState } from '../demo/store';
import type { Lang, Member } from '../types';
import { email } from './email';
import { supabase } from './supabase/client';
import { supabaseAuth } from './supabase/auth';

export type AuthError =
  | 'invalidCredentials' | 'emailTaken' | 'weakPassword' | 'notFound'
  | 'notVerified' | 'samePassword' | 'rateLimited' | 'generic';

export interface AuthAdapter {
  readonly mode: 'demo' | 'supabase';
  useSession(): Member | null;
  /** False until the saved session (if any) has been checked. Gates wait for it. */
  useReady(): boolean;
  /** `verify: true` = a confirmation email was sent and there's no session until it's opened. */
  signUp(input: { email: string; password: string; lang: Lang; redirectPath?: string }): Promise<{ ok: true; verify: boolean } | { ok: false; error: AuthError }>;
  signIn(input: { email: string; password: string }): Promise<{ ok: true; member: Member } | { ok: false; error: AuthError }>;
  signOut(): Promise<void>;
  requestPasswordReset(emailAddress: string, lang: Lang): Promise<void>;
  /** Sets a new password for the signed-in member (after opening a reset link). */
  updatePassword(password: string): Promise<{ ok: true } | { ok: false; error: AuthError }>;
  /** Demo only: confirms the verification link. Supabase handles this itself. */
  confirmEmail(): Promise<void>;
  /** Demo only: the "View as" switcher. Not present in the real adapter. */
  demoSwitch?(memberId: string | null): void;
}

const demoAuth: AuthAdapter = {
  mode: 'demo',
  useSession() {
    const s = useDemoState();
    return s.members.find((m) => m.id === s.sessionMemberId) ?? null;
  },
  useReady: () => true,
  async signUp({ email: address, password, lang }) {
    const addr = address.trim().toLowerCase();
    if (password.length < 8) return { ok: false, error: 'weakPassword' };
    if (demoStore.get().members.some((m) => m.email === addr)) return { ok: false, error: 'emailTaken' };
    const member: Member = {
      id: newId('m'), email: addr, firstName: '', lang, belt: 'none', interests: [], role: 'member',
      joinedAt: new Date().toISOString(), emailVerified: false, isDemo: true,
      subscription: { tier: null, status: 'none', periodEnd: null, cancelAtPeriodEnd: false, pendingTier: null },
    };
    demoStore.set((s) => ({ members: [...s.members, member], sessionMemberId: member.id }));
    await email.send('verify', addr, lang);
    return { ok: true, verify: false };
  },
  async signIn({ email: address, password }) {
    const m = demoStore.get().members.find((x) => x.email === address.trim().toLowerCase());
    if (!m || password.length < 8) return { ok: false, error: 'invalidCredentials' };
    demoStore.set(() => ({ sessionMemberId: m.id }));
    return { ok: true, member: m };
  },
  async signOut() {
    demoStore.set(() => ({ sessionMemberId: null }));
  },
  async requestPasswordReset(address, lang) {
    // Same answer whether or not the address exists (no account probing).
    const m = demoStore.get().members.find((x) => x.email === address.trim().toLowerCase());
    if (m) await email.send('reset', m.email, lang);
  },
  async updatePassword(password) {
    if (password.length < 8) return { ok: false, error: 'weakPassword' };
    return demoStore.get().sessionMemberId ? { ok: true } : { ok: false, error: 'generic' };
  },
  async confirmEmail() {
    const id = demoStore.get().sessionMemberId;
    demoStore.set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, emailVerified: true } : m)) }));
  },
  demoSwitch(memberId) {
    demoStore.set(() => ({ sessionMemberId: memberId }));
  },
};

export const auth: AuthAdapter = supabase ? supabaseAuth : demoAuth;
