// POST /api/otp  { action:'send', email }            -> emails a 6-digit code, returns { token }
//                { action:'verify', email, code, token } -> returns { verified } (proof sent with the party request)
import { postOnly, readJson, assertSameOrigin, clientIp, limiter, fail, HttpError } from '../lib/http.js';
import { issueCode, checkCode, issueVerified, otpConfigured, normEmail } from '../lib/otp.js';
import { mailConfigured, sendMail } from '../lib/mail.js';
import { otpEmail } from '../lib/emails.js';

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const sendByIp = limiter(6, 10 * 60 * 1000), sendByEmail = limiter(3, 10 * 60 * 1000), verifyByIp = limiter(12, 10 * 60 * 1000);

export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  try {
    assertSameOrigin(req);
    if (!otpConfigured() || !mailConfigured()) {
      console.error('[otp] email is not set up (SMTP_USER / SMTP_PASS)');
      throw new HttpError(503, 'Email verification isn’t switched on yet. Please WhatsApp us instead.');
    }
    const body = await readJson(req), email = normEmail(body.email), ip = clientIp(req);
    if (email.length > 254 || !EMAIL.test(email)) throw new HttpError(400, 'Please check your email address.', 'email');

    if (body.action === 'send') {
      if (sendByIp(ip) || sendByEmail(email)) throw new HttpError(429, 'Too many codes requested. Please wait a few minutes and try again.');
      const { code, token } = issueCode(email);
      try { await sendMail({ to: email, ...otpEmail(code) }); }
      catch (e) { console.error('[otp] send failed', e.message); throw new HttpError(502, 'We couldn’t send the code just now. Please check the address and try again.'); }
      return res.status(200).json({ ok: true, token });
    }
    if (body.action === 'verify') {
      if (verifyByIp(ip)) throw new HttpError(429, 'Too many tries. Please wait a few minutes and request a new code.');
      if (!checkCode(email, String(body.code || '').trim(), body.token)) throw new HttpError(400, 'That code isn’t right or has expired. Please check it or send a new one.', 'code');
      return res.status(200).json({ ok: true, verified: issueVerified(email) });
    }
    throw new HttpError(400, 'Please refresh the page and try again.');
  } catch (e) { return fail(res, e, 'otp'); }
}
