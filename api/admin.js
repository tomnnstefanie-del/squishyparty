// /api/admin  (Authorization: Bearer <ADMIN_PASSWORD>): the private dashboard at /admin.html.
//   GET                                                   -> the numbers, bookings and the add-on list for amendments
//   POST { action: 'mark' | 'undo', ref, status }         -> contacted / lost / vendor n (payments use the ledger below)
//   POST { action: 'digest' }                              -> send the to-do list to Telegram now
//   POST { action: 'payment', ref, kind, cents, by, note } -> record a deposit or payment received
//   POST { action: 'reverse', ref, paymentId, reason, by } -> reverse a payment recorded by mistake (never deleted)
//   POST { action: 'revise', ref, plan, by, note }         -> draft a revision (admin only; priced on the server)
//   POST { action: 'revision', ref, n, step, vendor, reason, by } -> send (emails R-n) / accept / vendor / apply / withdraw / discard
//   POST { action: 'change-handled', ref, changeId, by }   -> a customer's change request has been dealt with
//   POST { action: 'reward', ref (the friend's booking), step: 'sent' | 'redeemed', by } -> referral reward voucher
//   POST { action: 'settings', settings, by }              -> costs and targets for the scorecard (lib/scorecard.js)
// ADMIN_PASSWORD is a Vercel environment variable (12+ characters); without it the dashboard stays locked.
// Wrong passwords are counted per address in the database (10 per 15 minutes), so guessing is slow on every instance.
import crypto from 'node:crypto';
import { clientIp, limiter, fail, HttpError, readJson, assertSameOrigin } from '../lib/http.js';
import { readStats, markStatus, tooManyFailures, validStatus, saveSettings } from '../lib/stats.js';
import { addPayment, reversePayment, createRevision, stepRevision, handleChange, getFull, paidCents, cleanBy, BookingError } from '../lib/bookings.js';
import { validateRequest } from '../lib/validate.js';
import { ADDON_LIST, EXP_NAME } from '../lib/pricing.js';
import { quotePdf } from '../lib/quote-pdf.js';
import { sendMail, mailConfigured } from '../lib/mail.js';
import { revisedQuotationEmail } from '../lib/emails.js';
import { sendTelegram, sendTelegramDocument } from '../lib/telegram.js';
import { sendDigest } from './digest.js';
import { stepReward, listRewards } from '../lib/rewards.js';

