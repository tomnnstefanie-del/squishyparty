// Referral and QR numbers for the private dashboard (/admin.html), kept in a small Redis database.
// Free: Vercel -> Storage -> Upstash for Redis, which sets KV_REST_API_URL and KV_REST_API_TOKEN
// (UPSTASH_REDIS_REST_URL / _TOKEN also work). Called over its REST API, so no extra packages.
// Without a database nothing is recorded and the dashboard says so; tests set STATS_MEMORY=1.
// Stored: counts, referral codes with the first name and booking reference of the family they belong to, recent
// requests (reference, date, size, total, how they found us) and, for scheduling, each booking's date, time, venue
// name and postal area, add-ons and partner vendors. No phone numbers, emails or street addresses.

import crypto from 'node:crypto';

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
    default: throw new Error('unsupported ' + cmd);
  }
}

async function run(cmds) {
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
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };

/** Recording never gets in the way of the customer: failures are logged and ignored. */
async function safe(tag, cmds) { try { await run(cmds); } catch (e) { console.error('[stats]', tag, e.message); } }

// A timeline of what happened and when (scans, link opens, requests, contacted, confirmed), newest first.
const log = (e) => [['LPUSH', P + 'events', JSON.stringify({ ...e, at: new Date().toISOString() })], ['LTRIM', P + 'events', 0, 999]];

export const recordScan = () => safe('scan', [...bump('capsule_scan'), ...log({ type: 'scan' })]);

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

export function recordRequest({ ref, plan, price, contact, via, code, shareCode, experienceName }) {
  const first = contact.parentName.split(/\s+/)[0].slice(0, 40);
  const row = { ref, at: new Date().toISOString(), date: plan.date, participants: plan.participants, totalCents: price.totalCents, via, code: via === 'friend' ? code : '', company: !!contact.companyName };
  // For the booking calendar: when, where (venue name and postal area only), what, and who else needs to confirm
  const booking = { ...row, start: plan.start, end: plan.end, first, companyName: contact.companyName || '', experience: experienceName || plan.experience, wax: !!plan.wax,
    venue: contact.venueName || '', area: String(contact.postalCode || '').slice(0, 2), addons: price.addons.length,
    vendors: vendorsOf(price), onQuote: price.onQuote.map((a) => a.name), inHouse: price.addons.filter((a) => a.vendor === IN_HOUSE).map((a) => a.name) };
  const cmds = [...bump('requests'), ['LPUSH', P + 'requests', JSON.stringify(row)], ['LTRIM', P + 'requests', 0, 499],
    ['HSET', P + 'codes', shareCode, JSON.stringify({ ref, first, date: plan.date })],
    ['HSET', P + 'life', ref, JSON.stringify({ at: row.at })], ['HSET', P + 'book', ref, JSON.stringify(booking)], ...log({ type: 'request', ref, via })];
  if (via) cmds.push(...bump('req_' + via.replace('-', '_')));
  if (via === 'friend') cmds.push(['HINCRBY', P + 'referred', code, 1], ['LPUSH', P + 'by:' + code, JSON.stringify(row)], ['LTRIM', P + 'by:' + code, 0, 99]);
  return safe('request', cmds);
}

export const STATUSES = ['contacted', 'confirmed', 'lost', 'paid'];
/** 'contacted', 'confirmed', 'lost', 'paid', or 'v0'-'v9' (that partner vendor confirmed). */
export const validStatus = (s) => STATUSES.includes(s) || /^v\d$/.test(String(s));

/**
 * Records a step for a request: we contacted them, they confirmed, they didn't book, they paid, or partner vendor n
 * confirmed. The first time counts: tapping a button twice doesn't move the time. undo (dashboard only) clears it.
 * Returns { life, booking } or null if the reference or vendor is unknown.
 */
