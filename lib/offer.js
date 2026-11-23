// The free-gift offer (owner, 2026-11-23). It replaces the $10 friend referral.
// Every party booked through one of our links gets ONE free item for the booking (minimum 10 participants still applies):
//   /wcc, /plq, /epm  the QR code at each Tom & Stefanie store
//   /gift             the foam-board poster at every party, and the same link sent on WhatsApp afterwards
//   /c                the capsule-lid sticker (already printed, so it keeps working)
// Old personal referral links (?ref=MIA-K7Q2) that were already shared also get the free item.
// Which item: Squishy only gets a Jelly squishy (even Crunchy); Clicker only gets a 3-key NOMI clicker;
// Squishy + Clicker lets the customer pick either.

export const OFFER_SOURCES = {
  wcc: 'Woodlands Civic Centre store QR',
  plq: 'PLQ store QR',
  epm: 'Eastpoint Mall store QR',
  event: 'party poster / after-party link',
  capsule: 'capsule QR sticker',
};
// The launch-party link (/gift) is valid for 2 months from the first time that phone opened it.
export const OFFER_MONTHS = { event: 2 };
/** When this source's offer ends for someone who first opened the link at firstAt (ms), or null if it doesn't expire. */
export function offerUntil(source, firstAt) {
  const m = OFFER_MONTHS[source];
  if (!m || !Number.isFinite(firstAt) || firstAt <= 0) return null;
  const d = new Date(firstAt); d.setMonth(d.getMonth() + m); return d.getTime();
}
export const GIFT_NAMES = { jelly: 'Jelly squishy', clicker: '3-key NOMI clicker' };

/** The items this plan's free gift can be, first = the default. */
export function giftOptions(plan) {
  const a = plan && (plan.activity || (plan.clicker ? 'both' : 'squishy'));
  return a === 'clicker' ? ['clicker'] : a === 'both' ? ['jelly', 'clicker'] : ['jelly'];
}

/**
 * The free gift for this request, or null. referral: { source, gift } from the page; validCode: an old friend link.
 * Returns { item, name, label, via, choice, until } where choice says the customer could pick and until is when the offer ends (or null).
 */
export function freeGift(plan, referral, validCode = false, now = Date.now()) {
  const r = referral || {};
  if (!OFFER_SOURCES[r.source] && !validCode) return null;
  const until = offerUntil(r.source, r.firstAt);
  if (until && now > until && !validCode) return null; // the 2 months from their first scan are over
  const opts = giftOptions(plan);
  const item = opts.includes(r.gift) ? r.gift : opts[0];
  return { item, name: GIFT_NAMES[item], label: `1 free ${GIFT_NAMES[item]}`, via: OFFER_SOURCES[r.source] || 'friend’s link', choice: opts.length > 1, until };
}
