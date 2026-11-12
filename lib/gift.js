// Store QR gift A/B test (owner, 12 Nov 2026). Each Tom & Stefanie outlet has a poster QR: /?src=store&o=wcc|plq|epm.
// A device that scans it is given one of two gifts at random, and keeps it (src/app.js): A = $10 off the first party,
// B = a free jelly squishy for the birthday child. The dashboard compares which gift brings more paid parties and
// profit per scan (lib/scorecard.js). One offer per booking: a valid friend's code wins over the store gift.
export const OUTLETS = { wcc: 'Woodlands Civic Centre', plq: 'Paya Lebar Quarter', epm: 'Eastpoint Mall' };
export const GIFTS = {
  A: { name: '$10 off your first party', short: '$10 off', discountCents: 1000 },
  B: { name: 'Free jelly squishy for the birthday child', short: 'Free jelly squishy', worthCents: 1800 }, // $16 squishy + $2 container
};
/** What a free jelly squishy costs us (materials), used until the owner enters their own on the dashboard. */
export const BONUS_COST_CENTS = 400;

export const cleanGift = (g) => (g === 'A' || g === 'B' ? g : '');
export const cleanOutlet = (o) => (Object.prototype.hasOwnProperty.call(OUTLETS, o) ? o : '');

/** The arm this request belongs to (came from a store QR with a gift), whether or not the gift could be applied. */
export const giftArm = (referral) => (referral && referral.source === 'outlet' ? cleanGift(referral.gift) : '');

/**
 * The gift actually given: the arm, for a first party, unless a valid friend's code (not their own) was used.
 * friendCodeCounts: true when a friend's code gives this booking its $10 instead.
 */
export function giftApplied(referral, friendCodeCounts) {
  const arm = giftArm(referral);
  if (!arm || referral.returning || friendCodeCounts) return '';
  return arm;
}
