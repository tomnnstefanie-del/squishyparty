// Builds public/index.html (the whole website, one file) from the sources in src/.
//   npm run build            -> public/index.html  (what Vercel serves)
//   npm run build -- --preview -> also .preview/index.html and tools/mobile-studio/site.html,
//                               with every photo embedded so the page works offline / in the Mobile Studio.
// Never edit public/index.html by hand: edit src/ and rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const b64 = (f) => fs.readFileSync(path.join(root, f)).toString('base64');
const replaceAll = (s, a, b) => s.split(a).join(b);

const base = src('base.html'), v2 = src('base-v2.html'), js = src('app.js');

// The public address. Change it here (or set SITE_URL) when a custom domain is added.
const SITE = (process.env.SITE_URL || 'https://squishyparty.vercel.app').replace(/\/$/, '');
const markup = src('markup.html');

// <head> (meta, fonts, base styles) comes from base.html
let head = base.slice(0, base.indexOf('</style>') + '</style>'.length);
const TITLE = 'Squishy-Making Birthday Parties in Singapore | Squishy Party by Tom &amp; Stefanie';
const DESC = 'Kids’ squishy-making parties at your home, condo or venue in Singapore. Jelly, Crunchy or Duo DIY from $16 per child, hosted by our team. Team bonding too.';
head = replaceAll(head, '<title>Squishy Party · Tom &amp; Stefanie</title>', '<title>' + TITLE + '</title>');
head = head.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + DESC + '">');
if (!head.includes(DESC)) throw new Error('The meta description was not replaced');

// Search and social: canonical address, link previews (WhatsApp, Facebook, Telegram) and structured data for Google.
const text = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const faq = [...markup.matchAll(/<details class="acc"(?: open)?><summary>(.*?)<\/summary><div class="acc-body">(.*?)<\/div><\/details>/g)]
  .map((m) => ({ '@type': 'Question', name: text(m[1]), acceptedAnswer: { '@type': 'Answer', text: text(m[2]) } }));
if (faq.length < 5) throw new Error('FAQ questions were not found for the structured data');
const org = { '@type': 'Organization', '@id': SITE + '/#org', name: 'Squishy Party by Tom & Stefanie', url: SITE + '/', logo: SITE + '/img/og.jpg' };
const ld = { '@context': 'https://schema.org', '@graph': [
  org,
  { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'Squishy Party', publisher: { '@id': org['@id'] }, inLanguage: 'en-SG' },
  // Prices mirror the FAQ ("Jelly is $16, Crunchy $18 and the Duo $26 per child").
  { '@type': 'Service', name: 'Squishy-making birthday party', serviceType: 'Kids’ birthday party activity', provider: { '@id': org['@id'] },
    areaServed: { '@type': 'Country', name: 'Singapore' }, description: text(DESC), image: SITE + '/img/og.jpg',
    offers: { '@type': 'AggregateOffer', priceCurrency: 'SGD', lowPrice: 16, highPrice: 26, offerCount: 3 } },
  { '@type': 'FAQPage', mainEntity: faq }
] };
head = replaceAll(head, '</title>', '</title>\n' + [
  `<link rel="canonical" href="${SITE}/">`,
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Squishy Party">',
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
fs.writeFileSync(path.join(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`);

// Component styles and the icon sprite from base-v2.html, plus the "x" icon
const v2style = v2.slice(0, v2.indexOf('</style>') + 8);
const s0 = v2.indexOf('<svg width="0"');
const v2sprite = replaceAll(v2.slice(s0, v2.indexOf('</svg>', s0) + 6), '</svg>', '  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>\n</svg>');
const b0 = base.indexOf('<body>');
const sprite = base.slice(b0, base.indexOf('</svg>', b0) + 6);

let out = head + '\n' + v2style + '\n<style>\n' + src('styles.css') + '</style>\n</head>\n' + sprite + '\n' + v2sprite + '\n' + markup + '\n<script>' + js + '</script>\n</body>\n</html>\n';

// Hero and Jelly / Crunchy / Duo photos are embedded so the first screen needs no extra requests
out = replaceAll(out, '__IMG__', 'data:image/webp;base64,' + b64('src/img/hero.webp'));
for (const k of ['jelly', 'crunchy', 'both']) out = replaceAll(out, `__EXP_${k}__`, 'data:image/webp;base64,' + b64(`src/img/exp-${k}.webp`));
if (out.includes('__EXP_') || out.includes('__IMG__')) throw new Error('An image placeholder was not replaced');

fs.writeFileSync(path.join(root, 'public/index.html'), out);
console.log('built public/index.html', (out.length / 1024).toFixed(0) + ' KB');

if (process.argv.includes('--preview')) {
  // Offline preview: embed the photos from public/img too (the live site loads them as files).
  let prev = out, n = 0;
  for (const sub of ['making', 'how', 'cakes', 'bloom', 'events']) {
    const dir = path.join(root, 'public/img', sub);
    for (const f of fs.readdirSync(dir).filter((x) => /\.(jpg|png)$/.test(x)).sort()) {
      const type = f.endsWith('.png') ? 'image/png' : 'image/jpeg';
      prev = replaceAll(prev, `'img/${sub}/${f}'`, `'data:${type};base64,${b64(`public/img/${sub}/${f}`)}'`); n++;
    }
  }
  prev = replaceAll(prev, 'src="img/store.jpg"', `src="data:image/jpeg;base64,${b64('public/img/store.jpg')}"`); n++;
  fs.mkdirSync(path.join(root, '.preview'), { recursive: true });
  fs.writeFileSync(path.join(root, '.preview/index.html'), prev);
  fs.writeFileSync(path.join(root, 'tools/mobile-studio/site.html'), prev);
  console.log(`preview: .preview/index.html and tools/mobile-studio/site.html (${n} photos embedded)`);
}
