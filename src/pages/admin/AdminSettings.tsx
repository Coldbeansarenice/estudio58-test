import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../adapters';
import { newId } from '../../demo/store';
import { coachingPlacesUsed } from '../../lib/access';
import { Icon } from '../../components/Icon';
import { Field, useToast } from '../../components/ui';
import { LANGS, TIERS, type Category, type FaqItem, type Localized, type SiteSettings } from '../../types';

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-2xl font-bold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function LocalizedInputs({ label, value, onChange, multiline = false }: { label: string; value: Localized; onChange: (v: Localized) => void; multiline?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LANGS.map((l) => (
        <Field key={l} label={`${label} · ${t(`admin.settings.${l}`)}`}>
          {(id) => multiline
            ? <textarea id={id} lang={l} className="input" rows={4} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
            : <input id={id} lang={l} className="input" value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />}
        </Field>
      ))}
    </div>
  );
}

const euros = (cents: number) => (cents / 100).toFixed(2);
const toCents = (s: string) => Math.max(0, Math.round(parseFloat(s.replace(',', '.')) * 100) || 0);

export function AdminSettings() {
  const { t } = useTranslation();
  const toast = useToast();
  const data = db.useData();
  const [s, setS] = useState<SiteSettings>(data.settings);
  const [cats, setCats] = useState<Category[]>(data.categories);
  const [priceText, setPriceText] = useState<Record<string, string>>(() => ({
    academy: euros(s.prices.academy), review: euros(s.prices.review), coaching: euros(s.prices.coaching), oneOffQuestion: euros(s.prices.oneOffQuestion),
  }));
  const used = coachingPlacesUsed(data);
  const patch = (p: Partial<SiteSettings>) => setS((x) => ({ ...x, ...p }));
  const save = async () => {
    const prices = { ...s.prices, ...Object.fromEntries(Object.entries(priceText).map(([k, v]) => [k, toCents(v)])) } as SiteSettings['prices'];
    await db.saveSettings({ ...s, prices, coachingPlaces: Math.max(0, Math.floor(s.coachingPlaces)), achievements: s.achievements.filter((a) => a.en.trim() || a.es.trim()) });
    await db.saveCategories(cats.filter((c) => c.name.en.trim() || c.name.es.trim()));
    toast(t('admin.settings.savedNote'));
  };
  const fileName = (key: 'logoName' | 'heroImageName' | 'portraitName', label: string) => (
    <Field label={label} hint={s[key] ? t('admin.videos.chosen', { name: s[key] }) : undefined}>
      {(id) => <input id={id} type="file" accept="image/*" className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-[4px] file:border-0 file:bg-surface-2 file:px-4 file:text-fg"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) patch({ [key]: f.name } as Partial<SiteSettings>); }} />}
    </Field>
  );
  const travelSwitch = (
    <button role="switch" aria-checked={s.travelMode} onClick={() => { const v = !s.travelMode; patch({ travelMode: v }); void db.saveSettings({ travelMode: v }); toast(t('admin.settings.savedNote')); }}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-[4px] border border-line bg-surface-2 px-4 text-left">
      <span className="text-sm">{s.travelMode ? t('admin.settings.travelOn') : t('admin.settings.travelOff')}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${s.travelMode ? 'bg-gold' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${s.travelMode ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
  return (
    <div className="space-y-5 pb-24">
      <Section title={t('admin.settings.travel')}>{travelSwitch}</Section>

      <Section title={t('admin.settings.pricing')} note={t('admin.settings.pricingNote')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-muted"><th className="pb-2" /><th className="pb-2 font-medium">{t('admin.settings.price')}</th><th className="pb-2 font-medium">{t('admin.settings.questions')}</th><th className="pb-2 font-medium">{t('admin.settings.reviews')}</th></tr></thead>
            <tbody>
              {TIERS.map((id) => (
                <tr key={id}>
                  <th className="py-1.5 pr-3 text-left font-display text-lg uppercase">{t(`tiers.${id}.name`)}</th>
                  <td className="py-1.5 pr-2"><input className="input" inputMode="decimal" aria-label={`${t(`tiers.${id}.name`)} ${t('admin.settings.price')}`} value={priceText[id]} onChange={(e) => setPriceText({ ...priceText, [id]: e.target.value })} /></td>
                  <td className="py-1.5 pr-2"><input className="input" type="number" min={0} aria-label={`${t(`tiers.${id}.name`)} ${t('admin.settings.questions')}`} value={s.limits[id].questionsPerMonth} onChange={(e) => patch({ limits: { ...s.limits, [id]: { ...s.limits[id], questionsPerMonth: Number(e.target.value) } } })} /></td>
                  <td className="py-1.5"><input className="input" type="number" min={0} aria-label={`${t(`tiers.${id}.name`)} ${t('admin.settings.reviews')}`} value={s.limits[id].reviewsPerMonth} onChange={(e) => patch({ limits: { ...s.limits, [id]: { ...s.limits[id], reviewsPerMonth: Number(e.target.value) } } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.settings.oneOff')}>{(id) => <input id={id} className="input" inputMode="decimal" value={priceText.oneOffQuestion} onChange={(e) => setPriceText({ ...priceText, oneOffQuestion: e.target.value })} />}</Field>
          <Field label={t('admin.settings.places')} hint={t('admin.settings.placesUsed', { used, total: s.coachingPlaces })}>{(id) => <input id={id} className="input" type="number" min={0} value={s.coachingPlaces} onChange={(e) => patch({ coachingPlaces: Number(e.target.value) })} />}</Field>
        </div>
      </Section>

      <Section title={t('admin.settings.texts')}>
        <LocalizedInputs label={t('admin.settings.headline')} value={s.heroHeadline} onChange={(v) => patch({ heroHeadline: v })} />
        <LocalizedInputs label={t('admin.settings.bio')} value={s.bio} onChange={(v) => patch({ bio: v })} multiline />
        <LocalizedInputs label={t('admin.settings.philosophy')} value={s.philosophy} onChange={(v) => patch({ philosophy: v })} multiline />
        <div>
          <LocalizedInputs label={t('admin.settings.announcement')} value={s.announcement ?? { en: '', es: '' }} onChange={(v) => patch({ announcement: v.en || v.es ? v : null })} />
          <p className="hint">{t('admin.settings.announcementNote')}</p>
        </div>
      </Section>

      <Section title={t('admin.settings.achievements')} note={t('admin.settings.achievementsNote')}>
        {s.achievements.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1"><LocalizedInputs label={`${i + 1}`} value={a} onChange={(v) => patch({ achievements: s.achievements.map((x, j) => (j === i ? v : x)) })} /></div>
            <button className="btn-quiet mt-7 !px-2" aria-label={t('common.remove')} onClick={() => patch({ achievements: s.achievements.filter((_, j) => j !== i) })}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <button className="btn-ghost" onClick={() => patch({ achievements: [...s.achievements, { en: '', es: '' }] })}><Icon name="plus" size={16} />{t('common.add')}</button>
      </Section>

      <Section title={t('admin.settings.faq')}>
        {s.faq.map((f, i) => (
          <div key={f.id} className="space-y-2 border-b border-line pb-4">
            <LocalizedInputs label={t('admin.settings.question')} value={f.q} onChange={(q) => patch({ faq: s.faq.map((x) => (x.id === f.id ? { ...x, q } : x)) })} />
            <LocalizedInputs label={t('admin.settings.answer')} value={f.a} multiline onChange={(a) => patch({ faq: s.faq.map((x) => (x.id === f.id ? { ...x, a } : x)) })} />
            <div className="flex gap-1">
              <button className="btn-quiet !min-h-9" disabled={i === 0} onClick={() => { const n = [...s.faq]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; patch({ faq: n }); }}><Icon name="up" size={16} />{t('common.moveUp')}</button>
              <button className="btn-quiet !min-h-9" onClick={() => patch({ faq: s.faq.filter((x) => x.id !== f.id) })}><Icon name="trash" size={16} />{t('common.remove')}</button>
            </div>
          </div>
        ))}
        <button className="btn-ghost" onClick={() => patch({ faq: [...s.faq, { id: newId('f'), q: { en: '', es: '' }, a: { en: '', es: '' } } as FaqItem] })}><Icon name="plus" size={16} />{t('admin.settings.addFaq')}</button>
      </Section>

      <Section title={t('admin.settings.categories')}>
        {cats.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <div className="flex-1"><LocalizedInputs label={t('library.category')} value={c.name} onChange={(name) => setCats(cats.map((x) => (x.id === c.id ? { ...x, name } : x)))} /></div>
            <button className="btn-quiet mt-7 !px-2" aria-label={t('common.remove')} disabled={data.videos.some((v) => v.categoryId === c.id)} onClick={() => setCats(cats.filter((x) => x.id !== c.id))}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <button className="btn-ghost" onClick={() => setCats([...cats, { id: newId('cat'), name: { en: '', es: '' } }])}><Icon name="plus" size={16} />{t('admin.settings.addCategory')}</button>
      </Section>

      <Section title={t('admin.settings.brand')}>
        {fileName('logoName', t('admin.settings.logo'))}
        {fileName('heroImageName', t('admin.settings.hero'))}
        {fileName('portraitName', t('admin.settings.portrait'))}
        <p className="hint">{t('admin.videos.fileDemo')}</p>
      </Section>

      <Section title={t('admin.settings.social')}>
        <Field label={t('admin.settings.instagram')}>{(id) => <input id={id} className="input" type="url" value={s.instagram} onChange={(e) => patch({ instagram: e.target.value })} />}</Field>
        <Field label={t('admin.settings.ibjjf')}>{(id) => <input id={id} className="input" type="url" value={s.ibjjf} onChange={(e) => patch({ ibjjf: e.target.value })} />}</Field>
      </Section>

      <div className="safe-bottom fixed inset-x-0 bottom-14 z-30 border-t border-line bg-ink/95 py-3 backdrop-blur md:bottom-0">
        <div className="wrap flex justify-end"><button className="btn-gold w-full sm:w-auto" onClick={save}>{t('common.save')}</button></div>
      </div>
    </div>
  );
}
