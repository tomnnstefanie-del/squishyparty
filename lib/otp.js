// Email one-time codes without a database: every token is signed with a server secret (HMAC), so it can't be forged.
// The secret comes from OTP_SECRET, or is derived from TELEGRAM_BOT_TOKEN so there is one less thing to set up.
import crypto from 'node:crypto';

const CODE_TTL = 10 * 60 * 1000;      // a code works for 10 minutes
const VERIFIED_TTL = 2 * 60 * 60 * 1000; // a verified email stays verified for 2 hours

function secret() {
  const s = process.env.OTP_SECRET || (process.env.TELEGRAM_BOT_TOKEN ? crypto.createHmac('sha256', process.env.TELEGRAM_BOT_TOKEN).update('squishy-party-otp').digest('hex') : '');
  if (!s) throw new Error('OTP secret is not configured');
  return s;
}
const mac = (...parts) => crypto.createHmac('sha256', secret()).update(parts.join('|')).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export const normEmail = (e) => String(e || '').trim().toLowerCase();

export function otpConfigured() { try { secret(); return true; } catch { return false; } }

/** New 6-digit code for this email, plus a token the browser keeps and sends back with the code. */
export function issueCode(email, now = Date.now()) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const exp = now + CODE_TTL;
  return { code, token: `${exp}.${mac('code', normEmail(email), code, exp)}` };
}

export function checkCode(email, code, token, now = Date.now()) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || !/^\d{6}$/.test(String(code || ''))) return false;
  if (Number(exp) < now) return false;
  return same(sig, mac('code', normEmail(email), code, exp));
}

/** Proof that this email was verified, sent with the party request. */
export function issueVerified(email, now = Date.now()) {
  const exp = now + VERIFIED_TTL;
  return `${exp}.${mac('verified', normEmail(email), exp)}`;
}

export function checkVerified(email, token, now = Date.now()) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || Number(exp) < now) return false;
  return same(sig, mac('verified', normEmail(email), exp));
}
