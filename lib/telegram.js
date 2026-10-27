// Builds the owner notification and sends it with the Telegram Bot API.
import { formatPhone } from './phone.js';
import { CATEGORY_TITLES, money } from './pricing.js';
import { readReferralCode, samePerson, REFERRAL_OFFER } from './referral.js';

// Where a request came from (the ?src= in the link). Unknown sources are shown as they are.
const SOURCES = { capsule: 'capsule QR sticker', instagram: 'Instagram', whatsapp: 'WhatsApp', google: 'Google', flyer: 'flyer', outlet: 'Tom & Stefanie outlet' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function clock(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
function longDate(d) {
  return new Date(d + 'T00:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });
}
function duration(start, end) {
  const toM = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const d = toM(end) - toM(start), h = Math.floor(d / 60), r = d % 60;
  return (h ? `${h}h` : '') + (r ? ` ${r}m` : '');
}

export function whatsappLink(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildMessage({ ref, plan, contact, price, clientTotalCents, referral, shareCode, site }) {
  const L = [];
  L.push(`🎉 <b>New Confetti Club request</b> · <code>${ref}</code>`);
  L.push('');
  L.push(`👤 <b>${esc(contact.parentName)}</b>`);
  if (contact.companyName) L.push(`🏢 <b>${esc(contact.companyName)}</b>${contact.companyUen ? ` · UEN ${esc(contact.companyUen)}` : ''}${contact.billingEmail ? `\n    Invoice to ${esc(contact.billingEmail)}` : ''}`);
  L.push(`📱 ${formatPhone(contact.phone)}`);
  L.push(`✉️ ${esc(contact.email)}${contact.emailVerified ? ' ✅ verified' : ''}`);
  L.push('');
  L.push(`📅 <b>${longDate(plan.date)}</b>, ${clock(plan.start)}–${clock(plan.end)} (${duration(plan.start, plan.end).trim()})`);
  if (contact.venueName) L.push(`📍 <b>${esc(contact.venueName)}</b>\n    ${esc(contact.address)}, Singapore ${contact.postalCode}`);
  else L.push(`📍 <b>${esc(contact.address)}, Singapore ${contact.postalCode}</b>`);
  L.push(`👥 ${plan.participants} participants${plan.participants < price.billableParticipants ? ` (charged as ${price.billableParticipants})` : ''}`);
  const rf = referral || {}, used = rf.code ? readReferralCode(rf.code) : null;
  if (used && used.valid) L.push(`🎁 <b>Referred by a friend</b> (code ${esc(used.code)} ✅): ${REFERRAL_OFFER} if they’re new. Not with other offers.${samePerson(used, contact.parentName) ? '\n    ⚠️ The code has the same first name as this customer: check it isn’t their own.' : ''}`);
  else if (used) L.push(`⚠️ Referral code “${esc(used.code)}” isn’t one of ours (typo?). Check with the customer before giving the offer.`);
  if (rf.source === 'capsule' && !(used && used.valid)) L.push(`🎁 <b>Capsule QR offer</b>: ${REFERRAL_OFFER} if they’re new. Not with other offers.${rf.sticker ? `\n    Saw a squishy “Made by: ${esc(rf.sticker)}”` : ''}`);
  if (rf.returning) L.push('🔁 Has booked with us before');
  if (rf.source) L.push(`🧭 Found us via: ${esc(SOURCES[rf.source] || rf.source)}`);
  L.push('');
  L.push('🧪 <b>Squishy DIY</b>');
  for (const l of price.squishy) L.push(`• ${esc(l.label)}: ${money(l.cents)}`);
  L.push(`<b>Squishy total: ${money(price.squishyCents)}</b>`);
  if (contact.companyName) L.push(`🧾 <b>Company booking: send a quotation and invoice</b>`);
  if (price.addons.length) {
    L.push('');
    L.push('➕ <b>Add-ons</b>');
    for (const a of price.addons) {
      const qtyTxt = a.quantity > 1 ? ` ×${a.quantity}` : '';
      const priceTxt = a.cents == null ? 'on quote' : money(a.cents) + (a.demo ? ' (demo price)' : '');
      L.push(`• [${esc(CATEGORY_TITLES[a.category] || a.category)}] ${esc(a.name)}${qtyTxt}, ${esc(a.vendor)}: ${priceTxt}`);
      const c = plan.custom && plan.custom[a.id];
      if (c) {
        if (c.colours && c.colours.length) L.push(`    🎨 Colours: ${esc(c.colours.join(', '))}`);
        if (c.text) L.push(`    ✍️ Vinyl text: “${esc(c.text)}”`);
        if (c.notes) L.push(`    💡 Inspiration: ${esc(c.notes)}`);
        if (c.images) L.push(`    🖼 ${c.images} moodboard image${c.images > 1 ? 's' : ''} below`);
      }
    }
  } else {
    L.push('');
    L.push('➕ No add-ons');
  }
  L.push('');
  L.push(`💰 <b>Estimated total: ${money(price.totalCents)}</b>${price.onQuote.length ? ` + ${price.onQuote.length} item(s) on quote` : ''}`);
  if (clientTotalCents != null && clientTotalCents !== price.totalCents) L.push(`⚠️ Page showed ${money(clientTotalCents)}; the server price above is the one to quote.`);
  if (contact.notes) { L.push(''); L.push(`📝 ${esc(contact.notes)}`); }
  if (shareCode) { L.push(''); L.push(`🔗 <b>Their referral link</b> to send after the party (friends get ${REFERRAL_OFFER}):
${esc(site)}/?ref=${shareCode}`); }
  let text = L.join('\n');
  if (text.length > 3900) text = text.slice(0, 3880) + '\n… (truncated)';
  return text;
}

/** The WhatsApp message to send after the party, with the family's referral link. */
export function afterPartyMessage({ contact, shareCode, site }) {
  const first = contact.parentName.split(/\s+/)[0];
  return `Hi ${first}! Thank you for celebrating with Confetti Club 🎉 Here's how to look after your squishies: ${site}/#care

How did everyone enjoy it? We'd love your honest feedback.

Know another family planning a party? Share this link and they'll get ${REFERRAL_OFFER}: ${site}/?ref=${shareCode}`;
}

export function customerGreeting({ ref, plan, contact }) {
  const first = contact.parentName.split(/\s+/)[0];
  return `Hi ${first}! This is Confetti Club 🎉 Thanks for your request ${ref} for ${longDate(plan.date)}${contact.venueName ? ' at ' + contact.venueName : ''}. We're checking our team's availability and will confirm shortly.`;
}

/** Sends a file (e.g. the PDF quotation) with a caption, so the chat keeps a copy of exactly what the customer received. */
export async function sendTelegramDocument({ token, chatId, data, filename, mime = 'application/pdf', caption, apiBase = 'https://api.telegram.org', timeoutMs = 15000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const fd = new FormData();
    fd.append('chat_id', String(chatId));
    fd.append('caption', caption.slice(0, 1000));
    fd.append('document', new Blob([data], { type: mime }), filename);
    const r = await fetch(`${apiBase}/bot${token}/sendDocument`, { method: 'POST', body: fd, signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(`Telegram responded ${r.status}: ${j.description || 'unknown error'}`);
    return j;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends one moodboard image (base64 JPEG/PNG) as a photo with a caption. */
export async function sendTelegramPhoto({ token, chatId, b64, mime, caption, apiBase = 'https://api.telegram.org', timeoutMs = 15000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const fd = new FormData();
    fd.append('chat_id', String(chatId));
    fd.append('caption', caption.slice(0, 1000));
    fd.append('photo', new Blob([Buffer.from(b64, 'base64')], { type: mime }), mime === 'image/png' ? 'moodboard.png' : 'moodboard.jpg');
    const r = await fetch(`${apiBase}/bot${token}/sendPhoto`, { method: 'POST', body: fd, signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(`Telegram responded ${r.status}: ${j.description || 'unknown error'}`);
    return j;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTelegram({ token, chatId, text, buttonUrl, afterUrl, apiBase = 'https://api.telegram.org', timeoutMs = 8000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${apiBase}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(buttonUrl ? { reply_markup: { inline_keyboard: [[{ text: '💬 WhatsApp the customer', url: buttonUrl }], ...(afterUrl ? [[{ text: '🎁 After the party: care tips + referral link', url: afterUrl }]] : [])] } } : {}),
      }),
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(`Telegram responded ${r.status}: ${j.description || 'unknown error'}`);
    return j;
  } finally {
    clearTimeout(timer);
  }
}
