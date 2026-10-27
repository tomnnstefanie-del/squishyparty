// Itemised PDF quotation, made on the server from the same pricing as the request (lib/pricing.js), so the PDF always
// matches what the customer saw. A small hand-written PDF (A4, the built-in Helvetica fonts, the logo as a JPEG):
// no extra packages, nothing to download at run time. Text outside Western European characters prints as "?".
import zlib from 'node:zlib';
import { formatPhone } from './phone.js';
import { LOGO } from './quote-logo.js';

// Character widths (1/1000 em) for codes 32-126, from the standard Helvetica and Helvetica-Bold metrics.
const W = {
  R: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],
  B: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584],
};
// Unicode -> WinAnsi for the few typographic characters we use; Latin-1 maps to itself.
const WIN = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97, '•': 0x95, '€': 0x80, '…': 0x85 };
const ASCII = { '″': '"', '′': "'", '−': '-', ' ': ' ' };
const WIN_W = { 0x92: 222, 0x91: 222, 0x93: 333, 0x94: 333, 0x96: 556, 0x97: 1000, 0x95: 350, 0x80: 556, 0x85: 1000, 0xd7: 584 };

function codes(s) {
  return [...String(s)].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 32 && c <= 126) return c;
    if (WIN[ch]) return WIN[ch];
    if (c >= 0xa0 && c <= 0xff) return c;
    if (ASCII[ch]) return ASCII[ch].charCodeAt(0);
    const base = ch.normalize('NFKD').charAt(0).codePointAt(0); // e.g. letters with accents outside Latin-1
    return base >= 32 && base <= 126 ? base : 63; // "?"
  });
}
const widthOf = (s, font, size) => codes(s).reduce((a, c) => a + (c >= 32 && c <= 126 ? W[font][c - 32] : WIN_W[c] || 556), 0) * size / 1000;
const pdfStr = (s) => '(' + codes(s).map((c) => (c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c) : c < 128 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0'))).join('') + ')';

