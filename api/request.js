// POST /api/request  (Vercel serverless function, Node runtime)
// Validates a party request, checks the email was verified, re-prices it on the server, sends the full order to the
// owner's Telegram and emails the customer a confirmation. Nothing is paid online: we confirm and send a quotation.
// Secrets stay here and only come from environment variables.
import crypto from 'node:crypto';
import { validateRequest } from '../lib/validate.js';
import { priceRequest, ratesOf } from '../lib/pricing.js';
import { CATALOGUE } from '../lib/catalogue.js';
import { makeReferralCode, readReferralCode, samePerson } from '../lib/referral.js';
import { buildMessage, afterPartyMessage, customerGreeting, sendTelegram, sendTelegramPhoto, sendTelegramDocument, whatsappLink } from '../lib/telegram.js';
import { quotePdf, referralDiscount } from '../lib/quote-pdf.js';
import { addonName } from '../lib/pricing.js';
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { checkVerified } from '../lib/otp.js';
import { mailConfigured, sendMail } from '../lib/mail.js';
import { confirmationEmail } from '../lib/emails.js';
import { recordRequest, statsConfigured, vendorsOf } from '../lib/stats.js';
import { statusLink, changeLink } from '../lib/status-link.js';

const rateLimited = limiter(5, 10 * 60 * 1000); // best-effort, per server instance
const EXP_NAMES = Object.fromEntries(Object.entries(CATALOGUE.EXP).map(([k, e]) => [k, e.name]));

function makeRef(date) {
  return 'SP-' + date.slice(2).replace(/-/g, '') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  try {
    assertSameOrigin(req);
    if (rateLimited(clientIp(req))) throw new HttpError(429, 'Too many requests. Please wait a minute.');

    const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.error('[request] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set');
      throw new HttpError(503, 'Requests are not switched on yet.');
    }
    if (!mailConfigured()) {
      console.error('[request] email is not set up (SMTP_USER / SMTP_PASS), so emails can’t be verified');
      throw new HttpError(503, 'Requests are not switched on yet.');
    }

    const data = validateRequest(await readJson(req, 3 * 1024 * 1024)); // room for a few moodboard images
    const price = priceRequest(data.plan);
    const ref = makeRef(data.plan.date);

    // Bots that fill the hidden field get a normal-looking reply, but nothing is sent.
    if (data.honeypot) { console.warn('[request] honeypot triggered', ref); return res.status(200).json({ ok: true, ref }); }

    if (!checkVerified(data.contact.email, data.emailToken)) throw new HttpError(400, 'Please verify your email address first.', 'email');
    const contact = { ...data.contact, emailVerified: true };

    const site = (process.env.SITE_URL || 'https://confetticlub.vercel.app').replace(/\/$/, '');
    const shareCode = makeReferralCode(contact.parentName);
    const text = buildMessage({ ref, plan: data.plan, contact, price, clientTotalCents: data.clientTotalCents, referral: data.referral, shareCode, site, corporate: data.corporate });
    const buttonUrl = whatsappLink(contact.phone, customerGreeting({ ref, plan: data.plan, contact }));
    try {
      const afterUrl = whatsappLink(contact.phone, afterPartyMessage({ ref, contact, shareCode, site }));
      // With the dashboard connected, buttons record when we got back to them, confirmed, got paid, and each partner confirmed
      const statusUrls = statsConfigured() ? { contacted: statusLink(site, ref, 'contacted'), confirmed: statusLink(site, ref, 'confirmed'), paid: statusLink(site, ref, 'paid'),
        vendors: vendorsOf(price).slice(0, 10).map((v, i) => ({ name: v.name, url: statusLink(site, ref, 'v' + i) })) } : null;
      await sendTelegram({ token, chatId, text, buttonUrl, afterUrl, statusUrls, apiBase: process.env.TELEGRAM_API_BASE || undefined });
    } catch (e) {
      console.error('[request] telegram send failed', ref, e.message); // no personal data in logs
      throw new HttpError(502, 'We couldn’t send your request just now. Please try again in a minute.');
    }
    console.log('[request] sent', ref);

    // Dashboard numbers: how they found us, and this family's own code so their referrals can be traced back
    const usedCode = data.referral.code ? readReferralCode(data.referral.code) : null;
    const via = usedCode ? (usedCode.valid ? 'friend' : 'unknown-code') : data.referral.source === 'capsule' ? 'capsule' : '';
    const discountCents = referralDiscount(data.referral, readReferralCode, samePerson, contact.parentName);
    await recordRequest({ ref, plan: data.plan, price, contact, via, code: usedCode ? usedCode.code : '', shareCode, experienceName: EXP_NAMES[data.plan.experience], corporate: data.corporate,
      rates: ratesOf(data.plan), discountCents, bookingFor: data.bookingFor });

    // Moodboard images follow the message. A failed photo doesn't undo the request, which has already reached you.
    for (let i = 0; i < data.images.length; i++) {
      const im = data.images[i];
      try { await sendTelegramPhoto({ token, chatId, b64: im.b64, mime: im.mime, caption: `${ref} · moodboard for ${addonName(im.addon)} (${i + 1}/${data.images.length})`, apiBase: process.env.TELEGRAM_API_BASE || undefined }); }
      catch (e) { console.error('[request] moodboard photo failed', ref, e.message); }
    }

    // PDF quotation for every request (a package price for families; companies choose package or breakdown), from the
    // same server pricing. A copy goes to Telegram
    // so you have exactly what the customer received, even if prices change later.
    let quote = null;
    {
      try {
        const pdf = quotePdf({ ref, issued: new Date(), plan: data.plan, contact, price, bookingFor: data.bookingFor, discountCents,
          detailed: !!data.corporate?.detailed, experienceName: EXP_NAMES[data.plan.experience],
          contactEmail: process.env.MAIL_REPLY_TO || process.env.SMTP_USER || '', site });
        quote = { pdf, filename: `Confetti-Club-Quotation-Q-${ref}.pdf`, totalCents: price.totalCents - discountCents, discountCents };
        await sendTelegramDocument({ token, chatId, data: pdf, filename: quote.filename, caption: `${ref} · PDF quotation emailed to the customer${discountCents ? ' (includes $10 referral discount)' : ''}`, apiBase: process.env.TELEGRAM_API_BASE || undefined });
      } catch (e) { console.error('[request] quotation copy failed', ref, e.message); }
    }

    // The confirmation email is a courtesy: if it fails, the request has still reached you.
    let emailed = true;
    try { await sendMail({ to: contact.email, ...confirmationEmail({ ref, plan: data.plan, contact, price, quote, corporate: data.corporate, changeUrl: statsConfigured() ? changeLink(site, ref) : '' }) }); }
    catch (e) { emailed = false; console.error('[request] confirmation email failed', ref, e.message); }

    return res.status(200).json({ ok: true, ref, emailed, quoted: !!(quote && emailed), bookingFor: data.bookingFor, totalCents: price.totalCents });
  } catch (e) { return fail(res, e, 'request'); }
}
