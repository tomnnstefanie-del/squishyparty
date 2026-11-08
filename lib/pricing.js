// Server-side pricing. Every request is re-priced here from the catalogue; totals sent by the browser are never trusted.
// A revision of a booking is priced with `lock` (the unit prices from the original quote, see ratesOf), so items already
// quoted keep their price and only new items use today's catalogue.
import { CATALOGUE as C } from './catalogue.js';

const BY_ID = Object.fromEntries(C.P.map((p) => [p.id, p]));
const CLK = Object.fromEntries((C.CLICKER || []).map((b) => [b.id, b]));
const PKG = Object.fromEntries((C.PACKAGES || []).map((k) => [k.id, k]));

/** Activity, clicker base and package of a plan; older bookings (before clickers and packages) are Squishy DIY + Essentials. */
export function planKind(plan) {
  return { activity: plan.activity || 'squishy', clicker: plan.clicker || null, package: PKG[plan.package] ? plan.package : 'essentials' };
}

export function billable(participants, minPax = C.MIN_PAX) { return Math.max(participants, minPax); }

function qty(p, plan) {
  if (p.basis === 'child' || p.basis === 'pax') return Math.max(plan.participants, p.min || 0);
  return 1;
}

/** The unit prices a quote was made with, kept with the booking so a revision can keep them. */
export function ratesOf(plan) {
  return {
    MIN_PAX: C.MIN_PAX, CONTAINER: C.CONTAINER, WAX: C.WAX, WAX_DUO: C.WAX_DUO, LOGISTICS: C.LOGISTICS,
    exp: { [plan.experience]: C.EXP[plan.experience].pax },
    addons: Object.fromEntries(plan.addons.filter((id) => BY_ID[id]).map((id) => [id, BY_ID[id].price])),
    CLICKER_DELIVERY: C.CLICKER_DELIVERY, COMBO: C.COMBO,
    clicker: plan.clicker && CLK[plan.clicker] ? { [plan.clicker]: CLK[plan.clicker].price } : {},
    pkg: (({ fee, credit }) => ({ fee, credit }))(PKG[planKind(plan).package]),
  };
}

const pick = (lock, key) => (lock && lock[key] != null ? lock[key] : C[key]);

export function waxCents(experience, n, lock) {
  return experience === 'both' ? pick(lock, 'WAX_DUO') * n : pick(lock, 'WAX') * n * C.EXP[experience].per; // Duo: per person, both squishies
}

/**
 * plan: { participants, experience, wax, addons[], activity?, clicker?, package? } (already validated). lock: optional rates from ratesOf().
 * `squishy` holds the activity lines (Squishy DIY and/or Clicker Keychains); the package fee and cake credit sit on top.
 */
