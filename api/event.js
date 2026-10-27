// POST /api/event  { type: 'link_open', code }: a friend's referral link opened on a new device.
// The page sends it once per device. Only the code is stored, to count opens per referring family.
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { recordLinkOpen } from '../lib/stats.js';
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
    return res.status(200).json({ ok: true });
  } catch (e) { return fail(res, e, 'event'); }
}
