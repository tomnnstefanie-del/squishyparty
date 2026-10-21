// Rebuilds lib/catalogue.js from the price list inside public/index.html (run: npm run catalogue) so the server and the page always price the same way.
import fs from 'fs';
const src = fs.readFileSync(process.argv[2], 'utf8');
const grab = (start, endTok = '];') => { const i = src.indexOf(start); const j = src.indexOf(endTok, i) + endTok.length; return src.slice(i, j); };
const consts = src.slice(src.indexOf('  var MIN_PAX'), src.indexOf('\n', src.indexOf('  var MIN_PAX')));
const code = [consts, grab('  var EXP = {', '};'), grab('  var CATS = ['), grab('  var P = [')].join('\n') +
  '\nreturn {MIN_PAX, CONTAINER, WAX, WAX_DUO, WAX_DUO_UP, LOGISTICS, TEAM_HOURS, SETUP_MIN, PLAY_MIN, EXP, CATS, P};';
const data = new Function(code)();
data.P = data.P.map(p => ({ id:p.id, cat:p.cat, name:p.name, vendor:p.vendor, status:p.status, basis:p.basis, price:p.price, min:p.min || 0 }));
data.CATS = data.CATS.map(c => ({ id:c.id, title:c.title }));
fs.writeFileSync(process.argv[3], '// Generated from the page script by dev/extract-catalogue.mjs. The server prices every request from this file.\nexport const CATALOGUE = ' + JSON.stringify(data, null, 2) + ';\n');
console.log('items:', data.P.length, 'exp:', Object.keys(data.EXP).join(','), 'consts:', data.MIN_PAX, data.CONTAINER, data.WAX, data.WAX_DUO, data.LOGISTICS);
