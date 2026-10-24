// Builds the owner notification and sends it with the Telegram Bot API.
import { CATEGORY_TITLES, money } from './pricing.js';

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
  return `https://wa.me/65${phone}?text=${encodeURIComponent(text)}`;
}

export function buildMessage({ ref, plan, contact, price, clientTotalCents }) {
  const L = [];
  L.push(`🎉 <b>New Squishy Party request</b> · <code>${ref}</code>`);
  L.push('');
  L.push(`👤 <b>${esc(contact.parentName)}</b>`);
  if (contact.companyName) L.push(`🏢 <b>${esc(contact.companyName)}</b>${contact.companyUen ? ` · UEN ${esc(contact.companyUen)}` : ''}${contact.billingEmail ? `\n    Invoice to ${esc(contact.billingEmail)}` : ''}`);
  L.push(`📱 +65 ${contact.phone.slice(0, 4)} ${contact.phone.slice(4)}`);
  L.push(`✉️ ${esc(contact.email)}${contact.emailVerified ? ' ✅ verified' : ''}`);
  L.push('');
  L.push(`📅 <b>${longDate(plan.date)}</b>, ${clock(plan.start)}–${clock(plan.end)} (${duration(plan.start, plan.end).trim()})`);
  if (contact.venueName) L.push(`📍 <b>${esc(contact.venueName)}</b>\n    ${esc(contact.address)}, Singapore ${contact.postalCode}`);
  else L.push(`📍 <b>${esc(contact.address)}, Singapore ${contact.postalCode}</b>`);
  L.push(`👧 ${plan.children} children${plan.children < price.billableChildren ? ` (charged as ${price.billableChildren})` : ''} · ${plan.adults} adults`);
  L.push('');
  L.push('🧪 <b>Squishy Party</b>');
  for (const l of price.squishy) L.push(`• ${esc(l.label)}: ${money(l.cents)}`);
  L.push(`<b>Squishy total: ${money(price.squishyCents)}</b> · 50% deposit ${money(price.depositCents)}`);
  if (contact.companyName) L.push(`🧾 <b>Company booking: send a quotation and invoice</b> (no PayNow deposit)`);
  else L.push(`🔐 10% holding deposit <b>${money(price.holdCents)}</b> by PayNow, ref <code>${ref}</code>: <i>awaiting payment</i>`);
  if (price.addons.length) {
    L.push('');
    L.push('➕ <b>Add-ons</b>');
    for (const a of price.addons) {
      const qtyTxt = a.quantity > 1 ? ` ×${a.quantity}` : '';
      const priceTxt = a.cents == null ? 'on quote' : money(a.cents) + (a.demo ? ' (demo price)' : '');
      L.push(`• [${esc(CATEGORY_TITLES[a.category] || a.category)}] ${esc(a.name)}${qtyTxt}, ${esc(a.vendor)}: ${priceTxt}`);
    }
  } else {
    L.push('');
    L.push('➕ No add-ons');
  }
  L.push('');
  L.push(`💰 <b>Estimated total: ${money(price.totalCents)}</b>${price.onQuote.length ? ` + ${price.onQuote.length} item(s) on quote` : ''}`);
  if (plan.budgetCents != null) L.push(`🎯 Their budget: ${money(plan.budgetCents)}`);
  if (clientTotalCents != null && clientTotalCents !== price.totalCents) L.push(`⚠️ Page showed ${money(clientTotalCents)}; the server price above is the one to quote.`);
  if (contact.notes) { L.push(''); L.push(`📝 ${esc(contact.notes)}`); }
  let text = L.join('\n');
  if (text.length > 3900) text = text.slice(0, 3880) + '\n… (truncated)';
  return text;
}

export function customerGreeting({ ref, plan, contact }) {
  const first = contact.parentName.split(/\s+/)[0];
  return `Hi ${first}! This is Squishy Party by Tom & Stefanie 🎉 Thanks for your request ${ref} for ${longDate(plan.date)}${contact.venueName ? ' at ' + contact.venueName : ''}. We're checking our team's availability and will confirm shortly.`;
}

export async function sendTelegram({ token, chatId, text, buttonUrl, apiBase = 'https://api.telegram.org', timeoutMs = 8000 }) {
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
        ...(buttonUrl ? { reply_markup: { inline_keyboard: [[{ text: '💬 WhatsApp the customer', url: buttonUrl }]] } } : {}),
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
