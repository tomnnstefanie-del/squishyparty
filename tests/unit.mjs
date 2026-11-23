// Unit tests for server pricing, validation and the Telegram message.
import assert from 'node:assert/strict';
import { priceRequest, ratesOf, activityName } from '../lib/pricing.js';
import { validateRequest, RequestError } from '../lib/validate.js';
import { buildMessage, whatsappLink, customerGreeting, afterPartyMessage } from '../lib/telegram.js';
process.env.TELEGRAM_BOT_TOKEN = 'unit:token';
const otp = await import('../lib/otp.js');
const { confirmationEmail } = await import('../lib/emails.js');
const { quotePdf } = await import('../lib/quote-pdf.js');
const { freeGift, giftOptions } = await import('../lib/offer.js');
const { validateFeedback } = await import('../lib/feedback.js');
const Ref = await import('../lib/referral.js');
const { statusLink, checkStatusToken } = await import('../lib/status-link.js');
const nodeFs = await import('node:fs');
const nodeZlib = await import('node:zlib');
const Stats = await import('../lib/stats.js');
const Score = await import('../lib/scorecard.js');

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ✓', name); };
const plan = (o = {}) => ({ participants: 10, experience: 'both', wax: false, addons: [], ...o });

console.log('pricing');
t('Duo, 10 participants = $280 + $150 travel = $430', () => assert.equal(priceRequest(plan()).totalCents, 43000));
t('Duo + wax duo deal for 10 = $465 ($3.50 per person for both squishies)', () => assert.equal(priceRequest(plan({ wax: true })).totalCents, 46500));
t('Jelly, 10 participants = $330; + wax $20 = $350', () => { assert.equal(priceRequest(plan({ experience: 'jelly' })).totalCents, 33000); assert.equal(priceRequest(plan({ experience: 'jelly', wax: true })).totalCents, 35000); });
t('Crunchy, 10 participants = $350', () => assert.equal(priceRequest(plan({ experience: 'crunchy' })).totalCents, 35000));
t('Minimum 10: 6 participants priced as 10', () => { const p = priceRequest(plan({ participants: 6 })); assert.equal(p.billableParticipants, 10); assert.equal(p.totalCents, 43000); });
t('No deposit is worked out (nothing is paid online)', () => { const p = priceRequest(plan()); assert.equal(p.depositCents, undefined); assert.equal(p.holdCents, undefined); });
t('Per-person add-on is charged per participant (favour bags, 10 × $6)', () => { const p = priceRequest(plan({ addons: ['s-favours'] })); assert.equal(p.addons[0].quantity, 10); assert.equal(p.addons[0].cents, 6000); });
t('Removed vendors are no longer accepted', () => { assert.throws(() => priceRequest(plan({ addons: ['f-bento'] }))); });
t('Cakes are on quote, never counted as $0', () => { const p = priceRequest(plan({ addons: ['bs-custom'] })); assert.equal(p.addons[0].cents, null); assert.equal(p.onQuote.length, 1); assert.equal(p.totalCents, 43000); });

