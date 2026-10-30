// Referral and QR numbers for the private dashboard (/admin.html), kept in a small Redis database.
// Free: Vercel -> Storage -> Upstash for Redis, which sets KV_REST_API_URL and KV_REST_API_TOKEN
// (UPSTASH_REDIS_REST_URL / _TOKEN also work). Called over its REST API, so no extra packages.
// Without a database nothing is recorded and the dashboard says so; tests set STATS_MEMORY=1.
// Stored: counts, referral codes with the first name and booking reference of the family they belong to, recent
// requests (reference, date, size, total, how they found us) and, for scheduling, each booking's date, time, venue
// name and postal area, add-ons and partner vendors. Payments, revisions and change history are in lib/bookings.js.
// The customer's contact details (needed to email a revised quotation) are kept separately under cc:contact:<ref>,
// behind the dashboard password, and expire after 400 days. They never go to the dashboard page or the logs.

import crypto from 'node:crypto';
import { sign } from './otp.js';
import { buildScorecard, cleanSettings, windowOf, VISIT_SOURCES } from './scorecard.js';

const P = 'cc:';
const mem = new Map();

const conf = () => ({
  url: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, ''),
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});
export const statsConfigured = () => process.env.STATS_MEMORY === '1' || !!(conf().url && conf().token);

// The handful of Redis commands we use, in memory for tests and local runs.
function memRun([cmd, key, ...a]) {
  const get = (t) => { if (!mem.has(key)) mem.set(key, t()); return mem.get(key); };
  switch (cmd) {
    case 'HINCRBY': { const h = get(() => new Map()); const v = (Number(h.get(a[0])) || 0) + Number(a[1]); h.set(a[0], String(v)); return v; }
    case 'HSET': { const h = get(() => new Map()); for (let i = 0; i < a.length; i += 2) h.set(a[i], String(a[i + 1])); return 1; }
    case 'HGET': { const h = mem.get(key); return h && h.has(a[0]) ? h.get(a[0]) : null; }
    case 'INCR': { const v = (Number(mem.get(key)) || 0) + 1; mem.set(key, String(v)); return v; }
    case 'DEL': return mem.delete(key) ? 1 : 0;
    case 'HGETALL': { const h = mem.get(key); return h ? [...h].flat() : []; }
    case 'LPUSH': { const l = get(() => []); a.forEach((x) => l.unshift(String(x))); return l.length; }
    case 'LTRIM': { const l = mem.get(key) || []; mem.set(key, l.slice(Number(a[0]), Number(a[1]) + 1)); return 'OK'; }
    case 'LRANGE': { const l = mem.get(key) || []; return l.slice(Number(a[0]), Number(a[1]) === -1 ? undefined : Number(a[1]) + 1); }
    case 'EXPIRE': return 1;
    case 'GET': return mem.has(key) ? mem.get(key) : null;
    case 'SET': mem.set(key, String(a[0])); return 'OK';
    default: throw new Error('unsupported ' + cmd);
  }
}

export async function run(cmds) {
  if (process.env.STATS_MEMORY === '1') return cmds.map(memRun);
  const { url, token } = conf(); if (!url || !token) return null;
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(url + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds), signal: ctrl.signal });
    const j = await r.json();
    if (!r.ok || !Array.isArray(j)) throw new Error(`database responded ${r.status}`);
    return j.map((x) => x.result);
  } finally { clearTimeout(timer); }
}

const day = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // Singapore date
const bump = (field) => [['HINCRBY', P + 'count', field, 1], ['HINCRBY', P + 'day:' + day(), field, 1], ['EXPIRE', P + 'day:' + day(), 120 * 86400]];
const hash = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1]; return o; };
export const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
export { P, bump, hash };

/** Recording never gets in the way of the customer: failures are logged and ignored. */
async function safe(tag, cmds) { try { await run(cmds); } catch (e) { console.error('[stats]', tag, e.message); } }

// A timeline of what happened and when (scans, link opens, requests, contacted, confirmed), newest first.
export const log = (e) => [['LPUSH', P + 'events', JSON.stringify({ ...e, at: new Date().toISOString() })], ['LTRIM', P + 'events', 0, 999]];

