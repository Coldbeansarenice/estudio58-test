import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, demoWebhook, payments } from '../adapters';
import { activeTier, coachingFull, coachingPlacesUsed } from '../lib/access';
import { lp, useLang } from '../lib/content';
import { money } from '../lib/format';
import { useRouter } from '../lib/router';
import { TIERS, type TierId } from '../types';
import { Icon } from './Icon';
import { Modal, Tricolour, useToast } from './ui';

export function TierCards({ autoOpen }: { autoOpen?: TierId | null }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { navigate } = useRouter();
  const toast = useToast();
  const me = auth.useSession();
  const data = db.useData();
  const s = data.settings;
  const current = activeTier(me);
  const full = coachingFull(data.members, s);
  const used = coachingPlacesUsed(data.members);
  const onWaitlist = !!me && data.waitlist.some((w) => w.memberId === me.id);

  const [confirm, setConfirm] = useState<TierId | null>(null);
  const [agree, setAgree] = useState(false);
  const [demoCheckout, setDemoCheckout] = useState<TierId | null>(null);

  useEffect(() => {
    if (autoOpen && me && !current) { setConfirm(autoOpen); setAgree(false); }
  }, [autoOpen, me, current]);

  const tierName = (id: TierId) => t(`tiers.${id}.name`);

  const choose = (id: TierId) => {
    if (!me) { navigate(lp(lang, `/signup?tier=${id}`)); return; }
    if (current) { navigate(lp(lang, '/account#subscription')); return; }
    setAgree(false);
    setConfirm(id);
  };

  const toPayment = async () => {
    if (!confirm || !me) return;
    const res = await payments.startCheckout(me.id, confirm);
    setConfirm(null);
    if (res.kind === 'refused') { toast(t(`membership.refused.${res.reason}`)); return; }
    if (res.kind === 'redirect') { window.location.href = res.url; return; }
    setDemoCheckout(res.tier);
  };

  const simulateWebhook = () => {
    if (!me || !demoCheckout) return;
    const ok = demoWebhook.checkoutCompleted(me.id, demoCheckout);
    const tier = demoCheckout;
    setDemoCheckout(null);
    if (!ok) { toast(t('membership.refused.coachingFull')); return; }
    toast(t('membership.welcome', { tier: tierName(tier) }));
    navigate(lp(lang, '/dashboard'));
  };

  const joinWaitlist = async () => {
    if (!me) { navigate(lp(lang, '/signup?waitlist=1')); return; }
    await payments.joinWaitlist(me.id);
    toast(t('tiers.joinedWaitlist'));
  };

  const features = (id: TierId) => {
    const lim = s.limits[id];
    if (id === 'academy') return [t('tiers.f.library'), t('tiers.f.bothLangs'), t('tiers.f.noQuestions', { price: money(s.prices.oneOffQuestion, lang) })];
    if (id === 'review') return [t('tiers.f.everything', { tier: tierName('academy') }), t('tiers.f.reviews', { count: lim.reviewsPerMonth }), t('tiers.f.questions', { count: lim.questionsPerMonth })];
    return [t('tiers.f.everything', { tier: tierName('review') }), t('tiers.f.reviews', { count: lim.reviewsPerMonth }), t('tiers.f.questions', { count: lim.questionsPerMonth }), t('tiers.f.call')];
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((id, i) => {
          const isCurrent = current === id && me?.role !== 'admin';
          const isFull = id === 'coaching' && full && !isCurrent;
          return (
            <article key={id} className={`card relative flex flex-col overflow-hidden p-5 sm:p-6 ${i === 1 ? 'md:border-gold/50' : ''}`}>
              {i === 2 && <Tricolour className="absolute inset-x-0 top-0" />}
              <h3 className="text-[28px] font-extrabold">{tierName(id)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`tiers.${id}.line`)}</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-[44px] font-bold leading-none tabular-nums">{money(s.prices[id], lang)}</span>
                <span className="text-sm text-muted">{t('common.perMonth')}</span>
              </p>
              <p className="text-xs text-muted">{t('common.vatIncluded')}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">
                {features(id).map((f) => (
                  <li key={f} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-gold" />{f}</li>
                ))}
              </ul>
              {id === 'coaching' && !isCurrent && (
                <p className="mt-4 text-sm text-muted">
                  {full ? t('tiers.waitlistNote') : t('tiers.places', { left: s.coachingPlaces - used, total: s.coachingPlaces })}
                </p>
              )}
              <div className="mt-5">
                {isCurrent ? (
                  <button className="btn-ghost w-full" onClick={() => navigate(lp(lang, '/account#subscription'))}>{t('tiers.current')} · {t('tiers.change')}</button>
                ) : isFull ? (
                  <button className="btn-ghost w-full" disabled={onWaitlist} onClick={joinWaitlist}>
                    {onWaitlist ? t('tiers.joinedWaitlist') : t('tiers.full')}
                  </button>
                ) : (
                  <button className={`${i === 1 && !current ? 'btn-gold' : 'btn-ghost'} w-full`} onClick={() => choose(id)}>
                    {current ? t('tiers.change') : t('tiers.choose', { tier: tierName(id) })}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={t('membership.confirmTitle')}>
        {confirm && (
          <div className="space-y-4">
            <p>{t('membership.confirmBody', { tier: tierName(confirm), price: money(s.prices[confirm], lang) })}</p>
            <p className="text-sm text-muted">{t('membership.billing')}</p>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[#F2B90F]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>{t('membership.agree')}</span>
            </label>
            <button className="btn-gold w-full" disabled={!agree} onClick={toPayment}>{t('membership.toPayment')}</button>
          </div>
        )}
      </Modal>

      <Modal open={!!demoCheckout} onClose={() => setDemoCheckout(null)} title={t('membership.demoTitle')}>
        {demoCheckout && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t('membership.demoBody')}</p>
            <div className="rounded-[4px] border border-line bg-surface-2 p-4">
              <p className="font-display text-xl font-bold uppercase">{tierName(demoCheckout)}</p>
              <p className="tabular-nums">{money(s.prices[demoCheckout], lang)} {t('common.perMonth')} · {t('common.vatIncluded')}</p>
            </div>
            <button className="btn-gold w-full" onClick={simulateWebhook}>{t('membership.simulate')}</button>
          </div>
        )}
      </Modal>
    </>
  );
}
