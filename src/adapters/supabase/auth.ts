// SUPABASE AUTH: email + password, email verification, password reset, log out.
// Roles come from the user_roles table (assigned on the server only), never from the browser.
import type { AuthAdapter, AuthError } from '../auth';
import { siteUrl, supabase } from './client';
import { refresh, sbStore, start, useSbReady, useSbState } from './data';

const sb = () => supabase!;

function authError(code: string | undefined, message = ''): AuthError {
  if (code === 'invalid_credentials') return 'invalidCredentials';
  if (code === 'email_not_confirmed') return 'notVerified';
  if (code === 'user_already_exists' || code === 'email_exists') return 'emailTaken';
  if (code === 'weak_password') return 'weakPassword';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'rateLimited';
  console.error('[supabase auth]', code, message);
  return 'generic';
}

export const supabaseAuth: AuthAdapter = {
  mode: 'supabase',
  useSession() {
    const s = useSbState();
    return s.members.find((m) => m.id === s.sessionMemberId) ?? null;
  },
  useReady: useSbReady,
  async signUp({ email, password, lang, redirectPath }) {
    if (password.length < 8) return { ok: false, error: 'weakPassword' };
    const { data, error } = await sb().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        // Where the confirmation link lands (keeps ?tier= / ?waitlist= from the sign-up page).
        emailRedirectTo: siteUrl(redirectPath ?? `/${lang}/onboarding`),
        // Read by handle_new_user() to create the profile in the right language.
        data: { lang },
      },
    });
    if (error) return { ok: false, error: authError(error.code, error.message) };
    // With "Confirm email" on, there is no session until the link is opened.
    // (An address that already has an account gets the same answer, so nobody can probe for accounts.)
    if (!data.session) return { ok: true, verify: true };
    await refresh(data.session.user);
    return { ok: true, verify: false };
  },
  async signIn({ email, password }) {
    const { data, error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { ok: false, error: authError(error.code, error.message) };
    await refresh(data.user);
    const s = sbStore.get();
    const member = s.members.find((m) => m.id === data.user.id);
    if (!member) return { ok: false, error: 'generic' };
    return { ok: true, member };
  },
  async signOut() {
    await sb().auth.signOut();
    await refresh(null);
  },
  async requestPasswordReset(email, lang) {
    // Same answer whether or not the address exists (no account probing).
    const { error } = await sb().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: siteUrl(`/${lang}/reset-password?mode=update`),
    });
    if (error) console.error('[supabase auth] reset:', error.code, error.message);
  },
  async updatePassword(password) {
    if (password.length < 8) return { ok: false, error: 'weakPassword' };
    const { error } = await sb().auth.updateUser({ password });
    if (error) return { ok: false, error: error.code === 'same_password' ? 'samePassword' : authError(error.code, error.message) };
    sbStore.endRecovery();
    return { ok: true };
  },
  async confirmEmail() {
    // Supabase confirms the address itself when the member opens the emailed link.
  },
};

start();