export const recordScan = () => safe('scan', [...bump('capsule_scan'), ...log({ type: 'scan' })]);

/** A visit to the site (once per browser session), by where it came from (?src=), for the scorecard funnel. */
export const recordVisit = (source) => safe('visit', [...bump('visit'), ...bump('visit_' + (VISIT_SOURCES.includes(source) ? source : 'other'))]);

/** Costs and targets for the scorecard, entered on the dashboard. */
export async function saveSettings(input, by) {
  const s = { ...cleanSettings(input), savedAt: new Date().toISOString(), savedBy: String(by || '—').slice(0, 40) };
  await run([['SET', P + 'settings', JSON.stringify(s)]]);
  return s;
}

/** A friend's link opened on a new device (the page sends this once per device). */
export const recordLinkOpen = (code) => safe('open', [...bump('link_open'), ['HINCRBY', P + 'opens', code, 1], ...log({ type: 'open', code })]);

/**
 * A request that reached Telegram. via: 'friend' (one of our codes), 'capsule' (QR offer), 'unknown-code' or ''.
 * Also remembers the new family's own code, so later referrals can be traced back to their party.
 */
export const IN_HOUSE = 'Tom & Stefanie'; // our own add-ons: nothing to confirm with a partner

/** Partner vendors in a request, each with its add-ons, in the order they were chosen. */
export function vendorsOf(price) {
  const by = new Map();
  for (const a of price.addons) {
    if (a.vendor === IN_HOUSE) continue;
    if (!by.has(a.vendor)) by.set(a.vendor, { name: a.vendor, items: [] });
    by.get(a.vendor).items.push(a.name + (a.quantity > 1 ? ` ×${a.quantity}` : '') + (a.cents == null ? ' (priced in quote)' : ''));
  }
  return [...by.values()];
}

export function recordRequest({ ref, plan, price, contact, via, code, shareCode, experienceName, corporate, rates, discountCents, bookingFor, match, source }) {
  const first = contact.parentName.split(/\s+/)[0].slice(0, 40);
  const row = { ref, at: new Date().toISOString(), date: plan.date, participants: plan.participants, totalCents: price.totalCents, via, code: via === 'friend' ? code : '', company: !!contact.companyName, source: source || '' };
  // For the booking calendar: when, where (venue name and postal area only), what, and who else needs to confirm
  const booking = { ...row, start: plan.start, end: plan.end, first, companyName: contact.companyName || '', experience: experienceName || plan.experience, wax: !!plan.wax,
    venue: contact.venueName || '', area: String(contact.postalCode || '').slice(0, 2), addons: price.addons.length,
    vendors: vendorsOf(price), onQuote: price.onQuote.map((a) => a.name), inHouse: price.addons.filter((a) => a.vendor === IN_HOUSE).map((a) => a.name),
    procurement: !!(corporate && corporate.procurement), poRef: contact.poRef || '',
    occasion: (corporate && corporate.occasion) || '', yearly: !!(corporate && corporate.yearly), returning: (match && match.previous || []).map((p) => p.ref).slice(0, 5), selfReferral: !!(match && match.selfReferral),
    // What was quoted, so a revision can be compared and priced with the same unit prices (lib/bookings.js)
    version: 1, plan: { participants: plan.participants, experience: plan.experience, wax: !!plan.wax, addons: plan.addons, date: plan.date, start: plan.start, end: plan.end },
    rates: rates || null, lines: price, originalTotalCents: price.totalCents, discountCents: discountCents || 0 };
  const contactSnap = { ...contact, bookingFor: bookingFor || (contact.companyName ? 'company' : 'family'), corporate: corporate || null };
  const cmds = [...bump('requests'), ['LPUSH', P + 'requests', JSON.stringify(row)], ['LTRIM', P + 'requests', 0, 499],
    ['HSET', P + 'codes', shareCode, JSON.stringify({ ref, first, date: plan.date, who: whoKeys(contact) })],
    ...whoKeys(contact).flatMap((k) => [['LPUSH', P + 'who:' + k, JSON.stringify({ ref, date: plan.date })], ['LTRIM', P + 'who:' + k, 0, 19], ['EXPIRE', P + 'who:' + k, 400 * 86400]]),
    ['HSET', P + 'life', ref, JSON.stringify({ at: row.at })], ['HSET', P + 'book', ref, JSON.stringify(booking)], ...log({ type: 'request', ref, via }),
    ['SET', P + 'contact:' + ref, JSON.stringify(contactSnap)], ['EXPIRE', P + 'contact:' + ref, 400 * 86400]];
  if (via) cmds.push(...bump('req_' + via.replace('-', '_')));
  if (via === 'friend') cmds.push(['HINCRBY', P + 'referred', code, 1], ['LPUSH', P + 'by:' + code, JSON.stringify(row)], ['LTRIM', P + 'by:' + code, 0, 99]);
  return safe('request', cmds);
}

