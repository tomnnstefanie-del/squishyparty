# PRD 02: Booking administration dashboard

Status: **Draft. Partly built** (live dashboard at `/admin.html`). Not approved.

## Problem
Each booking passes through several hands: the customer, up to four partner vendors, and the owner collecting a deposit and a balance. Without one view, replies are slow, a vendor goes unconfirmed, or a balance is forgotten after the party.

## Target user
The owner (Tom & Stefanie team), on a phone, between other work. One shared password; no separate staff accounts.

## Desired outcome
Every open booking shows its single next step; nothing waits more than a day without a reminder; the owner can see response times and where bookings come from.

## Current state (from the code)
- **Access:** `/admin.html` → `api/admin.js`, `Authorization: Bearer ADMIN_PASSWORD` (12+ chars, constant-time compare, 10 failures per 15 min per hashed IP stored in Redis, plus a per-instance limiter). `noindex`, `no-store`.
- **Data:** `lib/stats.js` (Upstash Redis via REST). Per booking: date, time, first name, company name, venue name, first 2 postal digits, participants, total, add-ons, partner vendors. No phone, email or street address. Lifecycle timestamps in `cc:life`.
- **Stages** (`stageOf`): 🟡 `pending` waiting for vendors → 🟠 `ready` ask for deposit (also when no partner add-ons) → 🔵 `booked` deposit paid (stored as `confirmed`) → 🟢 `paid` paid in full; grey `lost` didn't book.
- **To-dos** (`todosFor`): reply to the customer; confirm with each vendor; price "In your quote" items; ask for deposit; collect balance ("Balance overdue: the party has passed").
- **Screens** (`src/admin.html`): how-to guide; month calendar; "Still to do"; a card per booking with vendor ticks, Paid, Didn't book and undo; referral totals (capsule QR, friend links), response times, last 14 days, who referred whom, recent requests, activity log.
- **Actions:** `POST {action:'mark'|'undo', ref, status}` for `contacted`, `confirmed`, `lost`, `paid`, `v0`–`v9`; `POST {action:'digest'}` sends the to-do to Telegram now.
- **Telegram:** each request message has signed buttons (`lib/status-link.js` → `api/status.js`): Contacted, one per partner vendor, Deposit paid, Paid in full. First tap counts; repeat taps don't move the time.
- 🚧 **Daily digest:** `api/digest.js` + `lib/digest.js`, Vercel cron `0 1 * * *` (9am Singapore), protected by `CRON_SECRET`: open bookings grouped by stage with one "next step" button each.
- **Retention:** daily counters expire after 120 days; lists are trimmed (500 requests, 1000 events); **booking (`cc:book`) and lifecycle (`cc:life`) records never expire** today.
- **Does not exist:** deposit amount or due date per booking, notes per booking, search, export, per-staff accounts, audit of who tapped a button, data deletion tool.

## User flow (today, kept)
1. Request arrives → Telegram message + 🟡 card.
2. Owner WhatsApps the customer → taps **Contacted**.
3. Owner asks each vendor → taps **<Vendor> confirmed** → card turns 🟠.
4. Owner asks for deposit → taps **Deposit paid** → 🔵.
5. Balance received → **Paid in full** → 🟢, off the to-do list.
6. Each morning at 9am the digest lists what is still open.

## Functional requirements (proposed)
| ID | Requirement | Notes |
|---|---|---|
| D-F1 | Show the deposit amount due and due date on 🟠/🔵 cards | Amount and rule **Needs owner approval** (O1). Until then show nothing, not a guess |
| D-F2 | Short private note per booking (owner-typed, max 280 chars, escaped with `textContent`) | Stored in Redis by ref |
| D-F3 | Filter bookings by stage and month; search by reference | Client-side, data already loaded |
| D-F4 | CSV export of bookings without personal data | Same fields as stored today |
| D-F5 | "Balance overdue" highlight in the digest when the party date has passed | Logic exists in `todosFor`; surface it first in the digest |
| D-F6 | Data retention: delete or anonymise booking records after N months | N **Needs owner approval** (PDPA, O8) |
| D-F7 | Re-send quotation button | Depends on PRD 01 Q-F8 and storing an email (**Needs owner approval**) |

## Constraints
- Keep the single shared password model unless the owner asks for accounts.
- No phone, email or street address in Redis unless the owner approves a change (privacy rule in `CLAUDE.md`).
- Every new route: same-origin check on POST, JSON only, size limit, rate limit, `no-store`.
- Customer text (venue name, notes) must never reach `innerHTML`.
- The digest must stay under Telegram's 4096-character limit (currently cut at 3900).

## Dependencies
- Upstash Redis env vars set in Vercel. `CRON_SECRET` for the digest 🚧.
- O1 deposit policy; O8 retention / PDPA.

## Acceptance criteria
- Tapping a Telegram button, then opening the dashboard, shows the new stage without a refresh of data older than the request.
- Wrong password 11 times from one address → HTTP 429 for 15 minutes.
- The digest with no open bookings says "Nothing pending."
- Any new note containing `<img src=x onerror=alert(1)>` renders as text.
- `npm run check` passes.

## Test cases
1. Unit: `stageOf` for every combination of vendors confirmed / contacted / confirmed / paid / lost (extend `tests/unit.mjs`).
2. Unit: `todosFor` returns "Balance overdue" when date < today and stage is `booked`.
3. Unit: `markStatus(ref,'paid')` also sets `contacted` and `confirmed`; undo clears only the given status.
4. Unit: `checkStatusToken` rejects a token for another ref or status.
5. Unit: `buildDigest` truncates above 3900 chars and keeps the dashboard button.
6. E2E (`STATS_MEMORY=1`): send a request → `/api/admin` with password lists it as `pending`.
7. E2E: `/api/admin` without password → 401; with short `ADMIN_PASSWORD` → 503.
8. E2E: `/api/digest` without `CRON_SECRET` → 401.

## Out of scope
- Staff accounts and roles; partner logins (see PRD 03).
- Payments, invoices, accounting.
- Customer-facing booking status page.

## Open decisions (Needs owner approval)
- Deposit amount, due date and refund policy (O1). Retention period for booking records (O8). Whether to store booker email to re-send quotes.
