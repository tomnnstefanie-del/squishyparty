// Unit tests for server pricing, validation and the Telegram message.
import assert from 'node:assert/strict';
import { priceRequest } from '../lib/pricing.js';
import { validateRequest, RequestError } from '../lib/validate.js';
import { buildMessage, whatsappLink, customerGreeting, afterPartyMessage } from '../lib/telegram.js';
process.env.TELEGRAM_BOT_TOKEN = 'unit:token';
const otp = await import('../lib/otp.js');
const { confirmationEmail } = await import('../lib/emails.js');
const { quotePdf, referralDiscount } = await import('../lib/quote-pdf.js');
const { validateFeedback } = await import('../lib/feedback.js');
const Ref = await import('../lib/referral.js');
const { statusLink, checkStatusToken } = await import('../lib/status-link.js');
const nodeFs = await import('node:fs');
const nodeZlib = await import('node:zlib');

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ✓', name); };
const plan = (o = {}) => ({ participants: 10, experience: 'both', wax: false, addons: [], ...o });

console.log('pricing');
t('Duo, 10 participants = $280 + $150 travel = $430', () => assert.equal(priceRequest(plan()).totalCents, 43000));
t('Duo + wax duo deal = $480 ($50 for 20 squishies)', () => assert.equal(priceRequest(plan({ wax: true })).totalCents, 48000));
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
const v = validateRequest({ ...dateOK(), plan: { ...dateOK().plan, wax: true, addons: ['bs-custom', 's-favours', 'pp-face-2'] }, contact: { ...dateOK().contact, notes: 'Lift <b>B</b>, level 2' } });
const price = priceRequest(v.plan);
const msg = buildMessage({ ref: 'SP-TEST-0001', plan: v.plan, contact: v.contact, price, clientTotalCents: 1 });
t('includes contact, date, venue, address, postal', () => { for (const s of ['Sarah Tan', '+65 8123 4567', 'sarah@example.com', 'Condo function room', '1 Example Road, Singapore 123456', '2:00 pm–4:00 pm']) assert.ok(msg.includes(s), s); });
t('lists participants, squishy lines and every add-on, with no deposit or budget', () => { assert.ok(!/deposit|budget|PayNow/i.test(msg)); for (const s of ['10 participants', 'Duo: Jelly + Crunchy', 'Wax Cracking duo deal', 'travel', 'Custom cake', 'Butter Studio', 'on quote', 'Party favour bags ×10', 'Face painting']) assert.ok(msg.includes(s), s); });
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
  const e = confirmationEmail({ ref: 'SP-2', plan: v.plan, contact: v.contact, price, quote: { pdf: Buffer.from('%PDF-1.4'), filename: 'Confetti-Club-Quotation-Q-SP-2.pdf', totalCents: price.totalCents - 1000, discountCents: 1000 } });
  assert.equal(e.subject, 'Your Confetti Club Quotation | Q-SP-2');
  assert.equal(e.attachments.length, 1); assert.equal(e.attachments[0].contentType, 'application/pdf');
  for (const s of ['itemised PDF quotation is attached', 'not yet confirmed', 'Confetti Club', 'with your $10 friend referral']) assert.ok((e.text + e.html).includes(s), s);
});
t('$10 referral on the quotation: valid code or capsule, not their own, first party only', () => {
  const { makeReferralCode, readReferralCode, samePerson } = Ref; const code = makeReferralCode('Mia Tan');
  assert.equal(referralDiscount({ code }, readReferralCode, samePerson, 'Sarah Lim'), 1000);
  assert.equal(referralDiscount({ code }, readReferralCode, samePerson, 'Mia Lee'), 0); // same first name: the team checks
  assert.equal(referralDiscount({ code, returning: true }, readReferralCode, samePerson, 'Sarah Lim'), 0);
  assert.equal(referralDiscount({ code: 'MIA-ZZZZ' }, readReferralCode, samePerson, 'Sarah Lim'), 0);
  assert.equal(referralDiscount({ source: 'capsule' }, readReferralCode, samePerson, 'Sarah Lim'), 1000);
  assert.equal(referralDiscount({}, readReferralCode, samePerson, 'Sarah Lim'), 0);
});
t('after-party message has care tips, the feedback link with their reference, and their referral link', () => {
  const m = afterPartyMessage({ ref: 'SP-261107-AB12', contact: v.contact, shareCode: 'SARAH-AB23', site: 'https://example.sg' });
  for (const x of ['https://example.sg/#care', 'https://example.sg/feedback.html?ref=SP-261107-AB12', '?ref=SARAH-AB23']) assert.ok(m.includes(x), x);
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
  for (const x of ['Strict-Transport-Security', "object-src 'none'", "frame-ancestors 'none'", 'X-Content-Type-Options', '/(admin|feedback).html']) assert.ok(all.includes(x), x);
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
console.log('referrals (friend gets $10 off, no database)');
{
  const { makeReferralCode, readReferralCode, samePerson } = await import('../lib/referral.js');
  const code = makeReferralCode('Mia Tan');
  t('codes look like MIA-K7Q2 and check out as ours', () => { assert.match(code, /^MIA-[A-Z2-9]{4}$/); assert.ok(readReferralCode(code.toLowerCase()).valid); });
  t('a made-up or mistyped code is flagged', () => { const bad = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A'); assert.ok(!readReferralCode(bad).valid); assert.ok(!readReferralCode('HELLO').valid); });
  t('same first name as the code is flagged as a possible self-referral', () => { assert.ok(samePerson(readReferralCode(code), 'mia lim')); assert.ok(!samePerson(readReferralCode(code), 'Sarah')); });
  const g = dateOK(); g.referral = { code, source: 'capsule', returning: true }; const vr = validateRequest(g);
  const m = buildMessage({ ref: 'SP-1', plan: vr.plan, contact: vr.contact, price: priceRequest(vr.plan), clientTotalCents: null, referral: vr.referral, shareCode: 'SARAH-AB23', site: 'https://example.sg' });
  t('Telegram shows the referral, source, returning flag and their own link to share', () => { assert.match(m, /Referred by a friend/); assert.match(m, /capsule QR sticker/); assert.match(m, /booked with us before/); assert.match(m, /https:\/\/example\.sg\/\?ref=SARAH-AB23/); });
  t('capsule QR scans get the $10 offer in Telegram, with the "Made by" name', () => {
    const c = dateOK(); c.referral = { source: 'capsule', sticker: 'Mia' }; const vc = validateRequest(c);
    const mc = buildMessage({ ref: 'SP-2', plan: vc.plan, contact: vc.contact, price: priceRequest(vc.plan), clientTotalCents: null, referral: vc.referral, shareCode: 'X-AB23', site: 'https://example.sg' });
    assert.match(mc, /Capsule QR offer<\/b>: \$10 off their first hosted party/); assert.match(mc, /Made by: Mia/);
  });
  const fs = await import('node:fs');
  t('the sticker short link /c is counted, then opens the capsule offer', () => { const r = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites; assert.ok(r.some((x) => x.source === '/c' && x.destination === '/api/scan')); assert.ok(fs.readFileSync(new URL('../api/scan.js', import.meta.url), 'utf8').includes("'/?src=capsule#offer'")); });
  t('a bad source value is dropped', () => { const b = dateOK(); b.referral = { source: '<script>' }; assert.equal(validateRequest(b).referral.source, ''); });
}

console.log(`\n${passed} unit tests passed`);
