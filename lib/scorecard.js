// The evaluation scorecard on the dashboard: acquisition, referrals and repeat bookings, revenue and ROI, worked out
// from what the site already records (bookings, payments, sources, rewards, daily counters) plus the costs and targets
// the team enters on the dashboard (cc:settings). Pure function, so it's easy to test.
//
// Definitions (the same as the evaluation slides):
//   paid party        a request in the window with a deposit recorded (not "didn't book")
//   new customer      a paid party that isn't flagged as a returning customer
//   revenue           the booking's current quoted total (after any applied revision), before the $10 discount
//   contribution      revenue − squishy kits − facilitator staff − partner costs − $10 discount − free-squishy reward
//   gross profit      revenue − kits − staff − partner costs (before marketing costs): the "LTV" of one party
//   CAC (touchpoint)  that touchpoint's cost ÷ new customers it brought in
//   blended CAC       programme cost ÷ all new customers
//   LTV : CAC         gross profit per paid party ÷ blended CAC (healthy at 3 : 1 or more)
//   K-factor          friends' paid parties ÷ other paid parties: how many extra customers each customer brings
//   marketing ROI     (gross profit of paid parties − programme cost) ÷ programme cost
//                     programme cost = printing + ads + programme staff + other + $10 discounts + rewards
//                     (discounts and rewards are counted once, as programme cost, not also in gross profit)
import { IN_HOUSE } from './stats.js';

// The four touchpoints of the pilot. Anything without a store, capsule or friend tag (search, social, typed in) is organic.
export const TOUCH = { outlet: 'Retail store QR', capsule: 'Capsule QR (generic)', organic: 'Search / social / direct', friend: 'Friend’s WhatsApp referral link' };
export const SOCIAL = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'google', 'telegram', 'xhs'];
export const VISIT_SOURCES = ['capsule', 'outlet', ...SOCIAL, 'flyer', 'other', 'direct'];

// Targets: set before the pilot, fixed while it runs (changes at a checkpoint need a reason and are logged), and compared
// with the actual numbers on the dashboard. key: [label, default, unit, 'ge' (at least) | 'le' (at most), max].
// The CAC ceiling isn't stored: it is gross profit per party ÷ the LTV : CAC target, so the two always agree.
export const TARGETS = {
  targetParties: ['New paying customers', 3, '', 'ge', 10000],
  targetVisitReqPct: ['Reached the site → request', 2, '%', 'ge', 100],
  targetReqDepPct: ['Request → deposit paid', 50, '%', 'ge', 100],
  targetDepFullPct: ['Deposit → paid in full', 90, '%', 'ge', 100],
  targetAvgRev: ['Average revenue per party', 400, '$', 'ge', 100000],
  targetMarginPct: ['Gross profit, % of revenue', 60, '%', 'ge', 100],
  targetLtvCac: ['LTV : CAC', 3, ': 1', 'ge', 100],
  targetRoiPct: ['Marketing ROI', 200, '%', 'ge', 100000],
  targetOpensPerFamily: ['Friend opens per family', 2, '', 'ge', 1000],
  targetOpenQuotePct: ['Friend opens → asked for a quote', 15, '%', 'ge', 100],
  targetQuotePaidPct: ['Friend quotes → paid', 50, '%', 'ge', 100],
  targetReferralPct: ['Referral rate', 20, '%', 'ge', 100],
  targetK: ['Viral coefficient (K)', 0.2, '', 'ge', 100],
  targetRedeemPct: ['Reward redemption', 60, '%', 'ge', 100],
  targetYearlyPct: ['Companies who hold it every year', 50, '%', 'ge', 100],
  targetRebookPct: ['Company rebooking', 50, '%', 'ge', 100],
};
export const targetsOf = (settings) => Object.fromEntries(Object.entries(TARGETS).map(([k, d]) => [k, settings && settings[k] != null ? settings[k] : d[1]]));
/** 'ok' on target, 'close' within 20%, 'off' further away; null without an actual number yet. */
export function statusOf(actual, target, dir) {
  if (actual == null || target == null) return null;
  if (dir === 'le') return actual <= target ? 'ok' : actual <= target * 1.2 ? 'close' : 'off';
  return actual >= target ? 'ok' : actual >= target * 0.8 ? 'close' : 'off';
}

