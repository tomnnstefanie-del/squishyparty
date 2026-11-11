// Booking administration: payments (a ledger with reversals), revisions (admin-only amendments), customer change
// requests and a history of who did what and when. Data lives next to lib/stats.js in the same Redis database:
//   cc:book (hash)       the confirmed booking: plan, unit prices (rates), lines and total of the current version
//   cc:contact:<ref>     contact details for revised quotations (expires after 400 days)
//   cc:pay:<ref>         payments: [{ id, kind: deposit|payment|reversal, cents, at, by, note, reverses }]
//   cc:rev:<ref>         revisions: [{ n, status: draft|sent|applied|withdrawn, plan, price, ... }]
//   cc:chg:<ref>         customer change requests: [{ id, at, text, status: open|handled }]
//   cc:hist:<ref>        history, newest first: { at, by, what }
// Rules: a revision never touches the confirmed booking until the customer has accepted it and every affected vendor
// has re-confirmed; payments are never deleted, only reversed with a reason; refunds and cancellations stay manual.
import crypto from 'node:crypto';
import { run, json, P, bump, log, vendorsOf, IN_HOUSE, statsConfigured } from './stats.js';
import { priceRequest, ratesOf, EXP_NAME, money, addonInfo } from './pricing.js';
import { checkReward } from './rewards.js';

const now = () => new Date().toISOString();
const id = () => crypto.randomBytes(4).toString('hex');
export const cleanBy = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);

export class BookingError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

/** Everything about one booking, for the admin API. */
export async function getFull(ref) {
  if (!statsConfigured()) throw new BookingError('The database isn’t connected.', 503);
  const [b, l, c, pay, rev, chg, hist] = await run([['HGET', P + 'book', ref], ['HGET', P + 'life', ref], ['GET', P + 'contact:' + ref],
    ['GET', P + 'pay:' + ref], ['GET', P + 'rev:' + ref], ['GET', P + 'chg:' + ref], ['LRANGE', P + 'hist:' + ref, 0, 99]]);
  const booking = json(b); if (!booking) throw new BookingError('That booking isn’t in the dashboard.', 404);
  return { booking, life: json(l) || {}, contact: json(c), payments: json(pay) || [], revisions: json(rev) || [], changes: json(chg) || [], history: (hist || []).map(json).filter(Boolean) };
}

export const paidCents = (payments) => payments.reduce((a, p) => a + p.cents, 0);
const reversedIds = (payments) => new Set(payments.filter((p) => p.kind === 'reversal').map((p) => p.reverses));
export const openRevision = (revisions) => revisions.find((r) => r.status === 'draft' || r.status === 'sent') || null;

/** Keeps the stage ticks (deposit paid, paid in full) in line with the ledger and the confirmed total. */
function syncLife(life, booking, payments) {
  const net = paidCents(payments), t = now();
  if (net > 0) { life.confirmed = life.confirmed || t; if (!life.contacted) life.contacted = t; } else { delete life.confirmed; delete life.paid; }
  if (net > 0 && net >= booking.totalCents) life.paid = life.paid || t; else delete life.paid;
  return life;
}

async function save(ref, parts, by, what, event) {
  const cmds = [];
  if (parts.booking) cmds.push(['HSET', P + 'book', ref, JSON.stringify(parts.booking)]);
  if (parts.life) cmds.push(['HSET', P + 'life', ref, JSON.stringify(parts.life)]);
  if (parts.payments) cmds.push(['SET', P + 'pay:' + ref, JSON.stringify(parts.payments)]);
  if (parts.revisions) cmds.push(['SET', P + 'rev:' + ref, JSON.stringify(parts.revisions)]);
  if (parts.changes) cmds.push(['SET', P + 'chg:' + ref, JSON.stringify(parts.changes)]);
  cmds.push(['LPUSH', P + 'hist:' + ref, JSON.stringify({ at: now(), by: by || '—', what })], ['LTRIM', P + 'hist:' + ref, 0, 299]);
  if (event) cmds.push(...log({ ...event, ref }));
  await run(cmds);
}

