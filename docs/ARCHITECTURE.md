# Architecture

> Describes the code on `main` as of commit `718fe5d` (28 Oct 2026). Proposed changes are in the PRDs, not here. If the code and this file disagree, **the code wins**: fix this file.

## Big picture

```
 Browser (public/index.html, one static page)          Vercel serverless functions (api/)          Outside services
 ─────────────────────────────────────────────         ───────────────────────────────────         ─────────────────
 planner + request form  ── POST /api/otp ──────────▶  otp.js      (6-digit email code)  ──────▶ Gmail SMTP (nodemailer)
                         ── POST /api/request ──────▶  request.js  validate → re-price →  ──────▶ Telegram Bot API
                                                                    Telegram → PDF → email ──────▶ Gmail SMTP
                                                                    → recordRequest       ──────▶ Upstash Redis (REST)
 friend link opened      ── POST /api/event ────────▶  event.js    (count link opens)     ──────▶ Upstash Redis
 capsule QR  /c          ── GET  (rewrite) ─────────▶  scan.js     (count, 307 to /?src=capsule#offer)
 feedback.html           ── POST /api/feedback ─────▶  feedback.js (stars, comment, photo) ──────▶ Telegram
 admin.html              ── GET/POST /api/admin ────▶  admin.js    (password, stats, mark/undo, send digest)
 Telegram buttons        ── GET  /api/status ───────▶  status.js   (signed link → markStatus)
 Vercel Cron 01:00 UTC   ── GET  /api/digest ───────▶  digest.js    (CRON_SECRET → Telegram to-do)
 analytics (no personal data) ─────────────────────────────────────────────────────────────────▶ PostHog
```

There is **no customer database and no login for customers**. Bookings are confirmed by a person on WhatsApp. Nothing is paid online.

## Front end
- `public/index.html` is **generated** by `npm run build` (`dev/build.mjs`) from `src/`. Never edit it by hand.
- `src/markup.html` (content), `src/styles.css` (styles, appended in numbered `/* vNN */` blocks; v66 is the latest), `src/app.js` (all browser logic, one IIFE, ES5 style with `var`), `src/base.html` / `src/base-v2.html` (`<head>`, base styles, SVG icon sprite).
- Other pages built from `src/` with the shared header/footer: `stores.html` (Tom & Stefanie physical stores), `feedback.html`, `admin.html`.
- The build also writes SEO tags, JSON-LD (Organization, FAQ), `robots.txt` and `sitemap.xml`, and injects the WhatsApp country list from `lib/phone.js`.
- Browser analytics: `track(event, props)` in `src/app.js` sends events (e.g. `addon_added`, `store_opened`) to PostHog, without personal data. Referral code / source are kept in `localStorage` so a friend's offer survives a page reload.

## Catalogue and pricing (single source of truth)
1. Prices are written in `src/app.js`: `MIN_PAX`, `CONTAINER`, `WAX`, `WAX_DUO`, `LOGISTICS`, `EXP` (Jelly/Crunchy/Duo), `CATS`, `P` (add-ons), `STORES` (partner store sheets).
2. `npm run catalogue` (`dev/extract-catalogue.mjs`) extracts them from the **built** page into `lib/catalogue.js`.
3. `lib/pricing.js` `priceRequest(plan)` re-prices every request from `lib/catalogue.js`. Browser totals are only compared, never trusted.
- Money is integer cents. `price:null` = "In your quote", never 0.
- Add-on `status`: `demo` (placeholder price, shows "Demo price"; 103 items today), `partner` (priced in the quote; 4 items), `approved` (agreed; 18 items). The comment in `src/app.js` also mentions `prospective`.
- Butter Studio items are generated from `dev/butter-studio.json` by `dev/butter-studio.mjs`.

