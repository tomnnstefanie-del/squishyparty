// The free-gift offer (owner, 2026-11-23). It replaces the $10 friend referral.
// Every party booked through one of our links gets ONE free item for the booking (minimum 10 participants still applies):
//   /wcc, /plq, /epm  the QR code at each Tom & Stefanie store
//   /gift             the foam-board poster at every party, and the same link sent on WhatsApp afterwards
//   /c                the capsule-lid sticker (already printed, so it keeps working)
// Old personal referral links (?ref=MIA-K7Q2) that were already shared also get the free item.
// Which item: squishy packages get a Jelly squishy (even Crunchy). A package with only clickers gets a clicker.
// A package with clickers and squishies lets the customer choose. Set `gift` on a package in EXP (src/app.js) to
// change it, e.g. gift:['clicker'] or gift:['jelly','clicker']; without it a package gives a Jelly squishy.

export const OFFER_SOURCES = {
  wcc: 'Woodlands Civic Centre store QR',
  plq: 'PLQ store QR',
  epm: 'Eastpoint Mall store QR',
  event: 'party poster / after-party link',
  capsule: 'capsule QR sticker',
};
export const GIFT_NAMES = { jelly: 'Jelly squishy', clicker: 'clicker' };

/** The items a package's free gift can be, first = the default. */
export function giftOptions(experience, exp) {
  const g = exp && exp[experience] && exp[experience].gift;
  const ok = Array.isArray(g) ? g.filter((k) => GIFT_NAMES[k]) : [];
  return ok.length ? ok : ['jelly'];
}

/**
 * The free gift for this request, or null. referral: { source, gift } from the page; validCode: an old friend link.
 * Returns { item, name, label, via, choice } where choice says the customer could pick.
 */
export function freeGift(plan, referral, exp, validCode = false) {
  const r = referral || {};
  if (!OFFER_SOURCES[r.source] && !validCode) return null;
  const opts = giftOptions(plan && plan.experience, exp);
  const item = opts.includes(r.gift) ? r.gift : opts[0];
  return { item, name: GIFT_NAMES[item], label: `1 free ${GIFT_NAMES[item]}`, via: OFFER_SOURCES[r.source] || 'friend’s link', choice: opts.length > 1 };
}
