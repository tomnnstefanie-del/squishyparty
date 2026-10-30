// The evaluation scorecard on the dashboard: acquisition, referrals and repeat bookings, revenue and ROI, worked out
// from what the site already records (bookings, payments, sources, rewards, daily counters) plus the costs and targets
// the team enters on the dashboard (cc:settings). Pure function, so it's easy to test.
//
// Definitions (the same as the evaluation slides):
//   paid party        a request in the window with a deposit recorded (not "didn't book")
//   new customer      a paid party that isn't flagged as a returning customer
//   revenue           the booking's current quoted total (after any applied revision), before the $10 discount
//   contribution      revenue − squishy kits − facilitator staff − partner costs − $10 discount − free-squishy reward
//   CAC (touchpoint)  that touchpoint's cost ÷ new customers it brought in
//   marketing ROI     (contribution before marketing costs from attributed parties − programme cost) ÷ programme cost
//                     programme cost = printing + ads + programme staff + other + $10 discounts + rewards
//                     (discounts and rewards are counted once, as programme cost, not also in that contribution)
import { IN_HOUSE } from './stats.js';

export const TOUCH = { friend: 'Family referral link', capsule: 'Capsule QR sticker', outlet: 'In-store QR', social: 'Social / WhatsApp / Google', other: 'Other links', direct: 'Direct (no tag)' };
export const SOCIAL = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'google', 'telegram', 'xhs'];
export const VISIT_SOURCES = ['capsule', 'outlet', ...SOCIAL, 'flyer', 'other', 'direct'];

export const SETTING_KEYS = { // name: [kind, max]
  pilotStart: ['date'], pilotEnd: ['date'],
  targetParties: ['int', 10000], targetReferralPct: ['int', 100], targetRebookPct: ['int', 100],
  kitCents: ['cents', 100000], staffCents: ['cents', 1000000], partnerCostPct: ['int', 100], rewardCents: ['cents', 100000],
  capsulePrintCents: ['cents', 10000000], outletPrintCents: ['cents', 10000000], adSpendCents: ['cents', 10000000],
  programmeStaffCents: ['cents', 10000000], otherCents: ['cents', 10000000],
};

/** Tidies settings sent from the dashboard. Unknown keys are dropped; empty values mean "not set". */
export function cleanSettings(input) {
  const out = {};
  for (const [k, [kind, max]] of Object.entries(SETTING_KEYS)) {
    const v = input ? input[k] : undefined;
    if (v === undefined || v === null || v === '') continue;
    if (kind === 'date') { if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) out[k] = String(v); continue; }
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= max) out[k] = n;
  }
  if (out.pilotStart && out.pilotEnd && out.pilotEnd < out.pilotStart) delete out.pilotEnd;
  return out;
}

export function touchOf(b) {
  if (b.via === 'friend') return 'friend';
  if (b.via === 'capsule' || b.source === 'capsule') return 'capsule';
  if (b.source === 'outlet') return 'outlet';
  if (SOCIAL.includes(b.source)) return 'social';
  return b.source ? 'other' : 'direct';
}

const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const sgDay = (iso) => new Date(Date.parse(iso) + 8 * 3600e3).toISOString().slice(0, 10);
const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : null);
const sum = (xs, f) => xs.reduce((a, x) => a + (f(x) || 0), 0);

/** The window the scorecard covers: the pilot dates if set, otherwise the last 6 weeks. */
export function windowOf(settings, today) {
  const from = settings.pilotStart || addDays(today, -41);
  let to = settings.pilotEnd || today; if (to > today) to = today;
  return { from, to: to < from ? from : to };
}

/**
 * books: stored bookings (with lines); life, pays: by ref; codes: shareCode -> { ref }; rewards: list;
 * days: { 'YYYY-MM-DD': { counter: n } } for the window; settings: cleaned; today: 'YYYY-MM-DD' (Singapore).
 */
