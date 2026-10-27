# PRD 01: Automated corporate PDF quotations

Status: **Draft. Partly built.** Not approved.

## Problem
Company bookers (HR, office managers) usually need a formal, itemised quotation to get a purchase approved before they can confirm. Today a quotation is generated automatically, but it says "Pending availability", has no validity date, no payment terms and many partner prices are still placeholders. The owner then has to send a final quote by hand, which slows down company bookings.

## Target user
- **Primary:** company bookers who need an approvable document.
- **Secondary:** the owner, who wants to send fewer manual quotes.

## Desired outcome
A company booker receives, within a minute of sending a request, a quotation they can forward to finance, and the owner can send an updated final version without retyping it.

## Current state (from the code)
- The request form has a checkbox "Email me an itemised PDF quotation" (`#want-quote`), **ticked by default for companies**, optional for families (`src/app.js` sends `wantQuote`).
- `lib/validate.js`: company bookings require `companyName` (2+ chars); `companyUen` is optional, checked against `^[0-9A-Z]{8,10}$`.
- `lib/quote-pdf.js` builds the PDF by hand (no packages): logo, "QUOTATION", status pill **"Pending availability"**, quote number `Q-<ref>`, issue date, "Prepared for" (company name, Attn, UEN), itemised lines from the **server** pricing (`lib/pricing.js`), $10 referral line when it applies, items "In your quote", fine print ("Partner prices marked as estimated are confirmed in your final quote", "All prices in Singapore dollars") and the note that it is **not a confirmed booking or invoice** and no payment is due.
- `api/request.js` attaches the PDF to the confirmation email (`lib/emails.js`, subject "Your Confetti Club Quotation | Q-<ref>") and sends a copy to Telegram. If the PDF fails, the request still goes through.
- `node dev/sample-quote.mjs` writes `dev/sample-quote.pdf`.
- **Does not exist:** validity date, payment / deposit terms, GST line, PO number, final (revised) quotation, re-send from the dashboard, invoice.

## User flow (proposed, builds on the current one)
1. Company booker plans the event, chooses "A company", enters company name and (optionally) UEN and **PO / reference number** (proposed).
2. Sends the request; within a minute they get the email with `Q-<ref>.pdf` (exists).
3. Owner confirms vendors on the dashboard (exists).
4. Owner presses **"Send final quotation"** on the booking (proposed): the same PDF, marked "Final", with confirmed prices and payment terms, emailed to the booker and copied to Telegram.
5. Booker forwards it to finance.

## Functional requirements
| ID | Requirement | Status |
|---|---|---|
| Q-F1 | Generate the PDF from server pricing only | ✅ exists |
| Q-F2 | Default the checkbox to ticked for companies | ✅ exists |
| Q-F3 | Show a "Valid until" date = issue date + N days | 📝 N is **Needs owner approval** (O2) |
| Q-F4 | Optional PO / reference field for companies, validated and escaped (`pdfStr`) | 📝 |
| Q-F5 | Payment terms block (deposit, balance due date, payment methods) | 📝 content is **Needs owner approval** (O1) |
| Q-F6 | GST line only if Confetti Club is GST-registered | 📝 **Needs owner approval** (O2) |
| Q-F7 | Clearly mark lines whose price is `status:'demo'` as estimates (today: one fine-print sentence) | 📝 |
| Q-F8 | Dashboard button to (re)send the quotation for a booking, marked "Final" | 📝 needs PRD 02; contact email is **not** stored in Redis today, so this needs a design decision (see Constraints) |

## Constraints
- No new production dependencies (keep the hand-written PDF).
- Escape all customer text with `pdfStr`. Never put customer text into the PDF unescaped.
- Do not store email or phone in Redis (current privacy rule). Re-sending a quote therefore needs either the customer to request it again, or an owner-approved change to what is stored (**Needs owner approval**).
- Prices: never show a demo price as final. `null` stays "In your quote".
- The quotation must keep saying it is not a booking or an invoice until the owner decides otherwise.

## Dependencies
- O1 deposit policy, O2 validity and GST, O3 agreed partner prices (see [ROADMAP](../ROADMAP.md#decisions-the-owner-needs-to-make)).
- PRD 02 for the dashboard re-send button.

## Acceptance criteria
- A company request with "Email me a quotation" ticked produces an email with a PDF attachment within one request cycle (exists; keep it passing).
- When Q-F3 is approved: the PDF shows "Valid until <date>" in Singapore time.
- When Q-F4 is built: a PO number typed with `<script>` or `)` appears literally and the PDF still opens.
- No demo-priced line appears without an "estimate" marker.
- `npm run check` passes; `public/index.html` and `lib/catalogue.js` change only as intended.

## Test cases
1. Unit: `quotePdf()` for a company with UEN contains company name, "Attn:", "UEN" (exists in `tests/unit.mjs`; extend).
2. Unit: family request without the box ticked → no PDF, email still sent.
3. Unit: PO number with PDF special characters `( ) \` → valid PDF (starts `%PDF`, ends `%%EOF`).
4. Unit: valid-until date for an issue date of 31 Dec → correct next-year date.
5. Unit: referral discount applied once, not for `returning`, not for a self-referral (exists; keep).
6. E2E: company planner path → mock mailbox has an attachment named `Confetti-Club-Quotation-Q-SP-…pdf`.
7. Manual: open `dev/sample-quote.pdf` on a phone and in Adobe Reader.

## Out of scope
- Online payment, invoices, receipts, e-signature.
- Multi-currency.
- Sending quotes to anyone other than the verified email.

## Open decisions (Needs owner approval)
- Deposit amount and policy (O1). Quote validity period; GST status (O2). Agreed partner prices (O3). Whether to store booker email for re-sending.
