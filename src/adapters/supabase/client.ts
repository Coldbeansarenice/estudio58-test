// SUPABASE CLIENT (browser)
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. When either is missing,
// `supabase` is null and every adapter falls back to the demo.
// The publishable key is public by design: row-level security in
// supabase/migrations/ decides what each signed-in member may read or change.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Picks up the session from email confirmation and password-reset links.
        detectSessionInUrl: true,
        // Implicit flow, so a link opened on another device (e.g. the phone's mail app) still works.
        flowType: 'implicit',
      },
    })
  : null;

/** Full URL for links in Supabase emails (confirmation, password reset). */
export const siteUrl = (path: string) => `${window.location.origin}${path}`;
