# Booking changes: scenarios to test ("eval set")

What should happen when a customer changes their mind after sending a request. **None of this is built yet.**
Today a change means a new request (a second booking on the dashboard) or a manual note. This file is the
spec for an "Amend booking" feature; each scenario becomes an end-to-end test once the rules marked
**Owner decision** are agreed.

## How a change would be recorded (proposed)
- An **Amend** button in the booking's Details on the dashboard: participants, date and time, experience,
  Wax Cracking, add-ons. The server re-prices with `lib/pricing.js` (never the browser's total).
- Each amendment is saved in a **change log** on the booking: when, what changed (old → new) and the total
  before and after. It shows in the tile's Details and in the Activity list, and is posted to Telegram.
- A **revised quotation** is emailed (`Q-SP-…-R2`, `-R3`…), with a copy to Telegram. Earlier versions are kept.
- Vendors affected by the change go back to **waiting** (yellow chip), with a to-do to re-confirm or cancel.
- Stage rules: the deposit stays recorded; the balance to collect follows the new total.

## Scenarios

| # | Customer changes… | When | Expected result |
|---|---|---|---|
| 1 | Participants 30 → 20 | Before the deposit | Total re-priced (e.g. Duo $990 → $670), quote R2 emailed, per-person add-ons (favour bags) back to waiting, log "Participants 30 → 20" |
| 2 | Participants 15 → 8 | Before the deposit | Charged as the minimum 10; quote says "minimum charge is 10"; log shows both numbers |
| 3 | Participants 20 → 25 | After the deposit | Stays 🔵 Deposit paid; balance goes up by the difference; to-do "Re-confirm Bloom for 25" for per-person vendors |
| 4 | Removes the cake | Butter Studio not yet confirmed | Butter Studio disappears from the vendor list; total down; no to-do |
| 5 | Removes the cake | Butter Studio already confirmed | To-do "Tell Butter Studio the cake is cancelled" until ticked; total down |
| 6 | Adds a balloon arch | After the deposit | Bloom added as waiting; stays blue with the alert "1 vendor to confirm"; balance up |
| 7 | Moves the date | Any time | Every vendor back to waiting ("check the new date"); calendar moves; log "7 Nov → 14 Nov" |
| 8 | Changes time only | Any time | Vendors with timed services (photographer, face painter) back to waiting; cake and decor stay confirmed |
| 9 | Jelly → Duo | Before the deposit | Re-priced; wax price follows the Duo deal |
| 10 | Cancels | Before the deposit | "Didn't book" (grey), confirmed vendors get a to-do to cancel |
| 11 | Cancels | After the deposit | New "Cancelled" state (not "Didn't book"), with the deposit refund decision recorded. **Owner decision:** refund policy |
| 12 | Sends a second request for the same party | Any time | Dashboard flags "possible duplicate" (same email and date); option to replace the first. Two bookings are never counted |
| 13 | Adds a friend's referral code late | Before the deposit | $10 applied on R2; referral counted for the friend |
| 14 | Our catalogue price changed since the quote | Any amendment | **Owner decision:** keep the quoted prices for unchanged items (recommended), or re-price everything at today's prices |
| 15 | Asks to reduce numbers 2 days before | Close to the date | **Owner decision:** a cut-off after which numbers can go up but not down |
| 16 | Changes the venue address | Any time | Logged; travel fee unchanged (one fee in Singapore); vendors that deliver back to waiting |

## Owner decisions needed before building
1. Price lock: keep the quoted prices for items already on the quote, or re-price at today's prices?
2. Deposit refund and cancellation policy (scenario 11).
3. Cut-off for reducing participants or removing add-ons (scenario 15).
4. Who can amend: only you on the dashboard (recommended to start), or customers through a link in their email?
