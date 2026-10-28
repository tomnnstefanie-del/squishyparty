// Server-side pricing. Every request is re-priced here from the catalogue; totals sent by the browser are never trusted.
// A revision of a booking is priced with `lock` (the unit prices from the original quote, see ratesOf), so items already
// quoted keep their price and only new items use today's catalogue.
import { CATALOGUE as C } from './catalogue.js';

const BY_ID = Object.fromEntries(C.P.map((p) => [p.id, p]));

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
  };
}

const pick = (lock, key) => (lock && lock[key] != null ? lock[key] : C[key]);

export function waxCents(experience, n, lock) {
  return experience === 'both' ? pick(lock, 'WAX_DUO') * n : pick(lock, 'WAX') * n * C.EXP[experience].per; // Duo: per person, both squishies
}

/** plan: { participants, experience, wax, addons[] } (already validated). lock: optional rates from ratesOf(). */
export function priceRequest(plan, lock) {
  const e = C.EXP[plan.experience];
  const pax = lock && lock.exp && lock.exp[plan.experience] != null ? lock.exp[plan.experience] : e.pax;
  const n = billable(plan.participants, pick(lock, 'MIN_PAX'));
  const container = pick(lock, 'CONTAINER'), logistics = pick(lock, 'LOGISTICS');
  const squishy = [
    { label: `Squishy DIY: ${e.name}, ${n} × $${(pax / 100).toFixed(0)}`, cents: pax * n },
    { label: `Squishy capsules + rhinestone stickers, ${n} × $${(container / 100).toFixed(0)}`, cents: container * n },
  ];
  if (plan.wax) {
    squishy.push({
      label: plan.experience === 'both'
        ? `Wax Cracking duo deal, ${n} × $${(pick(lock, 'WAX_DUO') / 100).toFixed(2)} (2 squishies each)`
        : `Wax Cracking, ${n * e.per} squishies × $${(pick(lock, 'WAX') / 100).toFixed(0)}`,
      cents: waxCents(plan.experience, n, lock),
    });
  }
  squishy.push({ label: `One-time travel & set-up (up to ${C.TEAM_HOURS} hours)`, cents: logistics });
  const squishyCents = squishy.reduce((a, l) => a + l.cents, 0);

  const addons = plan.addons.map((id) => {
    const p = BY_ID[id];
    const q = qty(p, plan);
    const unit = lock && lock.addons && id in lock.addons ? lock.addons[id] : p.price;
    return {
      id, category: p.cat, name: p.name, vendor: p.vendor, status: p.status, quantity: q,
      // null = priced in the quotation (e.g. cakes); never counted as zero
      cents: unit == null ? null : unit * q,
      demo: p.status === 'demo',
    };
  });
  const pricedAddons = addons.filter((a) => a.cents != null).reduce((a, l) => a + l.cents, 0);
  const onQuote = addons.filter((a) => a.cents == null);

  return {
    billableParticipants: n,
    squishy, squishyCents,
    addons, onQuote,
    totalCents: squishyCents + pricedAddons,
  };
}

export function isKnownAddon(id) { return Object.prototype.hasOwnProperty.call(BY_ID, id); }
/** Which personalisation an add-on accepts, e.g. { colours, text, notes, images }, or null. */
export function addonCustom(id) { return (BY_ID[id] && BY_ID[id].custom) || null; }
export function addonName(id) { return BY_ID[id] ? BY_ID[id].name : id; }
export function addonInfo(id) { const p = BY_ID[id]; return p ? { id, name: p.name, vendor: p.vendor, cat: p.cat, price: p.price } : null; }
export const ADDON_LIST = C.P.map((p) => ({ id: p.id, name: p.name, vendor: p.vendor, cat: p.cat, price: p.price }));
export const EXPERIENCES = Object.keys(C.EXP);
export const EXP_NAME = Object.fromEntries(Object.entries(C.EXP).map(([k, e]) => [k, e.name]));
export const CATEGORY_TITLES = Object.fromEntries(C.CATS.map((c) => [c.id, c.title]));
export const money = (cents) => '$' + (cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