// Recognising the same customer without accounts: their verified email and WhatsApp number, stored only as keyed
// hashes (cc:who:<hash> -> their booking refs, kept 400 days like the contact details). Never shown to customers.
const OCC = { 'family-day': 'Family Day', 'team-bonding': 'team bonding', 'year-end': 'D&D / year-end party', anniversary: 'company anniversary', festive: 'festive celebration', other: 'event' };
export function whoKeys(contact) {
  const keys = [];
  const e = String(contact.email || '').trim().toLowerCase(), ph = String(contact.phone || '').replace(/\D/g, '');
  if (e) keys.push('e' + sign('who', e).slice(0, 24));
  if (ph.length >= 8) keys.push('p' + sign('who', ph).slice(0, 24));
  return keys;
}

/**
 * Before a request is recorded: earlier bookings with the same email or WhatsApp number, and whether a friend's code
 * belongs to this same person. Returns null without the dashboard. Never throws.
 */
export async function matchCustomer(contact, code) {
  if (!statsConfigured()) return null;
  try {
    const keys = whoKeys(contact);
    const res = await run([...keys.map((k) => ['LRANGE', P + 'who:' + k, 0, 19]), ['HGET', P + 'codes', code || '-']]);
    const seen = new Map(), by = new Set();
    keys.forEach((k, i) => { for (const raw of res[i] || []) { const p = json(raw); if (p && !seen.has(p.ref)) seen.set(p.ref, p); if (p) by.add(k[0] === 'e' ? 'email' : 'WhatsApp number'); } });
    const from = json(res[keys.length]);
    const selfReferral = !!(from && Array.isArray(from.who) && from.who.some((k) => keys.includes(k)));
    return { previous: [...seen.values()].sort((a, b) => b.date.localeCompare(a.date)), by: [...by].join(' and '), selfReferral };
  } catch (e) { console.error('[stats] match', e.message); return null; }
}

export const STATUSES = ['contacted', 'confirmed', 'lost', 'paid', 'rebook'];
/** 'contacted', 'confirmed', 'lost', 'paid', or 'v0'-'v9' (that partner vendor confirmed). */
export const validStatus = (s) => STATUSES.includes(s) || /^v\d$/.test(String(s));

/**
 * Records a step for a request: we contacted them, they confirmed, they didn't book, they paid, or partner vendor n
 * confirmed. The first time counts: tapping a button twice doesn't move the time. undo (dashboard only) clears it.
 * Returns { life, booking } or null if the reference or vendor is unknown.
 */
