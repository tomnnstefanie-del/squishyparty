# PRDs

Product requirement drafts. **None is approved.** Each one separates **Current state** (what the code does today, with file references) from **Proposed** (what does not exist yet). Business rules nobody has decided are marked **Needs owner approval**: an agent must not invent them.

| # | PRD | Current state | Main owner decisions |
|---|---|---|---|
| 01 | [Automated corporate PDF quotations](01-corporate-pdf-quotations.md) | Partly built | Deposit, quote validity, GST, demo prices |
| 02 | [Booking administration dashboard](02-booking-admin-dashboard.md) | Partly built | Deposit amount, data retention |
| 03 | [Partner vendor storefronts](03-partner-vendor-storefronts.md) | Store sheet in planner exists; no partner access | Partner prices, photo permission, partner access |
| 04 | [Referral attribution and incentives](04-referral-attribution-incentives.md) | Partly built ($10 for the friend) | $20 referrer credit, stacking, PDPA |
| 05 | [Returning-customer rebooking](05-returning-customer-rebooking.md) | Not built | PDPA marketing consent, returning offer |

## Template
Problem · Target user · Desired outcome · Current state · User flow · Functional requirements · Constraints · Dependencies · Acceptance criteria · Test cases · Out of scope · Open decisions.

## Rules for agents working from a PRD
- Build only requirements the owner has marked approved (in the PRD or in a GitHub issue).
- Anything marked **Needs owner approval** stays as a placeholder, a setting, or is left out. Never pick a number for the owner.
- Every change follows [`../../CLAUDE.md`](../../CLAUDE.md): edit `src/`, never `public/index.html`; `npm run check` must pass; no secrets in code.
