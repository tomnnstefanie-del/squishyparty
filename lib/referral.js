// Friend referral codes without a database. A code looks like MIA-K7Q2: a first name, 2 random characters and a
// 2-character signature made with the server secret, so a made-up or mistyped code is spotted straight away.
// Only the friend gets the offer ($20 off their first Squishy Party); the family who shared the link gets nothing.
import crypto from 'node:crypto';
import { sign } from './otp.js';

export const REFERRAL_OFFER = '$20 off their first Squishy Party';
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, so codes are easy to read out
const FORMAT = /^([A-Z]{2,8})-([A-Z2-9]{2})([A-Z2-9]{2})$/;

const prefixOf = (name) => (String(name || '').normalize('NFKD').replace(/[^A-Za-z ]/g, '').trim().split(/\s+/)[0] || '').toUpperCase().slice(0, 8);
const check = (body) => { const h = crypto.createHash('sha256').update(sign('referral', body)).digest(); return ABC[h[0] % 32] + ABC[h[1] % 32]; };

/** A new code for this customer, e.g. "MIA-K7Q2". */
export function makeReferralCode(name) {
  let p = prefixOf(name); if (p.length < 2) p = 'FRIEND';
  const r = ABC[crypto.randomInt(32)] + ABC[crypto.randomInt(32)];
  return `${p}-${r}${check(p + '-' + r)}`;
}

/** Tidies what the customer typed and says whether it is one of our codes. */
export function readReferralCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/\s+/g, '').slice(0, 16);
  if (!code) return null;
  const m = FORMAT.exec(code);
  return { code, valid: !!m && check(m[1] + '-' + m[2]) === m[3], prefix: m ? m[1] : '' };
}

export const samePerson = (ref, name) => !!ref && !!ref.prefix && ref.prefix === prefixOf(name);