// ---------------------------------------------------------------- payments
/** kind: 'deposit' (secures the date) or 'payment' (any later amount, e.g. the balance). */
export async function addPayment(ref, { kind, cents, by, note }) {
  by = cleanBy(by); if (!by) throw new BookingError('Please add your name, for the record.');
  if (!['deposit', 'payment'].includes(kind)) throw new BookingError('Choose deposit or payment.');
  if (!Number.isInteger(cents) || cents <= 0 || cents > 10_000_000) throw new BookingError('Enter the amount received, e.g. 150.00.');
  const f = await getFull(ref), { booking, life, payments } = f;
  if (life.lost) throw new BookingError('This booking is marked “Didn’t book”. Undo that first.', 409);
  const waiting = (booking.vendors || []).filter((v) => !(life.vendors || {})[v.name]).map((v) => v.name);
  if (kind === 'deposit' && waiting.length) throw new BookingError(`${waiting.join(' and ')} ${waiting.length > 1 ? 'haven’t' : 'hasn’t'} confirmed yet. Confirm every vendor before the deposit.`, 409);
  if (kind === 'payment' && paidCents(payments) <= 0) throw new BookingError('Record the deposit first.', 409);
  const entry = { id: id(), kind, cents, at: now(), by, note: String(note || '').slice(0, 200) };
  payments.push(entry);
  syncLife(life, booking, payments);
  await save(ref, { payments, life }, by, `${kind === 'deposit' ? 'Deposit' : 'Payment'} received: ${money(cents)}${entry.note ? ` (${entry.note})` : ''}`, { type: kind === 'deposit' ? 'confirmed' : (life.paid ? 'paid' : 'payment') });
  await run(bump(kind === 'deposit' ? 'confirmed' : 'payment'));
  await checkReward(booking, life); // a friend's booking paid in full: the family who referred them is owed a reward
  return { entry, paidCents: paidCents(payments), balanceCents: booking.totalCents - paidCents(payments), life };
}

/** A payment recorded by mistake is reversed (never deleted), with a reason. */
export async function reversePayment(ref, { paymentId, reason, by }) {
  by = cleanBy(by); if (!by) throw new BookingError('Please add your name, for the record.');
  reason = String(reason || '').trim().slice(0, 200); if (reason.length < 3) throw new BookingError('Please give a reason for the reversal.');
  const f = await getFull(ref), { booking, life, payments } = f;
  const orig = payments.find((p) => p.id === paymentId && p.kind !== 'reversal');
  if (!orig) throw new BookingError('That payment wasn’t found.', 404);
  if (reversedIds(payments).has(orig.id)) throw new BookingError('That payment is already reversed.', 409);
  payments.push({ id: id(), kind: 'reversal', reverses: orig.id, cents: -orig.cents, at: now(), by, note: reason });
  syncLife(life, booking, payments);
  await save(ref, { payments, life }, by, `Reversed ${orig.kind} of ${money(orig.cents)} from ${orig.at.slice(0, 10)}: ${reason}`, { type: 'undo', what: 'payment reversed' });
  await checkReward(booking, life); // an unsent reward is voided if the booking is no longer paid in full
  return { paidCents: paidCents(payments), life };
}

// ---------------------------------------------------------------- revisions
function describe(plan) {
  return { participants: plan.participants, date: plan.date, time: `${plan.start}–${plan.end}`, experience: EXP_NAME[plan.experience] || plan.experience, wax: plan.wax ? 'yes' : 'no' };
}
function addonMap(price) { const m = {}; for (const a of price.addons) m[a.id] = a; return m; }

/** What changed between two versions, in plain words, and which vendors must re-confirm or be told to cancel. */
export function compare(oldPlan, oldPrice, newPlan, newPrice) {
  const o = describe(oldPlan), n = describe(newPlan), lines = [];
  const label = { participants: 'Participants', date: 'Date', time: 'Time', experience: 'Squishy DIY', wax: 'Wax Cracking' };
  for (const k of Object.keys(label)) if (String(o[k]) !== String(n[k])) lines.push(`${label[k]}: ${o[k]} → ${n[k]}`);
  const oa = addonMap(oldPrice), na = addonMap(newPrice);
  for (const k of Object.keys(oa)) if (!na[k]) lines.push(`Removed: ${oa[k].name} (${oa[k].vendor})`);
  for (const k of Object.keys(na)) if (!oa[k]) lines.push(`Added: ${na[k].name} (${na[k].vendor})`);
  for (const k of Object.keys(na)) if (oa[k] && oa[k].quantity !== na[k].quantity) lines.push(`${na[k].name}: ${oa[k].quantity} → ${na[k].quantity}`);
  const whenChanged = o.date !== n.date || o.time !== n.time;
  const vendors = new Map();
  const touched = (a) => a.vendor !== IN_HOUSE;
  for (const k of Object.keys(na)) if (touched(na[k]) && (whenChanged || !oa[k] || oa[k].quantity !== na[k].quantity)) vendors.set(na[k].vendor, 'confirm');
  for (const k of Object.keys(oa)) if (touched(oa[k]) && !na[k] && !vendors.has(oa[k].vendor)) {
    const stillUsed = Object.values(na).some((a) => a.vendor === oa[k].vendor);
    vendors.set(oa[k].vendor, stillUsed ? 'confirm' : 'cancel');
  }
  return { lines, vendors: [...vendors].map(([name, action]) => ({ name, action })) };
}

