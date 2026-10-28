# PRD 05: Returning-customer rebooking

Status: **Draft. Not built.** Not approved.

## Problem
A family that enjoyed a party is the most likely to book again (next birthday, a sibling) or to bring their company. Today they start from an empty planner, re-enter everything, and the owner has no reminder that a past customer's child has another birthday coming.

## Target user
- **Primary:** past customers booking a second party.
- **Secondary:** the owner, who wants repeat bookings with little effort.

## Desired outcome
A past customer can rebook in under a minute from a link the owner sends, with their last choices pre-filled, and the owner knows the request is from a returning customer.

## Current state (from the code)
- No rebooking feature exists.
- `lib/validate.js` still accepts `referral.returning` (true/false); `lib/telegram.js` shows "🔁 Has booked with us before" and `referralDiscount` gives no $10 to returning customers. But the "booked before" checkbox was **removed** from the page (commit `7053cad`), so the browser never sends it now.
- After a request, the success screen offers "send another request" (`plan-again` button) in the same browser session.
- Each booking has a reference `SP-YYMMDD-XXXX`; the dashboard stores date, first name, participants, add-ons and vendors, but no contact details.
- The feedback page (`/feedback.html?ref=SP-…`) asks happy customers (4–5 stars) to share their referral link.
- **Does not exist:** saved plans, customer accounts, rebook links, birthday reminders, returning-customer offer, marketing consent.

## User flow (proposed)
1. After a 🟢 paid party, the owner can tap **"Rebook link"** on the booking (dashboard or Telegram).
2. The link `/?rebook=<signed token>` opens the planner pre-filled with the last experience, participant count and add-on choices (no personal data in the URL; the token only names the booking reference, signed like status links).
3. The customer changes the date and anything else, verifies their email (as today) and sends.
4. Telegram and the dashboard show "🔁 Returning: previous booking SP-…".
5. **Only with PDPA marketing consent (O8):** a reminder about a month before the child's next birthday, sent by the owner, not automatically.

## Functional requirements (proposed)
| ID | Requirement | Notes |
|---|---|---|
| B-F1 | Signed rebook token per booking ref (reuse `sign()` from `lib/otp.js`) | No expiry or expiry N days: **Needs owner approval** |
| B-F2 | `GET` endpoint or client logic that turns a valid token into a plan pre-fill (experience, participants, add-on ids) from `cc:book` | No contact details returned |
| B-F3 | Mark the new request as returning server-side from the valid token (not a customer checkbox) | Restores the "🔁" line truthfully |
| B-F4 | Returning-customer offer, if any | **Needs owner approval** (O9); default none |
| B-F5 | Optional marketing-consent checkbox, unticked by default, stored with time and wording version | **Needs owner approval** (O8) for wording and storage |
| B-F6 | Birthday reminder list on the dashboard (no automatic sending) | Needs B-F5 and storing a child's birth month: **Needs owner approval** |

## Constraints
- PDPA: no marketing messages without consent; consent must be opt-in, separate from the existing contact notice (since `718fe5d` a notice under the form, "By sending this request, you agree we may contact you…"; the page sends `consent: true`), which only covers arranging this party.
- No personal data in URLs or analytics. The token must not reveal the customer's name.
- Discontinued add-ons in an old booking are dropped quietly with a note "Some items are no longer available".
- Prices are always today's prices from `lib/catalogue.js`, never the old quote.

## Dependencies
- PRD 02 (paid stage, booking storage). PRD 04 (stacking with referral rules, O7).
- O8 PDPA consent, O9 returning offer.

## Acceptance criteria
- A valid rebook link pre-fills experience, participants and add-ons; date and contact fields are empty.
- A tampered token shows the normal empty planner and no error page.
- The resulting Telegram message says returning and names the earlier reference.
- No reminder is ever sent automatically.
- `npm run check` passes.

## Test cases
1. Unit: token for ref A fails for ref B.
2. Unit: pre-fill drops add-on ids no longer in the catalogue.
3. Unit: server sets `returning:true` only with a valid token, ignores a client-sent `returning`.
4. E2E: open `/?rebook=<token>` → planner shows the old participant count → send → mock Telegram contains "🔁".
5. Click-through: rebook link opened on phone and as a file preview.

## Out of scope
- Customer accounts and passwords; saved payment details; automatic WhatsApp or email campaigns; loyalty points.

## Open decisions (Needs owner approval)
- PDPA marketing consent wording and storage (O8). Returning-customer offer (O9). Whether to store a child's birth month at all. Token expiry.