export async function markStatus(ref, status, undo = false, by = '') {
  if (!statsConfigured() || !validStatus(status)) return null;
  const [raw, rawBook] = await run([['HGET', P + 'life', ref], ['HGET', P + 'book', ref]]);
  const life = json(raw), booking = json(rawBook) || {}; if (!life) return null;
  const now = new Date().toISOString();
  let vendor = null, changed = false;
  // Steps happen in order, so a stray or early tap can't put a booking in an impossible state
  if (status === 'confirmed' || status === 'paid') {
    const [rawPay] = await run([['GET', P + 'pay:' + ref]]);
    if ((json(rawPay) || []).length) return { life, booking, refused: undo ? 'Payments are corrected with a reversal and a reason, on the booking’s Manage panel.' : 'Record the payment with its amount on the Manage panel or the Telegram confirm page.' };
    if (!undo) return { life, booking, refused: 'Record the payment with its amount on the Manage panel or the Telegram confirm page.' };
  }
  if (!undo) {
    const waiting = (booking.vendors || []).filter((v) => !(life.vendors || {})[v.name]).map((v) => v.name);
    if (life.lost && status !== 'lost') return { life, booking, refused: 'This booking is marked “Didn’t book”. Undo that on the dashboard first.' };
    if (status === 'confirmed' && waiting.length) return { life, booking, refused: `${waiting.join(' and ')} ${waiting.length > 1 ? 'haven’t' : 'hasn’t'} confirmed yet. Confirm every vendor before the deposit.` };
    if (status === 'paid' && !life.confirmed) return { life, booking, refused: 'Record the deposit first, then “Paid in full”.' };
    if (status === 'lost' && (life.confirmed || life.paid)) return { life, booking, refused: 'A deposit is recorded for this booking. Undo the deposit first if they’ve cancelled.' };
  }
  if (/^v\d$/.test(status)) {
    vendor = (booking.vendors || [])[Number(status.slice(1))]; if (!vendor) return null;
    life.vendors = life.vendors || {};
    if (undo && life.vendors[vendor.name]) { delete life.vendors[vendor.name]; changed = true; }
    else if (!undo && !life.vendors[vendor.name]) { life.vendors[vendor.name] = now; changed = true; }
  } else if (undo && life[status]) { delete life[status]; if (status === 'confirmed') delete life.paid; changed = true; }
  else if (!undo && !life[status]) {
    life[status] = now; changed = true;
    if ((status === 'confirmed' || status === 'paid') && !life.contacted) life.contacted = now; // we must have spoken to them
  }
  const NAMES = { contacted: 'Contacted the customer', lost: 'Didn’t book', confirmed: 'Deposit paid', paid: 'Paid in full', rebook: 'Asked about booking again next year' };
  const what = (undo ? 'Undid: ' : '') + (vendor ? `${vendor.name} confirmed` : NAMES[status] || status);
  if (changed) await run([['HSET', P + 'life', ref, JSON.stringify(life)], ...(undo ? [] : bump(vendor ? 'vendor_ok' : status)),
    ['LPUSH', P + 'hist:' + ref, JSON.stringify({ at: now, by: String(by || '—').slice(0, 40), what })], ['LTRIM', P + 'hist:' + ref, 0, 299],
    ...log({ type: undo ? 'undo' : vendor ? 'vendor' : status, ref, ...(vendor ? { vendor: vendor.name } : {}), ...(undo ? { what: vendor ? vendor.name : status } : {}) })]);
  return { life, booking, vendor };
}

/**
 * Where a booking is. Stored keys: contacted, confirmed (= deposit paid), paid (= paid in full), lost, vendors{}.
 *   pending  yellow  partner vendors still to confirm
 *   ready    orange  every vendor confirmed (or none needed): WhatsApp the customer about the deposit
 *   booked   blue    deposit paid
 *   paid     green   paid in full
 *   lost     grey    didn't book
 */
export function stageOf(b, life) {
  if (life.paid) return 'paid';
  if (life.confirmed) return 'booked';
  if (life.lost) return 'lost';
  return (b.vendors || []).every((v) => (life.vendors || {})[v.name]) ? 'ready' : 'pending';
}

