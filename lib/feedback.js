// After-party feedback: checks what /feedback.html sends and writes the Telegram message.
import { RequestError } from './validate.js';

const REF = /^SP-\d{6}-[0-9A-F]{4}$/;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);

/** body: { ref, rating 1-5, comment, photo (data:image/jpeg;base64,...), website (honeypot) } */
export function validateFeedback(body) {
  const b = body || {};
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new RequestError('Please choose 1 to 5 stars.', 'rating');
  const ref = clean(b.ref, 20).toUpperCase();
  let photo = '';
  if (b.photo) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.photo));
    if (!m || m[1].length > 700000) throw new RequestError('That photo couldn’t be added. Please try a smaller one.', 'photo');
    photo = m[1];
  }
  return { ref: REF.test(ref) ? ref : '', rating, comment: clean(b.comment, 1000), photo, honeypot: clean(b.website, 200) };
}

export function feedbackMessage(f) {
  const L = [];
  L.push(`${'⭐'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)} <b>Party feedback: ${f.rating}/5</b>${f.ref ? ` · <code>${f.ref}</code>` : ''}`);
  if (f.comment) { L.push(''); L.push(`💬 “${esc(f.comment)}”`); }
  if (f.photo) L.push('📷 Photo below');
  L.push('');
  if (f.rating >= 4) L.push(`💖 <b>Happy host: send their referral link.</b>${f.ref ? ` It’s at the end of the request message for ${f.ref}.` : ''}`);
  else L.push('📞 <b>Not a great experience: call or WhatsApp them personally.</b> Hold off on the referral link.');
  if (!f.ref) L.push('ℹ️ No booking reference (opened without the link from WhatsApp).');
  return L.join('\n');
}
