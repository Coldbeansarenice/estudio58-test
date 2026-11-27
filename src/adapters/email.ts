// EMAIL ADAPTER
// Phase 1 (now): demo. Emails are not sent; they are listed in /admin → Overview → "Demo email outbox".
// Phase 7: replace `demoEmail` with a Resend version that calls a server function
// (the Resend key never reaches the browser).
import i18n from '../i18n';
import { demoStore, newId } from '../demo/store';
import type { Lang } from '../types';

export type EmailTemplate =
  | 'verify' | 'reset' | 'welcome'
  | 'requestReceived' | 'reply'
  | 'waitlistOwner' | 'waitlistInvite'
  | 'paymentFailed';

export interface EmailAdapter {
  readonly mode: 'demo' | 'resend';
  send(template: EmailTemplate, to: string, lang: Lang, vars?: Record<string, string>): Promise<void>;
}

/** Address shown for emails meant for Jean. Real address set in Phase 7. */
export const OWNER_INBOX = 'Jean (owner inbox)';

const demoEmail: EmailAdapter = {
  mode: 'demo',
  async send(template, to, lang, vars = {}) {
    const t = i18n.getFixedT(lang);
    const travel = demoStore.get().settings.travelMode;
    const subject = t(`email.${template}`, { ...vars, defaultValue: template })
      + (travel && (template === 'requestReceived') ? ` · ${t('ask.travelShort')}` : '');
    demoStore.set((s) => ({
      outbox: [{ id: newId('mail'), to, template, lang, subject, createdAt: new Date().toISOString() }, ...s.outbox],
    }));
  },
};

export const email: EmailAdapter = demoEmail;
