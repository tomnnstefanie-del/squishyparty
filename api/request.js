// POST /api/request  (Vercel serverless function, Node runtime)
// Validates a party request, re-prices it on the server and sends the full order to the owner's Telegram.
// Secrets stay here: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are read from environment variables only.
import crypto from 'node:crypto';
import { validateRequest, RequestError } from '../lib/validate.js';
import { priceRequest } from '../lib/pricing.js';
import { buildMessage, customerGreeting, sendTelegram, whatsappLink } from '../lib/telegram.js';

const MAX_BODY = 16 * 1024;
const WINDOW_MS = 10 * 60 * 1000, MAX_PER_WINDOW = 5;
const hits = new Map(); // best-effort, per server instance

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function makeRef(date) {
  return 'SP-' + date.slice(2).replace(/-/g, '') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel parses JSON for us
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new RequestError('That request is too large.'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed.' }); }
  if (!String(req.headers['content-type'] || '').includes('application/json')) return res.status(415).json({ ok: false, error: 'Please send JSON.' });
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) return res.status(413).json({ ok: false, error: 'That request is too large.' });

  // Same-origin only: browsers send Origin on cross-site POSTs.
  const origin = req.headers.origin, host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin) { try { if (new URL(origin).host !== host) return res.status(403).json({ ok: false, error: 'Not allowed.' }); } catch { return res.status(403).json({ ok: false, error: 'Not allowed.' }); } }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'Too many requests. Please wait a minute.' });

  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[request] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set');
    return res.status(503).json({ ok: false, error: 'Requests are not switched on yet.' });
  }

  let data;
  try {
    data = validateRequest(await readBody(req));
  } catch (e) {
    if (e instanceof RequestError) return res.status(400).json({ ok: false, error: e.message, field: e.field });
    return res.status(400).json({ ok: false, error: 'Please refresh the page and try again.' });
  }

  const price = priceRequest(data.plan);
  const ref = makeRef(data.plan.date);

  // Bots that fill the hidden field get a normal-looking reply, but nothing is sent.
  if (data.honeypot) { console.warn('[request] honeypot triggered', ref); return res.status(200).json({ ok: true, ref, depositCents: price.depositCents }); }

  const text = buildMessage({ ref, plan: data.plan, contact: data.contact, price, clientTotalCents: data.clientTotalCents });
  const buttonUrl = whatsappLink(data.contact.phone, customerGreeting({ ref, plan: data.plan, contact: data.contact }));
  try {
    await sendTelegram({ token, chatId, text, buttonUrl, apiBase: process.env.TELEGRAM_API_BASE || undefined });
  } catch (e) {
    console.error('[request] telegram send failed', ref, e.message); // no personal data in logs
    return res.status(502).json({ ok: false, error: 'We couldn’t send your request just now. Please try again in a minute.' });
  }
  console.log('[request] sent', ref);
  return res.status(200).json({ ok: true, ref, totalCents: price.totalCents, depositCents: price.depositCents });
}