/** What's still open for a booking, from our side and the partners'. */
export function todosFor(b, life, today, x = {}) {
  const stage = stageOf(b, life);
  const t = [];
  // Changes asked for by the customer, and a revision in progress, come first whatever the stage
  const openChg = (x.changes || []).filter((c) => c.status === 'open').length;
  if (openChg) t.push(`Customer asked for a change${openChg > 1 ? ` (${openChg})` : ''}: review it`);
  const rv = (x.revisions || []).find((r) => r.status === 'draft' || r.status === 'sent');
  if (rv && rv.status === 'draft') t.push(`Review and send revised quotation R${rv.n}`);
  if (rv && rv.status === 'sent') {
    if (!rv.accepted) t.push(`Waiting for the customer to accept R${rv.n}`);
    for (const v of rv.vendors) if (!v.done) t.push(v.action === 'cancel' ? `Tell ${v.name} their items are cancelled (R${rv.n})` : `Re-confirm ${v.name} for R${rv.n}`);
    if (rv.accepted && rv.vendors.every((v) => v.done)) t.push(`Apply revision R${rv.n} to the booking`);
  }
  // Companies often book the same event every year: about 10 weeks before the anniversary, ask about next year
  if (b.companyName && (stage === 'booked' || stage === 'paid') && !life.rebook && b.date < today) {
    const anniv = new Date(b.date + 'T00:00:00Z'); anniv.setUTCFullYear(anniv.getUTCFullYear() + 1);
    const days = (anniv - new Date(today + 'T00:00:00Z')) / 864e5;
    // A yearly event gets an earlier nudge (about 13 weeks), so they can book before the dates go
    const what = (OCC[b.occasion] ? `: their ${OCC[b.occasion]}` : '') + (b.yearly ? ', held every year' : '');
    if (days <= (b.yearly ? 90 : 70) && days > -30) t.push(`Ask ${b.companyName} about booking again${what} (last one was ${b.date})`);
  }
  if (stage === 'lost' || stage === 'paid') return t;
  if (!life.contacted) t.push('Reply to the customer');
  for (const v of b.vendors || []) if (!(life.vendors || {})[v.name]) t.push(`Confirm with ${v.name}`);
  if ((b.onQuote || []).length && stage !== 'booked') t.push(`Price ${b.onQuote.join(', ')} in the final quote`);
  if (b.procurement && stage !== 'booked') t.push('Help with their vendor registration / procurement');
  if (stage === 'ready') t.push('WhatsApp the customer to ask for the deposit');
  if (stage === 'booked') t.push((b.date < today ? 'Balance overdue: ' : 'Collect the balance: ') + (x.balanceCents != null ? '$' + (x.balanceCents / 100).toFixed(2) : '').replace(/: $/, ''));
  return t;
}

/** Wrong dashboard passwords per address, kept in the database so every server instance sees them. */
export async function tooManyFailures(ip, add) {
  if (!statsConfigured()) return false;
  const key = P + 'fail:' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16); // no raw IPs stored
  if (add) { const [n] = await run([['INCR', key], ['EXPIRE', key, 15 * 60]]); return n > 10; }
  const [n] = await run([['GET', key]]); return Number(n) > 10;
}

const HOUR = 3600e3;
function timing(list) { // hours between two moments: average, middle value and how many
  const h = list.filter((x) => x >= 0).map((x) => x / HOUR).sort((a, b) => a - b);
  if (!h.length) return { n: 0 };
  return { n: h.length, avg: h.reduce((a, b) => a + b, 0) / h.length, median: h.length % 2 ? h[(h.length - 1) / 2] : (h[h.length / 2 - 1] + h[h.length / 2]) / 2 };
}