/**
 * A draft revision from the dashboard. planIn: { participants, date, start, end, experience, wax, addons[] }.
 * validate: lib/validate.js's validateRequest, passed in so this file stays free of request parsing.
 */
export async function createRevision(ref, { planIn, by, note }, validate) {
  by = cleanBy(by); if (!by) throw new BookingError('Please add your name, for the record.');
  const f = await getFull(ref), { booking, life, contact, revisions } = f;
  if (life.lost) throw new BookingError('This booking is marked “Didn’t book”.', 409);
  if (openRevision(revisions)) throw new BookingError(`Revision R${openRevision(revisions).n} is still open. Send, apply or withdraw it first.`, 409);
  if (!contact) throw new BookingError('This booking’s contact details have expired, so a revised quotation can’t be sent.', 409);
  const c = contact;
  const v = validate({ v: 1, plan: { ...planIn, custom: {} }, consent: true, website: '', bookingFor: c.bookingFor,
    contact: { parentName: c.parentName, phone: '+' + c.phone, phoneCountry: c.phoneCountry || 'SG', email: c.email, venueName: c.venueName, address: c.address, postalCode: c.postalCode,
      companyName: c.companyName, companyUen: c.companyUen, billingEmail: c.billingEmail, billingContact: c.billingContact, poRef: c.poRef, billingNotes: c.billingNotes, notes: '' } });
  const plan = { participants: v.plan.participants, experience: v.plan.experience, wax: !!v.plan.wax, addons: v.plan.addons, date: v.plan.date, start: v.plan.start, end: v.plan.end };
  const price = priceRequest(plan, booking.rates || undefined);
  const diff = compare(booking.plan, booking.lines, plan, price);
  if (!diff.lines.length) throw new BookingError('Nothing has changed from the confirmed booking.');
  // R2, R3…: one higher than the confirmed version and every revision so far (withdrawn ones keep their number)
  const rev = { n: Math.max((booking.version || 1) + 1, ...revisions.map((r) => r.n + 1)),
    status: 'draft', createdAt: now(), createdBy: by, note: String(note || '').slice(0, 300), plan, price, totalCents: price.totalCents,
    prevTotalCents: booking.totalCents, diff: diff.lines, vendors: diff.vendors.map((x) => ({ ...x, done: null })), accepted: null };
  revisions.push(rev);
  await save(ref, { revisions }, by, `Drafted revision R${rev.n}: ${diff.lines.join('; ')} (total ${money(booking.totalCents)} → ${money(price.totalCents)})`, { type: 'revision', what: `R${rev.n} drafted` });
  return rev;
}

/**
 * Moves an open revision along: send (after review), accept (customer said yes), vendor (a vendor re-confirmed or was
 * told), apply (replaces the confirmed booking), withdraw (with a reason), discard (a draft that was never sent).
 */
