# Confetti Club QR codes and short links

Every printed QR code points to a **short link** on our own site, never straight at a page.
The short link forwards people on, so you can change where it goes at any time **without reprinting**.

| Short link | Printed on | Where it goes today | Offer |
|---|---|---|---|
| `confetticlub.vercel.app/gift` | Launch-party foam-board poster | `/?src=event` | A free jelly squishy for the birthday child, first party only, valid 2 months from the first scan on that phone |
| `confetticlub.vercel.app/c` | Capsule-lid sticker (already printed) | `api/scan` | $10 off the first party |

The store posters (`print/store-qr-*.svg`) point straight at `/?src=store&o=wcc|plq|epm` and run the store gift test
($10 off or a free jelly squishy; message within 14 days of scanning, deposit within 30 days of the request).
Each family's own referral link (`?ref=MIA-K7Q2`) is in the after-party WhatsApp message for the host to send to their guests.

## Files for the launch-party QR (`/gift`)

- `confetti-club_launch-party_gift_print-tile.pdf`: ready to print, 10 × 12.5 cm at 300 dpi, with the heading and link text.
- `confetti-club_launch-party_gift_print-tile.png`: the same tile as an image.
- `confetti-club_launch-party_gift_qr.svg`: the code on its own, as a vector. Use this one when the designer is making a bigger poster: it stays sharp at any size.
- `confetti-club_launch-party_gift_qr.png`: the code on its own, about 3000 px.

Printing tips: keep the code at least 3 cm wide (bigger for a poster across a room: about 1 cm of code per 10 cm of scanning distance), keep the white border around it, and print dark on a light background. Test-scan the printed proof with two different phones before the full run.

## How to change where a link goes

1. Open `vercel.json` and find the `redirects` list, e.g.
   `{ "source": "/gift", "destination": "/?src=event", "permanent": false }`
2. Change only `destination`. Keep `source` the same, because that's what is printed.
3. Keep `"permanent": false`. A permanent redirect is remembered by phones, so later changes wouldn't reach people who scanned before.
4. Copy the same change into the `/gift` line in `dev/server.mjs` (the local preview), run `npm run check`, then branch → preview → merge as usual.

## Naming a new link

- Short, lowercase, one word, easy to read out and type: `/gift`, `/wcc`, `/xmas`.
- Name it after **where it's printed or used**, not after the offer, so the offer can change without the name becoming wrong.
- Never reuse an old name for something different: old posters and stickers may still be out there.
- A new offer link also needs its `src` handled in `src/app.js` (the `REF` block) and on the server (`lib/gift.js`, `lib/quote-pdf.js`, `lib/telegram.js`).
- QR files: `confetti-club_<where>_<link>_qr.svg`, e.g. `confetti-club_launch-party_gift_qr.svg`.

## If the website address changes

The codes say `confetticlub.vercel.app`. If you move to your own domain later, keep the Vercel project and that address
working (Vercel keeps `*.vercel.app` alongside a custom domain), and the printed codes keep working.