export function priceRequest(plan, lock) {
  const k = planKind(plan), sq = k.activity !== 'clicker', ck = k.activity !== 'squishy';
  const e = C.EXP[plan.experience];
  const pax = lock && lock.exp && lock.exp[plan.experience] != null ? lock.exp[plan.experience] : e.pax;
  const n = billable(plan.participants, pick(lock, 'MIN_PAX'));
  const container = pick(lock, 'CONTAINER'), combo = pick(lock, 'COMBO');
  const dollars = (c) => (c / 100).toFixed(c % 100 ? 2 : 0);
  const squishy = [];
  if (k.activity === 'both' && combo != null) squishy.push({ label: `Squishy + Clicker combo, ${n} × $${dollars(combo)}`, cents: combo * n });
  else {
    if (sq) {
      squishy.push({ label: `Squishy DIY: ${e.name}, ${n} × $${(pax / 100).toFixed(0)}`, cents: pax * n });
      squishy.push({ label: `Squishy capsules + rhinestone stickers, ${n} × $${(container / 100).toFixed(0)}`, cents: container * n });
    }
    if (ck) {
      const b = CLK[k.clicker], unit = lock && lock.clicker && lock.clicker[k.clicker] != null ? lock.clicker[k.clicker] : b.price;
      squishy.push({ label: `Clicker keychain: ${b.name}, ${n} × $${dollars(unit)}`, cents: unit * n });
    }
  }
  if (sq && plan.wax) {
    squishy.push({
      label: plan.experience === 'both'
        ? `Wax Cracking duo deal, ${n} × $${(pick(lock, 'WAX_DUO') / 100).toFixed(2)} (2 squishies each)`
        : `Wax Cracking, ${n * e.per} squishies × $${(pick(lock, 'WAX') / 100).toFixed(0)}`,
      cents: waxCents(plan.experience, n, lock),
    });
  }
  squishy.push(sq
    ? { label: `One-time travel & set-up (up to ${C.TEAM_HOURS} hours)`, cents: pick(lock, 'LOGISTICS') }
    : { label: `One-time delivery & set-up (up to ${C.TEAM_HOURS} hours)`, cents: pick(lock, 'CLICKER_DELIVERY') });
  const squishyCents = squishy.reduce((a, l) => a + l.cents, 0);

  // Package: a fixed fee (null = priced in the quotation), add-ons it includes at no charge, and a cake credit
  // taken off the most expensive priced cake.
  const pk = PKG[k.package], fee = lock && lock.pkg && lock.pkg.fee !== undefined ? lock.pkg.fee : pk.fee;
  const credit = lock && lock.pkg && lock.pkg.credit != null ? lock.pkg.credit : pk.credit;
  const unitOf = (id) => (lock && lock.addons && id in lock.addons ? lock.addons[id] : BY_ID[id].price);
  const cakes = plan.addons.filter((id) => BY_ID[id].cat === 'cake' && unitOf(id) != null);
  const credited = credit ? cakes.sort((x, y) => unitOf(y) - unitOf(x))[0] : undefined;

  const addons = plan.addons.map((id) => {
    const p = BY_ID[id];
    const q = qty(p, plan);
    const unit = unitOf(id), included = pk.includes.includes(id);
    const full = unit == null ? null : unit * q;
    const off = id === credited ? Math.min(credit, full) : 0;
    return {
      id, category: p.cat, name: p.name, vendor: p.vendor, status: p.status, quantity: q,
      // null = priced in the quotation (e.g. cakes); never counted as zero
      cents: included ? 0 : full == null ? null : full - off,
      ...(included ? { included: pk.name } : {}), ...(off ? { creditCents: off } : {}),
      demo: p.status === 'demo',
    };
  });
  const pricedAddons = addons.filter((a) => a.cents != null).reduce((a, l) => a + l.cents, 0);
  const onQuote = addons.filter((a) => a.cents == null);

  return {
    billableParticipants: n,
    activity: k.activity, squishy, squishyCents,
    package: { id: pk.id, name: pk.name, cents: fee, credit, onQuote: fee == null },
    addons, onQuote,
    totalCents: squishyCents + (fee || 0) + pricedAddons,
  };
}

export function isKnownAddon(id) { return Object.prototype.hasOwnProperty.call(BY_ID, id); }
/** Which personalisation an add-on accepts, e.g. { colours, text, notes, images }, or null. */
export function addonCustom(id) { return (BY_ID[id] && BY_ID[id].custom) || null; }
export function addonName(id) { return BY_ID[id] ? BY_ID[id].name : id; }
export function addonInfo(id) { const p = BY_ID[id]; return p ? { id, name: p.name, vendor: p.vendor, cat: p.cat, price: p.price } : null; }
export const ADDON_LIST = C.P.map((p) => ({ id: p.id, name: p.name, vendor: p.vendor, cat: p.cat, price: p.price }));
export const EXPERIENCES = Object.keys(C.EXP);
export const ACTIVITIES = { squishy: 'Squishy DIY', clicker: 'Clicker Keychain', both: 'Squishy + Clicker' };
export const CLICKER_IDS = Object.keys(CLK);
export const CLICKER_NAME = Object.fromEntries(Object.values(CLK).map((b) => [b.id, b.name]));
export const PACKAGE_IDS = Object.keys(PKG);
export const PACKAGE_NAME = Object.fromEntries(Object.values(PKG).map((k) => [k.id, k.name]));
/** One line for the booking: "Squishy Duo · Celebration", "Clicker Keychain (Deluxe: 9-key base) · Essentials". */
export function activityLabel(plan) {
  const k = planKind(plan);
  const what = k.activity === 'clicker' ? `Clicker Keychain (${CLICKER_NAME[k.clicker] || k.clicker})`
    : k.activity === 'both' ? `${C.EXP[plan.experience].name} + Clicker Keychain (${CLICKER_NAME[k.clicker] || k.clicker})`
    : C.EXP[plan.experience].name;
  return `${what} · ${PACKAGE_NAME[k.package]}`;
}
export const EXP_NAME = Object.fromEntries(Object.entries(C.EXP).map(([k, e]) => [k, e.name]));
export const CATEGORY_TITLES = Object.fromEntries(C.CATS.map((c) => [c.id, c.title]));
export const money = (cents) => '$' + (cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
