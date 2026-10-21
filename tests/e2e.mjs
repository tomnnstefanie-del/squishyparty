// End-to-end: real browser → /api/request → (mock) Telegram. Run: npm test
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outbox = path.join(root, 'dev/.outbox.json');
const PORT = 3100, MOCK = 8789, BASE = `http://localhost:${PORT}`;
const env = { ...process.env, PORT: String(PORT), MOCK_PORT: String(MOCK), TELEGRAM_BOT_TOKEN: 'test:token', TELEGRAM_CHAT_ID: '4242', TELEGRAM_API_BASE: `http://localhost:${MOCK}` };
const procs = [];
const start = (file, e = env) => new Promise((ok) => { const p = spawn('node', [file], { cwd: root, env: e }); procs.push(p); p.stdout.on('data', (d) => { if (/on http/.test(d)) ok(p); }); p.stderr.on('data', (d) => process.stderr.write(d)); });
const sent = () => JSON.parse(fs.readFileSync(outbox, 'utf8'));
let passed = 0; const ok = (name) => { passed++; console.log('  ✓', name); };

try { fs.rmSync(outbox + '.fail'); } catch {}
await start('dev/mock-telegram.mjs');
await start('dev/server.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const txt = (s) => page.evaluate((s) => document.querySelector(s).textContent.trim(), s);
  const d = new Date(); d.setDate(d.getDate() + 30); const date = d.toISOString().slice(0, 10);

  console.log('customer flow');
  await page.goto(BASE);
  await page.click('.hero-actions a.btn-primary');
  await page.fill('#children', '12'); await page.dispatchEvent('#children', 'change');
  await page.fill('#adults', '8'); await page.dispatchEvent('#adults', 'change');
  await page.fill('#budget', '1200');
  await page.fill('#date', date); await page.fill('#time', '14:00'); await page.fill('#end', '16:30');
  await page.fill('#venue', '1 Example Road');
  await page.fill('#postal', '123456');
  await page.click('#wiz-next');
  await page.click('label.addon'); // wax duo deal
  await page.click('#wiz-next');
  await page.click('#use-rec');
  await page.click('#wiz-next'); await page.click('#wiz-next');
  assert.equal(await page.inputValue('#req-date'), date);
  assert.equal(await page.inputValue('#req-time'), '14:00');
  assert.equal(await page.inputValue('#req-end'), '16:30');
  assert.equal(await page.inputValue('#req-address'), '1 Example Road');
  assert.equal(await page.inputValue('#req-postal'), '123456');
  ok('step 5 is prefilled with date, time, venue address and postal code from page 1');
  await page.fill('#req-address', 'Block B, 1 Example Road'); await page.waitForTimeout(100);
  assert.equal(await page.inputValue('#venue'), 'Block B, 1 Example Road');
  ok('editing the address in step 5 updates the plan');
  const pageDeposit = await txt('#dep-amount'), pageTotal = (await txt('#total-price')).replace('+', '');
  await page.fill('[name=parentName]', 'Sarah Tan');
  await page.fill('[name=phone]', '8123 4567');
  await page.fill('[name=email]', 'sarah@example.com');
  await page.fill('[name=notes]', 'Lift lobby B, level 2');
  await page.check('[name=consent]');
  await page.click('#booking-submit');
  await page.waitForSelector('#sent-card:not([hidden])', { timeout: 10000 });
  const ref = await txt('#sent-ref');
  assert.match(ref, /^SP-\d{6}-[0-9A-F]{4}$/);
  ok(`customer sees "Request sent!" with reference ${ref}`);

  const msgs = sent();
  assert.equal(msgs.length, 1);
  const m = msgs[0];
  assert.equal(m.token, 'test:token'); assert.equal(m.chat_id, '4242'); assert.equal(m.parse_mode, 'HTML');
  for (const s of [ref, 'Sarah Tan', '+65 8123 4567', 'sarah@example.com', 'Block B, 1 Example Road, Singapore 123456', '2:00 pm–4:30 pm', '12 children', '8 adults', 'Duo: Jelly + Crunchy', 'Wax Cracking duo deal', 'travel', 'Lift lobby B, level 2'])
    assert.ok(m.text.includes(s), 'message missing: ' + s);
  ok('owner gets one Telegram message with contact, date/time, venue, address, guests, order and notes');
  assert.ok(m.text.includes(`Estimated total: ${pageTotal}`), `server total should match page total ${pageTotal}`);
  assert.ok(m.text.includes(`50% deposit ${pageDeposit}`), `deposit should match ${pageDeposit}`);
  assert.ok(!m.text.includes('⚠️'));
  ok(`server-calculated total (${pageTotal}) and deposit (${pageDeposit}) match the page`);
  const btn = m.reply_markup.inline_keyboard[0][0];
  assert.ok(btn.url.startsWith('https://wa.me/6581234567?text=Hi%20Sarah'));
  ok('message has a "WhatsApp the customer" button with a ready greeting');
  console.log('\n----- Telegram message preview -----\n' + m.text.replace(/<[^>]+>/g, '') + '\n[ ' + btn.text + ' ]\n------------------------------------\n');

  await page.click('#sent-todo');
  assert.ok(await page.isVisible('#panel-p-check'));
  assert.ok((await txt('#todo-list')).includes('Request availability'));
  ok('to-do list now shows "Request availability" as done');
  assert.deepEqual(errors, []);

  console.log('failure handling');
  fs.writeFileSync(outbox + '.fail', '1');
  const p2 = await browser.newPage(); await p2.goto(BASE);
  const r = await p2.evaluate(async (date) => { const res = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.2' }, body: JSON.stringify({ v: 1, plan: { children: 10, adults: 5, experience: 'jelly', wax: false, addons: [], date, start: '10:00', end: '12:00', budgetCents: null }, contact: { parentName: 'Ann Lee', phone: '91234567', email: 'a@example.com', venueName: 'Home', address: '2 Example Ave', postalCode: '654321', notes: '' }, consent: true, website: '' }) }); return { s: res.status, b: await res.json() }; }, date);
  assert.equal(r.s, 502); assert.equal(r.b.ok, false);
  fs.rmSync(outbox + '.fail');
  ok('if Telegram is down, the customer is told it was NOT sent (no fake confirmation)');

  const api = (body, headers = {}) => p2.evaluate(async ([body, headers]) => { const res = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); return { s: res.status, b: await res.json().catch(() => ({})) }; }, [body, headers]);
  const base = { v: 1, plan: { children: 10, adults: 5, experience: 'both', wax: true, addons: [], date, start: '10:00', end: '12:00', budgetCents: null }, contact: { parentName: 'Ann Lee', phone: '91234567', email: 'a@example.com', venueName: 'Home', address: '2 Example Ave', postalCode: '654321', notes: '' }, consent: true, website: '', client: { totalCents: 1 } };

  console.log('security');
  let x = await api({ ...base, plan: { ...base.plan, addons: ['free-unicorn'] } }, { 'X-Forwarded-For': '10.0.0.3' });
  assert.equal(x.s, 400); ok('tampered add-on id is rejected (400)');
  const before = sent().length;
  x = await api(base, { 'X-Forwarded-For': '10.0.0.4' });
  assert.equal(x.s, 200); assert.equal(x.b.totalCents, 48000);
  const last = sent().at(-1).text;
  assert.ok(last.includes('Page showed $0.01'));
  ok('a fake $0.01 total from the browser is ignored; server prices it at $480 and flags the mismatch');
  x = await api({ ...base, website: 'http://spam' }, { 'X-Forwarded-For': '10.0.0.5' });
  assert.equal(x.s, 200); assert.equal(sent().length, before + 1);
  ok('honeypot (bot) submissions are dropped silently');
  const g = await p2.evaluate(async () => (await fetch('/api/request')).status);
  assert.equal(g, 405); ok('GET is refused (405)');
  const cross = await fetch(`${BASE}/api/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify(base) });
  assert.equal(cross.status, 403); ok('cross-site posts are refused (403)');
  let codes = [];
  for (let i = 0; i < 6; i++) codes.push((await api({ ...base, plan: { ...base.plan, addons: ['nope'] } }, { 'X-Forwarded-For': '10.0.0.9' })).s);
  assert.deepEqual(codes, [400, 400, 400, 400, 400, 429]); ok('more than 5 requests in 10 minutes from one address gets 429');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(!html.includes('test:token') && !/TELEGRAM_BOT_TOKEN|api\.telegram\.org/.test(html));
  ok('no Telegram token or Telegram URL anywhere in the page');

  console.log('not configured');
  const env2 = { ...env, PORT: '3101' }; delete env2.TELEGRAM_BOT_TOKEN;
  await start('dev/server.mjs', env2);
  const nc = await fetch('http://localhost:3101/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(base) });
  assert.equal(nc.status, 503); ok('without the bot token set, requests are refused (503), never "sent"');

  console.log(`\n${passed} end-to-end checks passed`);
} finally {
  await browser.close();
  for (const p of procs) p.kill();
}
