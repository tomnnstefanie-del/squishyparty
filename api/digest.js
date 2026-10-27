// GET /api/digest: the daily to-do "bump" in Telegram, run by Vercel Cron (vercel.json, 9am Singapore time).
// Vercel sends Authorization: Bearer <CRON_SECRET>; without CRON_SECRET set, nothing is sent (so no one else can trigger it).
import crypto from 'node:crypto';
import { readStats, statsConfigured } from '../lib/stats.js';
import { buildDigest } from '../lib/digest.js';
import { sendTelegram } from '../lib/telegram.js';

const same = (a, b) => { const h = (s) => crypto.createHash('sha256').update(String(s)).digest(); return crypto.timingSafeEqual(h(a), h(b)); };

/** Shared with the dashboard's "Send to Telegram now" button. */
export async function sendDigest() {
  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !statsConfigured()) return { sent: false, reason: 'Telegram or the database isn’t set up.' };
  const site = (process.env.SITE_URL || 'https://confetticlub.vercel.app').replace(/\/$/, '');
  const d = buildDigest(await readStats(), site);
  await sendTelegram({ token, chatId, text: d.text, keyboard: d.keyboard, apiBase: process.env.TELEGRAM_API_BASE || undefined });
  return { sent: true, count: d.count };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET || '';
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (secret.length < 16 || !given || !same(given, secret)) { res.statusCode = 401; return res.end('{"ok":false}'); }
  try { const r = await sendDigest(); console.log('[digest]', r.sent ? `sent, ${r.count} open` : r.reason); return res.status(200).json({ ok: true, ...r }); }
  catch (e) { console.error('[digest]', e.message); return res.status(500).json({ ok: false }); }
}
