// Builds public/index.html (the whole website, one file) from the sources in src/.
//   npm run build            -> public/index.html  (what Vercel serves)
//   npm run build -- --preview -> also .preview/index.html and tools/mobile-studio/site.html,
//                               with every photo embedded so the page works offline / in the Mobile Studio.
// Never edit public/index.html by hand: edit src/ and rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from '../lib/phone.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const b64 = (f) => fs.readFileSync(path.join(root, f)).toString('base64');
const replaceAll = (s, a, b) => s.split(a).join(b);

const base = src('base.html'), v2 = src('base-v2.html');
// The WhatsApp country list comes from lib/phone.js, so the page and the server check numbers the same way.
const js = src('app.js').replace('/*__COUNTRIES__*/[]', JSON.stringify(COUNTRIES));
if (!js.includes('["SG","Singapore"')) throw new Error('The country list was not added to app.js');

// The public address. Change it here (or set SITE_URL) when a custom domain is added.
const SITE = (process.env.SITE_URL || 'https://confetticlub.vercel.app').replace(/\/$/, '');
const markup = src('markup.html');

// <head> (meta, fonts, base styles) comes from base.html
let head = base.slice(0, base.indexOf('</style>') + '</style>'.length);
const TITLE = 'Confetti Club | Squishy-Making Birthday Parties &amp; Team Bonding in Singapore';
const DESC = 'Trending activities for birthday parties and team bonding in Singapore. Hosted squishy-making at your home, office or venue, from $16 per person.';
head = replaceAll(head, '<title>Squishy Party · Tom &amp; Stefanie</title>', '<title>' + TITLE + '</title>');
head = head.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + DESC + '">');
if (!head.includes(DESC)) throw new Error('The meta description was not replaced');

// Search and social: canonical address, link previews (WhatsApp, Facebook, Telegram) and structured data for Google.
const text = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const faq = [...markup.matchAll(/<details class="acc"(?: open)?><summary>(.*?)<\/summary><div class="acc-body">(.*?)<\/div><\/details>/g)]
  .map((m) => ({ '@type': 'Question', name: text(m[1]), acceptedAnswer: { '@type': 'Answer', text: text(m[2]) } }));
if (faq.length < 5) throw new Error('FAQ questions were not found for the structured data');
const org = { '@type': 'Organization', '@id': SITE + '/#org', name: 'Confetti Club', alternateName: 'Confetti Club by Tom & Stefanie', slogan: 'Trending activities for birthday parties & team bonding', url: SITE + '/', logo: SITE + '/img/logo.webp' };
const ld = { '@context': 'https://schema.org', '@graph': [
  org,
  { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'Confetti Club', publisher: { '@id': org['@id'] }, inLanguage: 'en-SG' },
  // Prices mirror the FAQ ("Jelly is $16, Crunchy $18 and the Duo $26 per child").
  { '@type': 'Service', name: 'Squishy-making birthday party', serviceType: 'Kids’ birthday party activity', provider: { '@id': org['@id'] },
    areaServed: { '@type': 'Country', name: 'Singapore' }, description: text(DESC), image: SITE + '/img/og.jpg',
    offers: { '@type': 'AggregateOffer', priceCurrency: 'SGD', lowPrice: 16, highPrice: 26, offerCount: 3 } },
  { '@type': 'FAQPage', mainEntity: faq }
] };
head = replaceAll(head, '</title>', '</title>\n' + [
  `<link rel="canonical" href="${SITE}/">`,
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Confetti Club">',
  `<meta property="og:title" content="${TITLE}">`,
  `<meta property="og:description" content="${DESC}">`,
  `<meta property="og:url" content="${SITE}/">`,
  `<meta property="og:image" content="${SITE}/img/og.jpg">`,
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
  '<meta property="og:locale" content="en_SG">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>'
].join('\n'));

