// Server-side pricing. Every request is re-priced here from the catalogue; totals sent by the browser are never trusted.
import { CATALOGUE as C } from './catalogue.js';

const BY_ID = Object.fromEntries(C.P.map((p) => [p.id, p]));

export function billable(children) { return Math.max(children, C.MIN_PAX); }

export function waxCents(experience, n) {
  return experience === 'both' ? C.WAX_DUO * n * 2 : C.WAX * n * C.EXP[experience].per;
}

function qty(p, plan) {
  if (p.basis === 'child') return Math.max(plan.children, p.min || 0);
  if (p.basis === 'pax') return Math.max(plan.children + plan.adults, p.min || 0);
  return 1;
}

/** plan: { children, adults, experience, wax, addons[] } (already validated) */
export function priceRequest(plan) {
  const e = C.EXP[plan.experience];
  const n = billable(plan.children);
  const squishy = [
    { label: `Squishy DIY: ${e.name}, ${n} × $${(e.pax / 100).toFixed(0)}`, cents: e.pax * n },
    { label: `Squishy capsules + rhinestone stickers, ${n} × $${(C.CONTAINER / 100).toFixed(0)}`, cents: C.CONTAINER * n },
  ];
  if (plan.wax) {
    squishy.push({
      label: plan.experience === 'both'
        ? `Wax Cracking duo deal, ${n * 2} squishies × $2.50`
        : `Wax Cracking, ${n * e.per} squishies × $2`,
      cents: waxCents(plan.experience, n),
    });
  }
  squishy.push({ label: `One-time travel & set-up (up to ${C.TEAM_HOURS} hours)`, cents: C.LOGISTICS });
  const squishyCents = squishy.reduce((a, l) => a + l.cents, 0);

  const addons = plan.addons.map((id) => {
    const p = BY_ID[id];
    const q = qty(p, plan);
    return {
      id, category: p.cat, name: p.name, vendor: p.vendor, status: p.status, quantity: q,
      // null = priced in the quotation (e.g. cakes); never counted as zero
      cents: p.price == null ? null : p.price * q,
      demo: p.status === 'demo',
    };
  });
  const pricedAddons = addons.filter((a) => a.cents != null).reduce((a, l) => a + l.cents, 0);
  const onQuote = addons.filter((a) => a.cents == null);

  return {
    billableChildren: n,
    squishy, squishyCents,
    depositCents: Math.round(squishyCents / 2),
    addons, onQuote,
    totalCents: squishyCents + pricedAddons,
  };
}

export function isKnownAddon(id) { return Object.prototype.hasOwnProperty.call(BY_ID, id); }
export const EXPERIENCES = Object.keys(C.EXP);
export const CATEGORY_TITLES = Object.fromEntries(C.CATS.map((c) => [c.id, c.title]));
export const money = (cents) => '$' + (cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