export async function markStatus(ref, status, undo = false) {
  if (!statsConfigured() || !validStatus(status)) return null;
  const [raw, rawBook] = await run([['HGET', P + 'life', ref], ['HGET', P + 'book', ref]]);
  const life = json(raw), booking = json(rawBook) || {}; if (!life) return null;
  const now = new Date().toISOString();
  let vendor = null, changed = false;
  if (/^v\d$/.test(status)) {
    vendor = (booking.vendors || [])[Number(status.slice(1))]; if (!vendor) return null;
    life.vendors = life.vendors || {};
    if (undo && life.vendors[vendor.name]) { delete life.vendors[vendor.name]; changed = true; }
    else if (!undo && !life.vendors[vendor.name]) { life.vendors[vendor.name] = now; changed = true; }
  } else if (undo && life[status]) { delete life[status]; changed = true; }
  else if (!undo && !life[status]) {
    life[status] = now; changed = true;
    if ((status === 'confirmed' || status === 'paid') && !life.contacted) life.contacted = now; // we must have spoken to them
  }
  if (changed) await run([['HSET', P + 'life', ref, JSON.stringify(life)], ...(undo ? [] : bump(vendor ? 'vendor_ok' : status)),
    ...log({ type: undo ? 'undo' : vendor ? 'vendor' : status, ref, ...(vendor ? { vendor: vendor.name } : {}), ...(undo ? { what: vendor ? vendor.name : status } : {}) })]);
  return { life, booking, vendor };
}

/** What's still open for a booking, from our side and the partners'. */
export function todosFor(b, life, today) {
  if (life.lost && !life.confirmed) return [];
  const t = [];
  if (!life.contacted) t.push('Reply to the customer');
  else if (!life.confirmed) t.push('Get the booking confirmed');
  for (const v of b.vendors || []) if (!(life.vendors || {})[v.name]) t.push(`Confirm with ${v.name}`);
  if ((b.onQuote || []).length && !life.confirmed) t.push(`Price ${b.onQuote.join(', ')} in the final quote`);
  if (life.confirmed && !life.paid) t.push(b.date < today ? 'Payment overdue: the party has passed' : 'Collect payment');
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
  const [count, opens, referred, codes, recent, events, lifeAll, bookAll, ...daily] = await run([
    ['HGETALL', P + 'count'], ['HGETALL', P + 'opens'], ['HGETALL', P + 'referred'], ['HGETALL', P + 'codes'], ['LRANGE', P + 'requests', 0, 99],
    ['LRANGE', P + 'events', 0, 199], ['HGETALL', P + 'life'], ['HGETALL', P + 'book'],
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
  const bookings = Object.values(hash(bookAll)).map(json).filter(Boolean).map((b) => {
    const lf = json(life[b.ref]) || {};
    const state = lf.confirmed ? 'confirmed' : lf.lost ? 'lost' : 'pending';
    return { ...b, life: lf, state, paid: !!lf.paid, todos: todosFor(b, lf, today), vendors: (b.vendors || []).map((v, i) => ({ ...v, i, ok: (lf.vendors || {})[v.name] || null })) };
  }).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  const top = Object.keys({ ...o, ...r }).sort((a, b) => num(r[b]) - num(r[a]) || num(o[b]) - num(o[a])).slice(0, 50);
  const lists = top.length ? await run(top.map((code) => ['LRANGE', P + 'by:' + code, 0, 19])) : [];
  return {
    connected: true,
    totals: { capsuleScans: num(c.capsule_scan), linkOpens: num(c.link_open), requests: num(c.requests), viaCapsule: num(c.req_capsule), viaFriend: num(c.req_friend), unknownCode: num(c.req_unknown_code) },
    daily: days.map((d, i) => { const h = hash(daily[i]); return { day: d, scans: num(h.capsule_scan), opens: num(h.link_open), requests: num(h.requests) }; }),
    referrers: top.map((code, i) => ({ code, from: json(k[code]), opens: num(o[code]), requests: num(r[code]), brought: (lists[i] || []).map(json).filter(Boolean) })),
    recent: (recent || []).map(json).filter(Boolean).map((q) => ({ ...q, life: json(life[q.ref]) || {} })),
    events: (events || []).map(json).filter(Boolean),
    lifecycle, bookings, today,
  };
}

export function _resetMemory() { mem.clear(); }