// robots.txt and sitemap.xml follow the same address
fs.writeFileSync(path.join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n  <url><loc>${SITE}/stores.html</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`);

// Component styles and the icon sprite from base-v2.html, plus the "x" icon
const v2style = v2.slice(0, v2.indexOf('</style>') + 8);
const s0 = v2.indexOf('<svg width="0"');
const v2sprite = replaceAll(v2.slice(s0, v2.indexOf('</svg>', s0) + 6), '</svg>', '  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>\n  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>\n  <symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></symbol>\n</svg>');
const b0 = base.indexOf('<body>');
const sprite = base.slice(b0, base.indexOf('</svg>', b0) + 6);

let out = head + '\n' + v2style + '\n<style>\n' + src('styles.css') + '</style>\n</head>\n' + sprite + '\n' + v2sprite + '\n' + markup + '\n<script>' + js + '</script>\n</body>\n</html>\n';

// Hero and Jelly / Crunchy / Duo photos are embedded so the first screen needs no extra requests
out = replaceAll(out, '__IMG__', 'data:image/webp;base64,' + b64('src/img/hero.webp'));
for (const k of ['jelly', 'crunchy', 'both']) out = replaceAll(out, `__EXP_${k}__`, 'data:image/webp;base64,' + b64(`src/img/exp-${k}.webp`));
if (out.includes('__EXP_') || out.includes('__IMG__')) throw new Error('An image placeholder was not replaced');

fs.writeFileSync(path.join(root, 'public/index.html'), out);
console.log('built public/index.html', (out.length / 1024).toFixed(0) + ' KB');

// Our stores: a separate page. Header and footer come from markup.html, with in-page links pointed back at the main page.
const toMain = (h) => h.replace(/<a href="#explore" data-tab-link="(tab-\w+)"/g, '<a href="./#$1"').replace(/href="#top"/g, 'href="./"').replace(/href="#/g, 'href="./#');
const header = toMain(markup.slice(markup.indexOf('<header class="site-header"'), markup.indexOf('</header>') + 9));
const footer = toMain(markup.slice(markup.indexOf('<footer>'), markup.indexOf('</footer>') + 9));
// Extra pages (Our stores, Feedback) share the head, styles, icons, header and footer.
function subPage(file, { title, desc, ogTitle, noindex }) {
  const h = head.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`)
    .replace(`<link rel="canonical" href="${SITE}/">`, `<link rel="canonical" href="${SITE}/${file}">`).replace(`<meta property="og:url" content="${SITE}/">`, `<meta property="og:url" content="${SITE}/${file}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${ogTitle}">`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '') + (noindex ? '\n<meta name="robots" content="noindex">' : '');
  const page = h + '\n' + v2style + '\n<style>\n' + src('styles.css') + '</style>\n</head>\n' + sprite + '\n' + v2sprite + '\n' + src(file).replace('__HEADER__', header).replace('__FOOTER__', footer) + '\n</body>\n</html>\n';
  if (page.includes('__HEADER__') || page.includes('__FOOTER__')) throw new Error(`${file}: header or footer was not filled in`);
  fs.writeFileSync(path.join(root, 'public', file), page);
  return page;
}
const stores = subPage('stores.html', { title: 'Our Stores | Confetti Club by Tom &amp; Stefanie', ogTitle: 'Our Stores | Confetti Club',
  desc: 'Try squishy-making at the Tom &amp; Stefanie squishy bar: Woodlands Civic Centre, Paya Lebar Quarter (PLQ) and Eastpoint Mall, Singapore. Addresses, phone numbers and opening hours.' });
// Feedback: linked from the after-party WhatsApp message, and kept out of search results.
const feedback = subPage('feedback.html', { title: 'How was your party? | Confetti Club', ogTitle: 'How was your party? | Confetti Club', noindex: true,
  desc: 'Tell us how your Confetti Club party went. It takes 15 seconds.' });
// Private referral dashboard (password in Vercel), also kept out of search results.
subPage('admin.html', { title: 'Dashboard | Confetti Club', ogTitle: 'Confetti Club', noindex: true, desc: 'Private dashboard.' });

if (process.argv.includes('--preview')) {
  // Offline preview: embed the photos from public/img too (the live site loads them as files).
  let prev = out, n = 0;
  for (const sub of ['making', 'how', 'butter', 'bloom', 'events', 'partypainters', 'jsquare']) {
    const dir = path.join(root, 'public/img', sub);
    for (const f of fs.readdirSync(dir).filter((x) => /\.(jpg|png|webp)$/.test(x)).sort()) {
      const type = f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      prev = replaceAll(prev, `'img/${sub}/${f}'`, `'data:${type};base64,${b64(`public/img/${sub}/${f}`)}'`); n++;
    }
  }
  prev = replaceAll(prev, 'url("fonts/flags.woff2")', `url("data:font/woff2;base64,${b64('public/fonts/flags.woff2')}")`);
  prev = replaceAll(prev, 'src="img/logo.webp"', `src="data:image/webp;base64,${b64('public/img/logo.webp')}"`);
  prev = replaceAll(prev, 'href="img/icon.png"', `href="data:image/png;base64,${b64('public/img/icon.png')}"`);
  prev = replaceAll(prev, 'src="img/store.jpg"', `src="data:image/jpeg;base64,${b64('public/img/store.jpg')}"`); n++;
  fs.mkdirSync(path.join(root, '.preview'), { recursive: true });
  fs.writeFileSync(path.join(root, '.preview/index.html'), prev);
  fs.writeFileSync(path.join(root, 'tools/mobile-studio/site.html'), prev);
  let prevStores = replaceAll(stores, 'src="img/logo.webp"', `src="data:image/webp;base64,${b64('public/img/logo.webp')}"`);
  prevStores = replaceAll(prevStores, 'href="img/icon.png"', `href="data:image/png;base64,${b64('public/img/icon.png')}"`);
  prevStores = prevStores.replace(/href="\.\/(#[^"]*)?"/g, (m, h) => `href="index.html${h || ''}"`);
  fs.writeFileSync(path.join(root, '.preview/stores.html'), prevStores);
  let prevFb = replaceAll(feedback, 'src="img/logo.webp"', `src="data:image/webp;base64,${b64('public/img/logo.webp')}"`);
  prevFb = replaceAll(prevFb, 'href="img/icon.png"', `href="data:image/png;base64,${b64('public/img/icon.png')}"`);
  fs.writeFileSync(path.join(root, '.preview/feedback.html'), prevFb.replace(/href="\.\/(#[^"]*)?"/g, (m, h) => `href="index.html${h || ''}"`));
  console.log(`preview: .preview/index.html and tools/mobile-studio/site.html (${n} photos embedded)`);
}
