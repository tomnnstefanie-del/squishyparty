// /api/admin  (Authorization: Bearer <ADMIN_PASSWORD>): the private dashboard at /admin.html.
//   GET                                          -> the numbers
//   POST { action: 'mark' | 'undo', ref, status } -> record (or clear) contacted / confirmed / lost / paid / vendor n
// ADMIN_PASSWORD is a Vercel environment variable (12+ characters); without it the dashboard stays locked.
// Wrong passwords are counted per address in the database (10 per 15 minutes), so guessing is slow on every instance.
import crypto from 'node:crypto';
import { clientIp, limiter, fail, HttpError, readJson, assertSameOrigin } from '../lib/http.js';
import { readStats, markStatus, tooManyFailures, validStatus } from '../lib/stats.js';

const rateLimited = limiter(30, 10 * 60 * 1000); // per instance, on top of the shared lockout
const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const same = (a, b) => { const h = (s) => crypto.createHash('sha256').update(String(s)).digest(); return crypto.timingSafeEqual(h(a), h(b)); };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw new HttpError(405, 'Method not allowed.'); }
    const pass = process.env.ADMIN_PASSWORD || '';
    if (pass.length < 12) throw new HttpError(503, 'The dashboard is locked: set ADMIN_PASSWORD (12 characters or more) in Vercel.');
    const ip = clientIp(req);
    if (rateLimited(ip) || await tooManyFailures(ip, false)) throw new HttpError(429, 'Too many tries. Please wait 15 minutes.');
    const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!given || !same(given, pass)) {
      await tooManyFailures(ip, true);
      console.warn('[admin] wrong password'); // no address or password logged
      throw new HttpError(401, 'That password isn’t right.');
    }
    if (req.method === 'POST') {
      assertSameOrigin(req);
      const b = await readJson(req, 1024);
      if (!['mark', 'undo'].includes(b.action) || !REF.test(String(b.ref || '')) || !validStatus(b.status)) throw new HttpError(400, 'Please refresh and try again.');
      const r = await markStatus(b.ref, b.status, b.action === 'undo');
      if (!r) throw new HttpError(404, 'That request isn’t in the dashboard.');
      return res.status(200).json({ ok: true, life: r.life });
    }
    return res.status(200).json({ ok: true, ...(await readStats()) });
  } catch (e) { return fail(res, e, 'admin'); }
}