const rateLimited = limiter(60, 10 * 60 * 1000); // per instance, on top of the shared lockout
const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const same = (a, b) => { const h = (s) => crypto.createHash('sha256').update(String(s)).digest(); return crypto.timingSafeEqual(h(a), h(b)); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dollars = (c) => '$' + (c / 100).toFixed(2);

/** Emails the revised quotation R-n and posts a copy to Telegram; only then is the revision marked as sent. */
async function sendRevision(ref, n, by) {
  by = cleanBy(by); if (!by) throw new BookingError('Please add your name, for the record.');
  const f = await getFull(ref), rev = f.revisions.find((r) => r.n === n);
  if (!rev || rev.status !== 'draft') throw new BookingError('Only a draft revision can be sent.', 409);
  if (!f.contact) throw new BookingError('This booking’s contact details have expired.', 409);
  if (!mailConfigured()) throw new BookingError('Email isn’t set up, so the revised quotation can’t be sent.', 503);
  const site = (process.env.SITE_URL || 'https://confetticlub.vercel.app').replace(/\/$/, '');
  const paid = paidCents(f.payments), c = f.contact, discount = f.booking.discountCents || 0;
  const pdf = quotePdf({ ref, issued: new Date(), plan: rev.plan, contact: c, price: rev.price, bookingFor: c.bookingFor, discountCents: discount,
    detailed: !!(c.corporate && c.corporate.detailed), experienceName: EXP_NAME[rev.plan.experience], revision: n, paidCents: paid, prevTotalCents: rev.prevTotalCents,
    contactEmail: process.env.MAIL_REPLY_TO || process.env.SMTP_USER || '', site });
  const filename = `Confetti-Club-Quotation-Q-${ref}-R${n}.pdf`;
  await sendMail({ to: c.email, ...revisedQuotationEmail({ ref, n, plan: rev.plan, contact: c, totalCents: rev.totalCents - discount, prevTotalCents: rev.prevTotalCents, paidCents: paid, diff: rev.diff, pdf, filename }) });
  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID, apiBase = process.env.TELEGRAM_API_BASE || undefined;
  if (token && chatId) {
    try {
      await sendTelegram({ token, chatId, apiBase, text: `✏️ <b>Revised quotation R${n} sent</b> · <code>${ref}</code> by ${esc(by)}\n${rev.diff.map((d) => '• ' + esc(d)).join('\n')}\nTotal ${dollars(rev.prevTotalCents)} → <b>${dollars(rev.totalCents)}</b>${paid ? `, deposit received ${dollars(paid)}` : ''}\n⏳ Pending customer acceptance${rev.vendors.length ? ' and ' + rev.vendors.map((v) => esc(v.name)).join(', ') : ''}. The booking stays as it is until you apply R${n} on the dashboard.` });
      await sendTelegramDocument({ token, chatId, apiBase, data: pdf, filename, caption: `${ref} · revised quotation R${n}, emailed to the customer` });
    } catch (e) { console.error('[admin] telegram copy of revision failed', e.message); }
  }
  return stepRevision(ref, { n, step: 'send', by });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw new HttpError(405, 'Method not allowed.'); }
    const pass = process.env.ADMIN_PASSWORD || '';
    if (pass.length < 12) throw new HttpError(503, 'The dashboard is locked: set ADMIN_PASSWORD (12 characters or more) in Vercel.');
    const ip = clientIp(req);
    if (rateLimited(ip) || await tooManyFailures(ip, false)) throw new HttpError(429, 'Too many tries. Please wait 15 minutes.');
    const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!given || !same(given, pass)) {
      await tooManyFailures(ip, true);
      console.warn('[admin] wrong password'); // no address or password logged
      throw new HttpError(401, 'That password isn’t right.');
    }
    if (req.method === 'GET') { const st = await readStats(); return res.status(200).json({ ok: true, ...st, rewards: st.connected ? await listRewards() : [], addonList: ADDON_LIST, experiences: EXP_NAME }); }

    assertSameOrigin(req);
    const b = await readJson(req, 8 * 1024);
    if (b.action === 'digest') { const r = await sendDigest(); if (!r.sent) throw new HttpError(503, r.reason); return res.status(200).json({ ok: true, count: r.count }); }
    if (b.action === 'settings') { const by = cleanBy(b.by); if (!by) throw new HttpError(400, 'Please add your name, for the record.'); return res.status(200).json({ ok: true, settings: await saveSettings(b.settings || {}, by) }); }
    const ref = String(b.ref || '');
    if (!REF.test(ref)) throw new HttpError(400, 'Please refresh and try again.');
    try {
      switch (b.action) {
        case 'mark': case 'undo': {
          if (!validStatus(b.status)) throw new HttpError(400, 'Please refresh and try again.');
          const r = await markStatus(ref, b.status, b.action === 'undo', cleanBy(b.by));
          if (!r) throw new HttpError(404, 'That request isn’t in the dashboard.');
          if (r.refused) throw new HttpError(409, r.refused);
          return res.status(200).json({ ok: true, life: r.life });
        }
        case 'payment': return res.status(200).json({ ok: true, ...(await addPayment(ref, { kind: b.kind, cents: b.cents, by: b.by, note: b.note })) });
        case 'reverse': return res.status(200).json({ ok: true, ...(await reversePayment(ref, { paymentId: String(b.paymentId || ''), reason: b.reason, by: b.by })) });
        case 'revise': return res.status(200).json({ ok: true, revision: await createRevision(ref, { planIn: b.plan || {}, by: b.by, note: b.note }, validateRequest) });
        case 'revision': {
          const n = Number(b.n);
          if (b.step === 'send') return res.status(200).json({ ok: true, revision: await sendRevision(ref, n, b.by) });
          return res.status(200).json({ ok: true, revision: await stepRevision(ref, { n, step: b.step, vendor: b.vendor, reason: b.reason, by: b.by }) });
        }
        case 'reward': {
          const by = cleanBy(b.by); if (!by) throw new HttpError(400, 'Please add your name, for the record.');
          const r = await stepReward(ref, b.step, by); if (r.error) throw new HttpError(r.status, r.error);
          return res.status(200).json({ ok: true, reward: r.reward });
        }
        case 'change-handled': return res.status(200).json({ ok: true, change: await handleChange(ref, { changeId: String(b.changeId || ''), by: b.by }) });
        default: throw new HttpError(400, 'Please refresh and try again.');
      }
    } catch (e) {
      if (e instanceof BookingError) throw new HttpError(e.status, e.message);
      if (e && e.name === 'RequestError') throw new HttpError(400, e.message, e.field);
      throw e;
    }
  } catch (e) { return fail(res, e, 'admin'); }
}
