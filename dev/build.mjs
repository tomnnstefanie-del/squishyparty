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

// <head> (meta, fonts, base styles) comes from base.html
let head = base.slice(0, base.indexOf('</style>') + '</style>'.length);
head = replaceAll(head, '<title>Squishy Party · Tom &amp; Stefanie</title>', '<title>Squishy Party · Party Planner</title>');
head = replaceAll(head, 'content="A hosted squishy-making birthday party at your venue. Choose Squishy Party or Signature with both textures, decorated take-home containers and a birthday finale. By Tom &amp; Stefanie."', 'content="Plan a birthday celebration built on our Squishy DIY experience, with cakes from partner bakeries, curated add-ons, one itemised total and one coordinating team. By Tom &amp; Stefanie."');

// Component styles and the icon sprite from base-v2.html, plus the "x" icon
const v2style = v2.slice(0, v2.indexOf('</style>') + 8);
const s0 = v2.indexOf('<svg width="0"');
const v2sprite = replaceAll(v2.slice(s0, v2.indexOf('</svg>', s0) + 6), '</svg>', '  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>\n</svg>');
const b0 = base.indexOf('<body>');
const sprite = base.slice(b0, base.indexOf('</svg>', b0) + 6);

let out = head + '\n' + v2style + '\n<style>\n' + src('styles.css') + '</style>\n</head>\n' + sprite + '\n' + v2sprite + '\n' + src('markup.html') + '\n<script>' + js + '</script>\n</body>\n</html>\n';

// Hero and Jelly / Crunchy / Duo photos are embedded so the first screen needs no extra requests
out = replaceAll(out, '__IMG__', 'data:image/webp;base64,' + b64('src/img/hero.webp'));
for (const k of ['jelly', 'crunchy', 'both']) out = replaceAll(out, `__EXP_${k}__`, 'data:image/webp;base64,' + b64(`src/img/exp-${k}.webp`));
if (out.includes('__EXP_') || out.includes('__IMG__')) throw new Error('An image placeholder was not replaced');

fs.writeFileSync(path.join(root, 'public/index.html'), out);
console.log('built public/index.html', (out.length / 1024).toFixed(0) + ' KB');

if (process.argv.includes('--preview')) {
  // Offline preview: embed the photos from public/img too (the live site loads them as files).
  let prev = out, n = 0;
  for (const sub of ['making', 'how', 'cakes']) {
    const dir = path.join(root, 'public/img', sub);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jpg')).sort()) {
      prev = replaceAll(prev, `'img/${sub}/${f}'`, `'data:image/jpeg;base64,${b64(`public/img/${sub}/${f}`)}'`); n++;
    }
  }
  prev = replaceAll(prev, 'src="img/store.jpg"', `src="data:image/jpeg;base64,${b64('public/img/store.jpg')}"`); n++;
  fs.mkdirSync(path.join(root, '.preview'), { recursive: true });
  fs.writeFileSync(path.join(root, '.preview/index.html'), prev);
  fs.writeFileSync(path.join(root, 'tools/mobile-studio/site.html'), prev);
  console.log(`preview: .preview/index.html and tools/mobile-studio/site.html (${n} photos embedded)`);
}
