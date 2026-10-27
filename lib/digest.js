// The daily Telegram "bump": every booking that still needs something, grouped by stage, with one button per booking
// for its next step (Contacted, a vendor confirmed, Deposit paid, Paid in full). The buttons are the same signed links
// as on the request message, so tapping one updates the dashboard. Sent by api/digest.js (daily) or the dashboard.
import { statusLink } from './status-link.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const day = (d) => new Date(d + 'T00:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });
const clock = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
const who = (b) => (b.companyName ? `${b.companyName} (${b.first})` : b.first);

const GROUPS = [
  ['pending', '🟡 <b>Waiting for vendors</b>'],
  ['ready', '🟠 <b>Ask for the deposit</b>'],
  ['booked', '🔵 <b>Deposit paid, balance to collect</b>'],
];

/** The one next step for a booking, as [button label, status]. */
function nextStep(b) {
  const L = b.life || {}, name = b.first.slice(0, 14) + ' ' + day(b.date).replace(/^\w+, /, '');
  if (!L.contacted) return [`✅ Contacted · ${name}`, 'contacted'];
  const v = (b.vendors || []).find((x) => !x.ok);
  if (v) return [`🤝 ${v.name.slice(0, 18)} ok · ${name}`, 'v' + v.i];
  if (b.state === 'ready') return [`💵 Deposit paid · ${name}`, 'confirmed'];
  if (b.state === 'booked') return [`💰 Paid in full · ${name}`, 'paid'];
  return null;
}

/** stats: the result of readStats(). Returns { text, keyboard, count }. */
export function buildDigest(stats, site) {
  const today = stats.today;
  // Upcoming parties with something open, plus past parties whose balance is still due
  const open = (stats.bookings || []).filter((b) => b.todos.length && (b.date >= today || b.state === 'booked'));
  const L = [`📋 <b>Confetti Club to-do</b> · ${day(today)}`];
  if (!open.length) {
    L.push('', 'Nothing pending. 🎉');
    return { text: L.join('\n'), keyboard: [[{ text: '📊 Open the dashboard', url: site + '/admin.html' }]], count: 0 };
  }
  const notReplied = open.filter((b) => !(b.life || {}).contacted).length;
  if (notReplied) L.push(`⏰ <b>${notReplied} not replied to yet</b>`);
  for (const [state, title] of GROUPS) {
    const list = open.filter((b) => b.state === state);
    if (!list.length) continue;
    L.push('', `${title} (${list.length})`);
    for (const b of list) L.push(`• ${day(b.date)} ${clock(b.start)} · <b>${esc(who(b))}</b>, ${b.participants} pax\n   → ${esc(b.todos.join('; '))}`);
  }
  const keyboard = open.map((b) => { const n = nextStep(b); return n && [{ text: n[0].slice(0, 60), url: statusLink(site, b.ref, n[1]) }]; }).filter(Boolean).slice(0, 20);
  keyboard.push([{ text: '📊 Open the dashboard', url: site + '/admin.html' }]);
  L.push('', 'Tap a button when that step is done. Each one updates the dashboard.');
  let text = L.join('\n');
  if (text.length > 3900) text = text.slice(0, 3880) + '\n… (more on the dashboard)';
  return { text, keyboard, count: open.length };
}
