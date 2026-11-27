// One import point for every outside service. Each service lives in its own file
// and can be swapped without touching the pages.
export { auth } from './auth';
export { db } from './database';
export { email } from './email';
export { payments, demoWebhook } from './payments';
export { video } from './video';

import { auth } from './auth';
import { db } from './database';
import { email } from './email';
import { payments } from './payments';
import { video } from './video';

/** Shown in /admin → Overview so nobody mistakes demo mode for the real thing. */
export const serviceStatus = [
  { key: 'database', service: 'Supabase', mode: db.mode, phase: 3 },
  { key: 'login', service: 'Supabase Auth', mode: auth.mode, phase: 3 },
  { key: 'payments', service: 'Stripe (test mode)', mode: payments.mode, phase: 5 },
  { key: 'video', service: 'Mux', mode: video.mode, phase: 6 },
  { key: 'email', service: 'Resend', mode: email.mode, phase: 7 },
] as const;

export const isDemo = serviceStatus.some((s) => s.mode === 'demo');