console.log('search (SEO)');
{
  const fs = await import('node:fs'); const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  t('page is indexable, with title, description and canonical', () => { assert.ok(!/noindex/.test(html)); assert.match(html, /<title>[^<]*Singapore[^<]*<\/title>/); assert.match(html, /<meta name="description" content="[^"]{80,170}">/); assert.match(html, /<link rel="canonical" href="https:\/\/[^"]+\/">/); });
  t('structured data is valid JSON with the FAQ', () => { const j = JSON.parse(html.match(/application\/ld\+json">(.*?)<\/script>/)[1]); const faq = j['@graph'].find((x) => x['@type'] === 'FAQPage'); assert.ok(faq.mainEntity.length >= 5); });
  t('robots.txt allows search engines and points at the sitemap', () => { const r = fs.readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'); assert.match(r, /Allow: \//); assert.match(r, /Sitemap: /); const hs = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).headers; assert.ok(!JSON.stringify(hs.find((h) => h.source === '/(.*)')).includes('noindex')); /* only private pages and APIs are noindex */ });
}

console.log('email codes');
t('a correct code verifies; a wrong code, other email or expired token does not', () => {
  const { code, token } = otp.issueCode('Sarah@Example.com');
  assert.ok(otp.checkCode('sarah@example.com', code, token));
  assert.ok(!otp.checkCode('sarah@example.com', code === '123456' ? '654321' : '123456', token));
  assert.ok(!otp.checkCode('other@example.com', code, token));
  assert.ok(!otp.checkCode('sarah@example.com', code, token, Date.now() + 11 * 60 * 1000));
});
t('verified token only works for the same email and expires', () => {
  const v = otp.issueVerified('a@b.co'); assert.ok(otp.checkVerified('A@B.co', v)); assert.ok(!otp.checkVerified('c@b.co', v));
  assert.ok(!otp.checkVerified('a@b.co', v, Date.now() + 3 * 3600 * 1000)); assert.ok(!otp.checkVerified('a@b.co', 'garbage'));
});

console.log('validation');
const good = () => ({ v: 1, plan: { ...plan(), date: '2099-01-01', start: '14:00', end: '16:00' }, contact: { parentName: 'Sarah Tan', phone: '8123 4567', email: 'sarah@example.com', venueName: 'Condo function room', address: '1 Example Road', postalCode: '123456', notes: '' }, consent: true, website: '' });
const dateOK = () => { const g = good(); const d = new Date(); d.setMonth(d.getMonth() + 2); g.plan.date = d.toISOString().slice(0, 10); return g; };
const bad = (mut, field) => { const g = dateOK(); mut(g); assert.throws(() => validateRequest(g), (e) => e instanceof RequestError && (!field || e.field === field)); };
t('accepts a good request and normalises the phone', () => assert.equal(validateRequest(dateOK()).contact.phone, '6581234567'));
t('accepts +65 prefix', () => { const g = dateOK(); g.contact.phone = '+65 9123 4567'; assert.equal(validateRequest(g).contact.phone, '6591234567'); });
t('accepts other countries by their length', () => { const g = dateOK(); g.contact.phoneCountry = 'US'; g.contact.phone = '(201) 555-0123'; assert.equal(validateRequest(g).contact.phone, '12015550123'); g.contact.phoneCountry = 'GB'; g.contact.phone = '07400 123456'; assert.equal(validateRequest(g).contact.phone, '447400123456'); });
t('rejects a number with the wrong length for its country', () => bad((g) => { g.contact.phoneCountry = 'US'; g.contact.phone = '201 555 012'; }, 'phone'));
t('rejects a non-Singapore mobile', () => bad((g) => { g.contact.phone = '1234 5678'; }, 'phone'));
t('rejects an unknown add-on id (tampering)', () => bad((g) => { g.plan.addons = ['free-unicorn']; }, 'addons'));
t('rejects an unknown experience', () => bad((g) => { g.plan.experience = 'gold'; }, 'experience'));
t('rejects end time before start', () => bad((g) => { g.plan.end = '13:00'; }, 'time'));
t('rejects a past date', () => bad((g) => { g.plan.date = '2020-01-01'; }, 'date'));
t('rejects a bad postal code', () => bad((g) => { g.contact.postalCode = '12345'; }, 'postalCode'));
t('requires consent', () => bad((g) => { g.consent = false; }, 'consent'));
t('ignores browser totals (never used for pricing)', () => { const g = dateOK(); g.client = { totalCents: 1 }; assert.equal(validateRequest(g).clientTotalCents, 1); });
t('rejects participants outside 1–60', () => { bad((g) => { g.plan.participants = 0; }, 'participants'); bad((g) => { g.plan.participants = 61; }, 'participants'); });
t('old children/adults/budget fields are not accepted or passed on', () => { const g = dateOK(); delete g.plan.participants; g.plan.children = 10; assert.throws(() => validateRequest(g), (e) => e.field === 'participants'); const ok = validateRequest({ ...dateOK(), plan: { ...dateOK().plan, budgetCents: 5 } }); assert.equal(ok.plan.budgetCents, undefined); });

console.log('telegram message');
const v = validateRequest({ ...dateOK(), plan: { ...dateOK().plan, wax: true, goodie: true, addons: ['bs-custom', 's-favours', 'pp-face-2'] }, contact: { ...dateOK().contact, notes: 'Lift <b>B</b>, level 2' } });
const price = priceRequest(v.plan);
const msg = buildMessage({ ref: 'SP-TEST-0001', plan: v.plan, contact: v.contact, price, clientTotalCents: 1 });
t('includes contact, date, venue, address, postal', () => { for (const s of ['Sarah Tan', '+65 8123 4567', 'sarah@example.com', 'Condo function room', '1 Example Road, Singapore 123456', '2:00 pm–4:00 pm']) assert.ok(msg.includes(s), s); });
t('lists participants, squishy lines and every add-on, with no deposit or budget', () => { assert.ok(!/deposit|budget|PayNow/i.test(msg)); for (const s of ['10 participants', 'Duo: Jelly + Crunchy', 'Squishy goodie bags, 10 × $6', 'travel', 'Custom cake', 'Butter Studio', 'on quote', 'Party favour bags ×10', 'Face painting']) assert.ok(msg.includes(s), s); });
t('Wax Cracking is discontinued: a request asking for it gets no wax line', () => { assert.equal(v.plan.wax, false); assert.ok(!/Wax/.test(msg)); });
t('squishy goodie bag: $6 per child (U.P. $7), with any DIY activity', () => { assert.equal(priceRequest(plan({ goodie: true })).totalCents - priceRequest(plan()).totalCents, 6000); assert.equal(priceRequest({ ...plan({ goodie: true }), activity: 'clicker', clicker: 3 }).squishy.filter((l) => /goodie/.test(l.label)).length, 1); });
t('escapes HTML in customer text', () => assert.ok(msg.includes('Lift &lt;b&gt;B&lt;/b&gt;, level 2')));
t('flags when the page total differs from the server total', () => assert.ok(msg.includes('server price above is the one to quote')));
t('confirmation email: we’ll WhatsApp them to confirm availability, nothing to pay', () => {
  const e = confirmationEmail({ ref: 'SP-TEST-0001', plan: v.plan, contact: v.contact, price });
  for (const s of ['SP-TEST-0001', 'reach out on WhatsApp at +65 8123 4567', 'Participants: 10', 'nothing to pay at this stage', 'one quotation', '15 minutes before']) assert.ok(e.text.includes(s), s);
  assert.ok(!/verified by our team|The Confetti Club/.test(e.text + e.html));
  assert.ok(!/deposit|PayNow/i.test(e.text + e.html)); assert.equal(e.attachments.length, 0);
  assert.ok(!e.html.includes('<b>B</b>'));
});
t('company booking: needs a company name, checks UEN and billing email', () => {
  const g = dateOK(); g.bookingFor = 'company';
  assert.throws(() => validateRequest(g), (e) => e.field === 'companyName');
  g.contact.companyName = 'Acme Pte Ltd'; g.contact.companyUen = 'bad uen!'; assert.throws(() => validateRequest(g), (e) => e.field === 'companyUen');
  g.contact.companyUen = '201912345k'; g.contact.billingEmail = 'nope'; assert.throws(() => validateRequest(g), (e) => e.field === 'billingEmail');
  g.contact.billingEmail = 'finance@acme.sg'; const ok = validateRequest(g);
  assert.equal(ok.bookingFor, 'company'); assert.equal(ok.contact.companyUen, '201912345K');
});
t('company booking: Telegram asks for an invoice; email says nothing to pay now', () => {
  const g = dateOK(); g.bookingFor = 'company'; Object.assign(g.contact, { companyName: 'Acme Pte Ltd', billingEmail: 'finance@acme.sg' });
  const c = validateRequest(g), pr = priceRequest(c.plan);
  const m = buildMessage({ ref: 'SP-1', plan: c.plan, contact: c.contact, price: pr, clientTotalCents: null });
  assert.ok(m.includes('Acme Pte Ltd') && m.includes('Invoice to finance@acme.sg') && m.includes('CORPORATE BOOKING: yes')); assert.ok(!m.includes('holding deposit'));
  const e = confirmationEmail({ ref: 'SP-1', plan: c.plan, contact: c.contact, price: pr });
  assert.ok(e.text.includes('nothing to pay at this stage') && e.text.includes('finance@acme.sg')); assert.ok(!e.text.includes('holding deposit'));
  assert.equal(validateRequest(dateOK()).bookingFor, 'family');
});
t('PDF quotation is a valid PDF with every object where the index says', () => {
  const pdf = quotePdf({ ref: 'SP-1', issued: new Date('2026-10-27'), plan: v.plan, contact: v.contact, price, bookingFor: 'family', discountCents: 0, contactEmail: 'hi@example.com', site: 'https://example.com' });
  const s = pdf.toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4') && s.trimEnd().endsWith('%%EOF'));
  const xref = Number(/startxref\n(\d+)/.exec(s)[1]); assert.ok(s.slice(xref).startsWith('xref'));
  const offs = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => +m[1]);
  offs.forEach((o, i) => assert.ok(s.slice(o).startsWith(`${i + 1} 0 obj`), `object ${i + 1}`));
  assert.ok(s.includes('/DCTDecode') && s.includes('/Helvetica-Bold'));
});
t('quotation email attaches the PDF, with a quotation subject', () => {
  const e = confirmationEmail({ ref: 'SP-2', plan: v.plan, contact: v.contact, price, quote: { pdf: Buffer.from('%PDF-1.4'), filename: 'Confetti-Club-Quotation-Q-SP-2.pdf', totalCents: price.totalCents, discountCents: 0, gift: { label: '1 free Jelly squishy' } } });
  assert.equal(e.subject, 'Your Confetti Club Quotation | Q-SP-2');
  assert.equal(e.attachments.length, 1); assert.equal(e.attachments[0].contentType, 'application/pdf');
  for (const s of ['itemised PDF quotation is attached', 'not yet confirmed', 'Confetti Club', '+ 1 free Jelly squishy']) assert.ok((e.text + e.html).includes(s), s);
});
t('NOMI clicker keychains: priced per person by base size, on the quote, and validated', () => {
  const g = dateOK(); g.plan.clicker = 4; g.plan.participants = 12; const vp = validateRequest(g);
  const pr = priceRequest(vp.plan), line = pr.squishy.find((l) => l.label.startsWith('NOMI clicker'));
  assert.equal(line.cents, 1300 * 12); assert.equal(line.label, 'NOMI clicker keychains: 4-key base, 12 × $13');
  assert.equal(pr.totalCents, priceRequest({ ...vp.plan, clicker: 0 }).totalCents + 15600);
  const small = dateOK(); small.plan.clicker = 9; small.plan.participants = 6; assert.equal(priceRequest(validateRequest(small).plan).squishy.find((l) => l.label.startsWith('NOMI')).cents, 2300 * 10); // minimum 10
  for (const [k2, c] of [[3, 1000], [4, 1300], [5, 1600], [6, 1800], [8, 2000], [9, 2300]]) { const x = dateOK(); x.plan.clicker = k2; assert.equal(priceRequest(validateRequest(x).plan).squishy.find((l) => l.label.startsWith('NOMI')).cents, c * 10, String(k2)); }
  assert.throws(() => { const b = dateOK(); b.plan.clicker = 7; validateRequest(b); }, (e) => e.field === 'clicker');
  assert.equal(validateRequest(dateOK()).plan.clicker, 0);
  assert.equal(ratesOf(vp.plan).clicker, 1300);
});
t('DIY activity: Squishy only, Clicker only (no squishy, capsule or wax lines) or Squishy + Clicker', () => {
  const c = dateOK(); c.plan.activity = 'clicker'; c.plan.clicker = 5; c.plan.wax = true; c.plan.participants = 12; const vc = validateRequest(c);
  assert.equal(vc.plan.wax, false); // no wax without a squishy
  const pc = priceRequest(vc.plan);
  assert.deepEqual(pc.squishy.map((l) => l.cents), [1600 * 12, 15000]); // clickers + travel & set-up only
  assert.equal(activityName(vc.plan), 'NOMI clicker keychains');
  assert.throws(() => { const b = dateOK(); b.plan.activity = 'clicker'; validateRequest(b); }, (e) => e.field === 'clicker'); // clicker needs a size
  assert.throws(() => { const b = dateOK(); b.plan.activity = 'party'; validateRequest(b); }, (e) => e.field === 'activity');
  const sq = dateOK(); sq.plan.activity = 'squishy'; sq.plan.clicker = 9; assert.equal(validateRequest(sq).plan.clicker, 0); // squishy only: clicker dropped
  const bo = dateOK(); bo.plan.activity = 'both'; bo.plan.clicker = 3; const vb = validateRequest(bo);
  assert.ok(priceRequest(vb.plan).squishy.some((l) => l.label.startsWith('Squishy DIY')) && priceRequest(vb.plan).squishy.some((l) => l.label.startsWith('NOMI')));
  assert.equal(activityName(vb.plan), 'Duo: Jelly + Crunchy + NOMI clickers');
  assert.equal(freeGift(vc.plan, { source: 'event', gift: 'jelly' }).item, 'clicker'); // clicker only: a clicker
  assert.equal(freeGift(vb.plan, { source: 'event', gift: 'clicker' }).item, 'clicker'); // both: their pick
  assert.equal(freeGift(validateRequest(sq).plan, { source: 'event', gift: 'clicker' }).item, 'jelly'); // squishy only: Jelly
});
t('free gift: one item per booking from the store, party and capsule links; no money off', () => {
  for (const src of ['wcc', 'plq', 'epm', 'event', 'capsule']) assert.equal(freeGift({ experience: 'crunchy' }, { source: src }).item, 'jelly', src);
  assert.equal(freeGift({ experience: 'both' }, { source: 'event' }).label, '1 free Jelly squishy');
  assert.equal(freeGift({ experience: 'jelly' }, {}), null); // no link, no gift
  assert.equal(freeGift({ experience: 'jelly' }, { source: 'instagram' }), null);
  assert.equal(freeGift({ experience: 'jelly' }, {}, true).item, 'jelly'); // old friend link still honoured
  assert.equal(freeGift({ experience: 'crunchy' }, { source: 'wcc', gift: 'clicker' }).item, 'jelly'); // no clickers: can't pick one
  assert.equal(freeGift({ experience: 'both', clicker: 4 }, { source: 'wcc', gift: 'clicker' }).label, '1 free 3-key NOMI clicker'); // squishy + clicker: their choice
  assert.equal(freeGift({ experience: 'both', clicker: 4 }, { source: 'wcc' }).item, 'jelly');
  assert.ok(freeGift({ experience: 'both', clicker: 4 }, { source: 'wcc' }).choice);
  assert.deepEqual(giftOptions({ experience: 'crunchy' }), ['jelly']);
  const g = buildMessage({ ref: 'SP-G', plan: v.plan, contact: v.contact, price, gift: freeGift(v.plan, { source: 'plq' }) });
  assert.ok(g.includes('Free gift: 1 free Jelly squishy') && g.includes('PLQ store QR') && !g.includes('$10'));
});
t('after-party message has care tips, the feedback link with their reference, and the party link (/gift)', () => {
  const m = afterPartyMessage({ ref: 'SP-261107-AB12', contact: v.contact, site: 'https://example.sg' });
  for (const x of ['https://example.sg/#care', 'https://example.sg/feedback.html?ref=SP-261107-AB12', 'https://example.sg/gift', 'free squishy']) assert.ok(m.includes(x), x);
  assert.ok(!m.includes('$10'));
});
t('feedback: 1-5 stars only, unknown references dropped, photo must be a JPEG', () => {
  assert.throws(() => validateFeedback({ rating: 6 }), (e) => e.field === 'rating');
  assert.equal(validateFeedback({ rating: 5, ref: 'not-a-ref' }).ref, '');
  assert.throws(() => validateFeedback({ rating: 5, photo: 'data:text/html;base64,AAAA' }), (e) => e.field === 'photo');
  assert.equal(validateFeedback({ rating: 4, photo: 'data:image/jpeg;base64,AAAA' }).photo, 'AAAA');
});
t('status links are signed: changing the reference or status breaks them', () => {
  const u = new URL(statusLink('https://example.sg', 'SP-261107-AB12', 'contacted')), tok = u.searchParams.get('t');
  assert.ok(checkStatusToken('SP-261107-AB12', 'contacted', tok));
  assert.ok(!checkStatusToken('SP-261107-AB13', 'contacted', tok) && !checkStatusToken('SP-261107-AB12', 'confirmed', tok) && !checkStatusToken('SP-261107-AB12', 'contacted', ''));
});
t('security headers: HSTS, no plugins, no framing, private pages not indexed', () => {
  const v = JSON.parse(nodeFs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')), all = JSON.stringify(v.headers);
  for (const x of ['Strict-Transport-Security', "object-src 'none'", "frame-ancestors 'none'", 'X-Content-Type-Options', '/(admin|feedback|change).html']) assert.ok(all.includes(x), x);
});
t('the daily bump runs at 9am Singapore time', () => { const v = JSON.parse(nodeFs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')); assert.deepEqual(v.crons, [{ path: '/api/digest', schedule: '0 1 * * *' }]); });
t('quotation package line costs exactly the same as the itemised breakdown', () => {
  const zlib = nodeZlib, text = (buf) => { const s = buf.toString('latin1'); return [...s.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => { try { return zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch { return ''; } }).join(''); };
  const q = { ref: 'SP-1', issued: new Date('2026-10-27'), plan: v.plan, contact: { ...v.contact, companyName: 'Acme' }, price, discountCents: 0, contactEmail: 'x@example.com', site: 'https://e.sg' };
  const pkg = text(quotePdf({ ...q, bookingFor: 'company' })), det = text(quotePdf({ ...q, bookingFor: 'company', detailed: true })), fam = text(quotePdf({ ...q, bookingFor: 'family', contact: v.contact }));
  const total = 'S$' + (price.totalCents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2 });
  assert.ok(pkg.includes('Corporate Team Bonding Workshop Package') && pkg.includes(total));
  assert.ok(det.includes('Squishy DIY') && !det.includes('Workshop Package') && det.includes(total));
  assert.ok(fam.includes('Birthday Party Activity Package') && fam.includes(total));
});
t('a revision keeps the quoted unit prices for items already on the booking', () => {
  const p = { participants: 15, experience: 'both', wax: false, addons: [] }, rates = ratesOf(p);
  rates.exp.both = 2000; // as if the Duo was $20 when quoted
  assert.equal(priceRequest({ ...p, participants: 20 }, rates).squishy[0].cents, 2000 * 20);
  assert.equal(priceRequest({ ...p, participants: 20, experience: 'jelly' }, rates).squishy[0].cents, 1600 * 20); // a new choice uses today's price
});
t('scorecard: paid parties, revenue, contribution, CAC by touchpoint and ROI follow the slide formulas', () => {
  const at = (d) => d + 'T02:00:00.000Z', L = (squishy, addons) => ({ squishyCents: squishy, addons });
  const books = [
    // capsule family, 10 kids, $300 squishy + $100 partner cake, $10 off, paid in full
    { ref: 'A', at: at('2026-10-05'), date: '2026-10-10', participants: 10, totalCents: 40000, discountCents: 1000, via: 'capsule', source: 'capsule', lines: L(30000, [{ vendor: 'Butter Studio', cents: 10000 }]) },
    // friend of A's family, 10 kids, $300, $10 off, deposit only
    { ref: 'B', at: at('2026-10-12'), date: '2026-11-20', participants: 10, totalCents: 30000, discountCents: 1000, via: 'friend', code: 'ANN-AB12', lines: L(30000, []) },
    // returning company, direct, deposit
    { ref: 'C', at: at('2026-10-13'), date: '2026-11-25', participants: 20, totalCents: 60000, via: '', source: '', companyName: 'Acme', yearly: true, returning: ['OLD'], lines: L(60000, []) },
    // request that didn't book
    { ref: 'D', at: at('2026-10-14'), date: '2026-11-30', participants: 8, totalCents: 24000, via: '', source: 'instagram', lines: L(24000, []) },
  ];
  const life = { A: { confirmed: 'x', paid: 'x' }, B: { confirmed: 'x' }, C: { confirmed: 'x' }, D: { lost: 'x' } };
  const settings = Score.cleanSettings({ pilotStart: '2026-10-01', pilotEnd: '2026-10-21', targetParties: 4, kitCents: 500, staffCents: 5000, partnerCostPct: 80, rewardCents: 600, capsulePrintCents: 2000, adSpendCents: 3000, junk: 'x', staffCentsx: 1 });
  assert.equal(settings.junk, undefined);
  const days = { '2026-10-05': { capsule_scan: 30, visit_direct: 10 }, '2026-10-12': { link_open: 4, visit_instagram: 6 } };
  const s = Score.buildScorecard({ books, life, codes: { 'ANN-AB12': { ref: 'A' } }, rewards: [{ friendRef: 'B', status: 'owed', at: at('2026-10-12') }], days, settings, today: '2026-10-28' });
  assert.deepEqual([s.window.from, s.window.to, s.window.days, s.weeks.length], ['2026-10-01', '2026-10-21', 21, 3]);
  assert.equal(s.kpis.paidParties, 3); assert.equal(s.kpis.newCustomers, 2); // C is a returning client
  assert.equal(s.kpis.avgRevenueCents, Math.round((40000 + 30000 + 60000) / 3));
  // A: 40000 − 10×500 − 5000 − 80% of 10000 − 1000 = 21000; B: 30000 − 5000 − 5000 − 1000 − 600 = 18400; C: 60000 − 10000 − 5000 = 45000
  assert.equal(s.money.contributionCents, 21000 + 18400 + 45000);
  const cap = s.touch.find((t) => t.key === 'capsule'), fr = s.touch.find((t) => t.key === 'friend'), so = s.touch.find((t) => t.key === 'organic');
  assert.deepEqual(s.touch.map((t) => t.key), ['outlet', 'capsule', 'organic', 'friend']); // always the four pilot touchpoints
  assert.deepEqual([cap.visits, cap.paid, cap.newCustomers, cap.costCents, cap.cacCents], [30, 1, 1, 2000 + 1000, 3000]);
  assert.deepEqual([fr.visits, fr.costCents, fr.cacCents], [4, 1000 + 600, 1600]);
  assert.deepEqual([so.visits, so.requests, so.paid, so.newCustomers, so.costCents, so.cacCents], [16, 2, 1, 0, 3000, null]); // search/social/direct: C (returning) paid, D didn't
  assert.deepEqual(s.kpis.bestCac, { touch: 'Party poster / after-party link', cents: 1600 });
  // Gross profit (before marketing costs): A 22000 + B 20000 + C 45000 = 87000; programme = 2000+3000 + 2000 discounts + 600 reward = 7600
  assert.equal(s.money.programmeCents, 7600); assert.equal(s.kpis.roiPct, Math.round((87000 - 7600) / 7600 * 100));
  assert.equal(s.kpis.blendedCacCents, 3800); assert.equal(s.kpis.ltvCents, 29000); assert.equal(s.kpis.ltvCac, 7.6); // 29000 ÷ 3800
  assert.equal(s.kpis.kFactor, 0.5); // 1 friend's paid party ÷ 2 other paid parties
  assert.deepEqual(s.referral.dropoff.map((d) => d.n), [1, 4, 1, 1]); assert.equal(s.referral.dropoff[1].perFamily, 4); assert.equal(s.referral.dropoff[2].ratePct, 25);
  assert.deepEqual(s.funnel.map((f) => f.n), [50, 4, 3, 1, 1]); assert.equal(s.funnel[2].ratePct, 75);
  assert.deepEqual([s.referral.completed, s.referral.withFriend, s.referral.ratePct], [1, 1, 100]); // A's family brought B
  assert.deepEqual([s.company.bookings, s.company.yearlyPct, s.company.rebookPct], [1, 100, 100]);
  assert.deepEqual(s.weeks.map((w) => w.paid), [1, 2, 0]);
  // Without kit and staff costs, contribution and ROI aren't guessed
  const bare = Score.buildScorecard({ books, life, codes: {}, rewards: [], days: {}, settings: {}, today: '2026-10-28' });
  assert.ok(!bare.costsSet && bare.kpis.contributionPerPartyCents === null && bare.kpis.roiPct === null && bare.window.from === '2026-09-17');
});
t('scorecard targets: plan defaults until changed, markers on/close/off, and a CAC ceiling worked out from gross profit', () => {
  assert.deepEqual([Score.statusOf(2.5, 2, 'ge'), Score.statusOf(1.7, 2, 'ge'), Score.statusOf(1, 2, 'ge'), Score.statusOf(null, 2, 'ge')], ['ok', 'close', 'off', null]);
  assert.deepEqual([Score.statusOf(70, 80, 'le'), Score.statusOf(90, 80, 'le'), Score.statusOf(120, 80, 'le')], ['ok', 'close', 'off']);
  const T = Score.targetsOf({ targetParties: 5 });
  assert.equal(T.targetParties, 5); assert.equal(T.targetAvgRev, 400); assert.equal(T.targetLtvCac, 3); assert.equal(T.targetK, 0.2);
  assert.deepEqual(Score.cleanSettings({ targetK: '0.25', targetAvgRev: 'x', targetMarginPct: 150 }), { targetK: 0.25 }); // decimals allowed, bad values dropped
  const at = (d) => d + 'T02:00:00.000Z';
  const books = [{ ref: 'A', at: at('2026-10-05'), date: '2026-10-10', participants: 10, totalCents: 33000, via: '', source: 'outlet', lines: { squishyCents: 33000, addons: [] } }];
  const settings = { pilotStart: '2026-10-01', pilotEnd: '2026-11-11', kitCents: 450, staffCents: 6000, outletPrintCents: 3000 };
  const s = Score.buildScorecard({ books, life: { A: { confirmed: 'x' } }, codes: {}, rewards: [], days: { '2026-10-05': { visit_outlet: 40 } }, settings, today: '2026-10-28' });
  // gross profit 33000 − 4500 − 6000 = 22500; CAC ceiling = 22500 ÷ 3 = 7500; actual CAC 3000 → on target
  assert.deepEqual(s.cacCeiling, { cents: 7500, fromActual: true, grossProfitCents: 22500 });
  assert.equal(s.checks.cac.status, 'ok'); assert.equal(s.touch.find((t) => t.key === 'outlet').cacStatus, 'ok');
  assert.equal(s.checks.targetAvgRev.status, 'close'); // $330 against $400 is within 20%
  assert.equal(s.checks.targetVisitReqPct.status, 'ok'); // 1 request from 40 visits = 3% ≥ 2%
  assert.equal(s.checks.targetParties.status, 'off'); // 1 of 3
  assert.equal(s.checks.targetK.status, 'off'); // no friend's party yet: K is 0
  assert.equal(s.checks.targetRedeemPct.status, null); // no vouchers sent yet: no verdict
  assert.ok(Score.pilotLocked(settings, '2026-10-28') && !Score.pilotLocked(settings, '2026-11-12') && !Score.pilotLocked({}, '2026-10-28'));
  // before any costs, the ceiling comes from the plan: $400 × 60% ÷ 3 = $80
  assert.deepEqual(Score.buildScorecard({ books: [], life: {}, codes: {}, rewards: [], days: {}, settings: {}, today: '2026-10-28' }).cacCeiling, { cents: 8000, fromActual: false, grossProfitCents: 24000 });
});
t('companies get a “book again?” reminder about 10 weeks before the anniversary of their event; families don’t', () => {
  const today = '2027-09-01', life = { contacted: 'x', confirmed: 'x', paid: 'x' };
  const co = { companyName: 'Acme', date: '2026-10-20', vendors: [] }, fam = { companyName: '', date: '2026-10-20', vendors: [] };
  assert.ok(Stats.todosFor(co, life, today).some((t) => t.startsWith('Ask Acme about booking again')));
  assert.ok(!Stats.todosFor(fam, life, today).some((t) => t.includes('booking again')));
  assert.ok(!Stats.todosFor({ ...co, date: '2026-12-31' }, life, today).some((t) => t.includes('booking again'))); // too early
  assert.ok(!Stats.todosFor(co, { ...life, rebook: 'x' }, today).some((t) => t.includes('booking again'))); // already asked
});
t('WhatsApp link goes to the customer with a greeting', () => { const u = whatsappLink(v.contact.phone, customerGreeting({ ref: 'SP-1', plan: v.plan, contact: v.contact })); assert.ok(u.startsWith('https://wa.me/6581234567?text=Hi%20Sarah')); });
t('fits in one Telegram message', () => assert.ok(msg.length < 4096));

console.log('personalisation (Bloom backdrops)');
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
const withCustom = (addons, custom) => { const g = dateOK(); g.plan.addons = addons; g.plan.custom = custom; return g; };
t('colours, vinyl text, notes and moodboard images are accepted for a backdrop in the plan', () => {
  const v2 = validateRequest(withCustom(['bl-fabric-std'], { 'bl-fabric-std': { colours: ['Pink', 'Sage', 'Pink'], text: 'Mia turns 7', notes: 'pastel <b>rainbow</b>', images: [JPG] } }));
  assert.deepEqual(v2.plan.custom['bl-fabric-std'], { colours: ['Pink', 'Sage'], text: 'Mia turns 7', notes: 'pastel <b>rainbow</b>', images: 1 });
  assert.equal(v2.images.length, 1); assert.equal(v2.images[0].mime, 'image/jpeg');
  const m2 = buildMessage({ ref: 'SP-1', plan: v2.plan, contact: v2.contact, price: priceRequest(v2.plan), clientTotalCents: null });
  for (const s of ['🎨 Colours: Pink, Sage', 'Vinyl text: “Mia turns 7”', 'Inspiration: pastel &lt;b&gt;rainbow&lt;/b&gt;', '1 moodboard image below']) assert.ok(m2.includes(s), s);
});
t('personalisation is refused for items not in the plan, or that don’t take it', () => {
  assert.throws(() => validateRequest(withCustom([], { 'bl-fabric-std': { text: 'x' } })), (e) => e.field === 'custom');
  assert.throws(() => validateRequest(withCustom(['s-favours'], { 's-favours': { text: 'x' } })), (e) => e.field === 'custom');
  const tw = validateRequest(withCustom(['bl-twin-15'], { 'bl-twin-15': { text: 'Happy 7th', notes: 'ignored', images: [JPG] } }));
  assert.deepEqual(tw.plan.custom['bl-twin-15'], { text: 'Happy 7th' }); assert.equal(tw.images.length, 0); // towers take colours and text only
});
t('moodboard images must be small JPEG/PNG, at most 3 per item', () => {
  assert.throws(() => validateRequest(withCustom(['bl-fabric-std'], { 'bl-fabric-std': { images: ['data:text/html;base64,PHNjcmlwdD4='] } })), (e) => e.field === 'custom');
  assert.throws(() => validateRequest(withCustom(['bl-fabric-std'], { 'bl-fabric-std': { images: [JPG, JPG, JPG, JPG] } })), (e) => e.field === 'custom');
  assert.throws(() => validateRequest(withCustom(['bl-fabric-std'], { 'bl-fabric-std': { images: ['data:image/jpeg;base64,' + 'A'.repeat(470000)] } })), (e) => e.field === 'custom');
});
console.log('old friend links (codes still recognised, no database)');
{
  const { makeReferralCode, readReferralCode, samePerson } = await import('../lib/referral.js');
  const code = makeReferralCode('Mia Tan');
  t('codes look like MIA-K7Q2 and check out as ours', () => { assert.match(code, /^MIA-[A-Z2-9]{4}$/); assert.ok(readReferralCode(code.toLowerCase()).valid); });
  t('a made-up or mistyped code is flagged', () => { const bad = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A'); assert.ok(!readReferralCode(bad).valid); assert.ok(!readReferralCode('HELLO').valid); });
  t('same first name as the code is flagged as a possible self-referral', () => { assert.ok(samePerson(readReferralCode(code), 'mia lim')); assert.ok(!samePerson(readReferralCode(code), 'Sarah')); });
  const g = dateOK(); g.referral = { code, source: 'capsule', returning: true }; const vr = validateRequest(g);
  const m = buildMessage({ ref: 'SP-1', plan: vr.plan, contact: vr.contact, price: priceRequest(vr.plan), clientTotalCents: null, referral: vr.referral, gift: freeGift(vr.plan, vr.referral, true) });
  t('Telegram shows the free gift, the old friend link, source and returning flag; no personal link to share', () => { assert.match(m, /Free gift: 1 free Jelly squishy/); assert.match(m, /old friend link/); assert.match(m, /capsule QR sticker/); assert.match(m, /booked with us before/); assert.ok(!m.includes('?ref=')); });
  t('capsule QR scans get the free gift in Telegram, with the "Made by" name', () => {
    const c = dateOK(); c.referral = { source: 'capsule', sticker: 'Mia' }; const vc = validateRequest(c);
    const mc = buildMessage({ ref: 'SP-2', plan: vc.plan, contact: vc.contact, price: priceRequest(vc.plan), clientTotalCents: null, referral: vc.referral, gift: freeGift(vc.plan, vc.referral) });
    assert.match(mc, /Free gift: 1 free Jelly squishy<\/b> \(via the capsule QR sticker\)/); assert.match(mc, /Made by: Mia/);
  });
  const fs = await import('node:fs');
  t('the store and party short links open the offer', () => { const r = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).redirects; for (const [p, s] of [['/gift', 'event'], ['/wcc', 'wcc'], ['/plq', 'plq'], ['/epm', 'epm']]) assert.ok(r.some((x) => x.source === p && x.destination === `/?src=${s}#offer`), p); });
  t('the sticker short link /c is counted, then opens the capsule offer', () => { const r = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites; assert.ok(r.some((x) => x.source === '/c' && x.destination === '/api/scan')); assert.ok(fs.readFileSync(new URL('../api/scan.js', import.meta.url), 'utf8').includes("'/?src=capsule#offer'")); });
  t('a bad source value is dropped', () => { const b = dateOK(); b.referral = { source: '<script>' }; assert.equal(validateRequest(b).referral.source, ''); });
}

console.log(`\n${passed} unit tests passed`);
