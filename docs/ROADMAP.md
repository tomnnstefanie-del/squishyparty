# Roadmap

> Status: **draft, nothing below is approved** unless the owner marks it so. Written 28 Oct 2026.
> Rule for this file: "Exists" means you can find it in the code today. "Proposed" means it does not exist yet. Never move an item to "Exists" until it is merged to `main`.

## Status legend
- ✅ **Exists**: in the code on `feature/participants-no-deposit` / `main`.
- 🚧 **In the release being prepared** (28 Oct 2026): in the owner's working copy, not yet in a commit when this was written.
- 📝 **Proposed**: a PRD draft exists; needs owner approval before any build.
- ❓ **Needs owner approval**: a business decision blocks it.

## What exists today
| Area | Status | Where |
|---|---|---|
| Step-by-step planner (participants, experience, wax, add-ons, request form) | ✅ | `src/markup.html`, `src/app.js` |
| Server re-pricing from a generated catalogue | ✅ | `lib/pricing.js`, `lib/catalogue.js` |
| Partner add-ons: Butter Studio, Bloom, PartyPainters.sg, J Square Photography, plus Tom & Stefanie favours | ✅ (most prices `status:'demo'`) | `P`, `STORES` in `src/app.js` |
| Partner "store" sheet inside the planner (hero, tags, gallery, colour palette) | ✅ | `openStore()` in `src/app.js` |
| Email OTP verification | ✅ | `api/otp.js`, `lib/otp.js` |
| Telegram notification with WhatsApp buttons | ✅ | `lib/telegram.js` |
| Confirmation email | ✅ | `lib/emails.js`, `lib/mail.js` |
| PDF quotation (ticked by default for companies) | ✅ | `lib/quote-pdf.js` |
| WhatsApp country codes | ✅ | `lib/phone.js` |
| Signed referral codes, $10 off for the friend, capsule QR `/c` | ✅ | `lib/referral.js`, `api/scan.js`, `api/event.js` |
| After-party feedback page | ✅ | `src/feedback.html`, `api/feedback.js` |
| Password dashboard with stages, referral stats, response times | ✅ | `src/admin.html`, `api/admin.js`, `lib/stats.js` |
| Signed Telegram status buttons | ✅ | `lib/status-link.js`, `api/status.js` |
| Daily 9am Telegram to-do digest (Vercel cron) | 🚧 | `api/digest.js`, `lib/digest.js`, `vercel.json` |
| Butter Studio menu generator | 🚧 | `dev/butter-studio.json`, `dev/butter-studio.mjs` |
| "Our stores" page (Tom & Stefanie physical stores) | ✅ | `src/stores.html` |
| NOMI Clicker Bar | ❓ menu link only, points to `stores.html`; no product, prices or page | `src/markup.html` header |
| CI on GitHub (`npm run check` on every PR) | 📝 not set up; there is no `.github/` folder | see [`AGENTS_WORKFLOW.md`](AGENTS_WORKFLOW.md) |

## Proposed order (Needs owner approval)
Ordered by value to the owner and how little it depends on undecided business rules.

### Now (no business decisions needed)
1. **Safety net:** GitHub Actions CI running `npm run check` on pull requests; branch protection on `main`. ([AGENTS_WORKFLOW.md](AGENTS_WORKFLOW.md))
2. **Dashboard polish** that only reflects data already stored ([PRD 02](prds/02-booking-admin-dashboard.md), issues D1–D3).
3. **Quotation fixes** that need no policy: quote validity date shown, company PO field, re-send a quote from the dashboard ([PRD 01](prds/01-corporate-pdf-quotations.md), issues Q1–Q2).

### Next (once the owner decides)
4. **Deposit policy shown in quotes and on the dashboard**: blocked by the deposit amount and terms ❓.
5. **Partner storefronts with agreed prices and approved photos** ([PRD 03](prds/03-partner-vendor-storefronts.md)): blocked per partner by price agreement and photo permission ❓.
6. **Referral incentive for the sharer** ([PRD 04](prds/04-referral-attribution-incentives.md)): blocked by the $20 referrer credit decision ❓.

### Later
7. **Returning-customer rebooking** ([PRD 05](prds/05-returning-customer-rebooking.md)): needs PDPA marketing consent ❓ before any reminder is sent.
8. **NOMI Clicker Bar** as a bookable experience: needs the owner to define the product ❓. No PRD yet.
9. **Optional nightly AI runs** (drafts only, OFF by default): see [AGENTS_WORKFLOW.md](AGENTS_WORKFLOW.md#optional-nightly-ai-runs-off-by-default).

## Decisions the owner needs to make
Collected from all PRDs. Nothing here has been decided.

| # | Decision | Blocks |
|---|---|---|
| O1 | Deposit amount (fixed or %), when it is due, refund and cancellation terms | PRD 01, PRD 02 |
| O2 | How long a quotation is valid (e.g. 14 days?) and whether prices include GST (is Confetti Club GST-registered?) | PRD 01 |
| O3 | Agreed prices for each partner item now marked `status:'demo'` (103 items, mostly Butter Studio) | PRD 01, PRD 03 |
| O4 | Written permission from each partner to use their photos and logo (Butter Studio, Bloom, PartyPainters.sg, J Square) | PRD 03 |
| O5 | Whether partners get any self-serve access (a page, a link, a login) or stay owner-managed | PRD 03 |
| O6 | Referrer reward: the proposed $20 credit, or nothing as today; cap, expiry, how it is paid | PRD 04 |
| O7 | Whether a referral discount can stack with company pricing or a returning-customer offer | PRD 04, PRD 05 |
| O8 | PDPA: wording and storage of marketing consent; whether to contact past customers at all | PRD 04, PRD 05 |
| O9 | Returning-customer offer, if any (amount, conditions) | PRD 05 |
| O10 | What the NOMI Clicker Bar is, its prices, and whether it joins the planner | Roadmap item 8 |
| O11 | Whether to enable GitHub Actions CI and branch protection on `main` (free on public repos; check minutes on private) | AGENTS_WORKFLOW |
| O12 | Whether to ever enable scheduled AI runs, which provider, and the monthly spend limit | AGENTS_WORKFLOW |
