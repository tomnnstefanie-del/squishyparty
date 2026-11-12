// Store QR gift A/B test (owner, 12 Nov 2026). Each Tom & Stefanie outlet has a poster QR: /?src=store&o=wcc|plq|epm.
// A device that scans it is given one of two gifts at random, and keeps it (src/app.js): A = $10 off the first party,
// B = a free jelly squishy for the birthday child. The dashboard compares which gift brings more paid parties and
// profit per scan (lib/scorecard.js). One offer per booking: a valid friend's code wins over the store gift.
export const OUTLETS = { wcc: 'Woodlands Civic Centre', plq: 'Paya Lebar Quarter', epm: 'Eastpoint Mall' };
export const GIFTS = {
  A: { name: '$10 off your first party', short: '$10 off', discountCents: 1000 },
  B: { name: 'Free jelly squishy for the birthday child', short: 'Free jelly squishy', worthCents: 1800 }, // $16 squishy + $2 container
};
// Time limits (owner, 12 Nov 2026): message us (a request on the site, or WhatsApp) within 14 days of scanning to lock
// the gift in, then pay the deposit within 30 days of that request. The party itself can be any date.
export const GIFT_LOCK_DAYS = 14, GIFT_DEPOSIT_DAYS = 30;
/** The last day to pay the deposit and keep the gift: 30 days after the request (Singapore date, YYYY-MM-DD). */
export const giftDepositBy = (at = new Date()) => new Date(new Date(at).getTime() + 8 * 3600e3 + GIFT_DEPOSIT_DAYS * 864e5).toISOString().slice(0, 10);
/** The scan was more than 14 days before this request (a day's grace for time zones and clocks). */
export const giftExpired = (scannedAt, now = Date.now()) => Number.isFinite(scannedAt) && scannedAt > 0 && now - scannedAt > (GIFT_LOCK_DAYS + 1) * 864e5;

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
  if (!arm || referral.returning || referral.giftExpired || friendCodeCounts) return '';
  return arm;
}
