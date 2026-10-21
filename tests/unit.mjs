// Unit tests for server pricing, validation and the Telegram message.
import assert from 'node:assert/strict';
import { priceRequest } from '../lib/pricing.js';
import { validateRequest, RequestError } from '../lib/validate.js';
import { buildMessage, whatsappLink, customerGreeting } from '../lib/telegram.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ✓', name); };
const plan = (o = {}) => ({ children: 10, adults: 8, experience: 'both', wax: false, addons: [], ...o });

console.log('pricing');
t('Duo, 10 children = $280 + $150 travel = $430', () => assert.equal(priceRequest(plan()).totalCents, 43000));
t('Duo + wax duo deal = $480 ($50 for 20 squishies)', () => assert.equal(priceRequest(plan({ wax: true })).totalCents, 48000));
t('Jelly, 10 children = $330; + wax $20 = $350', () => { assert.equal(priceRequest(plan({ experience: 'jelly' })).totalCents, 33000); assert.equal(priceRequest(plan({ experience: 'jelly', wax: true })).totalCents, 35000); });
t('Crunchy, 10 children = $350', () => assert.equal(priceRequest(plan({ experience: 'crunchy' })).totalCents, 35000));
t('Minimum 10: 6 children priced as 10', () => { const p = priceRequest(plan({ children: 6 })); assert.equal(p.billableChildren, 10); assert.equal(p.totalCents, 43000); });
t('Deposit is 50% of the Squishy Party total', () => assert.equal(priceRequest(plan({ wax: true })).depositCents, 24000));
t('Per-child add-on is charged per child (favour bags, 10 × $6)', () => { const p = priceRequest(plan({ addons: ['s-favours'] })); assert.equal(p.addons[0].quantity, 10); assert.equal(p.addons[0].cents, 6000); });
t('Removed vendors are no longer accepted', () => { assert.throws(() => priceRequest(plan({ addons: ['f-bento'] }))); });
t('Cakes are on quote, never counted as $0', () => { const p = priceRequest(plan({ addons: ['bs-custom'] })); assert.equal(p.addons[0].cents, null); assert.equal(p.onQuote.length, 1); assert.equal(p.totalCents, 43000); });

console.log('validation');
const good = () => ({ v: 1, plan: { ...plan(), date: '2099-01-01', start: '14:00', end: '16:00', budgetCents: 120000 }, contact: { parentName: 'Sarah Tan', phone: '8123 4567', email: 'sarah@example.com', venueName: 'Condo function room', address: '1 Example Road', postalCode: '123456', notes: '' }, consent: true, website: '' });
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
t('rejects children outside 1–60', () => bad((g) => { g.plan.children = 0; }, 'children'));

console.log('telegram message');
const v = validateRequest({ ...dateOK(), plan: { ...dateOK().plan, wax: true, addons: ['bs-custom', 's-favours', 'e-face'] }, contact: { ...dateOK().contact, notes: 'Lift <b>B</b>, level 2' } });
const price = priceRequest(v.plan);
const msg = buildMessage({ ref: 'SP-TEST-0001', plan: v.plan, contact: v.contact, price, clientTotalCents: 1 });
t('includes contact, date, venue, address, postal', () => { for (const s of ['Sarah Tan', '+65 8123 4567', 'sarah@example.com', 'Condo function room', '1 Example Road, Singapore 123456', '2:00 pm–4:00 pm']) assert.ok(msg.includes(s), s); });
t('lists squishy lines, deposit and every add-on', () => { for (const s of ['Duo: Jelly + Crunchy', 'Wax Cracking duo deal', 'travel', '50% deposit', 'Custom cake', 'Butter Studio', 'on quote', 'Party favour bags ×10', 'Face painting']) assert.ok(msg.includes(s), s); });
t('escapes HTML in customer text', () => assert.ok(msg.includes('Lift &lt;b&gt;B&lt;/b&gt;, level 2')));
t('flags when the page total differs from the server total', () => assert.ok(msg.includes('server price above is the one to quote')));
t('WhatsApp link goes to the customer with a greeting', () => { const u = whatsappLink(v.contact.phone, customerGreeting({ ref: 'SP-1', plan: v.plan, contact: v.contact })); assert.ok(u.startsWith('https://wa.me/6581234567?text=Hi%20Sarah')); });
t('fits in one Telegram message', () => assert.ok(msg.length < 4096));

console.log(`\n${passed} unit tests passed`);
