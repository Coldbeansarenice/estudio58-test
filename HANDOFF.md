# Estudio 58 — HANDOFF

> Read this file first at the start of every session. Update it at the end of every phase.
> Items marked **[OPEN]** are not decided yet. Ask the owner before building them.
> Version 2 (26 Nov 2026): merges the owner's original brief with the useful parts of a Lovable-generated brief.

## 1. The product in one line

Estudio 58 is a premium, bilingual (English / Spanish) online no-gi Brazilian Jiu-Jitsu academy by Jean Maltese (@jeanlucajj), with structured video courses, footage reviews and online coaching, sold as three monthly membership tiers.

## 2. Core rule

**Open, find, watch, ask.** Nothing on screen exists unless it helps a member find a technique, watch it, or ask Jean something.

It must feel like a premium international sports education brand, not a martial arts gym website and not a generic SaaS template.

## 3. The coach

- **Name on site:** Jean Maltese. Instagram: https://www.instagram.com/jeanlucajj/ (IBJJF profile: https://ibjjf.com/athletes/jean-maltese)
- Venezuelan. Competitive no-gi black belt.
- **Achievements** (editable in /admin; never add, invent or embellish):
  - 2026 European No-Gi Champion
  - 2025 European No-Gi Silver Medallist
  - 2024 European No-Gi Silver Medallist
  - 2024 ADCC Trials Medallist
  - Polaris Champion and Polaris veteran
  - Multiple-time National Champion
- Bio, training philosophy and portrait: **[OPEN]** owner to supply.

## 4. Who it is for

- All levels: beginners, hobbyists, competitors and coaches.
- Main growth market: the Spanish-speaking BJJ community, which is under-served today. English is the second audience.
- Visitors arrive mostly from Jean's Instagram, where free clips are posted.

## 5. Membership tiers (EUR, monthly, Stripe Billing)

Prices shown to customers include VAT (EU law requires consumer prices to include VAT). They are set so the owner keeps at least his target price after Irish VAT (23%).

| Tier | Owner's target (excl. VAT) | Price shown (incl. VAT) | Includes |
|---|---|---|---|
| 1. **Academy / Academia** | €10 / month | **€12.99 / month** | Full video library and all courses, in both languages. No Ask JLM questions included. |
| 2. **Review / Análisis** | €30 / month | **€36.99 / month** | Academy + **2 footage reviews a month** + **2 Ask JLM questions a month** |
| 3. **Coaching / Entrenamiento** | €60 / month | **€73.99 / month** | Academy and Review + **5 footage reviews a month** + **5 Ask JLM questions a month** + online coaching: **1 call a week**, at a pre-arranged time, **max 45 minutes**, on any video-call app |
| One-off question (Academy members) | €15 | **€18.99** each | One Ask JLM technique question, paid by card at the time of asking |

Prices are approved by the owner (26 Nov 2026) and can be edited in /admin.

**Coaching places are limited to 10.**
- /admin shows places used (e.g. "7 / 10"), and the limit is editable.
- When all 10 are taken, the Coaching card shows "Full: join the waitlist" (EN) / "Completo: únete a la lista de espera" (ES). Waitlist sign-ups need an account but no payment. Jean gets an email for each one and invites people from /admin when a place opens.
- The server refuses Coaching checkout when places are full, even if someone gets to the checkout page directly.

**Footage review fine print** (shown under the review form and on the membership page, EN/ES):
- Each review covers one match, or up to 10 minutes of footage.
- Unused reviews and questions don't carry over to the next month.
- Reviews are answered within 72 hours (6 days when Jean is travelling).

Rules:

