import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, payments } from '../adapters';
import { hasAccess } from '../lib/access';
import { lp, useLang } from '../lib/content';
import { Link, useRouter } from '../lib/router';
import { Field, usePageMeta, useToast } from '../components/ui';
import { BELTS, INTERESTS, type Belt, type Interest } from '../types';
import type { AuthError } from '../adapters/auth';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="wrap flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-[44px] font-extrabold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} className="input pr-24" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={8} />
      <button type="button" className="absolute inset-y-0 right-0 px-3 text-sm text-muted hover:text-fg" onClick={() => setShow((s) => !s)}>
        {show ? t('auth.hidePassword') : t('auth.showPassword')}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { navigate, query } = useRouter();
  usePageMeta('meta.login');
  const [emailV, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(emailV)) { setErr(t('auth.errors.invalidEmail')); return; }
    const res = await auth.signIn({ email: emailV, password: pw });
    if (!res.ok) { setErr(t(`auth.errors.${res.error}`)); return; }
    const next = query.get('next');
    const target = next && next.startsWith('/') ? next : lp(res.member.lang, res.member.role === 'admin' ? '/admin' : hasAccess(res.member) ? '/dashboard' : '/membership');
    navigate(target.replace(/^\/(en|es)/, `/${res.member.lang}`));
  };
  return (
    <AuthShell title={t('auth.loginTitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('auth.email')}>{(id) => <input id={id} className="input" type="email" inputMode="email" autoComplete="email" value={emailV} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={t('auth.password')}>{(id) => <PasswordInput id={id} value={pw} onChange={setPw} autoComplete="current-password" />}</Field>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn-gold w-full">{t('auth.submitLogin')}</button>
        {auth.mode === 'demo' && <p className="hint">{t('auth.demoHint')}</p>}
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        <Link className="text-muted hover:text-gold" to={lp(lang, '/reset-password')}>{t('auth.forgot')}</Link>
        <span className="text-muted">{t('auth.noAccount')} <Link className="text-gold" to={lp(lang, '/signup')}>{t('auth.signupTitle')}</Link></span>
      </div>
    </AuthShell>
  );
}

export function SignupPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { navigate, query } = useRouter();
  usePageMeta('meta.signup');
  const [emailV, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<{ field: 'email' | 'password' | 'form'; msg: string } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(emailV)) { setErr({ field: 'email', msg: t('auth.errors.invalidEmail') }); return; }
    if (pw.length < 8) { setErr({ field: 'password', msg: t('auth.errors.weakPassword') }); return; }
    const q = query.toString();
    const onboarding = lp(lang, `/onboarding${q ? `?${q}` : ''}`);
    const res = await auth.signUp({ email: emailV, password: pw, lang, redirectPath: onboarding });
    if (!res.ok) { setErr({ field: res.error === 'emailTaken' ? 'email' : 'form', msg: t(`auth.errors.${res.error as AuthError}`) }); return; }
    // Supabase with "Confirm email" on: no session until the emailed link is opened.
    if (res.verify) { setSentTo(emailV.trim()); return; }
    navigate(onboarding);
  };
  if (sentTo) {
    return (
      <AuthShell title={t('auth.verifyTitle')}>
        <p className="card p-4">{t('auth.verifyBody', { email: sentTo })}</p>
        <p className="mt-4 text-sm text-muted">{t('auth.verifyNext')}</p>
        <Link className="mt-6 inline-block text-sm text-muted hover:text-gold" to={lp(lang, '/login')}>← {t('auth.loginTitle')}</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t('auth.signupTitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('auth.email')} error={err?.field === 'email' ? err.msg : null}>{(id) => <input id={id} className="input" type="email" inputMode="email" autoComplete="email" value={emailV} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')} error={err?.field === 'password' ? err.msg : null}>{(id) => <PasswordInput id={id} value={pw} onChange={setPw} autoComplete="new-password" />}</Field>
        {err?.field === 'form' && <p className="err" role="alert">{err.msg}</p>}
        <p className="text-sm text-muted">
          {t('auth.termsA')} <Link className="text-fg underline" to={lp(lang, '/legal/terms')}>{t('footer.terms')}</Link> {t('auth.termsB')} <Link className="text-fg underline" to={lp(lang, '/legal/privacy')}>{t('footer.privacy')}</Link>{t('auth.termsC')}
        </p>
        <button className="btn-gold w-full">{t('auth.submitSignup')}</button>
      </form>
      <p className="mt-6 text-sm text-muted">{t('auth.haveAccount')} <Link className="text-gold" to={lp(lang, '/login')}>{t('auth.loginTitle')}</Link></p>
    </AuthShell>
  );
}

