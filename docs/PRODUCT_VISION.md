# Product vision: Confetti Club

> Status: draft for the owner. Written 28 Oct 2026 from the code on `main` (commit `718fe5d`). Anything under "Where we want to go" is a **proposal**, not a feature.

## One line
Confetti Club (by Tom & Stefanie) lets Singapore families and companies plan a hosted squishy-making party, and the extras around it, in a few minutes, then hands the booking to a real person who confirms it on WhatsApp.

## Who it is for
| Customer | What they want | How they book today |
|---|---|---|
| **Parents** planning a child's birthday (about 10–30 kids) | A fun, hands-on activity that comes to their venue, with the cake, decorations and entertainment sorted in one place | 4-step planner on the home page, WhatsApp follow-up |
| **Companies** (HR, office managers) planning team bonding or family days | A clear, itemised price they can get approved, invoiced to the company | Same planner, "A company" pre-selected; PDF quotation (package line or itemised), billing contact, PO reference, procurement support option |
| **Tom & Stefanie team** (the owner) | Every request in one place, nothing forgotten, partners confirmed before the deposit is asked for | Telegram message per request, `/admin.html` dashboard, 9am Telegram to-do |
| **Partner vendors** (Butter Studio, Bloom, PartyPainters.sg, J Square Photography) | More bookings with little admin | They are contacted by the owner; they have no login or page of their own |

## Principles (already in force through `CLAUDE.md`)
1. **A human confirms every booking.** No online payment, no automatic confirmation. The site never shows a fake "sent".
2. **The server prices everything.** Browser totals are never trusted; unknown prices are "In your quote", never $0.
3. **Collect as little personal data as possible.** No personal data in analytics or logs; the dashboard keeps no phone, email or street address.
4. **Honest content.** Real reviews only, word for word with permission. No safety claims the owner hasn't confirmed. Partner prices marked "Demo price" until agreed.
5. **Simple to run.** One static page, a few serverless functions, one production dependency (`nodemailer`), free-tier services.

## What success looks like (proposed measures: Needs owner approval)
- Requests per week, and the share that reach "paid in full".
- Median time from request to first reply ("Contacted"), already measured on the dashboard.
- Share of bookings that come from a friend's referral link or the capsule QR, already counted on the dashboard.
- Share of company requests that receive a PDF quotation, measurable from Telegram today, not on the dashboard.

Targets for any of these are **Needs owner approval**.

## Where we want to go (proposals only)
See [`ROADMAP.md`](ROADMAP.md) for order and status, and the PRDs in [`prds/`](prds/):
1. Make corporate quotations complete enough to approve without a call ([PRD 01](prds/01-corporate-pdf-quotations.md)).
2. Make the dashboard the single place to run a booking from request to paid ([PRD 02](prds/02-booking-admin-dashboard.md)).
3. Give each partner a proper storefront inside the planner, with agreed prices and approved photos ([PRD 03](prds/03-partner-vendor-storefronts.md)).
4. Decide and build fair referral incentives with traceable attribution ([PRD 04](prds/04-referral-attribution-incentives.md)).
5. Make it easy for a happy customer to book again ([PRD 05](prds/05-returning-customer-rebooking.md)).

## Things we will not do without the owner
- Take payments or deposits online.
- Add an AI chatbot on the public site (the rules for one are already in `CLAUDE.md`).
- Send marketing messages to customers (PDPA consent is not collected today).
- Publish partner photos, logos or prices the partner hasn't approved.
