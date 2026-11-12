// POST /api/event  { type: 'link_open', code }: a friend's referral link opened on a new device.
//                  { type: 'visit', source }: a visit to the site (once per browser session), counted by source.
//                  { type: 'gift', gift: 'A'|'B', outlet }: a device given a store QR gift (once per device), for the A/B test.
// The page sends it once per device. Only the code is stored, to count opens per referring family.
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { recordLinkOpen, recordVisit, recordGift } from '../lib/stats.js';
import { cleanGift, cleanOutlet } from '../lib/gift.js';
import { readReferralCode } from '../lib/referral.js';

const rateLimited = limiter(20, 10 * 60 * 1000);

export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  try {
    assertSameOrigin(req);
    if (rateLimited(clientIp(req))) throw new HttpError(429, 'Too many requests.');
    const b = await readJson(req, 1024);
    const used = b.type === 'link_open' ? readReferralCode(b.code) : null;
    if (used && used.valid) await recordLinkOpen(used.code); // made-up codes aren't counted
    if (b.type === 'visit') await recordVisit(/^[a-z0-9-]{1,24}$/.test(String(b.source || '')) ? b.source : 'direct'); // counted by source only
    if (b.type === 'gift' && cleanGift(b.gift)) await recordGift(cleanGift(b.gift), cleanOutlet(b.outlet));
    return res.status(200).json({ ok: true });
  } catch (e) { return fail(res, e, 'event'); }
}