export const SETTING_KEYS = { // name: [kind, max]
  pilotStart: ['date'], pilotEnd: ['date'],
  ...Object.fromEntries(Object.entries(TARGETS).map(([k, d]) => [k, ['num', d[4]]])),
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
    if (kind === 'num') { if (Number.isFinite(n) && n >= 0 && n <= max) out[k] = Math.round(n * 100) / 100; continue; }
    if (Number.isInteger(n) && n >= 0 && n <= max) out[k] = n;
  }
  if (out.pilotStart && out.pilotEnd && out.pilotEnd < out.pilotStart) delete out.pilotEnd;
  return out;
}

export function touchOf(b) {
  if (b.via === 'friend') return 'friend';
  if (b.via === 'capsule' || b.source === 'capsule') return 'capsule';
  if (b.source === 'outlet') return 'outlet';
  return 'organic';
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
    : sum([...SOCIAL, 'direct', 'flyer', 'other'], (s) => cnt('visit_' + s, f, to2));

  // Costs per touchpoint (fixed costs for the window, plus the $10 discounts and rewards actually given)
  const fixed = { capsule: S.capsulePrintCents || 0, outlet: S.outletPrintCents || 0, organic: S.adSpendCents || 0 };
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
  const roi = (list, share) => { const cost = programme(list, share); return costsSet && cost ? Math.round(((sum(list, (x) => x.direct) - cost) / cost) * 100) : null; };
  const money = {
    revenueCents: sum(paid, (x) => x.revenue), squishyCents: sum(paid, (x) => x.squishy), addonCents: sum(paid, (x) => x.addons),
    discountCents: sum(paid, (x) => x.discount), rewardCents: sum(paid, (x) => x.reward), partnerCents: Math.round(sum(paid, (x) => x.partnerCents) * partnerPct / 100),
    kitCents: (S.kitCents || 0) * sum(paid, (x) => x.b.participants), staffCents: (S.staffCents || 0) * paid.length,
    contributionCents: costsSet ? sum(paid, (x) => x.contribution) : null, programmeCents: programme(paid),
    grossProfitCents: costsSet ? sum(paid, (x) => x.direct) : null, roiPct: roi(paid, 1),
  };

  // Referrals: completed parties (paid in full) whose family's link brought at least one friend's paid party
  const refOfCode = {}; for (const [code, v] of Object.entries(codes || {})) if (v && v.ref) refOfCode[code] = v.ref;
  const referrers = new Set(all.filter((x) => x.b.via === 'friend' && x.paid && refOfCode[x.b.code]).map((x) => refOfCode[x.b.code]));
  const completed = cohort.filter((x) => x.full);
  const rw = (rewards || []).filter((r) => r.status !== 'void' && inWin(sgDay(r.at)));
  const sentN = rw.filter((r) => r.status === 'sent' || r.status === 'redeemed').length, redeemedN = rw.filter((r) => r.status === 'redeemed').length;
  const co = cohort.filter((x) => x.b.companyName);
  const friendPaid = paid.filter((x) => x.touch === 'friend').length, otherPaid = paid.length - friendPaid;
  const blendedCac = fresh.length && money.programmeCents ? Math.round(money.programmeCents / fresh.length) : null;
  const ltv = costsSet && paid.length ? Math.round(money.grossProfitCents / paid.length) : null;
  // Referral drop-off: families sent a link (parties paid in full) → friends who opened it → asked for a quote → paid
  const drop = [{ step: 'Families with a link', n: completed.length }, { step: 'Friends opened it', n: cnt('link_open') },
    { step: 'Friends asked for a quote', n: cohort.filter((x) => x.touch === 'friend').length }, { step: 'Friends paid', n: friendPaid }]
    .map((s, i, a) => ({ ...s, ratePct: i > 1 ? pctOf(s.n, a[i - 1].n) : null, perFamily: i === 1 && a[0].n ? Math.round((s.n / a[0].n) * 10) / 10 : null }));

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

  const T = targetsOf(S);
  const out = {
    window: { ...win, days: dayList.length }, costsSet, settings: S, targets: T,
    kpis: {
      paidParties: paid.length, newCustomers: fresh.length, targetParties: T.targetParties,
      avgRevenueCents: paid.length ? Math.round(money.revenueCents / paid.length) : null,
      contributionPerPartyCents: costsSet && paid.length ? Math.round(money.contributionCents / paid.length) : null,
      bestCac: best ? { touch: best.label, cents: best.cacCents } : null, roiPct: money.roiPct,
      blendedCacCents: blendedCac, ltvCents: ltv, ltvCac: ltv != null && blendedCac ? Math.round((ltv / blendedCac) * 10) / 10 : null,
      kFactor: otherPaid ? Math.round((friendPaid / otherPaid) * 100) / 100 : null,
    },
    funnel: [
      { step: 'Reached the site', n: sum(Object.keys(TOUCH), (k) => visitsOf(k)) },
      { step: 'Requests sent', n: cohort.length },
      { step: 'Deposits paid', n: paid.length },
      { step: 'Paid in full', n: paid.filter((x) => x.full).length },
      { step: 'Party done', n: paid.filter((x) => x.full && x.b.date < today).length },
    ].map((s, i, a) => ({ ...s, ratePct: i ? pctOf(s.n, a[i - 1].n) : null })),
    touch, money,
    referral: { completed: completed.length, withFriend: completed.filter((x) => referrers.has(x.b.ref)).length, ratePct: pctOf(completed.filter((x) => referrers.has(x.b.ref)).length, completed.length),
      targetPct: T.targetReferralPct, opens: cnt('link_open'), requests: cohort.filter((x) => x.b.via === 'friend').length, paid: friendPaid, dropoff: drop },
    rewards: { owed: rw.filter((r) => r.status === 'owed').length, sent: sentN, redeemed: redeemedN, ratePct: pctOf(redeemedN, sentN) },
    company: { bookings: co.length, yearly: co.filter((x) => x.b.yearly).length, yearlyPct: pctOf(co.filter((x) => x.b.yearly).length, co.length),
      returning: co.filter((x) => !x.isNew).length, rebookPct: pctOf(co.filter((x) => !x.isNew).length, co.length), targetPct: T.targetRebookPct },
    weeks,
  };

  // CAC ceiling = gross profit per party ÷ the LTV : CAC target (actual gross profit once there is some, else the planned one)
  const gpPlanned = Math.round(T.targetAvgRev * 100 * T.targetMarginPct / 100);
  const gp = ltv != null ? ltv : gpPlanned;
  const cacCeilingCents = T.targetLtvCac ? Math.round(gp / T.targetLtvCac) : null;
  out.cacCeiling = { cents: cacCeilingCents, fromActual: ltv != null, grossProfitCents: gp };
  const k = out.kpis, f = out.funnel, d = drop, $ = (c) => (c == null ? null : c / 100);
  const margin = costsSet && money.revenueCents ? Math.round((money.grossProfitCents / money.revenueCents) * 100) : null;
  const rows = [
    ['targetParties', fresh.length], ['targetVisitReqPct', f[1].ratePct], ['targetReqDepPct', f[2].ratePct], ['targetDepFullPct', f[3].ratePct],
    ['targetAvgRev', $(k.avgRevenueCents)], ['targetMarginPct', margin], ['targetLtvCac', k.ltvCac], ['targetRoiPct', k.roiPct],
    ['targetOpensPerFamily', d[1].perFamily], ['targetOpenQuotePct', d[2].ratePct], ['targetQuotePaidPct', d[3].ratePct],
    ['targetReferralPct', out.referral.ratePct], ['targetK', k.kFactor], ['targetRedeemPct', out.rewards.ratePct],
    ['targetYearlyPct', out.company.yearlyPct], ['targetRebookPct', out.company.rebookPct],
  ];
  out.checks = Object.fromEntries(rows.map(([key, actual]) => [key, { actual, target: T[key], dir: TARGETS[key][3], status: statusOf(actual, T[key], TARGETS[key][3]) }]));
  out.checks.cac = { actual: $(blendedCac), target: $(cacCeilingCents), dir: 'le', status: statusOf($(blendedCac), $(cacCeilingCents), 'le') };
  out.checks.marginPct = margin;
  for (const t of out.touch) t.cacStatus = statusOf($(t.cacCents), $(cacCeilingCents), 'le');
  out.targetDefs = Object.entries(TARGETS).map(([key, [label, def, unit, dir]]) => ({ key, label, default: def, unit, dir }));
  return out;
}

/** The pilot is running (targets locked) between the pilot start and end dates. */
export const pilotLocked = (settings, today) => !!(settings && settings.pilotStart && settings.pilotEnd && today >= settings.pilotStart && today <= settings.pilotEnd);

