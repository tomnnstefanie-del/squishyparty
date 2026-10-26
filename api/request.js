// POST /api/request  (Vercel serverless function, Node runtime)
// Validates a party request, checks the email was verified, re-prices it on the server, sends the full order to the
// owner's Telegram and emails the customer a confirmation. Nothing is paid online: we confirm and send a quotation.
// Secrets stay here and only come from environment variables.
import crypto from 'node:crypto';
import { validateRequest } from '../lib/validate.js';
import { priceRequest } from '../lib/pricing.js';
import { buildMessage, customerGreeting, sendTelegram, sendTelegramPhoto, whatsappLink } from '../lib/telegram.js';
import { addonName } from '../lib/pricing.js';
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { checkVerified } from '../lib/otp.js';
import { mailConfigured, sendMail } from '../lib/mail.js';
import { confirmationEmail } from '../lib/emails.js';

const rateLimited = limiter(5, 10 * 60 * 1000); // best-effort, per server instance

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

    const text = buildMessage({ ref, plan: data.plan, contact, price, clientTotalCents: data.clientTotalCents });
    const buttonUrl = whatsappLink(contact.phone, customerGreeting({ ref, plan: data.plan, contact }));
    try {
      await sendTelegram({ token, chatId, text, buttonUrl, apiBase: process.env.TELEGRAM_API_BASE || undefined });
    } catch (e) {
      console.error('[request] telegram send failed', ref, e.message); // no personal data in logs
      throw new HttpError(502, 'We couldn’t send your request just now. Please try again in a minute.');
    }
    console.log('[request] sent', ref);

    // Moodboard images follow the message. A failed photo doesn't undo the request, which has already reached you.
    for (let i = 0; i < data.images.length; i++) {
      const im = data.images[i];
      try { await sendTelegramPhoto({ token, chatId, b64: im.b64, mime: im.mime, caption: `${ref} · moodboard for ${addonName(im.addon)} (${i + 1}/${data.images.length})`, apiBase: process.env.TELEGRAM_API_BASE || undefined }); }
      catch (e) { console.error('[request] moodboard photo failed', ref, e.message); }
    }

    // The confirmation email is a courtesy: if it fails, the request has still reached you.
    let emailed = true;
    try { await sendMail({ to: contact.email, ...confirmationEmail({ ref, plan: data.plan, contact, price }) }); }
    catch (e) { emailed = false; console.error('[request] confirmation email failed', ref, e.message); }

    return res.status(200).json({ ok: true, ref, emailed, bookingFor: data.bookingFor, totalCents: price.totalCents });
  } catch (e) { return fail(res, e, 'request'); }
}
