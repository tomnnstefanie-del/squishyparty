# PRD 03: Partner vendor storefronts

Status: **Draft. A store sheet exists inside the planner; nothing partner-facing exists.** Not approved.

## Problem
Customers choose cakes, styling, entertainment and photography from partners, but most partner prices are placeholders ("Demo price"), photos and menus are copied from public listings, and partners have no way to keep their own listing current. That limits trust (a customer can't rely on a demo price) and creates work for the owner.

## Target user
- **Primary:** parents and company bookers comparing add-ons in the planner.
- **Secondary:** partner vendors (Butter Studio, Bloom, PartyPainters.sg, J Square Photography) and the owner, who maintains their listings.

## Desired outcome
Each partner has an accurate, approved storefront inside the planner: agreed prices, approved photos and logo, clear lead times. The owner can update a partner's listing in one place and every price on the page, server and PDF stays in step.

## Current state (from the code)
- `STORES` in `src/app.js` defines one store sheet per vendor: title, area, tags, pill (e.g. "Styling partner"), "from" price, logo/thumb, hero photo, note, optional `gallery` and colour `palette` (Bloom).
- `openStore(v)` opens a bottom sheet (`ss-*` classes) with the vendor's items grouped by section; `track('store_opened')` records the open.
- Add-ons in `P`: Butter Studio 89, Bloom 18, PartyPainters.sg 11, J Square Photography 6, Tom & Stefanie 1 (`s-favours`). Status counts across `P`: **103 `demo`**, 18 `approved`, 4 `partner` (custom cakes, priced in the quote).
- Butter Studio items are generated from `dev/butter-studio.json` (from their public online menus) by `dev/butter-studio.mjs` 🚧, prices tagged demo "until the partner rate is agreed".
- Photos: `public/img/bloom/`, `public/img/jsquare/`, `public/img/partypainters/`, `public/img/butter/` 🚧; Butter Studio logo loads from `thebutterstudio.com` (allowed in the CSP `img-src`).
- The server prices only from `lib/catalogue.js`; demo items are flagged `demo:true` in pricing and the PDF says partner estimates are confirmed in the final quote.
- `stores.html` is **not** a partner storefront: it lists Tom & Stefanie's own physical stores.
- **Does not exist:** partner logins or edit links, partner-approved flag for photos, lead times per vendor, availability, a standalone public page per partner, partner payouts.

## User flow (proposed)
1. Customer opens "Party Services" or a category in the planner, taps a partner card.
2. Store sheet shows approved hero/gallery, short description, lead time, and items with agreed prices (no "Demo price" once approved).
3. Customer adds items; server re-prices; owner confirms the vendor as today (PRD 02).
4. Owner side: when a partner sends new prices or photos, the owner (or an agent, on the owner's instruction) edits one data file per partner, runs `npm run catalogue`, and `npm run check`.

## Functional requirements (proposed)
| ID | Requirement | Notes |
|---|---|---|
| S-F1 | One data file per partner (like `dev/butter-studio.json`) generating `P` and `STORES` entries | Keeps prices in one place |
| S-F2 | `photosApproved: true/false` per partner; build fails if a partner with `false` has photos on the page | Permission is **Needs owner approval** (O4) per partner |
| S-F3 | Per-partner `leadTimeDays` shown in the sheet and checked against the party date | Values come from each partner |
| S-F4 | Hide or clearly mark items still `demo` (owner chooses which) | O3 |
| S-F5 | Optional standalone page `/partners/<slug>` built from the same data, `noindex` until approved | Proposed only |
| S-F6 | Partner self-service (edit link or login) | **Needs owner approval** (O5); not recommended before S-F1 to S-F4 |

## Constraints
- No new production dependencies; static build stays.
- Never show a partner price as agreed unless the owner has marked it `approved`.
- Any new image host needs a CSP `img-src` change in `vercel.json` and owner approval. No server-side fetching of partner URLs (no SSRF).
- Don't copy partner reviews or claims; reviews must be real and permitted (`CLAUDE.md`).

## Dependencies
- O3 agreed prices, O4 photo/logo permission per partner, O5 partner access model.
- PRD 01 (PDF reflects approved vs estimate).

## Acceptance criteria
- For every partner with `photosApproved:false`, the built page contains none of that partner's photo paths.
- After changing a partner data file and running `npm run catalogue`, server pricing and page pricing agree (`tests/unit.mjs` and e2e pass).
- A store sheet with an approved price shows no "Demo price" label.
- `npm run check` passes.

## Test cases
1. Build: partner with `photosApproved:false` → build stops with a clear message.
2. Unit: `priceRequest` for one item of each partner equals the data file price × quantity.
3. Unit: demo item → `demo:true` in pricing and "estimate" marker in the PDF.
4. Click-through: open each store sheet on phone and desktop; gallery and palette render; Escape closes it.
5. E2E: add a Bloom backdrop and a Butter Studio cake → Telegram message lists both vendors and the dashboard has one vendor button each.

## Out of scope
- Payments to partners, commission tracking, partner contracts.
- Live availability calendars from partners.
- Marketplace sign-up for new partners.

## Open decisions (Needs owner approval)
- Agreed prices for the 103 demo items (O3). Written permission to use each partner's photos and logo (O4). Partner access model (O5). Whether the **NOMI Clicker Bar** (header link only today) becomes a storefront or experience (O10).
