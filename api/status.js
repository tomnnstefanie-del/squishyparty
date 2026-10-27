// GET /api/status?ref=SP-…&s=contacted|confirmed&t=…  (the buttons on the Telegram request message)
// Records when we got back to the customer or confirmed the party, for the dashboard's response times.
import { checkStatusToken } from '../lib/status-link.js';
import { markStatus, statsConfigured } from '../lib/stats.js';

const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const LABEL = { contacted: 'contacted', confirmed: 'confirmed' };
const sgTime = (iso) => new Date(iso).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function page(res, status, title, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  // Only fixed text and checked values below (reference format, known status words, a date): nothing is echoed raw.
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;color:#16183a;text-align:center"><h1 style="font-size:1.5rem">${title}</h1><p>${text}</p><p><a href="/admin.html">Open the dashboard</a></p></body></html>`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const ref = url.searchParams.get('ref') || '', s = url.searchParams.get('s') || '', t = url.searchParams.get('t') || '';
  if (!REF.test(ref) || !LABEL[s] || !checkStatusToken(ref, s, t)) return page(res, 400, 'That link isn’t valid', 'Please use the button on the Telegram message.');
  if (!statsConfigured()) return page(res, 503, 'Dashboard not connected', 'Connect the database in Vercel to record response times.');
  try {
    const life = await markStatus(ref, s);
    if (!life) return page(res, 404, 'Request not found', `${ref} was sent before the dashboard was connected.`);
    return page(res, 200, `${ref} marked ${LABEL[s]}`, `Recorded at ${sgTime(life[s])} (Singapore time).`);
  } catch (e) { console.error('[status]', e.message); return page(res, 500, 'Something went wrong', 'Please try again.'); }
}
