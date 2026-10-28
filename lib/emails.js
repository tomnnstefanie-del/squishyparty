// Customer emails: the verification code, and the "we've got your request" confirmation.
import { formatPhone } from './phone.js';
import { money } from './pricing.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wrap = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#16183a;line-height:1.5">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2734c4;font-weight:bold;margin:0 0 12px">Confetti Club</p>${inner}
<p style="font-size:12px;color:#6b6f8f;margin-top:28px">You're receiving this because this email address was used on our party planner. If that wasn't you, you can ignore this email.</p></div>`;

function clock(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; }
function longDate(d) { return new Date(d + 'T00:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' }); }

export function otpEmail(code) {
  return {
    subject: `${code} is your Confetti Club code`,
    text: `Your Confetti Club verification code is ${code}.\n\nEnter it on the request page to confirm your email. It expires in 10 minutes.`,
    html: wrap(`<p>Your verification code is</p><p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:8px 0 16px">${code}</p><p>Enter it on the request page to confirm your email. It expires in 10 minutes.</p>`),
  };
}

export function confirmationEmail({ ref, plan, contact, price, quote, corporate, changeUrl }) {
  const first = contact.parentName.split(/\s+/)[0];
  const phone = formatPhone(contact.phone);
  const when = `${longDate(plan.date)}, ${clock(plan.start)}–${clock(plan.end)}`;
  const where = [contact.venueName, `${contact.address}, Singapore ${contact.postalCode}`].filter(Boolean).join(', ');
  const plus = price.onQuote.length ? ' + items priced in your quote' : '';
  const total = quote ? quote.totalCents : price.totalCents;
  const invoice = (contact.companyName ? ` Once we confirm, we'll send the invoice to ${contact.billingEmail || contact.email}.` : '')
    + (corporate && corporate.procurement ? ` Our team will assist with the necessary procurement documentation, subject to your company's requirements, and will contact you about them.` : '');
  const row = (k, v) => `<tr><td style="padding:4px 14px 4px 0;color:#6b6f8f">${k}</td><td>${v}</td></tr>`;
  const details = [['Date', esc(when)], ['Venue', esc(where)], ['Participants', String(plan.participants)], ['Estimated total', `<b>S${esc(money(total))}</b>${esc(plus)}${quote && quote.discountCents ? ' (with your $10 friend referral)' : ''}`]];
  const outro = [
    `<p style="margin:18px 0 6px"><b>What happens next?</b></p>`,
    `<p style="margin:0 0 10px">Our team will check your date and arrangements, then reach out on WhatsApp at <b>${esc(phone)}</b> to confirm availability.</p>`,
    `<p style="margin:0 0 10px">There's nothing to pay at this stage. ${quote ? 'Your quotation is ready for review, but your booking is not yet confirmed.' : 'Your booking is not yet confirmed.'}${esc(invoice)}</p>`,
    changeUrl ? `<p style="font-size:14px">Need to change something, like the number of guests or the date? <a href="${esc(changeUrl)}">Request a change</a> and our team will send you a revised quotation.</p>` : '',
    `<p>We look forward to celebrating with you!</p><p>Warmly,<br>Confetti Club</p>`,
  ].join('\n');

  if (quote) {
    const why = contact.companyName ? 'for easy reference and internal approval' : 'for easy reference';
    const text = [
      `Hi ${first},`, '',
      `Thanks for planning your event with Confetti Club! 🎉`, '',
      `We've received your event request, and your itemised PDF quotation is attached ${why}.`, '',
      'Your event details:', `- Date: ${when}`, `- Venue: ${where}`, `- Participants: ${plan.participants}`, `- Estimated total: S${money(total)}${plus}`, '',
      'What happens next?',
      `Our team will check your date and arrangements, then reach out on WhatsApp at ${phone} to confirm availability.`, '',
      `There's nothing to pay at this stage. Your quotation is ready for review, but your booking is not yet confirmed.${invoice}`, '',
      ...(changeUrl ? [`Need to change something? Request a change here: ${changeUrl}`, ''] : []),
      'We look forward to celebrating with you!', '', 'Warmly,', 'Confetti Club',
    ].join('\n');
    const html = wrap(`<p>Hi ${esc(first)},</p>
<p>Thanks for planning your event with Confetti Club! 🎉</p>
<p>We've received your event request, and your <b>itemised PDF quotation is attached</b> ${why}.</p>
<p style="margin:16px 0 4px"><b>Your event details:</b></p>
<table style="border-collapse:collapse;font-size:14px;margin:0 0 4px">${details.map(([k, v]) => row(k, v)).join('')}</table>
${outro}`);
    return { subject: `Your Confetti Club Quotation | Q-${ref}`, text, html, attachments: [{ filename: quote.filename, content: quote.pdf, contentType: 'application/pdf' }] };
  }

  const text = [
    `Hi ${first},`, '',
    `Thanks for your Confetti Club request (${ref})! 🎉`, '',
    'Your event details:', `- Date: ${when}`, `- Venue: ${where}`, `- Participants: ${plan.participants}`, `- Estimated total: S${money(total)}${plus}`, '',
    'What happens next?',
    `Our team will check your date and arrangements, then reach out on WhatsApp at ${phone} to confirm availability.`, '',
    `There's nothing to pay at this stage. Once we confirm, we'll send you one quotation.${invoice}`, '',
    'Our team arrives 15 minutes before your start time to set up.', '', ...(changeUrl ? [`Need to change something? Request a change here: ${changeUrl}`, ''] : []), 'Warmly,', 'Confetti Club',
  ].join('\n');
  const html = wrap(`<p>Hi ${esc(first)},</p>
<p>Thanks for your Confetti Club request <b>${esc(ref)}</b>! 🎉</p>
<p style="margin:16px 0 4px"><b>Your event details:</b></p>
<table style="border-collapse:collapse;font-size:14px;margin:0 0 4px">${details.map(([k, v]) => row(k, v)).join('')}</table>
<p style="margin:18px 0 6px"><b>What happens next?</b></p>
<p style="margin:0 0 10px">Our team will check your date and arrangements, then reach out on WhatsApp at <b>${esc(phone)}</b> to confirm availability.</p>
<p style="margin:0 0 10px">There's nothing to pay at this stage. Once we confirm, we'll send you one quotation.${esc(invoice)}</p>
<p>Our team arrives 15 minutes before your start time to set up.</p>${changeUrl ? `<p style="font-size:14px">Need to change something? <a href="${esc(changeUrl)}">Request a change</a>.</p>` : ''}<p>Warmly,<br>Confetti Club</p>`);
  return { subject: `We've got your Confetti Club request (${ref})`, text, html, attachments: [] };
}

