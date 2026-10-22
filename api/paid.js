// POST /api/paid { ref, cents, sig }  The customer taps "I've paid" after scanning the PayNow QR.
// Sends a Telegram note so you can match the payment in your bank app (look for the reference).
// Only the browser that sent request `ref` holds a valid signature for it.
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { checkPayment } from '../lib/otp.js';
import { sendTelegram } from '../lib/telegram.js';
import { money } from '../lib/pricing.js';

const byIp = limiter(5, 10 * 60 * 1000);

export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  try {
    assertSameOrigin(req);
    if (byIp(clientIp(req))) throw new HttpError(429, 'Too many requests. Please wait a minute.');
    const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) throw new HttpError(503, 'Requests are not switched on yet.');
    const { ref, cents, sig } = await readJson(req);
    if (!/^SP-\d{6}-[0-9A-F]{4}$/.test(String(ref)) || !Number.isInteger(cents) || !checkPayment(ref, cents, sig)) throw new HttpError(400, 'Please refresh the page and try again.');
    const text = `💰 <b>Deposit marked as paid</b> · <code>${ref}</code>\nThe customer says they've paid the <b>${money(cents)}</b> holding deposit by PayNow.\nCheck your bank app for a PayNow of ${money(cents)} with reference <b>${ref}</b>, then WhatsApp them to confirm.`;
    try { await sendTelegram({ token, chatId, text, apiBase: process.env.TELEGRAM_API_BASE || undefined }); }
    catch (e) { console.error('[paid] telegram failed', ref, e.message); throw new HttpError(502, 'We couldn’t send that just now. Please try again in a minute.'); }
    console.log('[paid] marked', ref);
    return res.status(200).json({ ok: true });
  } catch (e) { return fail(res, e, 'paid'); }
}
