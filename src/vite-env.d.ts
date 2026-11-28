/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "memory" only for the single-file phone preview. Leave unset on Vercel. */
  readonly VITE_ROUTER_MODE?: 'browser' | 'memory';
  /** Supabase project URL. Leave unset (with the key) to run the demo. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (sb_publishable_...). Public by design: row-level security protects the data. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