export async function stepRevision(ref, { n, step, vendor, reason, by }) {
  by = cleanBy(by); if (!by) throw new BookingError('Please add your name, for the record.');
  const f = await getFull(ref), { booking, life, revisions } = f;
  const rev = revisions.find((r) => r.n === n); if (!rev) throw new BookingError('That revision wasn’t found.', 404);
  const open = rev.status === 'draft' || rev.status === 'sent';
  if (!open) throw new BookingError(`Revision R${n} is already ${rev.status}.`, 409);
  let what;
  if (step === 'discard') {
    if (rev.status !== 'draft') throw new BookingError('Only a draft can be discarded; withdraw a sent revision instead.', 409);
    revisions.splice(revisions.indexOf(rev), 1); what = `Discarded draft R${n}`;
  } else if (step === 'send') {
    if (rev.status !== 'draft') throw new BookingError('This revision was already sent.', 409);
    rev.status = 'sent'; rev.sentAt = now(); rev.sentBy = by; what = `Sent revised quotation R${n} (${money(rev.totalCents)}), pending customer acceptance`;
  } else if (step === 'accept') {
    if (rev.status !== 'sent') throw new BookingError('Send the revised quotation first.', 409);
    rev.accepted = { at: now(), by }; what = `Customer accepted R${n}`;
  } else if (step === 'vendor') {
    const v = rev.vendors.find((x) => x.name === vendor); if (!v) throw new BookingError('That vendor isn’t part of this revision.', 404);
    if (rev.status !== 'sent') throw new BookingError('Send the revised quotation first.', 409);
    v.done = { at: now(), by }; what = `${v.name} ${v.action === 'cancel' ? 'told about the cancellation' : 're-confirmed'} for R${n}`;
  } else if (step === 'withdraw') {
    reason = String(reason || '').trim().slice(0, 200); if (reason.length < 3) throw new BookingError('Please give a reason, e.g. “customer kept the original booking”.');
    rev.status = 'withdrawn'; rev.withdrawn = { at: now(), by, reason }; what = `Withdrew R${n}: ${reason}`;
  } else if (step === 'apply') {
    if (rev.status !== 'sent' || !rev.accepted) throw new BookingError('The customer hasn’t accepted this revision yet.', 409);
    const waiting = rev.vendors.filter((x) => !x.done).map((x) => x.name);
    if (waiting.length) throw new BookingError(`Waiting for ${waiting.join(' and ')}.`, 409);
    // Replace the confirmed booking with this version
    const p = rev.plan, price = rev.price, prevTotal = booking.totalCents;
    const keepRates = booking.rates || ratesOf(booking.plan), newRates = ratesOf(p);
    Object.assign(booking, {
      version: n, plan: p, lines: price, totalCents: price.totalCents, participants: p.participants, date: p.date, start: p.start, end: p.end,
      experience: EXP_NAME[p.experience] || p.experience, wax: p.wax, addons: price.addons.length, vendors: vendorsOf(price),
      onQuote: price.onQuote.map((a) => a.name), inHouse: price.addons.filter((a) => a.vendor === IN_HOUSE).map((a) => a.name),
      // unit prices: keep the ones already quoted, add today's for new items
      rates: { ...newRates, ...keepRates, exp: { ...newRates.exp, ...keepRates.exp }, addons: { ...newRates.addons, ...keepRates.addons } },
    });
    const lv = {}, before = life.vendors || {};
    for (const vd of booking.vendors) { const r = rev.vendors.find((x) => x.name === vd.name); lv[vd.name] = r && r.done ? r.done.at : before[vd.name]; if (!lv[vd.name]) delete lv[vd.name]; }
    life.vendors = lv;
    syncLife(life, booking, f.payments);
    rev.status = 'applied'; rev.appliedAt = now(); rev.appliedBy = by;
    what = `Applied R${n}: the confirmed booking is now ${money(price.totalCents)} (was ${money(prevTotal)})`;
    await save(ref, { booking, life, revisions }, by, what, { type: 'revision', what: `R${n} applied` });
    await checkReward(booking, life);
    return rev;
  } else throw new BookingError('Unknown step.');
  await save(ref, { revisions }, by, what, { type: 'revision', what: `R${n} ${step}` });
  return rev;
}

// ---------------------------------------------------------------- customer change requests
export async function addChangeRequest(ref, text) {
  const f = await getFull(ref);
  const entry = { id: id(), at: now(), text: String(text).slice(0, 1000), status: 'open' };
  f.changes.push(entry);
  await save(ref, { changes: f.changes }, 'Customer', 'Customer asked for a change', { type: 'change' });
  return { entry, booking: f.booking };
}

export async function handleChange(ref, { changeId, by }) {
  by = cleanBy(by); if (!by) throw new BookingError('Please add your name, for the record.');
  const f = await getFull(ref), c = f.changes.find((x) => x.id === changeId);
  if (!c) throw new BookingError('That change request wasn’t found.', 404);
  c.status = 'handled'; c.handled = { at: now(), by };
  await save(ref, { changes: f.changes }, by, 'Marked the customer’s change request as handled');
  return c;
}

/** For the dashboard list: amounts, open revision and change requests per booking, in one database round trip. */
export async function extrasFor(refs) {
  if (!refs.length) return {};
  const res = await run(refs.flatMap((r) => [['GET', P + 'pay:' + r], ['GET', P + 'rev:' + r], ['GET', P + 'chg:' + r], ['LRANGE', P + 'hist:' + r, 0, 49]]));
  const out = {};
  refs.forEach((r, i) => {
    const payments = json(res[i * 4]) || [], revisions = json(res[i * 4 + 1]) || [], changes = json(res[i * 4 + 2]) || [];
    const rev = reversedIds(payments);
    out[r] = { payments: payments.map((p) => ({ ...p, reversed: rev.has(p.id) })), paidCents: paidCents(payments), revisions, changes, history: (res[i * 4 + 3] || []).map(json).filter(Boolean) };
  });
  return out;
}

export { addonInfo };
