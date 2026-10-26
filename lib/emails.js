// Customer emails: the verification code, and the "we've got your request" confirmation.
import { money } from './pricing.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wrap = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16183a;line-height:1.5">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2734c4;font-weight:bold;margin:0 0 12px">The Confetti Club</p>${inner}
<p style="font-size:12px;color:#6b6f8f;margin-top:28px">You're receiving this because this email address was used on our party planner. If that wasn't you, you can ignore this email.</p></div>`;

function clock(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; }
function longDate(d) { return new Date(d + 'T00:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' }); }

export function otpEmail(code) {
  return {
    subject: `${code} is your The Confetti Club code`,
    text: `Your The Confetti Club verification code is ${code}.\n\nEnter it on the request page to confirm your email. It expires in 10 minutes.`,
    html: wrap(`<p>Your verification code is</p><p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:8px 0 16px">${code}</p><p>Enter it on the request page to confirm your email. It expires in 10 minutes.</p>`),
  };
}

export function confirmationEmail({ ref, plan, contact, price }) {
  const first = contact.parentName.split(/\s+/)[0];
  const phone = `+65 ${contact.phone.slice(0, 4)} ${contact.phone.slice(4)}`;
  const when = `${longDate(plan.date)}, ${clock(plan.start)}–${clock(plan.end)}`;
  const where = [contact.venueName, `${contact.address}, Singapore ${contact.postalCode}`].filter(Boolean).join(', ');
  let nextTitle = 'Nothing to pay now', nextText = `Once we confirm availability, we'll send you one quotation for your party.`;
  if (contact.companyName) { // company bookings are invoiced after we confirm, at the same prices
    nextTitle = 'Invoice for your company';
    nextText = `As this is a booking for ${contact.companyName}, there's nothing to pay now. Once we confirm availability, we'll send a quotation and invoice to ${contact.billingEmail || contact.email}. Prices are the same as shown on our website.`;
  }
  const text = [
    `Hi ${first},`, '',
    `Thanks for your Confetti Club request (${ref}).`,
    `Your request is currently being verified by our team, and we'll reach out to you on WhatsApp at ${phone}.`, '',
    `When: ${when}`, `Where: ${where}`, `Participants: ${plan.participants}`,
    `Estimated total: ${money(price.totalCents)}${price.onQuote.length ? ' + items priced in your quote' : ''}`, '',
    `${nextTitle}. ${nextText}`, '',
    'Our team arrives 15 minutes before your start time to set up.', '',
    'The Confetti Club',
  ].join('\n');
  const html = wrap(`<p>Hi ${esc(first)},</p>
<p>Thanks for your Confetti Club request <b>${esc(ref)}</b>. Your request is currently being verified by our team, and we'll reach out to you on WhatsApp at <b>${esc(phone)}</b>.</p>
<table style="border-collapse:collapse;font-size:14px;margin:12px 0">
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">When</td><td>${esc(when)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">Where</td><td>${esc(where)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">Participants</td><td>${plan.participants}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#6b6f8f">Estimate</td><td><b>${money(price.totalCents)}</b>${price.onQuote.length ? ' + items priced in your quote' : ''}</td></tr></table>
<div style="background:#f3f0ff;border-radius:12px;padding:14px 16px;margin:16px 0"><p style="margin:0 0 6px"><b>${esc(nextTitle)}</b></p>
<p style="margin:0">${esc(nextText)}</p></div>
<p>Our team arrives 15 minutes before your start time to set up.</p><p>The Confetti Club</p>`);
  return { subject: `We've got your Confetti Club request (${ref})`, text, html, attachments: [] };
}
