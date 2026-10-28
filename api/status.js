// /api/status?ref=SP-…&s=contacted|confirmed|paid|v0-v9&t=…  (the buttons on the Telegram request message)
// GET shows a Confirm page; the POST from that page records the step, with who did it. "Deposit paid" and
// "Paid in full" are payments: the page asks for the amount received and records it in the ledger (lib/bookings.js).
import { checkStatusToken } from '../lib/status-link.js';
import { markStatus, statsConfigured } from '../lib/stats.js';
import { addPayment, getFull, paidCents, cleanBy, BookingError } from '../lib/bookings.js';

const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const LABEL = { contacted: 'contacted', confirmed: 'deposit paid', paid: 'paid in full', rebook: 'asked about next year' };
const PAY = { confirmed: 'deposit', paid: 'payment' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sgTime = (iso) => new Date(iso).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dollars = (c) => '$' + (c / 100).toFixed(2);
const STYLE = 'font-family:system-ui,sans-serif;max-width:420px;margin:12vh auto;padding:0 20px;color:#16183a;text-align:center';
const INPUT = 'display:block;width:100%;box-sizing:border-box;font:inherit;font-size:1.05rem;padding:12px 14px;margin:6px 0 14px;border:1.5px solid #d8d6e6;border-radius:12px';

function head(res, status) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
}

function page(res, status, title, text) {
  head(res, status);
  // Only fixed text and checked or escaped values below: nothing is echoed raw.
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="${STYLE}"><h1 style="font-size:1.5rem">${title}</h1><p>${text}</p><p><a href="/admin.html">Open the dashboard</a></p></body></html>`);
}

function confirmPage(res, ref, s, t, what, extra, pay) {
  head(res, 200);
  // ref, s and t are checked against fixed patterns and the signature before this page is shown
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm</title>
<body style="${STYLE}"><h1 style="font-size:1.4rem">${what}?</h1><p>Booking ${ref}</p>${extra || ''}
<form method="post" action="/api/status" style="text-align:left"><input type="hidden" name="ref" value="${ref}"><input type="hidden" name="s" value="${s}"><input type="hidden" name="t" value="${t}">
${pay ? `<label>Amount received (S$)<input name="amount" inputmode="decimal" required pattern="[0-9]+([.][0-9]{1,2})?" placeholder="e.g. 150.00" value="${pay.prefill || ''}" style="${INPUT}"></label>
<label>Note <span style="color:#6b6f8f">(optional)</span><input name="note" maxlength="200" placeholder="e.g. PayNow, ref 1234" style="${INPUT}"></label>` : ''}
<label>Your name<input name="by" id="by" maxlength="40" required autocomplete="name" style="${INPUT}"></label>
<button style="display:block;width:100%;font:inherit;font-weight:700;font-size:1.05rem;padding:14px 28px;border:0;border-radius:999px;background:#e2335a;color:#fff;cursor:pointer">Yes, confirm</button></form>
<p style="color:#6b6f8f;font-size:.9rem;margin-top:22px">Nothing changes until you tap Confirm.</p>
<script>try{var b=document.getElementById('by');b.value=localStorage.getItem('cc-by')||'';b.form.addEventListener('submit',function(){localStorage.setItem('cc-by',b.value)})}catch(e){}</script></body></html>`);
}

async function readForm(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
  let raw = ''; for await (const c of req) { raw += c; if (raw.length > 4000) break; }
  return Object.fromEntries(new URLSearchParams(raw));
}

const toCents = (v) => { const m = /^\s*(\d{1,6})(?:\.(\d{1,2}))?\s*$/.exec(String(v || '')); return m ? Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0')) : NaN; };

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); return res.end(); }
  // GET (a tap in Telegram) only shows the Confirm page; the POST from that page records the step. So link previews,
  // scanners or a mistaken tap change nothing.
  const q = req.method === 'POST' ? await readForm(req) : Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const ref = String(q.ref || ''), s = String(q.s || ''), t = String(q.t || '');
  if (!REF.test(ref) || !(LABEL[s] || /^v\d$/.test(s)) || !checkStatusToken(ref, s, t)) return page(res, 400, 'That link isn’t valid', 'Please use the button on the Telegram message.');
  if (!statsConfigured()) return page(res, 503, 'Dashboard not connected', 'Connect the database in Vercel to record response times.');
  try {
    if (req.method === 'GET') {
      let extra = '', pay = null;
      if (PAY[s]) {
        const f = await getFull(ref), paid = paidCents(f.payments), balance = f.booking.totalCents - paid;
        extra = `<p style="color:#454a6b">Booking total ${dollars(f.booking.totalCents)}${paid ? ` · received so far ${dollars(paid)} · balance ${dollars(balance)}` : ''}</p>`;
        pay = { prefill: s === 'paid' && balance > 0 ? (balance / 100).toFixed(2) : '' };
      }
      const what = LABEL[s] ? 'Mark as ' + LABEL[s] : 'Mark this vendor as confirmed';
      return confirmPage(res, ref, s, t, what.charAt(0).toUpperCase() + what.slice(1), extra, pay);
    }
    const by = cleanBy(q.by);
    if (!by) return page(res, 400, 'Please add your name', 'Go back and add your name, so the dashboard shows who recorded this.');
    if (PAY[s]) {
      const cents = toCents(q.amount);
      if (!Number.isFinite(cents) || cents <= 0) return page(res, 400, 'Please check the amount', 'Go back and enter the amount received, e.g. 150.00.');
      const r = await addPayment(ref, { kind: PAY[s], cents, by, note: q.note });
      return page(res, 200, `${dollars(cents)} recorded for ${ref}`, `${PAY[s] === 'deposit' ? 'Deposit' : 'Payment'} recorded by ${esc(by)}. Received so far ${dollars(r.paidCents)}; balance ${dollars(Math.max(0, r.balanceCents))}.`);
    }
    const r = await markStatus(ref, s, false, by);
    if (!r) return page(res, 404, 'Request not found', `${ref} was sent before the dashboard was connected.`);
    if (r.refused) return page(res, 409, 'Not yet', esc(r.refused));
    if (r.vendor) return page(res, 200, `${esc(r.vendor.name)} confirmed for ${ref}`, `Recorded at ${sgTime(r.life.vendors[r.vendor.name])} (Singapore time) by ${esc(by)}.`);
    return page(res, 200, `${ref} marked ${LABEL[s]}`, `Recorded at ${sgTime(r.life[s])} (Singapore time) by ${esc(by)}.`);
  } catch (e) {
    if (e instanceof BookingError) return page(res, e.status, 'Not yet', esc(e.message));
    console.error('[status]', e.message); return page(res, 500, 'Something went wrong', 'Please try again.');
  }
}
