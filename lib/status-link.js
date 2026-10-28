// One-tap links on the Telegram request message (Contacted, Confirmed, Paid, each partner vendor confirmed) that record
// the time for the dashboard.
// Each link is signed with the server secret for that reference and status, so it can't be guessed or changed.
import crypto from 'node:crypto';
import { sign } from './otp.js';

const tokenFor = (ref, status) => sign('status', ref, status).slice(0, 32);

export const statusLink = (site, ref, status) => `${site}/api/status?ref=${encodeURIComponent(ref)}&s=${status}&t=${tokenFor(ref, status)}`;

export function checkStatusToken(ref, status, token) {
  const want = Buffer.from(tokenFor(ref, status)), got = Buffer.from(String(token || ''));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// The customer's own "request a change" link (in their confirmation email): signed for their booking reference only.
const changeToken = (ref) => sign('change', ref).slice(0, 32);
export const changeLink = (site, ref) => `${site}/change.html?ref=${encodeURIComponent(ref)}&t=${changeToken(ref)}`;
export function checkChangeToken(ref, token) {
  const want = Buffer.from(changeToken(ref)), got = Buffer.from(String(token || ''));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
