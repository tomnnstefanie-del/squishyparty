## What and why
<!-- One or two sentences. Link the issue: Closes #… -->

## Files touched
<!-- Should match the issue's approved file scope. Say if you had to go outside it, and why. -->

## Checks
- [ ] `npm run check` passes locally (CI runs it again)
- [ ] `public/index.html` and `lib/catalogue.js` changed only as intended (`git diff --stat`)
- [ ] No secrets, no personal data in logs or analytics
- [ ] Customer text is escaped (`esc`, `textContent`, `pdfStr`); no `innerHTML` with customer text
- [ ] No change to booking logic, pricing, OTP or emails unless the issue says so
- [ ] Nothing decided that a doc marks **Needs owner approval**
- [ ] Checked on the Vercel preview on a phone (owner)

## Not done / follow-ups
<!-- Anything left out on purpose. -->

<!-- Agents: open as a draft, add the needs-review label when CI is green. Never merge. -->
