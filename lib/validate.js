// Strict validation for incoming party requests. Anything unexpected is rejected with a parent-friendly message.
import { EXPERIENCES, isKnownAddon } from './pricing.js';

const clean = (v, max) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control characters (keep \n and \t)
  .trim()
  .slice(0, max);

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const SG_MOBILE = /^[689]\d{7}$/;
const POSTAL = /^\d{6}$/;
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function todaySG() {
  // YYYY-MM-DD in Singapore time
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export class RequestError extends Error {
  constructor(message, field) { super(message); this.name = 'RequestError'; this.field = field; }
}

export function validateRequest(body) {
  if (!body || typeof body !== 'object' || body.v !== 1) throw new RequestError('Please refresh the page and try again.');
  const p = body.plan || {}, c = body.contact || {};

  if (!isInt(p.children, 1, 60)) throw new RequestError('Please check the number of children (1–60).', 'children');
  if (!isInt(p.adults, 0, 80)) throw new RequestError('Please check the number of adults (0–80).', 'adults');
  if (!EXPERIENCES.includes(p.experience)) throw new RequestError('Please choose Jelly, Crunchy or Duo.', 'experience');
  if (typeof p.wax !== 'boolean') throw new RequestError('Please refresh the page and try again.', 'wax');
  if (!Array.isArray(p.addons) || p.addons.length > 25) throw new RequestError('Please check your add-ons.', 'addons');
  const addons = [...new Set(p.addons.map(String))];
  if (!addons.every(isKnownAddon)) throw new RequestError('One of your add-ons is no longer available. Please refresh the page.', 'addons');

  if (typeof p.date !== 'string' || !DATE.test(p.date) || Number.isNaN(Date.parse(p.date + 'T00:00:00Z'))) throw new RequestError('Please choose a party date.', 'date');
  const today = todaySG();
  if (p.date < today) throw new RequestError('Please choose a date in the future.', 'date');
  const max = new Date(); max.setUTCMonth(max.getUTCMonth() + 18);
  if (p.date > max.toISOString().slice(0, 10)) throw new RequestError('We take requests up to 18 months ahead.', 'date');
  if (!TIME.test(p.start || '') || !TIME.test(p.end || '') || mins(p.end) <= mins(p.start)) throw new RequestError('Please check the party start and end times.', 'time');
  if (p.budgetCents != null && !isInt(p.budgetCents, 0, 100_000_00)) throw new RequestError('Please check your budget.', 'budget');

  const contact = {
    parentName: clean(c.parentName, 100),
    phone: clean(c.phone, 20).replace(/\D/g, '').replace(/^65(?=\d{8}$)/, ''),
    email: clean(c.email, 254),
    venueName: clean(c.venueName, 120),
    address: clean(c.address, 300),
    postalCode: clean(c.postalCode, 6),
    notes: clean(c.notes, 1000),
  };
  if (contact.parentName.length < 2) throw new RequestError('Please add your name.', 'parentName');
  if (!SG_MOBILE.test(contact.phone)) throw new RequestError('Please enter a Singapore mobile number, e.g. 8123 4567.', 'phone');
  if (!EMAIL.test(contact.email)) throw new RequestError('Please check your email address.', 'email');
  if (contact.address.length < 5) throw new RequestError('Please add the venue address.', 'address');
  if (!POSTAL.test(contact.postalCode)) throw new RequestError('Please enter a 6-digit Singapore postal code.', 'postalCode');
  if (body.consent !== true) throw new RequestError('Please tick the box so we can contact you.', 'consent');

  // Company bookings: same prices, invoiced after we confirm (no PayNow holding deposit).
  const bookingFor = body.bookingFor === 'company' ? 'company' : 'family';
  if (bookingFor === 'company') {
    contact.companyName = clean(c.companyName, 120);
    contact.companyUen = clean(c.companyUen, 20).toUpperCase();
    contact.billingEmail = clean(c.billingEmail, 254);
    if (contact.companyName.length < 2) throw new RequestError('Please add the company name for the invoice.', 'companyName');
    if (contact.companyUen && !/^[0-9A-Z]{8,10}$/.test(contact.companyUen)) throw new RequestError('Please check the UEN, e.g. 201912345K.', 'companyUen');
    if (contact.billingEmail && !EMAIL.test(contact.billingEmail)) throw new RequestError('Please check the billing email.', 'billingEmail');
  }

  return {
    plan: { children: p.children, adults: p.adults, experience: p.experience, wax: p.wax, addons, date: p.date, start: p.start, end: p.end, budgetCents: p.budgetCents ?? null },
    contact, bookingFor,
    honeypot: clean(body.website, 200),
    clientTotalCents: Number.isInteger(body.client?.totalCents) ? body.client.totalCents : null,
    emailToken: typeof body.emailToken === 'string' ? body.emailToken.slice(0, 200) : '',
  };
}
