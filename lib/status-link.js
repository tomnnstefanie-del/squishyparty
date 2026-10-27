// One-tap links on the Telegram request message ("Contacted", "Confirmed") that record the time for the dashboard.
// Each link is signed with the server secret for that reference and status, so it can't be guessed or changed.
import crypto from 'node:crypto';
import { sign } from './otp.js';

const tokenFor = (ref, status) => sign('status', ref, status).slice(0, 32);

export const statusLink = (site, ref, status) => `${site}/api/status?ref=${encodeURIComponent(ref)}&s=${status}&t=${tokenFor(ref, status)}`;

export function checkStatusToken(ref, status, token) {
  const want = Buffer.from(tokenFor(ref, status)), got = Buffer.from(String(token || ''));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
