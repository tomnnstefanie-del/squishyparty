// Customer emails: the verification code, and the "we've got your request" confirmation.
import { money } from './pricing.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wrap = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16183a;line-height:1.5">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2734c4;font-weight:bold;margin:0 0 12px">Squishy Party · Tom &amp; Stefanie</p>${inner}
<p style="font-size:12px;color:#6b6f8f;margin-top:28px">You're receiving this because this email address was used on our party planner. If that wasn't you, you can ignore this email.</p></div>`;

function clock(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; }
function longDate(d) { return new Date(d + 'T00:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' }); }

export function otpEmail(code) {
  return {
    subject: `${code} is your Squishy Party code`,
    text: `Your Squishy Party verification code is ${code}.\n\nEnter it on the request page to confirm your email. It expires in 10 minutes.`,
    html: wrap(`<p>Your verification code is</p><p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:8px 0 16px">${code}</p><p>Enter it on the request page to confirm your email. It expires in 10 minutes.</p>`),
  };
}

export function confirmationEmail({ ref, plan, contact, price, paynow }) {
  const first = contact.parentName.split(/\s+/)[0];
  const phone = `+65 ${contact.phone.slice(0, 4)} ${contact.phone.slice(4)}`;
  const when = `${longDate(plan.date)}, ${clock(plan.start)}–${clock(plan.end)}`;
  const where = [contact.venueName, `${contact.address}, Singapore ${contact.postalCode}`].filter(Boolean).join(', ');
  const hold = money(price.holdCents);
  const payText = paynow
    ? `To lock in your request, please pay the ${hold} holding deposit (10% of your Squishy Party) by PayNow to ${paynow.payee} (${paynow.label}) with reference ${ref}. The QR code is attached: scan it in your banking app and the amount and reference fill in automatically.`
    : `To lock in your request, we'll WhatsApp you PayNow details for the ${hold} holding deposit (10% of your Squishy Party).`;
  const policy = 'Fine print: the 10% holding deposit is refunded in full if we’re unable to attend on your date. If you go ahead with your package, it’s deducted from your full amount. It’s non-refundable if you cancel.';
  const text = [
    `Hi ${first},`, '',
    `Thanks for your Squishy Party request (${ref}).`,
    `Your request is currently being verified by our team, and we'll reach out to you on WhatsApp at ${phone}.`, '',
    `When: ${when}`, `Where: ${where}`, `Guests: ${plan.children} children, ${plan.adults} adults`,
    `Estimated total: ${money(price.totalCents)}${price.onQuote.length ? ' + items priced in your quote' : ''}`, '',
    payText, policy, '',
    'Our team arrives 15 minutes before your start time to set up.', '',
    'Tom & Stefanie',
  ].join('\n');
  const html = wrap(`<p>Hi ${esc(first)},</p>
<p>Thanks for your Squishy Party request <b>${esc(ref)}</b>. Your request is currently being verified by our team, and we'll reach out to you on WhatsApp at <b>${esc(phone)}</b>.</p>
<table style="border-collapse:collapse;font-size:14px;margin:12px 0">
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">When</td><td>${esc(when)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">Where</td><td>${esc(where)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">Guests</td><td>${plan.children} children, ${plan.adults} adults</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">Estimate</td><td><b>${money(price.totalCents)}</b>${price.onQuote.length ? ' + items priced in your quote' : ''}</td></tr></table>
<div style="background:#f3f0ff;border-radius:12px;padding:14px 16px;margin:16px 0"><p style="margin:0 0 6px"><b>Holding deposit: ${hold}</b> (10% of your Squishy Party)</p>
<p style="margin:0">${esc(payText)}</p>${paynow ? '<p style="margin:12px 0 0"><img src="cid:paynow-qr" alt="PayNow QR code" width="200" height="200"></p>' : ''}
<p style="margin:10px 0 0;font-size:13px;color:#6b6f8f">${esc(policy)}</p></div>
<p>Our team arrives 15 minutes before your start time to set up.</p><p>Tom &amp; Stefanie</p>`);
  const attachments = paynow ? [{ filename: `PayNow-${ref}.png`, content: paynow.png, contentType: 'image/png', cid: 'paynow-qr' }] : [];
  return { subject: `We've got your Squishy Party request (${ref})`, text, html, attachments };
}