function wrapText(s, font, size, maxW) {
  const out = []; let line = '';
  for (const word of String(s).split(/\s+/).filter(Boolean)) {
    const t = line ? line + ' ' + word : word;
    if (widthOf(t, font, size) <= maxW || !line) line = t; else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

const INK = [0.086, 0.094, 0.227], MUTED = [0.42, 0.435, 0.56], LINE = [0.88, 0.87, 0.85], PINK = [0.89, 0.18, 0.33], SOFT = [0.95, 0.94, 0.99], COBALT = [0.15, 0.2, 0.77];
const sgd = (cents) => (cents < 0 ? '-' : '') + 'S$' + (Math.abs(cents) / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function longDate(d) { return new Date(d + 'T00:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' }); }
function clock(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; }

/** The $10 friend referral, if it applies: a valid code (or the capsule QR), not their own, and a first party. */
export function referralDiscount(referral, readReferralCode, samePerson, name) {
  const r = referral || {}; if (r.returning) return 0;
  const used = r.code ? readReferralCode(r.code) : null;
  if (used && used.valid && !samePerson(used, name)) return 1000;
  if (!used && r.source === 'capsule') return 1000;
  return 0;
}

/**
 * Builds the quotation PDF. Returns a Buffer.
 * q: { ref, issued (Date), plan, contact, price, bookingFor, discountCents, contactEmail, site }
 */
export function quotePdf(q) {
  const A4 = [595.28, 841.89], M = 48, R = A4[0] - M;
  const pages = []; let ops = [], y = 0;
  const newPage = () => { ops = []; pages.push(ops); y = 0; };
  const Y = (top) => A4[1] - top; // we lay out from the top; PDF counts from the bottom
  const rgb = (c, stroke) => `${c.map((v) => v.toFixed(3)).join(' ')} ${stroke ? 'RG' : 'rg'}`;
  const text = (s, x, top, { font = 'R', size = 10, color = INK, align = 'left' } = {}) => {
    const w = widthOf(s, font, size), tx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ops.push(`BT ${rgb(color)} /F${font} ${size} Tf ${tx.toFixed(2)} ${Y(top).toFixed(2)} Td ${pdfStr(s)} Tj ET`);
  };
  const hline = (top, color = LINE) => ops.push(`${rgb(color, true)} 0.8 w ${M} ${Y(top).toFixed(2)} m ${R} ${Y(top).toFixed(2)} l S`);
  const pill = (x, top, w, h, color) => { // rounded rectangle, filled
    const r = h / 2, b = Y(top + h), k = 0.5523 * r;
    ops.push(`${rgb(color)} ${x + r} ${b} m ${x + w - r} ${b} l ${x + w - r + k} ${b} ${x + w} ${b + r - k} ${x + w} ${b + r} c ${x + w} ${b + r + k} ${x + w - r + k} ${b + h} ${x + w - r} ${b + h} c ${x + r} ${b + h} l ${x + r - k} ${b + h} ${x} ${b + r + k} ${x} ${b + r} c ${x} ${b + r - k} ${x + r - k} ${b} ${x + r} ${b} c f`);
  };
  const ensure = (need) => { if (y + need > A4[1] - 56) { newPage(); y = M; } };

  const { plan, contact, price } = q;
  const company = q.bookingFor === 'company' && contact.companyName;
  const discount = q.discountCents || 0;
  const total = price.totalCents - discount;
  const quoteNo = 'Q-' + q.ref;
  const issued = (q.issued || new Date()).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });

  newPage();
  // Header: logo and line, QUOTATION and its status
  const lh = 40, lw = lh * LOGO.w / LOGO.h;
  ops.push(`q ${lw.toFixed(2)} 0 0 ${lh} ${M} ${Y(40 + lh).toFixed(2)} cm /Logo Do Q`);
  text('Parties worth sharing.', M, 96, { size: 9, color: MUTED });
  text('QUOTATION', R, 64, { font: 'B', size: 20, align: 'right' });
  const st = 'Pending availability', sw = widthOf(st, 'B', 8.5) + 18;
  pill(R - sw, 76, sw, 17, SOFT); text(st, R - sw / 2, 88, { font: 'B', size: 8.5, color: COBALT, align: 'center' });
  hline(114);

  // Prepared for / quote number
  const label = (s, x, top) => text(s.toUpperCase(), x, top, { font: 'B', size: 7, color: MUTED });
  const C2 = 330;
  label('Prepared for', M, 138); label('Quote number', C2, 138);
  y = 156;
  const forLines = [];
  if (company) { forLines.push([contact.companyName, 'B', 12.5]); forLines.push(['Attn: ' + contact.parentName, 'R', 9.5]); forLines.push(['Corporate event' + (contact.companyUen ? ' · UEN ' + contact.companyUen : ''), 'R', 9.5]); }
  else { forLines.push([contact.parentName, 'B', 12.5]); forLines.push(['Private celebration', 'R', 9.5]); }
  forLines.push([contact.email, 'R', 9.5]);
  forLines.push([formatPhone(contact.phone) + ' (WhatsApp)', 'R', 9.5]);
  if (company && contact.billingEmail && contact.billingEmail !== contact.email) forLines.push(['Invoice to ' + contact.billingEmail, 'R', 9.5]);
  let fy = y;
  for (const [s, f, z] of forLines) { for (const l of wrapText(s, f, z, C2 - M - 16)) { text(l, M, fy, { font: f, size: z, color: f === 'B' ? INK : [0.25, 0.27, 0.4] }); fy += z + 4; } }
  text(quoteNo, C2, y, { font: 'B', size: 12.5 });
  text('Issued ' + issued, C2, y + 16.5, { size: 9.5, color: [0.25, 0.27, 0.4] });
  text('Request reference ' + q.ref, C2, y + 30, { size: 9.5, color: [0.25, 0.27, 0.4] });
  y = Math.max(fy, y + 40) + 14;

  // Event details
  label('Event details', M, y); y += 18;
  const venue = [contact.venueName, `${contact.address}, Singapore ${contact.postalCode}`].filter(Boolean).join(', ');
  const rows = [
    ['Date', longDate(plan.date)],
    ['Time', `${clock(plan.start)} – ${clock(plan.end)}`],
    ['Participants', String(plan.participants) + (plan.participants < price.billableParticipants ? ` (minimum charge is ${price.billableParticipants})` : '')],
    ['Venue', venue],
  ];
  for (const [k, v] of rows) {
    const lines = wrapText(v, 'B', 10, 300);
    text(k, M, y, { size: 10, color: [0.25, 0.27, 0.4] });
    lines.forEach((l, i) => text(l, R, y + i * 14, { font: 'B', size: 10, align: 'right' }));
    y += 14 * lines.length + 6;
  }
  y += 6; hline(y); y += 24;

  // Items
  const head = () => { text('Description', M, y, { font: 'B', size: 8.5, color: MUTED }); text('Amount', R, y, { font: 'B', size: 8.5, color: MUTED, align: 'right' }); y += 8; hline(y); y += 18; };
  head();
  const item = (title, sub, amount, opts = {}) => {
    const tl = wrapText(title, 'R', 10, 340), sl = sub ? wrapText(sub, 'R', 8.5, 340) : [];
    ensure(tl.length * 13 + sl.length * 11 + 14);
    tl.forEach((l, i) => text(l, M, y + i * 13, { size: 10 }));
    text(amount, R, y, { size: 10, font: opts.bold ? 'B' : 'R', color: opts.color || INK, align: 'right' });
    let yy = y + tl.length * 13;
    sl.forEach((l, i) => text(l, M, yy - 1 + i * 11, { size: 8.5, color: MUTED }));
    yy += sl.length * 11;
    y = yy + 9;
  };
  text('Squishy DIY', M, y, { font: 'B', size: 10.5, color: COBALT }); y += 18;
  for (const l of price.squishy) item(l.label.replace(/ × \$/g, ' × S$').replace(/ x \$/g, ' x S$'), '', sgd(l.cents));
  if (price.addons.length) {
    ensure(40); y += 4; text('Add-ons', M, y, { font: 'B', size: 10.5, color: COBALT }); y += 18;
    for (const a of price.addons) {
      const sub = [a.vendor, a.quantity > 1 ? `${a.quantity} ×` : '', a.demo ? 'estimated price, confirmed in your final quote' : ''].filter(Boolean).join(' · ');
      item(a.name, sub, a.cents == null ? 'In final quote' : sgd(a.cents), { color: a.cents == null ? MUTED : INK });
    }
  }
  if (discount) item('Friend’s referral: $10 off your first party', 'Applied once we’ve checked the code', '-' + sgd(discount).replace('-', ''), { color: PINK, bold: true });

  // Total
  ensure(64); hline(y - 2); y += 26;
  text('Estimated total', M, y, { font: 'B', size: 13 });
  text(sgd(total) + (price.onQuote.length ? ' +' : ''), R, y + 2, { font: 'B', size: 20, align: 'right' });
  y += 22;
  const fine = [];
  if (discount) fine.push(`Before the referral discount: ${sgd(price.totalCents)}.`);
  if (price.onQuote.length) fine.push(`Plus ${price.onQuote.map((a) => a.name).join(', ')}, priced in your final quote.`);
  if (price.addons.some((a) => a.demo)) fine.push('Partner prices marked as estimated are confirmed in your final quote.');
  fine.push('All prices in Singapore dollars.');
  for (const l of wrapText(fine.join(' '), 'R', 8.5, R - M)) { text(l, M, y, { size: 8.5, color: MUTED }); y += 11; }

  // Notes
  ensure(80); y += 12; hline(y); y += 24;
  text('Important notes', M, y, { font: 'B', size: 11 }); y += 16;
  const notes = 'This quotation is not a confirmed booking or invoice. Your date, availability and final arrangements are subject to confirmation by Confetti Club. No payment is due on receiving this quotation. We’ll reach out on WhatsApp to confirm.';
  for (const l of wrapText(notes, 'R', 9, R - M)) { text(l, M, y, { size: 9, color: [0.25, 0.27, 0.4] }); y += 12.5; }

  // Footer on every page
  pages.forEach((p, i) => {
    ops = p;
    const foot = ['Confetti Club', q.contactEmail, q.site && q.site.replace(/^https?:\/\//, '')].filter(Boolean).join('  ·  ');
    text(foot, M, A4[1] - 34, { size: 8, color: MUTED });
    text(`${quoteNo}  ·  Page ${i + 1} of ${pages.length}`, R, A4[1] - 34, { size: 8, color: MUTED, align: 'right' });
  });

  // Assemble the file
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };
  const catalog = add(null), pagesId = add(null);
  const fR = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const jpg = Buffer.from(LOGO.b64, 'base64');
  const logo = add({ dict: `<< /Type /XObject /Subtype /Image /Width ${LOGO.w} /Height ${LOGO.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, data: jpg });
  const kids = pages.map((p) => {
    const z = zlib.deflateSync(Buffer.from(p.join('\n'), 'latin1'));
    const content = add({ dict: `<< /Filter /FlateDecode /Length ${z.length} >>`, data: z });
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Resources << /Font << /FR ${fR} 0 R /FB ${fB} 0 R >> /XObject << /Logo ${logo} 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${pdfStr('Confetti Club quotation ' + quoteNo)} /Author (Confetti Club) /Producer (Confetti Club) >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let size = chunks[0].length; const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(size);
    const parts = typeof o === 'string' ? [Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1')]
      : [Buffer.from(`${i + 1} 0 obj\n${o.dict}\nstream\n`, 'latin1'), o.data, Buffer.from('\nendstream\nendobj\n', 'latin1')];
    parts.forEach((b) => { chunks.push(b); size += b.length; });
  });
  const xref = ['xref', `0 ${objs.length + 1}`, '0000000000 65535 f ', ...offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n ')].join('\n');
  chunks.push(Buffer.from(`${xref}\ntrailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${size}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}