/** Reached from the reset link in the email (…/reset-password?mode=update), signed in by that link. */
function NewPasswordForm() {
  const { t } = useTranslation();
  const lang = useLang();
  const { navigate } = useRouter();
  const toast = useToast();
  const me = auth.useSession();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setErr(t('auth.errors.weakPassword')); return; }
    const res = await auth.updatePassword(pw);
    if (!res.ok) { setErr(t(`auth.errors.${res.error}`)); return; }
    toast(t('auth.passwordSaved'));
    navigate(lp(lang, me && hasAccess(me) ? '/dashboard' : '/membership'), { replace: true });
  };
  return (
    <AuthShell title={t('auth.newPasswordTitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')} error={err}>{(id) => <PasswordInput id={id} value={pw} onChange={setPw} autoComplete="new-password" />}</Field>
        <button className="btn-gold w-full">{t('auth.savePassword')}</button>
      </form>
    </AuthShell>
  );
}

export function ResetPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { query } = useRouter();
  const me = auth.useSession();
  const ready = auth.useReady();
  usePageMeta('meta.login', { title: t('auth.resetTitle'), index: false });
  const [emailV, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const updating = query.get('mode') === 'update';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(emailV)) { setErr(t('auth.errors.invalidEmail')); return; }
    await auth.requestPasswordReset(emailV, lang);
    setSent(true);
  };
  if (updating && !ready) return null;
  if (updating && me) return <NewPasswordForm />;
  return (
    <AuthShell title={t('auth.resetTitle')}>
      {updating && !sent && <p className="err mb-4" role="alert">{t('auth.linkExpired')}</p>}
      {sent ? <p className="card p-4">{t('auth.resetSent')}</p> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-muted">{t('auth.resetBody')}</p>
          <Field label={t('auth.email')} error={err}>{(id) => <input id={id} className="input" type="email" autoComplete="email" value={emailV} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <button className="btn-gold w-full">{t('auth.resetSend')}</button>
        </form>
      )}
      <Link className="mt-6 inline-block text-sm text-muted hover:text-gold" to={lp(lang, '/login')}>← {t('auth.loginTitle')}</Link>
    </AuthShell>
  );
}

export function OnboardingPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { navigate, query } = useRouter();
  const toast = useToast();
  const me = auth.useSession();
  usePageMeta('meta.member', { index: false });
  const [name, setName] = useState(me?.firstName ?? '');
  const [belt, setBelt] = useState<Belt>(me?.belt ?? 'none');
  const [ints, setInts] = useState<Interest[]>(me?.interests ?? []);
  if (!me) return null;
  const next = async (save: boolean) => {
    if (save) await db.updateProfile(me.id, { firstName: name.trim(), belt, interests: ints });
    if (query.get('waitlist')) {
      await payments.joinWaitlist(me.id);
      navigate(lp(lang, '/membership'));
      toast(`${t('tiers.joinedWaitlist')}. ${t('tiers.waitlistNote')}`);
      return;
    }
    const tier = query.get('tier');
    navigate(hasAccess(me) ? lp(lang, '/dashboard') : lp(lang, `/membership${tier ? `?tier=${tier}` : ''}`));
  };
  return (
    <AuthShell title={t('onboarding.title')}>
      {!me.emailVerified && (
        <div className="card mb-6 p-4">
          <p className="font-semibold">{t('auth.verifyTitle')}</p>
          <p className="mt-1 text-sm text-muted">{t('auth.verifyBody', { email: me.email })}</p>
          {auth.mode === 'demo' && <button className="btn-ghost mt-3 !min-h-10" onClick={() => auth.confirmEmail()}>{t('auth.demoVerify')}</button>}
        </div>
      )}
      <p className="mb-5 text-muted">{t('onboarding.intro')}</p>
      <div className="space-y-5">
        <Field label={t('onboarding.firstName')} optional>{(id) => <input id={id} className="input" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label={t('onboarding.belt')} optional>{(id) => (
          <select id={id} className="input" value={belt} onChange={(e) => setBelt(e.target.value as Belt)}>
            {BELTS.map((b) => <option key={b} value={b}>{t(`belts.${b}`)}</option>)}
          </select>
        )}</Field>
        <fieldset>
          <legend className="label">{t('onboarding.interests')} <span className="font-normal text-muted">({t('common.optional')})</span></legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button key={i} type="button" className="chip" aria-pressed={ints.includes(i)}
                onClick={() => setInts((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}>
                {t(`interests.${i}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-3 pt-2">
          <button className="btn-ghost flex-1" onClick={() => next(false)}>{t('onboarding.skip')}</button>
          <button className="btn-gold flex-1" onClick={() => next(true)}>{t('onboarding.next')}</button>
        </div>
      </div>
    </AuthShell>
  );
}
