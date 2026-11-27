# Estudio 58

Bilingual (English / Spanish) online no-gi Jiu Jitsu academy by Jean Maltese.
**Phase 1: clickable demo.** Everything runs on fake in-memory data, so it needs no accounts or keys.
Read `HANDOFF.md` first: it is the brief, and it says what is decided and what is still open.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also on your Wi-Fi, see below)
npm run build      # production build into dist/
```

Requires Node 20 or newer.

## See it on your phone

1. **Same Wi-Fi (quickest):** run `npm run dev`. Vite prints a `Network:` address such as `http://192.168.1.20:5173`. Open that on your phone.
2. **Vercel (Phase 2, the real way):** push this folder to GitHub, then in Vercel choose *Add New → Project*, pick the repo and press *Deploy* (Vercel detects Vite by itself; `vercel.json` already sends every page to the app). Open the `*.vercel.app` link on your phone. Each push gives a fresh preview link.
3. **Install as an app:** on the Vercel link, iPhone (Safari): *Share → Add to Home Screen*. Android (Chrome): *⋮ → Install app*. Installing needs HTTPS, so it works on Vercel, not on the Wi-Fi address.

## Using the demo

- A gold **DEMO** bar sits at the top of every page. Its **View as** menu switches between: visitor (signed out), Ana (Academy), Marco (Review), Lucía (Coaching) and Jean (Admin).
- You can also sign up with any email and an 8+ character password, or log in as any `*.demo@example.com` address.
- Checkout never asks for a card. The demo shows the step where Stripe would confirm the payment, and access only opens after you press **Simulate confirmed payment**. That mirrors the real rule: access comes only from the Stripe webhook.
- **My account → Manage subscription** stands in for Stripe's customer portal: upgrade, downgrade, cancel, and simulated failed payments.
- **/admin** (as Jean): overview, videos, courses, Ask JLM inbox, members, site settings (prices, limits, coaching places, travel mode, FAQ, achievements). The overview lists the emails the site *would* have sent.
- Reloading the page resets all demo data.

## How it is built

| Folder | What is in it |
|---|---|
| `src/adapters/` | **One file per outside service:** `database.ts` (Supabase), `auth.ts` (Supabase Auth), `payments.ts` (Stripe), `video.ts` (Mux), `email.ts` (Resend). Each one exports an interface plus a demo version. Later phases swap the demo version for the real one. Pages never call a service directly. |
| `src/demo/` | The fake data (`seed.ts`, every record marked `isDemo`) and the in-memory store. Delete before launch. |
| `src/i18n/` | i18next setup, browser-language detection, and `locales/en.ts` + `locales/es.ts`. **Every visible word lives here.** `es.ts` is typed against `en.ts`, so a missing Spanish key fails the build. |
| `src/lib/access.ts` | Membership rules in one place: who has access, monthly question/review limits, coaching places. |
| `src/lib/content.ts` | The language rule: a library shows only videos recorded in its language; a video missing a version is hidden there. |
| `src/lib/router.tsx` | Small built-in router (`/en/...`, `/es/...`). |
| `src/pages/` | Public pages, sign-up/log-in, member pages, Ask JLM, account, and `admin/`. |
| `public/` | PWA manifest, service worker (never caches video), icons. |

Design tokens (Gold lead) are at the top of `src/index.css`.

## Rules already wired in (see HANDOFF.md §14)

- Paid access is read only from the subscription status, which only the (simulated) webhook changes.
- Coaching checkout is refused when places are full, even if the checkout step is reached directly.
- Tier limits are checked in the data adapter (the server, later), not just hidden in the form.
- Video plays through `video.getPlayback()`, which in Phase 6 returns a short-lived signed link. No raw video URLs anywhere.
- Member pages are marked `noindex`; public pages get localised titles, descriptions, Open Graph and hreflang tags.

## Known gaps in Phase 1

- Real photos, Jean's bio and philosophy are **[OPEN]** in the handoff; placeholders are labelled "Photo to come · Placeholder, not Jean".
- Legal pages are placeholder text, to be checked by a professional.
- The demo player plays a timer, not video (Mux arrives in Phase 6).
- The browser's own "Choose file" button text follows the phone's language, not the site's.
