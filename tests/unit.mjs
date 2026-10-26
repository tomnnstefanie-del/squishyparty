// Unit tests for server pricing, validation and the Telegram message.
import assert from 'node:assert/strict';
import { priceRequest } from '../lib/pricing.js';
import { validateRequest, RequestError } from '../lib/validate.js';
import { buildMessage, whatsappLink, customerGreeting } from '../lib/telegram.js';
process.env.TELEGRAM_BOT_TOKEN = 'unit:token';
const otp = await import('../lib/otp.js');
const { confirmationEmail } = await import('../lib/emails.js');

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
  t('robots.txt allows search engines and points at the sitemap', () => { const r = fs.readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'); assert.match(r, /Allow: \//); assert.match(r, /Sitemap: /); assert.ok(!JSON.stringify(JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))).includes('noindex')); });
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
t('accepts a good request and normalises the phone', () => assert.equal(validateRequest(dateOK()).contact.phone, '81234567'));
t('accepts +65 prefix', () => { const g = dateOK(); g.contact.phone = '+65 9123 4567'; assert.equal(validateRequest(g).contact.phone, '91234567'); });
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
const v = validateRequest({ ...dateOK(), plan: { ...dateOK().plan, wax: true, addons: ['bs-custom', 's-favours', 'e-face'] }, contact: { ...dateOK().contact, notes: 'Lift <b>B</b>, level 2' } });
const price = priceRequest(v.plan);
const msg = buildMessage({ ref: 'SP-TEST-0001', plan: v.plan, contact: v.contact, price, clientTotalCents: 1 });
t('includes contact, date, venue, address, postal', () => { for (const s of ['Sarah Tan', '+65 8123 4567', 'sarah@example.com', 'Condo function room', '1 Example Road, Singapore 123456', '2:00 pm–4:00 pm']) assert.ok(msg.includes(s), s); });
t('lists participants, squishy lines and every add-on, with no deposit or budget', () => { assert.ok(!/deposit|budget|PayNow/i.test(msg)); for (const s of ['10 participants', 'Duo: Jelly + Crunchy', 'Wax Cracking duo deal', 'travel', 'Custom cake', 'Butter Studio', 'on quote', 'Party favour bags ×10', 'Face painting']) assert.ok(msg.includes(s), s); });
t('escapes HTML in customer text', () => assert.ok(msg.includes('Lift &lt;b&gt;B&lt;/b&gt;, level 2')));
t('flags when the page total differs from the server total', () => assert.ok(msg.includes('server price above is the one to quote')));
t('confirmation email says it’s being verified and we’ll WhatsApp them', () => {
  const e = confirmationEmail({ ref: 'SP-TEST-0001', plan: v.plan, contact: v.contact, price });
  for (const s of ['SP-TEST-0001', 'currently being verified by our team', 'WhatsApp', '+65 8123 4567', 'Participants: 10', 'Nothing to pay now', 'one quotation', '15 minutes before']) assert.ok(e.text.includes(s), s);
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
  assert.ok(m.includes('Acme Pte Ltd') && m.includes('Invoice to finance@acme.sg') && m.includes('send a quotation and invoice')); assert.ok(!m.includes('holding deposit'));
  const e = confirmationEmail({ ref: 'SP-1', plan: c.plan, contact: c.contact, price: pr });
  assert.ok(e.text.includes('nothing to pay now') && e.text.includes('finance@acme.sg') && e.text.includes('same as shown')); assert.ok(!e.text.includes('holding deposit'));
  assert.equal(validateRequest(dateOK()).bookingFor, 'family');
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
console.log('referrals (friend gets $20 off, no database)');
{
  const { makeReferralCode, readReferralCode, samePerson } = await import('../lib/referral.js');
  const code = makeReferralCode('Mia Tan');
  t('codes look like MIA-K7Q2 and check out as ours', () => { assert.match(code, /^MIA-[A-Z2-9]{4}$/); assert.ok(readReferralCode(code.toLowerCase()).valid); });
  t('a made-up or mistyped code is flagged', () => { const bad = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A'); assert.ok(!readReferralCode(bad).valid); assert.ok(!readReferralCode('HELLO').valid); });
  t('same first name as the code is flagged as a possible self-referral', () => { assert.ok(samePerson(readReferralCode(code), 'mia lim')); assert.ok(!samePerson(readReferralCode(code), 'Sarah')); });
  const g = dateOK(); g.referral = { code, source: 'capsule', returning: true }; const vr = validateRequest(g);
  const m = buildMessage({ ref: 'SP-1', plan: vr.plan, contact: vr.contact, price: priceRequest(vr.plan), clientTotalCents: null, referral: vr.referral, shareCode: 'SARAH-AB23', site: 'https://example.sg' });
  t('Telegram shows the referral, source, returning flag and their own link to share', () => { assert.match(m, /Referred by a friend/); assert.match(m, /capsule QR sticker/); assert.match(m, /booked with us before/); assert.match(m, /https:\/\/example\.sg\/\?ref=SARAH-AB23/); });
  t('a bad source value is dropped', () => { const b = dateOK(); b.referral = { source: '<script>' }; assert.equal(validateRequest(b).referral.source, ''); });
}

console.log(`\n${passed} unit tests passed`);
