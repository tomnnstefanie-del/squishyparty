// Thank-you reward for the family who shared their referral link: a free squishy at any Tom & Stefanie store.
// It becomes "owed" once the friend's party (a booking made with their code) is paid in full, and goes back to "void"
// if that payment is reversed before the voucher was sent. The team sends it on WhatsApp and marks it sent, then
// redeemed when it's used in store. Stored in cc:rewards, one per referred booking: { id, voucher, status, ... }.
import crypto from 'node:crypto';
import { run, json, P, log } from './stats.js';
import { sendTelegram, whatsappLink } from './telegram.js';

export const REWARD = 'a free squishy at any Tom & Stefanie store';
const now = () => new Date().toISOString();
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const voucherCode = () => 'SQ-' + [...crypto.randomBytes(4)].map((b) => ABC[b % 32]).join('');

export function rewardMessage(first, voucher, site) {
  return `Hi ${first}! Thank you for recommending Confetti Club to a friend 💖 Their party is all booked, so here's a little thank-you from us: ${REWARD}.

Just show this message at any of our stores (Woodlands Civic Centre, PLQ Mall or Eastpoint Mall): voucher ${voucher}. Our stores: ${site}/stores.html`;
}

/**
 * Called after every payment change on a booking. Creates the reward when a friend's booking becomes paid in full,
 * and voids an unsent one if it stops being paid. Never throws: rewards must not block recording a payment.
 */
export async function checkReward(booking, life) {
  try {
    if (booking.via !== 'friend' || !booking.code) return null;
    const [rawR, rawCode] = await run([['HGET', P + 'rewards', booking.ref], ['HGET', P + 'codes', booking.code]]);
    const existing = json(rawR), from = json(rawCode);
    if (life.paid && (!existing || existing.status === 'void')) {
      if (!from) return null; // a code from before the dashboard: no record of who shared it
      const r = { id: booking.ref, voucher: voucherCode(), status: 'owed', at: now(), referrerRef: from.ref, referrerFirst: from.first, friendRef: booking.ref, friendFirst: booking.first };
      await run([['HSET', P + 'rewards', booking.ref, JSON.stringify(r)], ...log({ type: 'reward', ref: from.ref, what: r.voucher })]);
      await notify(r);
      return r;
    }
    if (!life.paid && existing && existing.status === 'owed') {
      existing.status = 'void'; existing.voidedAt = now();
      await run([['HSET', P + 'rewards', booking.ref, JSON.stringify(existing)]]);
      return existing;
    }
    return existing;
  } catch (e) { console.error('[rewards]', e.message); return null; }
}

async function notify(r) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID; if (!token || !chatId) return;
  const site = (process.env.SITE_URL || 'https://confetticlub.vercel.app').replace(/\/$/, '');
  const [rawC] = await run([['GET', P + 'contact:' + r.referrerRef]]);
  const c = json(rawC);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  try {
    await sendTelegram({ token, chatId, apiBase: process.env.TELEGRAM_API_BASE || undefined,
      text: `🎁 <b>Referral reward owed</b>: ${esc(r.referrerFirst)} (<code>${r.referrerRef}</code>) referred ${esc(r.friendFirst)} (<code>${r.friendRef}</code>), now paid in full.\nSend ${esc(r.referrerFirst)} their voucher <b>${r.voucher}</b> for ${REWARD}, then mark it sent on the dashboard.`,
      ...(c && c.phone ? { buttonUrl: whatsappLink(c.phone, rewardMessage(r.referrerFirst, r.voucher, site)) } : {}) });
  } catch (e) { console.error('[rewards] telegram failed', e.message); }
}

/** step: 'sent' (voucher sent on WhatsApp) or 'redeemed' (used in store). by: who did it. */
export async function stepReward(friendRef, step, by) {
  const [raw] = await run([['HGET', P + 'rewards', friendRef]]);
  const r = json(raw); if (!r) return { error: 'That reward wasn’t found.', status: 404 };
  if (step === 'sent' && r.status === 'owed') { r.status = 'sent'; r.sent = { at: now(), by }; }
  else if (step === 'redeemed' && r.status === 'sent') { r.status = 'redeemed'; r.redeemed = { at: now(), by }; }
  else return { error: `This reward is ${r.status}.`, status: 409 };
  await run([['HSET', P + 'rewards', friendRef, JSON.stringify(r)], ['LPUSH', P + 'hist:' + r.referrerRef, JSON.stringify({ at: now(), by, what: `Referral reward ${r.voucher} ${step} (for referring ${r.friendRef})` })]]);
  return { reward: r };
}

export async function listRewards() {
  const [all] = await run([['HGETALL', P + 'rewards']]);
  const out = []; for (let i = 0; i < (all || []).length; i += 2) { const r = json(all[i + 1]); if (r) out.push(r); }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