/** Everything the dashboard shows. */
export async function readStats() {
  if (!statsConfigured()) return { connected: false };
  const days = [...Array(14)].map((_, i) => new Date(Date.now() + 8 * 3600e3 - i * 864e5).toISOString().slice(0, 10)).reverse();
  const [count, opens, referred, codes, recent, events, lifeAll, bookAll, rawSettings, rewardAll, ...daily] = await run([
    ['HGETALL', P + 'count'], ['HGETALL', P + 'opens'], ['HGETALL', P + 'referred'], ['HGETALL', P + 'codes'], ['LRANGE', P + 'requests', 0, 99],
    ['LRANGE', P + 'events', 0, 199], ['HGETALL', P + 'life'], ['HGETALL', P + 'book'], ['GET', P + 'settings'], ['HGETALL', P + 'rewards'],
    ...days.map((d) => ['HGETALL', P + 'day:' + d]),
  ]);
  const c = hash(count), o = hash(opens), r = hash(referred), k = hash(codes), life = hash(lifeAll);
  const lives = Object.values(life).map(json).filter(Boolean), t = (s) => new Date(s).getTime();
  const lifecycle = {
    toContact: timing(lives.filter((x) => x.contacted).map((x) => t(x.contacted) - t(x.at))),
    toConfirm: timing(lives.filter((x) => x.confirmed).map((x) => t(x.confirmed) - t(x.at))),
    contactToConfirm: timing(lives.filter((x) => x.confirmed && x.contacted).map((x) => t(x.confirmed) - t(x.contacted))),
    requests: lives.length, confirmed: lives.filter((x) => x.confirmed).length, lost: lives.filter((x) => x.lost && !x.confirmed).length,
    waiting: lives.filter((x) => !x.contacted && !x.lost).length,
  };
  const num = (x) => Number(x) || 0;
  // Bookings: every request with its date, what's confirmed and what's still to do, earliest party first
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const books = Object.values(hash(bookAll)).map(json).filter(Boolean);
  // Payments, revisions, change requests and history for each booking (lib/bookings.js), in one round trip
  const xr = books.length ? await run(books.flatMap((b) => [['GET', P + 'pay:' + b.ref], ['GET', P + 'rev:' + b.ref], ['GET', P + 'chg:' + b.ref], ['LRANGE', P + 'hist:' + b.ref, 0, 49]])) : [];
  const bookings = books.map((b, i) => {
    const lf = json(life[b.ref]) || {};
    const pays = json(xr[i * 4]) || [], revisions = json(xr[i * 4 + 1]) || [], changes = json(xr[i * 4 + 2]) || [];
    const reversed = new Set(pays.filter((p) => p.kind === 'reversal').map((p) => p.reverses));
    const paidCents = pays.reduce((a, p) => a + p.cents, 0);
    const x = { revisions, changes, balanceCents: b.totalCents - paidCents };
    const state = stageOf(b, lf);
    return { ...b, life: lf, state, paid: !!lf.paid, todos: todosFor(b, lf, today, x), vendors: (b.vendors || []).map((v, i2) => ({ ...v, i: i2, ok: (lf.vendors || {})[v.name] || null })),
      originalTotalCents: b.originalTotalCents || b.totalCents, paidCents, balanceCents: x.balanceCents,
      payments: pays.map((p) => ({ ...p, reversed: reversed.has(p.id) })), revisions, changes, history: (xr[i * 4 + 3] || []).map(json).filter(Boolean),
      rates: undefined, lines: undefined };
  }).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  // Scorecard for the pilot window (or the last 6 weeks), from the daily counters kept for 120 days
  const settings = json(rawSettings) || {}, win = windowOf(settings, today), winDays = [];
  for (let d = win.from; d <= win.to && winDays.length < 120; d = new Date(Date.parse(d + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10)) winDays.push(d);
  const dayHashes = winDays.length ? await run(winDays.map((d) => ['HGETALL', P + 'day:' + d])) : [];
  const scorecard = buildScorecard({ books, today, settings,
    life: Object.fromEntries(books.map((b) => [b.ref, json(life[b.ref]) || {}])),
    codes: Object.fromEntries(Object.entries(k).map(([code, v]) => [code, json(v)])),
    rewards: Object.values(hash(rewardAll)).map(json).filter(Boolean),
    days: Object.fromEntries(winDays.map((d, i) => [d, hash(dayHashes[i])])) });
  const top = Object.keys({ ...o, ...r }).sort((a, b) => num(r[b]) - num(r[a]) || num(o[b]) - num(o[a])).slice(0, 50);
  const lists = top.length ? await run(top.map((code) => ['LRANGE', P + 'by:' + code, 0, 19])) : [];
  return {
    connected: true,
    totals: { capsuleScans: num(c.capsule_scan), linkOpens: num(c.link_open), requests: num(c.requests), viaCapsule: num(c.req_capsule), viaFriend: num(c.req_friend), unknownCode: num(c.req_unknown_code) },
    daily: days.map((d, i) => { const h = hash(daily[i]); return { day: d, scans: num(h.capsule_scan), opens: num(h.link_open), requests: num(h.requests) }; }),
    referrers: top.map((code, i) => ({ code, from: json(k[code]), opens: num(o[code]), requests: num(r[code]), brought: (lists[i] || []).map(json).filter(Boolean) })),
    recent: (recent || []).map(json).filter(Boolean).map((q) => ({ ...q, life: json(life[q.ref]) || {} })),
    events: (events || []).map(json).filter(Boolean),
    lifecycle, bookings, today, scorecard,
  };
}

export function _resetMemory() { mem.clear(); }
