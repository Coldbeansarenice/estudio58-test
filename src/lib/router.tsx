// Tiny router: enough for Phase 1, no dependency.
// Mode "browser" (default, used on Vercel): real URLs like /es/library.
// Mode "memory" (the hosted phone preview, which can't change its URL): same routes, kept in memory.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

const MODE: 'browser' | 'memory' = (import.meta.env.VITE_ROUTER_MODE as 'memory' | undefined) ?? 'browser';

interface RouterValue {
  path: string; // pathname + search
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  back: () => void;
}

const RouterCtx = createContext<RouterValue | null>(null);

const currentBrowserPath = () => window.location.pathname + window.location.search;

export function RouterProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>(() => [MODE === 'browser' ? currentBrowserPath() : '/']);
  const path = stack[stack.length - 1];

  useEffect(() => {
    if (MODE !== 'browser') return;
    const onPop = () => setStack([currentBrowserPath()]);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (MODE === 'browser') {
      if (opts?.replace) window.history.replaceState(null, '', to);
      else window.history.pushState(null, '', to);
    }
    setStack((s) => (opts?.replace ? [...s.slice(0, -1), to] : [...s.slice(-30), to]));
    if (!to.includes('#')) window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(() => {
    if (MODE === 'browser') { window.history.back(); return; }
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const value = useMemo(() => ({ path, navigate, back }), [path, navigate, back]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterCtx);
  if (!ctx) throw new Error('useRouter outside RouterProvider');
  const [pathname, search = ''] = ctx.path.split('?');
  return { ...ctx, pathname, query: new URLSearchParams(search) };
}

/** Match "/:lang/video/:id" against "/es/video/v-1". */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean };

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (MODE === 'browser' && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
    >
      {children}
    </a>
  );
}

export const routerMode = MODE;
