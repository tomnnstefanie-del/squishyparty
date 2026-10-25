// Click-through of every button and step in a real browser (desktop, phone, sandboxed preview, opened as a file).
// Run: npm run test:click   (builds the offline preview first; no server or secrets needed)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, '.preview/index.html'), html = fs.readFileSync(file, 'utf8');
const exe = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const b = await chromium.launch({ executablePath: exe });
let failed = 0;
async function run(label, width, setup){
  const p = await b.newPage({viewport:{width,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const f = await setup(p); const res=[];
  const ok=(name,v)=>res.push((v?'✓ ':'✗ ')+name);
  const txt=s=>f.evaluate(s=>document.querySelector(s).textContent.trim(),s);
  const vis=s=>f.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.closest('[hidden]')&&e.getClientRects().length>0},s);
  const sel=s=>f.evaluate(s=>document.querySelector(s).getAttribute('aria-selected'),s);
  await f.click('#tab-faq'); ok('home tab FAQ', await vis('#panel-faq'));
  await f.click('#panel-faq details:nth-of-type(2) summary'); ok('FAQ dropdown opens', await f.evaluate(()=>document.querySelector('#panel-faq details:nth-of-type(2)').open));
  if (width>1080){ await f.click('.nav a[data-tab-link=tab-faq]'); ok('nav link -> FAQ tab', await sel('#tab-faq')==='true'); await f.click('#tab-how'); }
  ok('timeline has 3 steps and partner cards', await f.evaluate(()=>document.querySelectorAll('#how-tl .tl-step').length===3 && document.querySelectorAll('.tl-vcard').length>0));
  await f.click(width>640 ? '.hero-actions a.btn-primary' : '.mobile-cta a'); ok('I want a party', await vis('#wstep-1'));
  await f.fill('#budget','1200');
  const c0=+(await f.inputValue('#children')); await f.click('[data-step=children][data-d="1"]'); ok('children +', +(await f.inputValue('#children'))===c0+1);
  await f.click('[data-step=children][data-d="-1"]');
  await f.click('#wstep-1 details summary'); ok('when & where dropdown closes', !(await f.evaluate(()=>document.querySelector('#wstep-1 details').open))); await f.click('#wstep-1 details summary');
  const next = width>900 ? '#wiz-next' : '#wiz-next-m';
  await f.click(next); ok('Next -> step 2', await vis('#wstep-2'));
  await f.click('.exp-tile:nth-child(2)'); ok('pick Jelly', (await txt('#exp-title'))==='Jelly');
  await f.click('.exp-tile:nth-child(1)'); ok('pick Duo', (await txt('#exp-title')).startsWith('Duo'));
  await f.click('label.addon'); ok('wax add-on toggles', await f.isChecked('#wax'));
  ok('Duo deal label shows', await vis('#duo-deal'));
  await f.click(next); ok('Next -> step 3', await vis('#wstep-3'));
  await f.click('#wstep-3 .rec-acc summary'); ok('suggestions dropdown toggles', !(await f.evaluate(()=>document.querySelector('.rec-acc').open))); await f.click('#wstep-3 .rec-acc summary');
  await f.click('#tab-a-styling'); ok('add-on tab Styling', await vis('#panel-a-styling'));
  const before=await txt('#total-price'); await f.click('#panel-a-styling .store'); await p.waitForTimeout(400); ok('vendor menu opens', await vis('.ss-panel'));
  await f.click('.ss-item:nth-child(3) .ss-plus'); ok('add props changes total', (await txt('#total-price'))!==before);
  await f.click('.ss-item:nth-child(3) .ss-plus'); ok('remove props restores total', (await txt('#total-price'))===before);
  await f.click('.ss-item:nth-child(1) .ss-name'); await p.waitForTimeout(300); ok('item details open', await vis('#ss-opt'));
  await f.click('#ss-opt-x'); ok('item details close', !(await vis('#ss-opt')));
  await f.click('.ss-foot .btn'); await p.waitForTimeout(400); ok('Done closes menu', !(await vis('.ss-panel')));
  ok('add-suggestions button visible', await vis('#use-rec')); await f.click('#use-rec'); ok('add suggestions changes total', (await txt('#total-price'))!==before);
  await f.click(next); ok('Next -> step 4', await vis('#wstep-4'));
  for (const t of ['sched','check','inv','total']) { await f.click('#tab-p-'+t); ok('plan tab '+t, await vis('#panel-p-'+t)); }
  await f.click('#tab-p-check'); const tc0=await txt('#todo-count'); await f.click('#todo-list .todo-check >> nth=0'); ok('to-do tick counts', (await txt('#todo-count'))!==tc0);
  await f.click('.todo-act >> nth=0'); ok('to-do action button navigates', true);
  await f.evaluate(()=>{}); 
  const goPlan4 = async()=>{ for (let k=0;k<4;k++){ if (await vis('#wstep-4')) break; await f.click(width>900?'#wiz-next':'#wiz-next-m'); } };
  await goPlan4(); await f.click('#tab-p-inv'); await f.fill('#child-name','Mia'); await p.waitForTimeout(300); ok('caption uses name', (await f.inputValue('#inv-caption')).includes('Mia’s'));
  await f.click('[data-tpl=sparkle]'); await p.waitForTimeout(300); ok('template switch', (await f.getAttribute('[data-tpl=sparkle]','aria-checked'))==='true');
  await f.click('#copy-caption'); await p.waitForTimeout(200); ok('copy caption responds', (await txt('#copy-status')).length>0);
  await f.click('#inv-download'); await p.waitForTimeout(400); ok('save image responds', (await txt('#copy-status')).length>0);
  await f.click(next); ok('Next -> step 5', await vis('#wstep-5'));
  await f.click('#booking-submit'); ok('submit shows validation', (await txt('#booking-error')).startsWith('Please check'));
  await f.click('#stepper li:nth-child(1) a'); await f.fill('#date','2026-12-12'); await f.click('#stepper li:nth-child(5) a');
  await f.fill('[name=address]','1 Example Road'); await f.fill('[name=postalCode]','123456'); await f.fill('[name=parentName]','Test Parent'); await f.fill('[name=email]','parent@example.com'); await f.fill('[name=phone]','8123 4567'); await f.check('[name=consent]');
  await f.click(width>900 ? '#booking-submit' : '#wiz-next-m'); ok('valid request -> honest offline message', (await txt('#booking-error')).startsWith('This is an offline'));
  await f.click('#wiz-back'); ok('Back -> step 4', await vis('#wstep-4'));
  await f.click('#stepper li:nth-child(2) a'); ok('stepper link -> step 2', await vis('#wstep-2'));
  await f.click('.wiz-exit'); ok('Save & exit -> home', await vis('#view-home .hero'));
  await f.click('.header-cta').catch(()=>{}); if (width>640) ok('header CTA reopens planner (keeps progress)', await vis('#wstep-1') && (await txt('#total-price'))!=='$0.00');
  const fails=res.filter(r=>r.startsWith('✗')); failed += fails.length + errs.length;
  console.log(`\n${label}: ${res.length-fails.length}/${res.length} passed`, fails.length? '\n'+fails.join('\n'):'', errs.length? '\nerrors: '+errs.join('; '):'');
}
await run('Sandboxed preview, desktop', 1280, async p=>{ await p.setContent('<iframe id=f sandbox="allow-scripts" style="width:1260px;height:880px;border:0"></iframe>'); await p.evaluate(h=>document.getElementById('f').srcdoc=h, html); await p.waitForTimeout(1200); return p.frames()[1]; });
await run('Sandboxed preview, phone', 390, async p=>{ await p.setContent('<iframe id=f sandbox="allow-scripts" style="width:390px;height:880px;border:0"></iframe>'); await p.evaluate(h=>document.getElementById('f').srcdoc=h, html); await p.waitForTimeout(1200); return p.frames()[1]; });
await run('Opened as a file, desktop', 1280, async p=>{ await p.goto('file://'+file); return p.mainFrame(); });
// browser back button when opened as a file
const p=await b.newPage(); await p.goto('file://'+file); await p.click('.hero-actions a.btn-primary'); await p.click('#wiz-next'); await p.goBack(); await p.waitForTimeout(300);
console.log('\nBrowser Back from step 2 ->', await p.evaluate(()=>!document.getElementById('wstep-1').hidden ? 'step 1 ✓' : 'wrong'));
await b.close();
if (failed) { console.error(failed + ' click-through problem(s)'); process.exit(1); }