/** The revised quotation (after the team reviewed a change). The booking is unchanged until the customer accepts. */
export function revisedQuotationEmail({ ref, n, plan, contact, totalCents, prevTotalCents, paidCents, diff, pdf, filename }) {
  const first = contact.parentName.split(/\s+/)[0];
  const when = `${longDate(plan.date)}, ${clock(plan.start)}–${clock(plan.end)}`;
  const balance = totalCents - (paidCents || 0);
  const lines = [
    `Hi ${first},`, '',
    `As discussed, here is your revised Confetti Club quotation (Q-${ref}-R${n}). It's attached as a PDF.`, '',
    'What changed:', ...diff.map((d) => `- ${d}`), '',
    `When: ${when}`, `Participants: ${plan.participants}`,
    `Previous total: S${money(prevTotalCents)}`, `Revised total: S${money(totalCents)}`,
    ...(paidCents ? [`Deposit received: S${money(paidCents)}`, `Remaining balance: S${money(balance)}`] : []), '',
    'Your current booking stays as it is until you accept. Please reply to us on WhatsApp to accept the revision.', '',
    'Warmly,', 'Confetti Club',
  ];
  const row = (k, v) => `<tr><td style="padding:4px 14px 4px 0;color:#6b6f8f">${k}</td><td>${v}</td></tr>`;
  const html = wrap(`<p>Hi ${esc(first)},</p>
<p>As discussed, here is your revised Confetti Club quotation <b>Q-${esc(ref)}-R${n}</b>. It's attached as a PDF.</p>
<p style="margin:14px 0 4px"><b>What changed</b></p><ul style="margin:0 0 10px;padding-left:18px">${diff.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
<table style="border-collapse:collapse;font-size:14px;margin:0 0 4px">${row('When', esc(when))}${row('Participants', plan.participants)}${row('Previous total', 'S' + esc(money(prevTotalCents)))}${row('Revised total', '<b>S' + esc(money(totalCents)) + '</b>')}${paidCents ? row('Deposit received', 'S' + esc(money(paidCents))) + row('Remaining balance', '<b>S' + esc(money(balance)) + '</b>') : ''}</table>
<p>Your current booking stays as it is until you accept. <b>Please reply to us on WhatsApp to accept the revision.</b></p><p>Warmly,<br>Confetti Club</p>`);
  return { subject: `Your revised Confetti Club quotation | Q-${ref}-R${n}`, text: lines.join('\n'), html, attachments: [{ filename, content: pdf, contentType: 'application/pdf' }] };
}
