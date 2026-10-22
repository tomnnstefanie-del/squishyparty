// PayNow QR (SGQR / EMVCo format) with the amount and reference filled in, so the customer's banking app
// shows the exact deposit and our reference. Free: no payment provider involved; money goes straight to your PayNow.
// Env: PAYNOW_UEN (business) or PAYNOW_MOBILE (e.g. 91234567), and PAYNOW_NAME (shown in the banking app).
import QRCode from 'qrcode';

const f = (id, v) => id + String(v.length).padStart(2, '0') + v;

function crc16(s) { // CRC-16/CCITT-FALSE, as required by EMVCo
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function paynowConfig() {
  const uen = (process.env.PAYNOW_UEN || '').trim().toUpperCase();
  const mobile = (process.env.PAYNOW_MOBILE || '').replace(/\D/g, '').replace(/^65(?=\d{8}$)/, '');
  if (uen) return { type: '2', proxy: uen, label: 'UEN ' + uen, name: process.env.PAYNOW_NAME || 'Tom & Stefanie' };
  if (/^[89]\d{7}$/.test(mobile)) return { type: '0', proxy: '+65' + mobile, label: '+65 ' + mobile.slice(0, 4) + ' ' + mobile.slice(4), name: process.env.PAYNOW_NAME || 'Tom & Stefanie' };
  return null;
}

/** EMVCo payload string. amountCents fixed (not editable); ref goes into the bill reference field. */
export function paynowPayload({ type, proxy, name, amountCents, ref, expiry }) {
  const merchant = f('00', 'SG.PAYNOW') + f('01', type) + f('02', proxy) + f('03', '0') + (expiry ? f('04', expiry) : '');
  const s = f('00', '01') + f('01', '12') + f('26', merchant) + f('52', '0000') + f('53', '702') +
    f('54', (amountCents / 100).toFixed(2)) + f('58', 'SG') + f('59', name.replace(/[^\w &.-]/g, '').slice(0, 25) || 'Squishy Party') +
    f('60', 'Singapore') + f('62', f('01', ref.slice(0, 25))) + '6304';
  return s + crc16(s);
}

/** Everything the page needs to show the deposit QR, or null if PayNow isn't set up yet. */
export async function paynowFor(amountCents, ref, now = new Date()) {
  const cfg = paynowConfig();
  if (!cfg || !amountCents) return null;
  const exp = new Date(now.getTime() + 3 * 864e5).toISOString().slice(0, 10).replace(/-/g, ''); // QR valid 3 days
  const payload = paynowPayload({ ...cfg, amountCents, ref, expiry: exp });
  const svg = await QRCode.toString(payload, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#7B1C7E', light: '#FFFFFF' } });
  const png = await QRCode.toBuffer(payload, { type: 'png', margin: 2, width: 480, color: { dark: '#7B1C7E', light: '#FFFFFF' } });
  return { payload, svg, png, payee: cfg.name, label: cfg.label, amountCents, ref };
}

export const _test = { crc16 };
