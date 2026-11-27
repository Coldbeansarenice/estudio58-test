// POST /api/delete-account (Vercel function)
// Deletes the signed-in member's login. Every table with their data references auth.users
// with "on delete cascade", so profile, progress, bookmarks, requests and notices go too.
// Needs the server-only secret key, which must never reach the browser:
//   Vercel → Project → Settings → Environment Variables:
//   SUPABASE_SECRET_KEY (sb_secret_...) or SUPABASE_SERVICE_ROLE_KEY,
//   and SUPABASE_URL (or the existing VITE_SUPABASE_URL).
// TODO (Phase 5): cancel the member's Stripe subscription here before deleting.
import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return json(500, { error: 'not_configured' });

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  // Who is asking comes only from their own access token, never from the request body.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json(401, { error: 'not_signed_in' });

  const del = await admin.auth.admin.deleteUser(data.user.id);
  if (del.error) return json(500, { error: 'delete_failed' });
  return json(200, { ok: true });
}