- **Everything is behind the paywall.** Visitors who aren't signed in see only public pages: home, about, membership, FAQ and legal. There are no free videos on the site.
- One account can switch tiers (upgrade or downgrade) through the Stripe customer portal. Upgrades apply immediately, and the member pays only the difference for the rest of the month (Stripe's default). Downgrades apply at the next renewal. Upgrading to Coaching is only possible while a place is free. *(Proposed default; owner can change.)*
- Cancelling keeps access until the end of the paid month.
- A failed payment keeps access during Stripe's retry period, then access is paused until the payment is fixed.
- Changing language never needs a new subscription.
- Prices and question limits are editable in /admin and treated as provisional until the owner approves them.
- No annual plan at launch (it may come later with discounts).
- VAT: Jean is based in Ireland. Prices are VAT-inclusive, and Stripe Tax works out the VAT in each sale. Under €10,000 a year of cross-border EU digital sales, Irish VAT (23%) applies; above it, the buyer's country rate applies. **[OPEN, accountant]** Confirm: (a) whether VAT registration is needed yet; (b) how live coaching calls and personal footage reviews are treated, since services with real human work may follow different VAT rules from automatic video access; (c) rules for buyers outside the EU (Latin America, US).
- Live coaching calls happen **outside the site** in version 1. The site handles scheduling requests only.

## 6. Languages

- Two complete languages: **English (`/en`)** and **Spanish (`/es`)**. All routes are localised.
- **Language on first visit:** detect the browser language. Spanish browsers get `/es`; everything else gets `/en`. **English is the default.** There is no splash page.
- The choice is saved in localStorage and in the member's profile. Returning visitors land in their language.
- An EN/ES switcher sits in the navigation and in account settings.
- Every visible piece of text is translated: navigation, buttons, forms, validation and error messages, emails, notifications, legal pages, Ask JLM, and /admin. Use a central i18n system (i18next). Write neutral international Spanish that works for both Spain and Latin America.
- **Videos are recorded twice, once in each language.** Each video record has an English version and a Spanish version, each with its own title, description and video file.
  - A language's library shows only that language's version.
  - If one version is missing, that video is hidden from that language's library. Never show an English video in the Spanish library, or the reverse.
- Courses work the same way: one course record, with an English lesson list and a Spanish lesson list.

## 7. Content

- **No-gi only** for now. No Gi/No-Gi filter or label until gi content exists.
- Short lessons, 2 to 5 minutes each, organised into **courses** (ordered modules and lessons).
- First batch: about 1 hour per language, so roughly 2 hours of recording.
- Library categories: Guard Passing, Guard Retention, Open Guard, Half Guard, Takedowns and Wrestling, Submissions, Leg Locks, Back Control, Escapes and Defence, Positional Control, Competition Strategy, Sparring Breakdowns, Training Concepts. (Editable in /admin.)
- Filters: category, level (beginner / intermediate / advanced), content type, duration, recently added.
- Content types: technique, course lesson, competition analysis, sparring breakdown, Q&A answer video.
- Each video has: EN title and description, ES title and description, category, level, content type, thumbnail, draft/published status, and a "featured" flag.
- Upload frequency after launch: **[OPEN]**

## 8. Ask JLM (one section for all requests)

Members-only. The form has one **request type** selector:

| Type | Who can send | Limit |
|---|---|---|
| Technique question | Review, Coaching; Academy pays €18.99 per question | 2 a month (Review), 5 a month (Coaching) |
| Footage review | Review, Coaching | 2 a month (Review), 5 a month (Coaching) |
| Online coaching call scheduling | Coaching tier | 1 call a week, max 45 minutes |
| Private lesson / seminar enquiry | All members | No limit; price agreed and paid outside the site |

- When a member reaches their monthly limit, the form shows how many they have left and when it resets. Tier 1 members see the one-off €18.99 option instead.

Rules:

- A question can be linked to a specific video ("Ask JLM about this technique" button on each video page).
- The member chooses **Private** (seen only by them and Jean) or **Public** (shared with other members after Jean approves it).
- Footage reviews: the member pastes a link (YouTube unlisted, Google Drive, Instagram, etc.). No uploads from members in version 1.
- Jean answers from /admin with **written text, a short video reply, or a link to an existing lesson**.
- Statuses: new, in progress, answered, declined. The member gets an email and an in-app notice when Jean replies.
- Answers are given in the language the question was asked in.
- **Reply promise: within 72 hours.** A visible notice says answers are asynchronous.
- **Travel mode:** a switch in /admin. When it's on, the site says "Jean is travelling: replies within 6 days" (EN/ES) on Ask JLM and in confirmation emails, until it's switched off.
- Members can browse approved public questions in their language. They can't comment or vote in version 1.
- No live chat and no in-site video calls in version 1.

## 9. Pages

| Page | Who | Contents |
|---|---|---|
| Home | Everyone | Cinematic hero (photo or short video, dark overlay), headline, achievements, what members get, the 3 tiers, about Jean, FAQ, footer |
| About Jean | Everyone | Large portrait, achievements, bio, philosophy, Instagram |
| Membership | Everyone | The 3 tiers compared, with a clear recurring-billing notice before checkout |
| Sign up / log in | Everyone | Email + password, email verification, password reset |
| Dashboard | Members | Welcome, Continue Watching, New, Recommended for your level, Browse by position, Saved, Recent answers from Jean, membership status |
| Library | Members | Search and filters, video cards (thumbnail, title, duration, category, level) |
| Video page | Members | Player (speed control, full screen, resume), title, description, mark complete, save, related videos, "Ask JLM about this" |
| Courses | Members | Course list; course page with cover, description, level, total time, lesson count, ordered lessons, progress, Start/Continue |
| Ask JLM | Members | New request, my requests and their status, public answers |
| My account | Members | Name, language, belt and training interests, subscription (Stripe portal), saved videos, progress, my requests, delete account, log out |
| Admin `/admin` | Jean only | See section 10 |
| Terms, privacy, cancellation info | Everyone | Placeholder legal pages, to be checked by a professional |

Onboarding after signup (optional, skippable): first name, belt, training interests. The member is then sent to checkout, or to the dashboard if already subscribed.

## 10. Admin (`/admin`, desktop-first, non-technical)

No fields that ask for codes or technical numbers.

- **Overview** (real data only): active members per tier, monthly recurring revenue, requests waiting, published and draft videos, new members.
- **Videos:** upload EN and ES files, thumbnails, titles and descriptions in both languages, category, level, type, draft/publish, featured, safe delete.
- **Courses:** create, translate, add/remove/reorder lessons by dragging, publish.
- **Ask JLM inbox:** filter by type, language, status, privacy and tier. Reply with text, video or a lesson link. Approve public questions.
- **Members:** profile, tier, status, language, joined date. Never shows card details.
- **Site settings:** logo, hero images, bio, achievements, social links, FAQ, tier prices and limits (synced with Stripe), one-off question price, **travel mode switch**, announcements.

## 11. The look (to explore in Phase 1)

- **References:** Submeta (course structure), Nomadic Grappling Online (athlete subscription and community), BJJ Fanatics (premium instructional presentation), Netflix (browsing rows, continue watching), Nike (minimal athletic branding). Use them for inspiration; don't copy them.
- **Base:** dark and cinematic. Near-black `#0A0A0A`, surfaces `#191919` / `#202020`, text `#F5F5F5` / `#A3A3A3`.
- **Accent: chosen direction A, "Gold lead"** (inspired by the Venezuelan flag, used with restraint):
  - Gold `#F2B90F` is the only main accent: primary buttons, active states, highlights. Text on gold is near-black `#0A0A0A`.
  - Blue `#00247D` and red `#CF142B` appear only in a thin yellow-blue-red tricolour stripe (under the logo, in the footer, and as a small detail on achievement cards).
  - Red can also be used for error messages.
- **Type:** Barlow Condensed or Oswald for headings (bold, editorial, uppercase); Inter for body text.
- Cinematic sports photography, strong hierarchy, generous spacing, subtle transitions.
- **Avoid:** heavy gradients, big rounded "bubble" cards, generic SaaS illustrations, unnecessary animation.
- Logo: a typographic "ESTUDIO 58" wordmark for now, to be replaced later by the official logo.
- Placeholder photos must never be presented as Jean.
- Mobile-first (one-handed navigation on phones), and excellent on laptop and tablet. The owner checks on both.

## 12. Text and tone

- Direct, coach-to-athlete, confident, no hype.
- Hero (EN): "TRAIN WITH PURPOSE. MASTER YOUR JIU JITSU." (ES): "ENTRENA CON PROPÓSITO. DOMINA TU JIU JITSU." *(Provisional.)*
- Include a training disclaimer: practise techniques responsibly, with qualified supervision.

## 13. Do NOT build (version 1)

Merch, a native app, live streaming, public social feeds, comments or likes on videos, points/badges/leaderboards, multiple instructor accounts, ads, free videos on the site, fake testimonials, fake member counts or fake statistics.

## 14. Technical setup

| Piece | Service |
|---|---|
| Website | React + Vite + TypeScript + Tailwind, installable as a PWA |
| AI builder | Claude Code (claude.ai/code), working in the GitHub repo |
| Code | GitHub |
| Hosting | Vercel |
| Database and logins | Supabase (Postgres, Auth, row-level security) |
| Payments | Stripe Billing: 3 prices, Checkout, customer portal, Stripe Tax, webhooks |
| Video | **Mux** (proposed; see the cost note in section 16), behind an adapter so Bunny Stream can be swapped in |
| Emails | Resend |
| Domain | **estudio58bjj.com**, bought on Cloudflare (registered for 2 years) |

Non-negotiable rules:

- Every outside service sits behind its own small adapter file.
- **Paid access comes only from webhook-confirmed Stripe subscription status.** Never unlock content from a checkout redirect or a value in the browser.
- Tier limits (questions, reviews) are enforced on the server.
- Premium video plays only through short-lived signed links created on the server. Raw video URLs are never sent to the browser in database responses.
- Row-level security on every table with user data or restricted content. Members can only change their own profile, bookmarks, progress and requests. Private requests are never visible to other members.
- Admin roles are assigned on the server only.
- Secret keys live in service dashboards or Vercel environment variables, never in code or chat.
- Stripe stays in **test mode** until the owner explicitly approves going live.
- Real data only: no fabricated stats or activity. Demo/sample records are clearly labelled and removed before launch.
- If a service isn't connected yet, show a clearly labelled demo state instead of pretending it works.
- Every button does something. No dead links.
- GDPR: cookie consent for non-essential tracking only, account deletion, data export on request, private member pages not indexed. Localised titles, meta descriptions, hreflang and Open Graph tags on public pages.

Proposed tables: profiles, user_roles, subscriptions, categories, videos, video_versions (per language: title, description, video asset, subtitles), courses, course_versions, course_lessons, watch_progress, bookmarks, requests (Ask JLM), request_replies, notifications, site_settings.

## 15. Plan and dates (target: ready mid-January 2027)

| Week | Phase |
|---|---|
| 26 Nov–30 Nov | Phase 0: finish this brief and answer the open items. Create the GitHub repo. |
| 1–7 Dec | Phase 1: clickable fake with demo data, all pages in EN/ES, Gold lead design. Phase 2: online on Vercel. |
| 8–14 Dec | Phase 3: Supabase database and logins. Phase 4: admin (videos, courses). |
| 15–21 Dec | Phase 5: Stripe, 3 tiers, test mode, customer portal, Stripe Tax. |
| 22 Dec–4 Jan | Holiday buffer. **Record the first ~2 hours (EN + ES).** Owner writes bio and FAQ answers. |
| 5–9 Jan | Phase 6: Mux video, upload the first batch. Phase 7: Ask JLM and emails. |
| 10–14 Jan | Phase 8: homepage polish and real content. Phase 9: connect the domain, legal pages. Phase 10: QA test pass, fix issues. |
| ~15 Jan | Owner approves, Stripe goes live, one real purchase and refund, **launch**. |

## 16. Running costs (estimate)

- Video (Mux): storage about $0.003 per minute per month at 1080p, so 2 hours stored costs well under $1. Mux includes 100,000 free delivery minutes a month plus a $20 monthly usage credit on pay-as-you-go, which covers roughly 300+ members watching several hours a month. Bunny Stream would cost about the same or slightly more at this size (pay per GB, about $0.01 per GB delivered).
- Supabase: free, then about $25 a month once real members exist (needed for backups).
- Vercel, Resend: free tiers at launch.
- Stripe: about 1.5% + €0.25 per EU card payment, plus Stripe Tax and Billing fees.
- Domain: paid for 2 years.

## 17. Status

- Phase 0: in progress (v2 of this brief, 26 Nov 2026).
- Stripe account: set up and verified by the owner. Use test mode only.
- Domain estudio58bjj.com: purchased on Cloudflare.
- Nothing built yet.
