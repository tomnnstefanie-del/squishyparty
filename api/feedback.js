// POST /api/feedback  (Vercel serverless function, Node runtime)
// After-party feedback from /feedback.html: a 1-5 star rating, an optional comment and an optional photo.
// Goes to the owner's Telegram with what to do next: happy hosts (4-5) get their referral link, others a personal call.
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { sendTelegram, sendTelegramPhoto } from '../lib/telegram.js';
import { validateFeedback, feedbackMessage } from '../lib/feedback.js';

const rateLimited = limiter(5, 10 * 60 * 1000); // best-effort, per server instance

export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  try {
    assertSameOrigin(req);
    if (rateLimited(clientIp(req))) throw new HttpError(429, 'Too many tries. Please wait a minute.');
    const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) { console.error('[feedback] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set'); throw new HttpError(503, 'Feedback isn’t switched on yet. Please WhatsApp us instead.'); }

    const f = validateFeedback(await readJson(req, 1024 * 1024)); // room for one photo
    if (f.honeypot) { console.warn('[feedback] honeypot triggered'); return res.status(200).json({ ok: true }); }

    const apiBase = process.env.TELEGRAM_API_BASE || undefined;
    try { await sendTelegram({ token, chatId, text: feedbackMessage(f), apiBase }); }
    catch (e) { console.error('[feedback] telegram send failed', e.message); throw new HttpError(502, 'We couldn’t send your feedback just now. Please try again in a minute.'); }
    if (f.photo) {
      try { await sendTelegramPhoto({ token, chatId, b64: f.photo, mime: 'image/jpeg', caption: `${f.ref || 'Feedback'} · party photo from the host (${f.rating}/5)`, apiBase }); }
      catch (e) { console.error('[feedback] photo failed', e.message); }
    }
    console.log('[feedback] sent', f.ref || '(no ref)', f.rating);
    return res.status(200).json({ ok: true });
  } catch (e) { return fail(res, e, 'feedback'); }
}
