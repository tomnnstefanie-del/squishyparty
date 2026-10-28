// GET /api/status?ref=SP-…&s=contacted|confirmed|paid|v0-v9&t=…  (the buttons on the Telegram request message)
// Records when we got back to the customer, confirmed the party, got paid, or a partner vendor confirmed.
import { checkStatusToken } from '../lib/status-link.js';
import { markStatus, statsConfigured } from '../lib/stats.js';

const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const LABEL = { contacted: 'contacted', confirmed: 'deposit paid', paid: 'paid in full' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function confirmPage(res, ref, s, t, what) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  // ref, s and t are checked against fixed patterns and the signature before this page is shown
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm</title>
<body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;color:#16183a;text-align:center"><h1 style="font-size:1.4rem">${what}?</h1><p>Booking ${ref}</p>
<form method="post" action="/api/status"><input type="hidden" name="ref" value="${ref}"><input type="hidden" name="s" value="${s}"><input type="hidden" name="t" value="${t}">
<button style="font:inherit;font-weight:700;font-size:1.05rem;padding:14px 28px;border:0;border-radius:999px;background:#e2335a;color:#fff;cursor:pointer">Yes, confirm</button></form>
<p style="color:#6b6f8f;font-size:.9rem;margin-top:22px">Nothing changes until you tap Confirm.</p></body></html>`);
}

async function readForm(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 2000) break; }
  return Object.fromEntries(new URLSearchParams(raw));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end(); }
  // GET (a tap in Telegram) only shows a Confirm button; the POST from that page records the step. So link previews,
  // scanners or a mistaken tap change nothing.
  const q = req.method === 'POST' ? await readForm(req) : Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const ref = String(q.ref || ''), s = String(q.s || ''), t = String(q.t || '');
  if (!REF.test(ref) || !(LABEL[s] || /^v\d$/.test(s)) || !checkStatusToken(ref, s, t)) return page(res, 400, 'That link isn’t valid', 'Please use the button on the Telegram message.');
  if (!statsConfigured()) return page(res, 503, 'Dashboard not connected', 'Connect the database in Vercel to record response times.');
  if (req.method === 'GET') {
    const what = LABEL[s] ? 'Mark as ' + LABEL[s] : 'Mark this vendor as confirmed';
    return confirmPage(res, ref, s, t, what.charAt(0).toUpperCase() + what.slice(1));
  }
  try {
    const r = await markStatus(ref, s);
    if (!r) return page(res, 404, 'Request not found', `${ref} was sent before the dashboard was connected.`);
    if (r.refused) return page(res, 409, 'Not yet', esc(r.refused));
    if (r.vendor) return page(res, 200, `${esc(r.vendor.name)} confirmed for ${ref}`, `Recorded at ${sgTime(r.life.vendors[r.vendor.name])} (Singapore time).`);
    return page(res, 200, `${ref} marked ${LABEL[s]}`, `Recorded at ${sgTime(r.life[s])} (Singapore time).`);
  } catch (e) { console.error('[status]', e.message); return page(res, 500, 'Something went wrong', 'Please try again.'); }
}
