// Strict validation for incoming party requests. Anything unexpected is rejected with a parent-friendly message.
import { EXPERIENCES, isKnownAddon, addonCustom } from './pricing.js';

// Moodboard images arrive as small JPEG/PNG data URLs (shrunk in the browser). Limits keep requests well under 4 MB.
const IMG = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+=*)$/;
const MAX_IMG_CHARS = 460_000, MAX_IMGS_ITEM = 3, MAX_IMGS_TOTAL = 6;
function validateCustom(raw, addons) {
  if (raw == null) return { custom: {}, images: [] };
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new RequestError('Please refresh the page and try again.', 'custom');
  const custom = {}, images = [];
  for (const id of Object.keys(raw)) {
    const allow = addonCustom(id), c = raw[id] || {};
    if (!addons.includes(id) || !allow) throw new RequestError('Please refresh the page and try again.', 'custom');
    const out = {};
    if (allow.colours && Array.isArray(c.colours)) out.colours = [...new Set(c.colours.slice(0, 10).map((x) => clean(x, 20)).filter(Boolean))];
    if (allow.text) out.text = clean(c.text, 60);
    if (allow.notes) out.notes = clean(c.notes, 600);
    if (allow.images && Array.isArray(c.images)) {
      if (c.images.length > MAX_IMGS_ITEM) throw new RequestError('Please add up to 3 moodboard images per item.', 'custom');
      c.images.forEach((u) => {
        const m = typeof u === 'string' && u.length <= MAX_IMG_CHARS && IMG.exec(u);
        if (!m) throw new RequestError('One of your moodboard images couldn’t be read. Please remove it and try again.', 'custom');
        images.push({ addon: id, mime: 'image/' + m[1], b64: m[2] });
      });
      out.images = c.images.length;
    }
    if ((out.colours && out.colours.length) || out.text || out.notes || out.images) custom[id] = out;
  }
  if (images.length > MAX_IMGS_TOTAL) throw new RequestError('Please add up to 6 moodboard images in total.', 'custom');
  return { custom, images };
}

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

  if (!isInt(p.participants, 1, 60)) throw new RequestError('Please check the number of participants (1–60).', 'participants');
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

  // Company bookings: same prices, invoiced to the company after we confirm.
  const bookingFor = body.bookingFor === 'company' ? 'company' : 'family';
  if (bookingFor === 'company') {
    contact.companyName = clean(c.companyName, 120);
    contact.companyUen = clean(c.companyUen, 20).toUpperCase();
    contact.billingEmail = clean(c.billingEmail, 254);
    if (contact.companyName.length < 2) throw new RequestError('Please add the company name for the invoice.', 'companyName');
    if (contact.companyUen && !/^[0-9A-Z]{8,10}$/.test(contact.companyUen)) throw new RequestError('Please check the UEN, e.g. 201912345K.', 'companyUen');
    if (contact.billingEmail && !EMAIL.test(contact.billingEmail)) throw new RequestError('Please check the billing email.', 'billingEmail');
  }

  // How they found us: a friend's referral code, the capsule QR or another link, and whether they've booked before.
  const r = body.referral || {};
  const referral = { code: clean(r.code, 16).toUpperCase(), source: /^[a-z0-9-]{1,24}$/.test(String(r.source || '')) ? r.source : '', returning: r.returning === true };

  const { custom, images } = validateCustom(p.custom, addons);
  return {
    plan: { participants: p.participants, experience: p.experience, wax: p.wax, addons, date: p.date, start: p.start, end: p.end, custom },
    images,
    contact, bookingFor, referral,
    honeypot: clean(body.website, 200),
    clientTotalCents: Number.isInteger(body.client?.totalCents) ? body.client.totalCents : null,
    emailToken: typeof body.emailToken === 'string' ? body.emailToken.slice(0, 200) : '',
  };
}