## Server (`api/`, `lib/`)
| Route | File | Auth | Purpose |
|---|---|---|---|
| `POST /api/otp` | `api/otp.js` | same-origin, rate limit | Send / check a 6-digit email code (HMAC-signed, no DB; code 10 min, verified 2 h) |
| `POST /api/request` | `api/request.js` | same-origin, 5 per 10 min per instance, honeypot, verified-email token | Validate, re-price, Telegram, PDF quotation (every request), confirmation email, record for dashboard |
| `POST /api/event` | `api/event.js` | same-origin, rate limit | Count a valid referral link opened |
| `GET /c` → `/api/scan` | `api/scan.js` | none | Count a capsule QR scan, redirect to the offer |
| `POST /api/feedback` | `api/feedback.js` | same-origin, rate limit | After-party stars/comment/photo to Telegram |
| `GET/POST /api/admin` | `api/admin.js` | `Bearer ADMIN_PASSWORD` (12+ chars, constant time, 10 failures / 15 min per hashed IP in Redis) | Dashboard data; mark/undo statuses; send digest now |
| `GET /api/status` | `api/status.js` | HMAC-signed link per ref + status | One-tap status from Telegram |
| `GET /api/digest` | `api/digest.js` | `Bearer CRON_SECRET` (16+ chars) | Daily Telegram to-do |

Shared libraries: `validate.js` (every field), `pricing.js`, `catalogue.js` (generated), `telegram.js` (message, WhatsApp links), `emails.js` + `mail.js` (nodemailer), `otp.js` (`sign()` used by referral and status links too), `referral.js`, `status-link.js`, `stats.js` (Redis over REST; in-memory with `STATS_MEMORY=1`), `digest.js`, `quote-pdf.js` (hand-written PDF, no packages), `quote-logo.js`, `phone.js`, `feedback.js`, `http.js` (JSON body limit, same-origin, IP, best-effort limiter).

## Data stored (Upstash Redis, prefix `cc:`)
- Counters (total and per day): capsule scans, link opens, requests, requests by source, statuses.
- `cc:requests` list (latest 500), `cc:events` list (latest 1000), `cc:by:<code>` (latest 100 per referral code), `cc:opens`, `cc:referred` hashes.
- `cc:book` per reference: date, time, first name, company name, venue name, first 2 digits of postal code, participants, total, add-ons, partner vendors, company PO reference and whether they need procurement support. **No phone, email or street address.**
- `cc:life` per reference: timestamps for `contacted`, `confirmed` (= deposit paid), `paid`, `lost`, and `vendors{name: time}`.
- `cc:fail:<sha256(ip) prefix>`: dashboard password failures.
- Booking stage (`stageOf` in `lib/stats.js`): `pending` 🟡 → `ready` 🟠 → `booked` 🔵 → `paid` 🟢, or `lost` grey.

Without Redis env vars nothing is recorded and the dashboard says so; requests still work.

## Secrets and config (Vercel env vars only)
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_REPLY_TO`, `OTP_SECRET` (else derived from the bot token), `ADMIN_PASSWORD`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET`, `SITE_URL`. Test-only: `MAIL_TRANSPORT=file`, `TELEGRAM_API_BASE`, `STATS_MEMORY=1`.

## Security
See the OWASP checklist in [`../CLAUDE.md`](../CLAUDE.md). Headers (CSP, HSTS, frame-ancestors, no-store) are in `vercel.json`.

## Testing
`npm run check` = `build` → `catalogue` → `tests/unit.mjs` (pricing, validation, Telegram text, OTP, emails, PDF, feedback) → `tests/e2e.mjs` (real browser → local server → mock Telegram / file mailbox) → `tests/clickthrough.mjs` (every button on desktop, phone, sandboxed preview and file://). Needs Playwright's Chromium.

## Deploy
- Vercel builds from GitHub. **Every push to `main` deploys to production** within about a minute. Other branches get private preview URLs.
- CI: `.github/workflows/ci.yml` runs `npm run check` on pull requests into `main` (added in [PR #2](https://github.com/tomnnstefanie-del/squishyparty/pull/2), not merged yet). `main` is protected: pull request + 1 review + the `npm run check` check (configured 28 Oct 2026; see [AGENTS_WORKFLOW.md](AGENTS_WORKFLOW.md)).
- Rollback: Vercel → Deployments → previous → Promote.

## Known limits (facts, not plans)
- Rate limiters in `lib/http.js` are per server instance (best-effort); only the dashboard password lockout is shared via Redis.
- Referral codes need no database, so a sharer's code cannot be revoked individually.
- `referral.returning` is still accepted by the server (and stops the $10 discount in the PDF), but the "booked before" checkbox was removed from the page in commit `7053cad`, so it is never sent now.
- Contact consent is a notice under the form ("By sending this request, you agree…"); the page always sends `consent: true` and `wantQuote: true`. There is no marketing consent.
- The "NOMI Clicker Bar" link in the header menu opens `stores.html`; there is no NOMI product in the catalogue.
