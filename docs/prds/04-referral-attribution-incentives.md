# PRD 04: Referral attribution and incentives

Status: **Draft. Attribution and the friend's $10 are built; nothing exists for the sharer.** Not approved.

## Problem
Most party bookings come from word of mouth. The friend who is referred gets $10 off, but the family who shared gets nothing, the discount is applied by hand, and the owner can't easily see which families bring in bookings that actually get paid.

## Target user
- **Sharers:** families (and company contacts) after a happy party.
- **Friends:** new customers arriving through a link, a code or the capsule QR.
- **Owner:** wants to reward the right people and see what works.

## Desired outcome
Every referred booking is traced to its sharer through to "paid in full"; incentives (if the owner approves any for sharers) are applied consistently, once, and without manual errors.

## Current state (from the code)
- **Codes** (`lib/referral.js`): `FIRSTNAME-XXYY`, 2 random characters + a 2-character HMAC signature with the server secret. No database needed; made-up or mistyped codes show as invalid. `samePerson()` flags a possible self-referral by first-name prefix.
- **Issued:** every request's Telegram message includes the family's own link `/?ref=CODE` and a button with the after-party WhatsApp message (care tips + link) (`lib/telegram.js`).
- **Friend's offer:** `REFERRAL_OFFER = '$10 off their first hosted party'`. FAQ: new customers, once per family, can't be combined with other offers. The PDF quote subtracts $10 (`referralDiscount` in `lib/quote-pdf.js`) for a valid, not-own code or the capsule QR source, and not when `returning` is set. Otherwise "The $10 is taken off by hand in the quotation" (`CLAUDE.md`).
- **Capsule QR:** `/c` → `api/scan.js` counts a scan → `/?src=capsule#offer`.
- **Tracking:** `api/event.js` counts a valid link opened (once per device). `recordRequest` stores `via` (`friend`, `capsule`, `unknown-code`, ''), the code used and the new family's own code; dashboard shows totals, last 14 days, "Who referred whom", top 50 codes. Code and source survive reloads via `localStorage`.
- **Sharer reward:** none. "The sharer gets nothing" (`CLAUDE.md`).
- **Does not exist:** a $20 (or any) referrer credit, tracking whether a referred booking was paid, a ledger of credits, revoking a code, limits per sharer, consent to send referral reminders.

## User flow (proposed)
1. After the party the owner sends the after-party WhatsApp (exists) with the family's link.
2. Friend opens the link → offer banner → plans → request carries the code (exists).
3. Dashboard shows the referral row and, **when the referred booking reaches 🟢 paid**, marks the sharer as "earned" (proposed).
4. **If the owner approves a sharer reward:** the owner sees "Credit owed: <sharer first name>, <amount>" in the digest/dashboard and applies it to the sharer's next booking or pays it out by hand; taps "Credit given" (proposed).

## Functional requirements (proposed)
| ID | Requirement | Notes |
|---|---|---|
| R-F1 | Link each referred booking's stage to the sharer's row ("Who referred whom" shows 🟡/🟠/🔵/🟢) | Data already in Redis |
| R-F2 | Count "referred and paid" per code | |
| R-F3 | Sharer credit amount as a single config constant, **off (0) until approved** | The **$20 referrer credit is Needs owner approval** (O6) |
| R-F4 | Credit owed / given ledger per code with signed Telegram button "Credit given" | Only if R-F3 approved |
| R-F5 | Caps: max credits per sharer per year, expiry | **Needs owner approval** (O6) |
| R-F6 | Stacking rules with company bookings and returning-customer offers | **Needs owner approval** (O7) |
| R-F7 | Apply the friend's $10 automatically on the final quote (today it is on the auto PDF but "by hand" on final quotes) | Ties to PRD 01 |
| R-F8 | Revocation list of codes (small Redis set) | For abuse |

## Constraints
- Keep codes database-free to generate; Redis only for counts, ledger and revocations.
- No personal data in analytics; the sharer is identified by first name + code only.
- Self-referral and duplicate checks must not reveal another customer's details.
- Referral messages are sent by the owner on WhatsApp, never automatically, unless PDPA marketing consent exists (O8).
- Never advertise a sharer reward on the site before the owner approves it.

## Dependencies
- PRD 02 stages (paid in full), PRD 01 final quote.
- O6 reward, O7 stacking, O8 PDPA consent.

## Acceptance criteria
- With R-F3 at 0 (default), the site, emails and PDF mention no sharer reward.
- A referred booking marked 🟢 paid increments "referred and paid" for exactly one code.
- A self-referral (same first-name prefix) is flagged and earns nothing.
- Tapping "Credit given" twice records it once.
- `npm run check` passes.

## Test cases
1. Unit: `readReferralCode` accepts a code made by `makeReferralCode`, rejects a changed last character (exists; keep).
2. Unit: `referralDiscount` → 1000 for a valid friend code, 0 for own code, 0 for `returning`, 1000 for `source:'capsule'` with no code (exists; keep).
3. Unit: referred booking paid → ledger row "owed" only when credit > 0.
4. Unit: revoked code → `via` becomes `unknown-code`.
5. E2E: open `/?ref=<valid>` → `api/event` counts one open; reload → still one open.
6. E2E: request with code → dashboard "Who referred whom" lists it.

## Out of scope
- Cash payouts through the site; points or tiers; affiliate programmes for businesses; automatic WhatsApp/email reminders.

## Open decisions (Needs owner approval)
- Whether sharers get anything, e.g. the proposed **$20 referrer credit** (O6); caps and expiry; stacking (O7); PDPA consent for reminders (O8).
