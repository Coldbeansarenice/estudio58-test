import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './adapters';
import { hasAccess } from './lib/access';
import { useLang, lp } from './lib/content';
import { matchPath, RouterProvider, useRouter } from './lib/router';
import i18n, { detectLang, rememberLang } from './i18n';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import { AboutPage, FaqPage, HomePage, LegalPage, MembershipPage, NotFoundPage } from './pages/Public';
import { LoginPage, OnboardingPage, ResetPage, SignupPage } from './pages/Auth';
import { CoursePage, CoursesPage, DashboardPage, LibraryPage, VideoPage } from './pages/Member';
import { AskPage } from './pages/Ask';
import { AccountPage } from './pages/Account';
import { AdminPage } from './pages/admin/Admin';
import type { Member } from './types';

function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => { navigate(to, { replace: true }); }, [to, navigate]);
  return null;
}

/** Members-only gate. Access comes from the subscription status only. */
function Members({ children, admin = false, allowNoPlan = false }: { children: (me: Member) => ReactNode; admin?: boolean; allowNoPlan?: boolean }) {
  const me = auth.useSession();
  const lang = useLang();
  const { pathname, query } = useRouter();
  if (!me) {
    const here = pathname + (query.toString() ? `?${query}` : '');
    return <Redirect to={lp(lang, `/login?next=${encodeURIComponent(here)}`)} />;
  }
  if (admin && me.role !== 'admin') return <Redirect to={lp(lang, '/dashboard')} />;
  if (!allowNoPlan && !hasAccess(me)) return <Redirect to={lp(lang, '/membership')} />;
  return <>{children(me)}</>;
}

type Route = [pattern: string, render: (p: Record<string, string>) => ReactNode];

const routes: Route[] = [
  ['/:lang', () => <HomePage />],
  ['/:lang/about', () => <AboutPage />],
  ['/:lang/membership', () => <MembershipPage />],
  ['/:lang/faq', () => <FaqPage />],
  ['/:lang/legal/terms', () => <LegalPage doc="terms" />],
  ['/:lang/legal/privacy', () => <LegalPage doc="privacy" />],
  ['/:lang/legal/cancellation', () => <LegalPage doc="cancellation" />],
  ['/:lang/login', () => <LoginPage />],
  ['/:lang/signup', () => <SignupPage />],
  ['/:lang/reset-password', () => <ResetPage />],
  ['/:lang/onboarding', () => <Members allowNoPlan>{() => <OnboardingPage />}</Members>],
  ['/:lang/dashboard', () => <Members>{(me) => <DashboardPage me={me} />}</Members>],
  ['/:lang/library', () => <Members>{(me) => <LibraryPage me={me} />}</Members>],
  ['/:lang/video/:id', (p) => <Members>{(me) => <VideoPage me={me} id={p.id} />}</Members>],
  ['/:lang/courses', () => <Members>{(me) => <CoursesPage me={me} />}</Members>],
  ['/:lang/courses/:id', (p) => <Members>{(me) => <CoursePage me={me} id={p.id} />}</Members>],
  ['/:lang/ask', () => <Members>{(me) => <AskPage me={me} />}</Members>],
  ['/:lang/account', () => <Members allowNoPlan>{(me) => <AccountPage me={me} />}</Members>],
  ['/:lang/admin', () => <Members admin>{() => <AdminPage />}</Members>],
];

function Routes() {
  const { pathname, query } = useRouter();
  const me = auth.useSession();
  const { i18n: inst } = useTranslation();
  const first = pathname.split('/')[1];
  const lang = first === 'es' || first === 'en' ? first : null;

  useEffect(() => {
    if (lang && inst.language !== lang) void i18n.changeLanguage(lang);
    if (lang) rememberLang(lang);
  }, [lang, inst]);

  // No language in the URL: send to the saved or detected one (no splash page).
  if (!lang) {
    const target = me?.lang ?? detectLang();
    const rest = pathname === '/' ? '' : pathname;
    const q = query.toString();
    return <Redirect to={`/${target}${rest}${q ? `?${q}` : ''}`} />;
  }
  for (const [pattern, render] of routes) {
    const params = matchPath(pattern, pathname);
    if (params) return <>{render(params)}</>;
  }
  return <NotFoundPage />;
}

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <Layout>
          <Routes />
        </Layout>
      </ToastProvider>
    </RouterProvider>
  );
}
