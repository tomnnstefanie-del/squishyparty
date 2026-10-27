// WhatsApp numbers: a country code from a short list, then the local number checked for its length (and first digit
// where mobiles always start the same way). The same list is built into the page (dev/build.mjs), so both agree.
// Stored as international digits without "+", e.g. "6592979765", which is what wa.me links need.

// A to Z by name (the page selects Singapore by default).
// [ISO code, name, dialling code, shortest, longest, mobile numbers start with (optional), example]
export const COUNTRIES = [
  ['AU', 'Australia', '61', 9, 9, '4', '412 345 678'],
  ['CA', 'Canada', '1', 10, 10, '', '506 234 5678'],
  ['CN', 'China', '86', 11, 11, '1', '131 2345 6789'],
  ['FR', 'France', '33', 9, 9, '67', '6 12 34 56 78'],
  ['DE', 'Germany', '49', 10, 11, '1', '1512 3456789'],
  ['HK', 'Hong Kong', '852', 8, 8, '4569', '5123 4567'],
  ['IN', 'India', '91', 10, 10, '6789', '98765 43210'],
  ['ID', 'Indonesia', '62', 9, 12, '8', '812 3456 7890'],
  ['JP', 'Japan', '81', 10, 10, '789', '90 1234 5678'],
  ['MO', 'Macau', '853', 8, 8, '6', '6612 3456'],
  ['MY', 'Malaysia', '60', 9, 10, '1', '12 345 6789'],
  ['NZ', 'New Zealand', '64', 8, 10, '2', '21 123 4567'],
  ['PH', 'Philippines', '63', 10, 10, '9', '917 123 4567'],
  ['SG', 'Singapore', '65', 8, 8, '89', '8123 4567'],
  ['KR', 'South Korea', '82', 9, 10, '1', '10 1234 5678'],
  ['TW', 'Taiwan', '886', 9, 9, '9', '912 345 678'],
  ['TH', 'Thailand', '66', 9, 9, '689', '81 234 5678'],
  ['AE', 'United Arab Emirates', '971', 9, 9, '5', '50 123 4567'],
  ['GB', 'United Kingdom', '44', 10, 10, '7', '7400 123456'],
  ['US', 'United States', '1', 10, 10, '', '201 555 0123'],
  ['VN', 'Vietnam', '84', 9, 9, '35789', '91 234 5678'],
];

const byIso = Object.fromEntries(COUNTRIES.map((c) => [c[0], c]));

/** Checks a number for a country. Returns { ok, e164, local, error }. Accepts "+65 9123 4567", "91234567", "0412 345 678". */
export function checkPhone(iso, input) {
  const c = byIso[iso] || byIso.SG;
  const [, name, dial, min, max, starts, example] = c;
  let d = String(input || '').replace(/\D/g, '');
  const typedPlus = /^\s*(\+|00)/.test(String(input || ''));
  if (typedPlus) { d = d.replace(/^00/, ''); if (d.startsWith(dial)) d = d.slice(dial.length); }
  else if (d.startsWith(dial) && d.length - dial.length >= min && d.length - dial.length <= max) d = d.slice(dial.length);
  if (d.length > min && d.startsWith('0')) d = d.slice(1); // trunk "0", e.g. UK 07400 123456
  const lenTxt = min === max ? `${min} digits` : `${min} to ${max} digits`;
  const error = `${name} mobile numbers have ${lenTxt}${starts ? ` and start with ${[...starts].join(', ').replace(/, (\d)$/, ' or $1')}` : ''}, e.g. ${example}.`;
  if (!d) return { ok: false, error: 'Please add your mobile number.' };
  if (d.length < min || d.length > max || (starts && !starts.includes(d[0]))) return { ok: false, local: d, error };
  return { ok: true, local: d, e164: dial + d };
}

/** "6592979765" -> "+65 9297 9765" (local part in groups of 4, or 3-3-4 for 10 digits). */
export function formatPhone(e164) {
  const d = String(e164 || '');
  const c = COUNTRIES.filter((x) => d.startsWith(x[2])).sort((a, b) => b[2].length - a[2].length)[0];
  if (!c) return '+' + d;
  const l = d.slice(c[2].length);
  const g = l.length === 10 ? l.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : l.length === 8 ? l.replace(/(\d{4})(\d{4})/, '$1 $2') : l.replace(/(\d{3})(?=\d{3,}$)/g, '$1 ').trim();
  return `+${c[2]} ${g}`;
}