export function buildScorecard({ books, life, pays, codes, rewards, days, settings = {}, today }) {
  const win = windowOf(settings, today);
  const inWin = (d) => d >= win.from && d <= win.to;
  const S = settings, costsSet = S.kitCents != null && S.staffCents != null;
  const partnerPct = S.partnerCostPct != null ? S.partnerCostPct : 100;
  const rewardOf = new Map((rewards || []).filter((r) => r.status !== 'void').map((r) => [r.friendRef, r]));

  const all = books.map((b) => {
    const lf = life[b.ref] || {}, lines = b.lines || {};
    const partnerCents = sum((lines.addons || []).filter((a) => a.vendor !== IN_HOUSE), (a) => a.cents);
    const revenue = b.totalCents || 0, squishy = lines.squishyCents != null ? lines.squishyCents : revenue - sum(lines.addons || [], (a) => a.cents);
    const reward = rewardOf.has(b.ref) ? (S.rewardCents || 0) : 0;
    const direct = revenue - (S.kitCents || 0) * (b.participants || 0) - (S.staffCents || 0) - Math.round(partnerCents * partnerPct / 100); // before marketing costs
    return { b, lf, day: sgDay(b.at), touch: touchOf(b), revenue, squishy, addons: revenue - squishy, partnerCents, discount: b.discountCents || 0, reward, direct,
      contribution: direct - (b.discountCents || 0) - reward, paid: !!lf.confirmed && !lf.lost, full: !!lf.paid, isNew: !(b.returning || []).length };
  });
  const cohort = all.filter((x) => inWin(x.day)), paid = cohort.filter((x) => x.paid), fresh = paid.filter((x) => x.isNew);

  const dayList = []; for (let d = win.from; d <= win.to; d = addDays(d, 1)) dayList.push(d);
  const cnt = (field, from = win.from, to = win.to) => sum(dayList.filter((d) => d >= from && d <= to), (d) => Number((days[d] || {})[field]) || 0);
  const visitsOf = (t, f, to2) => t === 'friend' ? cnt('link_open', f, to2) : t === 'capsule' ? cnt('capsule_scan', f, to2) : t === 'outlet' ? cnt('visit_outlet', f, to2)
    : t === 'social' ? sum(SOCIAL, (s) => cnt('visit_' + s, f, to2)) : t === 'direct' ? cnt('visit_direct', f, to2) : cnt('visit_flyer', f, to2) + cnt('visit_other', f, to2);

  // Costs per touchpoint (fixed costs for the window, plus the $10 discounts and rewards actually given)
  const fixed = { capsule: S.capsulePrintCents || 0, outlet: S.outletPrintCents || 0, social: S.adSpendCents || 0 };
  const touchCost = (t) => (fixed[t] || 0) + sum(paid.filter((x) => x.touch === t), (x) => x.discount + x.reward);
  const touch = Object.keys(TOUCH).map((t) => {
    const p = paid.filter((x) => x.touch === t), n = fresh.filter((x) => x.touch === t).length, cost = touchCost(t);
    return { key: t, label: TOUCH[t], visits: visitsOf(t), requests: cohort.filter((x) => x.touch === t).length, paid: p.length, newCustomers: n,
      costCents: cost, cacCents: cost && n ? Math.round(cost / n) : null };
  });
  const best = touch.filter((t) => t.cacCents != null).sort((a, b) => a.cacCents - b.cacCents)[0] || null;

  // Money
  const programme = (list, share = 1) => Math.round(((S.capsulePrintCents || 0) + (S.outletPrintCents || 0) + (S.adSpendCents || 0) + (S.programmeStaffCents || 0) + (S.otherCents || 0)) * share)
    + sum(list, (x) => x.discount + x.reward);
  const attributed = (list) => list.filter((x) => ['friend', 'capsule', 'outlet', 'social'].includes(x.touch));
  const roi = (list, share) => { const cost = programme(list, share); return costsSet && cost ? Math.round(((sum(attributed(list), (x) => x.direct) - cost) / cost) * 100) : null; };
  const money = {
    revenueCents: sum(paid, (x) => x.revenue), squishyCents: sum(paid, (x) => x.squishy), addonCents: sum(paid, (x) => x.addons),
    discountCents: sum(paid, (x) => x.discount), rewardCents: sum(paid, (x) => x.reward), partnerCents: Math.round(sum(paid, (x) => x.partnerCents) * partnerPct / 100),
    kitCents: (S.kitCents || 0) * sum(paid, (x) => x.b.participants), staffCents: (S.staffCents || 0) * paid.length,
    contributionCents: costsSet ? sum(paid, (x) => x.contribution) : null, programmeCents: programme(paid),
    attributedContributionCents: costsSet ? sum(attributed(paid), (x) => x.direct) : null, roiPct: roi(paid, 1),
  };

  // Referrals: completed parties (paid in full) whose family's link brought at least one friend's paid party
  const refOfCode = {}; for (const [code, v] of Object.entries(codes || {})) if (v && v.ref) refOfCode[code] = v.ref;
  const referrers = new Set(all.filter((x) => x.b.via === 'friend' && x.paid && refOfCode[x.b.code]).map((x) => refOfCode[x.b.code]));
  const completed = cohort.filter((x) => x.full);
  const rw = (rewards || []).filter((r) => r.status !== 'void' && inWin(sgDay(r.at)));
  const sentN = rw.filter((r) => r.status === 'sent' || r.status === 'redeemed').length, redeemedN = rw.filter((r) => r.status === 'redeemed').length;
  const co = cohort.filter((x) => x.b.companyName);

  // Week by week (by the week the request came in); fixed costs are spread evenly over the weeks
  const weeks = [], nW = Math.max(1, Math.ceil(dayList.length / 7));
  for (let i = 0; i < nW; i++) {
    const f = addDays(win.from, i * 7); let t = addDays(f, 6); if (t > win.to) t = win.to;
    const wc = cohort.filter((x) => x.day >= f && x.day <= t), wp = wc.filter((x) => x.paid), wn = wp.filter((x) => x.isNew);
    const share = (dayList.filter((d) => d >= f && d <= t).length) / dayList.length;
    const cost = programme(wp, share);
    weeks.push({ from: f, to: t, visits: sum(Object.keys(TOUCH), (k) => visitsOf(k, f, t)), requests: wc.length, paid: wp.length, newCustomers: wn.length,
      avgRevenueCents: wp.length ? Math.round(sum(wp, (x) => x.revenue) / wp.length) : null,
      contributionPerPartyCents: costsSet && wp.length ? Math.round(sum(wp, (x) => x.contribution) / wp.length) : null,
      cacCents: wn.length && cost ? Math.round(cost / wn.length) : null, roiPct: wp.length ? roi(wp, share) : null }); // no ROI for a week without parties
  }

  return {
    window: { ...win, days: dayList.length }, costsSet, settings: S,
    kpis: {
      paidParties: paid.length, newCustomers: fresh.length, targetParties: S.targetParties ?? null,
      avgRevenueCents: paid.length ? Math.round(money.revenueCents / paid.length) : null,
      contributionPerPartyCents: costsSet && paid.length ? Math.round(money.contributionCents / paid.length) : null,
      bestCac: best ? { touch: best.label, cents: best.cacCents } : null, roiPct: money.roiPct,
    },
    funnel: [
      { step: 'Visits & scans', n: sum(Object.keys(TOUCH), (k) => visitsOf(k)) },
      { step: 'Requests sent', n: cohort.length },
      { step: 'Deposits paid', n: paid.length },
      { step: 'Paid in full', n: paid.filter((x) => x.full).length },
      { step: 'Party done', n: paid.filter((x) => x.full && x.b.date < today).length },
    ].map((s, i, a) => ({ ...s, ratePct: i ? pctOf(s.n, a[i - 1].n) : null })),
    touch, money,
    referral: { completed: completed.length, withFriend: completed.filter((x) => referrers.has(x.b.ref)).length, ratePct: pctOf(completed.filter((x) => referrers.has(x.b.ref)).length, completed.length),
      targetPct: S.targetReferralPct ?? null, opens: cnt('link_open'), requests: cohort.filter((x) => x.b.via === 'friend').length, paid: paid.filter((x) => x.b.via === 'friend').length },
    rewards: { owed: rw.filter((r) => r.status === 'owed').length, sent: sentN, redeemed: redeemedN, ratePct: pctOf(redeemedN, sentN) },
    company: { bookings: co.length, yearly: co.filter((x) => x.b.yearly).length, yearlyPct: pctOf(co.filter((x) => x.b.yearly).length, co.length),
      returning: co.filter((x) => !x.isNew).length, rebookPct: pctOf(co.filter((x) => !x.isNew).length, co.length), targetPct: S.targetRebookPct ?? null },
    weeks,
  };
}

