// POST /api/change  { ref, t, text }: a customer asks to change their booking (from the link in their confirmation
// email, signed for their booking reference). Nothing changes automatically: it goes to Telegram and the dashboard,
// and the team reviews it and, if needed, sends a revised quotation (api/admin.js, lib/bookings.js).
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { checkChangeToken } from '../lib/status-link.js';
import { addChangeRequest, BookingError } from '../lib/bookings.js';
import { statsConfigured } from '../lib/stats.js';
import { sendTelegram } from '../lib/telegram.js';

const rateLimited = limiter(5, 10 * 60 * 1000);
const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  try {
    assertSameOrigin(req);
    if (rateLimited(clientIp(req))) throw new HttpError(429, 'Too many requests. Please wait a few minutes or WhatsApp us.');
    const b = await readJson(req, 4096);
    const ref = String(b.ref || ''), text = String(b.text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
    if (!REF.test(ref) || !checkChangeToken(ref, b.t)) throw new HttpError(400, 'This link isn’t valid. Please use the link in your confirmation email, or WhatsApp us.');
    if (text.length < 3) throw new HttpError(400, 'Please tell us what you’d like to change.', 'text');
    if (!statsConfigured()) throw new HttpError(503, 'Please WhatsApp us your change for now.');
    let r;
    try { r = await addChangeRequest(ref, text.slice(0, 1000)); }
    catch (e) { if (e instanceof BookingError) throw new HttpError(e.status === 404 ? 400 : e.status, 'We couldn’t find this booking. Please WhatsApp us your change.'); throw e; }
    const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      try {
        await sendTelegram({ token, chatId, apiBase: process.env.TELEGRAM_API_BASE || undefined,
          text: `✏️ <b>Change requested</b> · <code>${ref}</code> (${esc(r.booking.first)}, party ${esc(r.booking.date)})\n💬 “${esc(text.slice(0, 1000))}”\n\nReview it on the dashboard. Nothing changes until you send a revised quotation and they accept it.` });
      } catch (e) { console.error('[change] telegram failed', e.message); }
    }
    return res.status(200).json({ ok: true });
  } catch (e) { return fail(res, e, 'change'); }
}
