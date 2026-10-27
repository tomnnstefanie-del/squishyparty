// Writes a sample PDF quotation to dev/sample-quote.pdf, to check the layout: node dev/sample-quote.mjs
import fs from 'node:fs';
import { priceRequest } from '../lib/pricing.js';
import { quotePdf } from '../lib/quote-pdf.js';
import { CATALOGUE } from '../lib/catalogue.js';
const addons = CATALOGUE.P.filter((p) => p.status !== 'hidden').slice(0, 4).map((p) => p.id);
const plan = { participants: 15, experience: 'both', wax: true, addons, date: '2026-11-07', start: '14:00', end: '16:00' };
const pdf = quotePdf({
  ref: 'SP-261107-CC58', issued: new Date(), plan, price: priceRequest(plan), bookingFor: 'company', discountCents: 1000,
  contact: { parentName: 'Stefanie Chua', companyName: 'Temasek Polytechnic', companyUen: 'T08GB0046G', email: 'stefanie@example.com', billingEmail: 'finance@example.com', phone: '6592979765', venueName: 'Block 1A, Function Room 2', address: '21 Tampines Avenue 1', postalCode: '529757' },
  contactEmail: 'hello@example.com', site: 'https://squishyparty.vercel.app',
});
fs.writeFileSync(new URL('./sample-quote.pdf', import.meta.url), pdf);
console.log('dev/sample-quote.pdf', pdf.length, 'bytes');
