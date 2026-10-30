// End-to-end: real browser → /api/request → (mock) Telegram. Run: npm test
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outbox = path.join(root, 'dev/.outbox.json'), mailbox = path.join(root, 'dev/.mailbox.json');
const PORT = 3100, MOCK = 8789, BASE = `http://localhost:${PORT}`;
const env = { ...process.env, PORT: String(PORT), MOCK_PORT: String(MOCK), TELEGRAM_BOT_TOKEN: 'test:token', TELEGRAM_CHAT_ID: '4242', TELEGRAM_API_BASE: `http://localhost:${MOCK}`, MAIL_TRANSPORT: 'file', STATS_MEMORY: '1', ADMIN_PASSWORD: 'test-dashboard-pass', CRON_SECRET: 'test-cron-secret-123456' };
process.env.TELEGRAM_BOT_TOKEN = 'test:token'; // so the test can mint a verified-email token like the server does
const { issueVerified } = await import('../lib/otp.js');
const { makeReferralCode } = await import('../lib/referral.js');
const mails = () => (fs.existsSync(mailbox) ? JSON.parse(fs.readFileSync(mailbox, 'utf8')) : []);
const procs = [];
const start = (file, e = env) => new Promise((ok) => { const p = spawn('node', [file], { cwd: root, env: e }); procs.push(p); p.stdout.on('data', (d) => { if (/on http/.test(d)) ok(p); }); p.stderr.on('data', (d) => process.stderr.write(d)); });
const sent = () => JSON.parse(fs.readFileSync(outbox, 'utf8'));
let passed = 0; const ok = (name) => { passed++; console.log('  ✓', name); };

try { fs.rmSync(outbox + '.fail'); } catch {}
try { fs.rmSync(mailbox); } catch {}
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
  assert.equal(await page.locator('#budget, #adults, #children').count(), 0);
  ok('step 1 asks only for the number of participants (no budget, no children/adults split)');
  assert.deepEqual(await page.$$eval('.exp-tile input', (xs) => xs.map((x) => x.value)), ['jelly', 'crunchy', 'both']);
  assert.ok((await page.$$eval('.exp-tile', (xs) => xs[2].textContent)).includes('Best value'));
  assert.deepEqual(await page.$$eval('#tl-exp b', (xs) => xs.map((x) => x.textContent)), ['Jelly', 'Crunchy', 'Duo']);
  ok('Squishy DIY options are ordered Jelly, Crunchy, Duo, with Duo labelled Best value');
  await page.fill('#participants', '12'); await page.dispatchEvent('#participants', 'change');
  await page.fill('#date', date); await page.fill('#time', '15:00');
  assert.equal(await page.inputValue('#end'), '17:00'); ok('a 3:00 pm start sets the end time to 5:00 pm (2 hours later)');
  await page.fill('#end', '16:30'); await page.fill('#time', '14:00');
  assert.equal(await page.inputValue('#end'), '16:00'); ok('changing the start again resets the end to 2 hours later');
  await page.fill('#end', '16:30');
  assert.ok((await txt('.early-hint')).includes('15 minutes before')); ok('basics page says the team arrives 15 minutes early');
  await page.fill('#spot', 'Clubhouse II, function room L2');
  await page.fill('#venue', '1 Example Road');
  await page.fill('#postal', '123456');
  await page.click('#wiz-next');
  await page.click('label.addon'); // wax duo deal
  await page.click('#wiz-next');
  assert.equal(await page.locator('.rec-acc, #use-rec').count(), 0); ok('step 3 has no "Your plan so far" box: the add-on tabs come straight after the intro');
  // Bloom: personalise the Standard fabric backdrop
  await page.click('#tab-a-styling'); await page.click('#panel-a-styling .store'); await page.waitForTimeout(300);
  await page.click('.ss-item >> nth=0 >> .ss-name'); await page.waitForTimeout(300);
  assert.equal(await page.locator('.ss-chip').count(), 10);
  await page.click('.ss-chip[aria-label=Pink]'); await page.click('.ss-chip[aria-label=Sage]');
  assert.ok((await txt('.ss-c-chosen')).includes('Pink, Sage')); assert.ok(await page.isVisible('.ss-chip[aria-label=Pink] .ss-chip-name'));
  await page.fill('#ss-c-text', 'Mia turns 7'); await page.fill('#ss-c-notes', 'Pastel rainbow, like the photo');
  await page.setInputFiles('#ss-mood-file', { name: 'mood.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await page.waitForSelector('.ss-mood-th img');
  await page.click('#ss-opt-add'); await page.click('.ss-foot .btn'); await page.waitForTimeout(300);
  ok('Bloom backdrop: choose colours (names appear), type vinyl text and inspiration, add a moodboard image');
  await page.click('#wiz-next');
  assert.ok(await page.isVisible('#wstep-5')); assert.equal(await txt('#wiz-count'), 'Step 4 of 4');
  ok('Add-ons goes straight to Request (step 4 of 4), with the itemised plan to check');
  assert.equal(await page.inputValue('#req-date'), date);
  assert.equal(await page.inputValue('#req-time'), '14:00');
  assert.equal(await page.inputValue('#req-end'), '16:30');
  assert.equal(await page.inputValue('#req-address'), '1 Example Road');
  assert.equal(await page.inputValue('#req-postal'), '123456');
  assert.equal(await page.inputValue('#req-spot'), 'Clubhouse II, function room L2');
  ok('step 5 is prefilled with date, time, venue address, exact location and postal code from page 1');
  await page.fill('#req-address', 'Block B, 1 Example Road'); await page.waitForTimeout(100);
  assert.equal(await page.inputValue('#venue'), 'Block B, 1 Example Road');
  ok('editing the address in step 5 updates the plan');
  const pageTotal = (await txt('#total-price')).replace('+', '');
  assert.ok(!/deposit|PayNow/i.test(await txt('#wstep-5'))); ok('the request step has no deposit or PayNow');
  await page.fill('[name=parentName]', 'Sarah Tan');
  await page.fill('[name=phone]', '8123 4567');
  await page.fill('#req-email', 'sarah@example.com');
  await page.click('#booking-submit');
  assert.ok((await txt('#otp-status')).includes('verify'), 'asks to verify'); assert.equal(sent().length, 0);
  ok('the request can’t be sent until the email is verified');
  await page.click('#otp-send');
  await page.waitForFunction(() => !document.getElementById('otp-code-row').hidden);
  const otpMail = mails().at(-1); const code = /\b(\d{6})\b/.exec(otpMail.subject)[1];
  assert.equal(otpMail.to, 'sarah@example.com');
  await page.fill('#otp-code', '000000'.replace(/./g, (d, i) => code[i] === d ? String((+d + 1) % 10) : d)); // a wrong code
  await page.waitForFunction(() => /isn’t right/.test(document.getElementById('otp-status').textContent));
  ok('a wrong code is refused');
  await page.fill('#otp-code', code);
  await page.waitForFunction(() => document.getElementById('otp-field').classList.contains('verified'));
  ok('the emailed 6-digit code verifies the address');
  await page.fill('[name=notes]', 'Lift lobby B, level 2');
  await page.click('#booking-submit');
  await page.waitForSelector('#sent-card:not([hidden])', { timeout: 10000 });
  const ref = await txt('#sent-ref');
  assert.match(ref, /^SP-\d{6}-[0-9A-F]{4}$/);
  ok(`customer sees "Request received!" with reference ${ref}`);
  assert.ok(await page.isVisible('#sent-family')); assert.ok((await txt('#sent-family')).includes('nothing to pay now'));
  ok('after sending, the customer is told there’s nothing to pay now');
  const conf = mails().at(-1);
  assert.equal(conf.to, 'sarah@example.com'); assert.ok(conf.subject.includes(ref));
  assert.ok(conf.text.includes('reach out on WhatsApp') && conf.text.includes('nothing to pay at this stage') && conf.text.includes('Participants: 12'));
  assert.equal(conf.attachments.length, 1); assert.ok(conf.subject.startsWith('Your Confetti Club Quotation'));
  ok('customer is emailed their PDF quotation: we’ll WhatsApp you to confirm, nothing to pay');

  const msgs = sent();
  assert.equal(msgs.length, 1);
  const m = msgs[0];
  assert.equal(m.token, 'test:token'); assert.equal(m.chat_id, '4242'); assert.equal(m.parse_mode, 'HTML');
  for (const s of [ref, 'Sarah Tan', '+65 8123 4567', 'sarah@example.com ✅ verified', 'Clubhouse II, function room L2', 'Block B, 1 Example Road, Singapore 123456', '2:00 pm–4:30 pm', '12 participants', 'Duo: Jelly + Crunchy', 'Wax Cracking duo deal', 'travel', 'Lift lobby B, level 2'])
    assert.ok(m.text.includes(s), 'message missing: ' + s);
  ok('owner gets one Telegram message with contact, date/time, venue, address, guests, order and notes');
  assert.ok(m.text.includes(`Estimated total: ${pageTotal}`), `server total should match page total ${pageTotal}`);

  assert.ok(!m.text.includes('⚠️')); assert.ok(!/deposit|budget|PayNow/i.test(m.text));
  ok(`server-calculated total (${pageTotal}) matches the page, with no deposit or budget lines`);
  for (const s of ['Fabric backdrop · Standard', '🎨 Colours: Pink, Sage', 'Vinyl text: “Mia turns 7”', 'Inspiration: Pastel rainbow, like the photo', '1 moodboard image below']) assert.ok(m.text.includes(s), 'message missing: ' + s);
  const photos = JSON.parse(fs.readFileSync(path.join(root, 'dev/.photos.json'), 'utf8')).filter((p) => p.kind !== 'Document'); // the quotation PDF is a document
  assert.equal(photos.length, 1); assert.ok(photos[0].caption.includes(ref) && photos[0].caption.includes('Fabric backdrop') && photos[0].jpeg);
  assert.ok((await txt('#review-list')).includes('Pink, Sage'));
  ok('owner gets the colours, vinyl text and inspiration in the message, and the moodboard as a photo');
  const btn = m.reply_markup.inline_keyboard[0][0];
  assert.ok(btn.url.startsWith('https://wa.me/6581234567?text=Hi%20Sarah'));
  ok('message has a "WhatsApp the customer" button with a ready greeting');
  console.log('\n----- Telegram message preview -----\n' + m.text.replace(/<[^>]+>/g, '') + '\n[ ' + btn.text + ' ]\n------------------------------------\n');

  const gone = await page.evaluate(async () => (await fetch('/api/paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status);
  assert.equal(gone, 404); ok('the old “I’ve paid” endpoint no longer exists');
  assert.equal(await page.locator('.ns-card').count(), 3);
  await page.click('#sent-todo');
  assert.ok(await page.isVisible('#wstep-4') && await page.isVisible('#panel-p-check')); assert.equal(await txt('#wiz-count'), 'Next steps');
  assert.ok((await txt('#todo-list')).includes('Request availability'));
  ok('to-do list now shows "Request availability" as done');
  await page.click('#tab-p-inv'); await page.click('[data-tpl=disco]');
  const [gifDl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#inv-gif')]);
  const gifBytes = fs.readFileSync(await gifDl.path());
  let gifFrames = 0; for (let i = 0; i < gifBytes.length - 2; i++) if (gifBytes[i] === 0x21 && gifBytes[i + 1] === 0xF9 && gifBytes[i + 2] === 4) gifFrames++;
  assert.equal(gifBytes.slice(0, 6).toString(), 'GIF89a'); assert.ok(gifFrames >= 10, 'frames ' + gifFrames); assert.ok(gifBytes.length < 2_000_000);
  assert.ok((await page.inputValue('#inv-caption')).includes('What the kids will be doing'));
  ok(`invitation saves as a moving GIF (${gifFrames} frames, ${Math.round(gifBytes.length / 1024)} KB) and the caption carries the kids’ schedule`);
  assert.deepEqual(errors, []);

  console.log('for companies');
  const cp = await browser.newPage({ viewport: { width: 1280, height: 900 } }); const cErrors = []; cp.on('pageerror', (e) => cErrors.push(e.message));
  await cp.goto(BASE); await cp.click('.hero-corp a');
  assert.ok(await cp.isVisible('#companies'));
  const rates = await cp.$eval('#rate-list', (e) => e.textContent); for (const s of ['Jelly', '$16', 'Crunchy', '$18', 'Duo', '$26', 'Best value', '+$2']) assert.ok(rates.includes(s), 'rate card missing ' + s);
  assert.ok((await cp.$eval('#rate-example', (e) => e.textContent)).includes('Duo for 30 people = $990'));
  ok('“For companies” shows outcome copy and a rate card priced from the catalogue (Duo for 30 = $990)');
  assert.equal(await cp.locator('#corp-form').count(), 0);
  await cp.click('[data-company]');
  assert.ok(await cp.isVisible('#wstep-1')); assert.ok(await cp.isChecked('input[name=bookingFor][value=company]'));
  ok('“Plan your company event” opens the planner with “A company” already chosen (no separate unverified form)');
  assert.deepEqual(cErrors, []); await cp.close();

  console.log('failure handling');
  fs.writeFileSync(outbox + '.fail', '1');
  const p2 = await browser.newPage(); await p2.goto(BASE);
  const r = await p2.evaluate(async ([date, tok]) => { const res = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.2' }, body: JSON.stringify({ v: 1, plan: { participants: 10, experience: 'jelly', wax: false, addons: [], date, start: '10:00', end: '12:00' }, contact: { parentName: 'Ann Lee', phone: '91234567', email: 'a@example.com', venueName: 'Home', address: '2 Example Ave', postalCode: '654321', notes: '' }, consent: true, website: '', emailToken: tok }) }); return { s: res.status, b: await res.json() }; }, [date, issueVerified('a@example.com')]);
  assert.equal(r.s, 502); assert.equal(r.b.ok, false);
  fs.rmSync(outbox + '.fail');
  ok('if Telegram is down, the customer is told it was NOT sent (no fake confirmation)');

  const api = (body, headers = {}) => p2.evaluate(async ([body, headers]) => { const res = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); return { s: res.status, b: await res.json().catch(() => ({})) }; }, [body, headers]);
  const base = { v: 1, plan: { participants: 10, experience: 'both', wax: true, addons: [], date, start: '10:00', end: '12:00' }, contact: { parentName: 'Ann Lee', phone: '91234567', email: 'a@example.com', venueName: 'Home', address: '2 Example Ave', postalCode: '654321', notes: '' }, consent: true, website: '', client: { totalCents: 1 }, emailToken: issueVerified('a@example.com') };

  console.log('security');
  let x = await api({ ...base, plan: { ...base.plan, addons: ['free-unicorn'] } }, { 'X-Forwarded-For': '10.0.0.3' });
  assert.equal(x.s, 400); ok('tampered add-on id is rejected (400)');
  const before = sent().length;
  x = await api(base, { 'X-Forwarded-For': '10.0.0.4' });
  assert.equal(x.s, 200); assert.equal(x.b.totalCents, 46500);
  const last = sent().at(-1).text;
  assert.ok(last.includes('Page showed $0.01'));
  ok('a fake $0.01 total from the browser is ignored; server prices it at $465 and flags the mismatch');
  x = await api({ ...base, wantQuote: true }, { 'X-Forwarded-For': '10.0.0.5' });
  assert.equal(x.s, 200); assert.equal(x.b.quoted, true);
  const qm = mails().at(-1); assert.ok(qm.subject.startsWith('Your Confetti Club Quotation | Q-SP-')); assert.deepEqual(qm.attachments, [`Confetti-Club-Quotation-Q-${x.b.ref}.pdf`]);
  const qd = JSON.parse(fs.readFileSync(path.join(root, 'dev/.photos.json'), 'utf8')).at(-1); assert.ok(qd.kind === 'Document' && qd.pdf && qd.caption.includes(x.b.ref));
  ok('ticking “Email me a PDF quotation” attaches the PDF to the email and posts a copy to Telegram');
  x = await api({ ...base, emailToken: '' }, { 'X-Forwarded-For': '10.0.0.6' });
  assert.equal(x.s, 400); assert.equal(x.b.field, 'email'); ok('a request without a verified email is refused (400)');
  x = await api({ ...base, emailToken: issueVerified('someone-else@example.com') }, { 'X-Forwarded-For': '10.0.0.7' });
  assert.equal(x.s, 400); ok('a verified token for a different email is refused');
  x = await api({ ...base, bookingFor: 'company', wantQuote: true, contact: { ...base.contact, companyName: 'Acme Pte Ltd', billingEmail: 'finance@acme.sg' } }, { 'X-Forwarded-For': '10.0.0.8' });
  assert.equal(x.s, 200); assert.equal(x.b.bookingFor, 'company'); assert.equal(x.b.totalCents, 46500);
  assert.ok(sent().at(-1).text.includes('CORPORATE BOOKING: yes') && mails().at(-1).text.includes('nothing to pay at this stage') && mails().at(-1).attachments.length === 1 && mails().at(-1).subject.includes('Quotation'));
  ok('company booking: same price, invoice requested on Telegram and in the email');
  x = await api({ ...base, bookingFor: 'company', wantQuote: true, corporate: { procurement: true }, contact: { ...base.contact, companyName: 'Acme Pte Ltd', billingContact: 'Finance Team', poRef: 'PO-77', billingNotes: 'Two invoices please' } }, { 'X-Forwarded-For': '10.0.4.1' });
  assert.equal(x.s, 200); assert.equal(x.b.totalCents, 46500);
  const ct = sent().at(-1).text;
  assert.ok(ct.includes('CORPORATE BOOKING: yes') && ct.includes('corporate-friendly package') && ct.includes('PO reference: <b>PO-77</b>') && ct.includes('Finance Team') && ct.includes('Two invoices please') && ct.includes('VENDOR REGISTRATION / PROCUREMENT SUPPORT REQUESTED'));
  assert.ok(mails().at(-1).text.includes('assist with the necessary procurement documentation'));
  ok('corporate options: Telegram flags procurement, PO reference, billing contact and quotation style; the email says our team will help with documents');
  x = await api({ ...base, website: 'http://spam' }, { 'X-Forwarded-For': '10.0.0.5' });
  assert.equal(x.s, 200); assert.equal(sent().length, before + 4); // the $465 request, the quotation request and two company bookings, nothing from the bot
  ok('honeypot (bot) submissions are dropped silently');
  const g = await p2.evaluate(async () => (await fetch('/api/request')).status);
  assert.equal(g, 405); ok('GET is refused (405)');

  console.log('after-party feedback');
  const fb = (body, ip) => p2.evaluate(async ([body, ip]) => { const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(body) }); return { s: res.status, b: await res.json().catch(() => ({})) }; }, [body, ip]);
  x = await fb({ ref: 'SP-261107-AB12', rating: 0 }, '10.0.1.1'); assert.equal(x.s, 400); ok('feedback without a star rating is refused');
  x = await fb({ ref: 'SP-261107-AB12', rating: 5, comment: 'The kids <loved> it' }, '10.0.1.2'); assert.equal(x.s, 200);
  let fm = sent().at(-1).text; assert.ok(fm.includes('5/5') && fm.includes('SP-261107-AB12') && fm.includes('send their referral link') && fm.includes('&lt;loved&gt;'));
  ok('5 stars reaches Telegram with the reference and “send their referral link”');
  x = await fb({ ref: 'SP-261107-AB12', rating: 2 }, '10.0.1.3'); assert.equal(x.s, 200);
  fm = sent().at(-1).text; assert.ok(fm.includes('2/5') && fm.includes('call or WhatsApp them personally') && !fm.includes('send their referral link'));
  ok('2 stars asks for a personal follow-up instead of a referral');
  const fp = await browser.newPage(); await fp.goto(BASE + '/feedback.html?ref=SP-261107-AB12');
  await fp.click('label[for=fb-r4]'); await fp.fill('#fb-comment', 'Lovely team'); await fp.click('#fb-send');
  await fp.waitForSelector('#fb-done:not([hidden])', { timeout: 10000 });
  assert.ok(sent().at(-1).text.includes('4/5') && sent().at(-1).text.includes('Lovely team')); await fp.close();
  ok('the feedback page sends a rating and comment, then says thank you');

  console.log('referral dashboard');
  const adm = (pw) => p2.evaluate(async (pw) => { const r = await fetch('/api/admin', { headers: pw ? { Authorization: 'Bearer ' + pw } : {} }); return { s: r.status, b: await r.json().catch(() => ({})) }; }, pw);
  assert.equal((await adm('')).s, 401); assert.equal((await adm('wrong-password')).s, 401); ok('the dashboard needs the right password');
  const before0 = (await adm('test-dashboard-pass')).b.totals;
  const scan = await fetch(BASE + '/c', { redirect: 'manual' }); assert.equal(scan.status, 307); assert.equal(scan.headers.get('location'), '/?src=capsule#offer');
  const friendCode = makeReferralCode('Mia Tan');
  const lp = await browser.newPage(); await lp.goto(BASE + '/?ref=' + friendCode); await lp.waitForTimeout(600);
  await lp.reload(); await lp.waitForTimeout(400); await lp.close(); // a second visit on the same device isn't counted again
  x = await api({ ...base, referral: { code: friendCode } }, { 'X-Forwarded-For': '10.0.2.1' }); assert.equal(x.s, 200);
  x = await api({ ...base, referral: { source: 'capsule' } }, { 'X-Forwarded-For': '10.0.2.2' }); assert.equal(x.s, 200);
  const st = (await adm('test-dashboard-pass')).b;
  assert.equal(st.totals.capsuleScans - before0.capsuleScans, 1); assert.equal(st.totals.linkOpens - before0.linkOpens, 1);
  assert.equal(st.totals.viaFriend - before0.viaFriend, 1); assert.equal(st.totals.viaCapsule - before0.viaCapsule, 1);
  const rfr = st.referrers.find((r) => r.code === friendCode); assert.ok(rfr && rfr.opens === 1 && rfr.requests === 1 && rfr.brought.length === 1);
  assert.ok(st.recent.some((q) => q.via === 'friend' && q.code === friendCode) && !JSON.stringify(st).includes('a@example.com') && !JSON.stringify(st).includes('91234567'));
  ok('QR scans, friend-link opens (once per device) and the requests each brought show on the dashboard, with no contact details');
  const dp = await browser.newPage(); await dp.goto(BASE + '/admin.html'); await dp.fill('#ad-pass', 'test-dashboard-pass'); await dp.click('#ad-login button');
  await dp.waitForSelector('#ad-body:not([hidden])'); assert.ok((await dp.textContent('#ad-referrers')).includes(friendCode)); await dp.close();
  ok('the dashboard page opens with the password and lists who referred whom');

  // Response times: the Telegram request message has signed "Contacted" / "Confirmed" buttons
  const kb = sent().at(-1).reply_markup.inline_keyboard.flat();
  const contactedUrl = kb.find((b) => b.text.includes('Contacted')).url, confirmedUrl = kb.find((b) => b.text.includes('Deposit paid')).url;
  const lastRef = new URL(contactedUrl).searchParams.get('ref');
  const local = (u) => BASE + new URL(u).pathname + new URL(u).search;
  // A Telegram button opens a confirm page; the Confirm button posts the same fields back
  const tap = (u, extra = {}) => { const x = new URL(u); for (const [k, v] of Object.entries({ by: 'Tester', ...extra })) x.searchParams.set(k, v); return fetch(BASE + x.pathname, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: x.searchParams.toString() }); };
  const admPost = (body) => p2.evaluate(async (body) => { const r = await fetch('/api/admin', { method: 'POST', headers: { Authorization: 'Bearer test-dashboard-pass', 'Content-Type': 'application/json' }, body: JSON.stringify({ by: 'Tester', ...body }) }); return { s: r.status, b: await r.json() }; }, body);
  const forged = new URL(local(contactedUrl)); forged.searchParams.set('ref', 'SP-261107-0000');
  assert.equal((await fetch(forged)).status, 400); ok('a status link with a changed reference is refused');
  let sr = await fetch(local(contactedUrl)); assert.equal(sr.status, 200); assert.ok((await sr.text()).includes('Yes, confirm'));
  assert.ok(!(await adm('test-dashboard-pass')).b.recent.find((q) => q.ref === new URL(contactedUrl).searchParams.get('ref')).life.contacted);
  ok('opening a Telegram button only shows a Confirm page; nothing changes until Confirm is tapped');
  sr = await tap(contactedUrl); assert.equal(sr.status, 200); assert.ok((await sr.text()).includes('marked contacted'));
  assert.equal((await tap(confirmedUrl)).status, 400); // a payment needs its amount
  sr = await tap(confirmedUrl, { amount: '100.00', note: 'PayNow' }); assert.equal(sr.status, 200); assert.ok((await sr.text()).includes('$100.00 recorded'));
  const st2 = (await adm('test-dashboard-pass')).b;
  const life = st2.recent.find((q) => q.ref === lastRef).life; assert.ok(life.contacted && life.confirmed);
  assert.ok(st2.lifecycle.toContact.n >= 1 && st2.lifecycle.toConfirm.n >= 1 && st2.events.some((e) => e.type === 'confirmed' && e.ref === lastRef) && st2.events.some((e) => e.type === 'scan'));
  ok('the Telegram buttons record when we contacted and when the deposit was paid; the dashboard shows response times and the activity log');
  const mk = await p2.evaluate(async (ref) => { const r = await fetch('/api/admin', { method: 'POST', headers: { Authorization: 'Bearer test-dashboard-pass', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark', ref, status: 'lost' }) }); return r.status; }, st2.recent.find((q) => q.ref !== lastRef).ref);
  assert.equal(mk, 200); ok('a request can be marked from the dashboard');
  const lock = await p2.evaluate(async () => { let s = 0; for (let i = 0; i < 12; i++) { const r = await fetch('/api/admin', { headers: { Authorization: 'Bearer nope-nope-nope', 'X-Forwarded-For': '10.9.9.9' } }); s = r.status; } return s; });
  assert.equal(lock, 429); ok('after 10 wrong passwords the dashboard locks that address for 15 minutes');

  // The whole booking process: a party with add-ons from two partner vendors and one of our own
  console.log('booking process');
  x = await api({ ...base, plan: { ...base.plan, addons: ['bl-arch', 'js-photo-1', 's-favours'] }, contact: { ...base.contact, venueName: 'Clubhouse B' } }, { 'X-Forwarded-For': '10.0.3.1' });
  assert.equal(x.s, 200); const bref = x.b.ref;
  const bk = sent().at(-1).reply_markup.inline_keyboard.flat(), tgBtn = (t) => bk.find((b) => b.text.includes(t));
  assert.ok(tgBtn('Deposit paid') && tgBtn('Paid in full') && tgBtn('Bloom confirmed') && tgBtn('J Square Photography confirmed') && !tgBtn('Tom & Stefanie'));
  const order = bk.map((b) => b.text.replace(/[^A-Za-z ]/g, '').trim().split(' ')[0]);
  assert.deepEqual(order, ['WhatsApp', 'Contacted', 'Bloom', 'J', 'Deposit', 'Paid', 'After']);
  ok('Telegram buttons follow the steps: WhatsApp, Contacted, each vendor, Deposit paid, Paid in full, then After the party');
  const book = async () => (await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === bref);
  let b1 = await book();
  assert.ok(b1 && b1.state === 'pending' && b1.date === base.plan.date && b1.start === '10:00' && b1.venue === 'Clubhouse B' && b1.addons === 3);
  assert.deepEqual(b1.vendors.map((v) => v.name), ['Bloom', 'J Square Photography']);
  for (const tdo of ['Reply to the customer', 'Confirm with Bloom', 'Confirm with J Square Photography']) assert.ok(b1.todos.includes(tdo), tdo);
  ok('the dashboard lists the booking with its date, time, venue, add-ons, both vendors waiting and what we still need to do');
  const early = await tap(tgBtn('Deposit paid').url, { amount: '100' }); assert.equal(early.status, 409); assert.ok((await early.text()).includes('confirmed yet'));
  assert.equal((await book()).state, 'pending'); ok('“Deposit paid” is refused while a vendor is still to confirm');
  assert.equal((await tap(tgBtn('Bloom confirmed').url)).status, 200);
  b1 = await book(); assert.ok(b1.vendors[0].ok && !b1.vendors[1].ok && !b1.todos.includes('Confirm with Bloom') && b1.todos.includes('Confirm with J Square Photography'));
  ok('tapping “Bloom confirmed” in Telegram ticks Bloom off; J Square is still waiting');
  await tap(tgBtn('J Square Photography confirmed').url);
  b1 = await book(); assert.ok(b1.state === 'ready' && b1.todos.includes('WhatsApp the customer to ask for the deposit'));
  ok('once every vendor has confirmed, the booking turns orange: “WhatsApp the customer to ask for the deposit”');
  const depPage = await (await fetch(local(tgBtn('Deposit paid').url))).text(); assert.ok(depPage.includes('Amount received') && depPage.includes('Your name'));
  await tap(tgBtn('Deposit paid').url, { amount: '200' });
  b1 = await book(); assert.ok(b1.state === 'booked' && !b1.paid && b1.paidCents === 20000 && b1.balanceCents === b1.totalCents - 20000 && b1.todos.length === 1 && b1.todos[0].startsWith('Collect the balance'));
  ok('“💵 Deposit paid” asks for the amount and name, turns it blue, and shows the balance left to collect');
  const payPage = await (await fetch(local(tgBtn('Paid in full').url))).text(); assert.ok(payPage.includes(`value="${(b1.balanceCents / 100).toFixed(2)}"`));
  assert.ok((await (await tap(tgBtn('Paid in full').url, { amount: (b1.balanceCents / 100).toFixed(2) })).text()).includes('recorded'));
  b1 = await book(); assert.ok(b1.state === 'paid' && b1.balanceCents === 0 && b1.todos.length === 0);
  ok('“💰 Paid in full” is prefilled with the balance; recording it turns the booking green');
  const un = await admPost({ action: 'undo', ref: bref, status: 'paid' }); assert.equal(un.s, 409);
  const lastPay = b1.payments.at(-1);
  assert.equal((await admPost({ action: 'reverse', ref: bref, paymentId: lastPay.id, reason: '' })).s, 400);
  const rv = await admPost({ action: 'reverse', ref: bref, paymentId: lastPay.id, reason: 'Recorded twice' }); assert.equal(rv.s, 200);
  b1 = await book(); assert.ok(b1.state === 'booked' && b1.paidCents === 20000 && b1.payments.length === 3 && b1.payments.find((p) => p.id === lastPay.id).reversed && b1.history.some((h) => h.what.includes('Recorded twice') && h.by === 'Tester'));
  assert.equal((await admPost({ action: 'reverse', ref: bref, paymentId: lastPay.id, reason: 'again' })).s, 409);
  ok('payments can’t be unticked: they are reversed with a reason, kept in the ledger, and logged with who did it');
  const bp = await browser.newPage(); await bp.goto(BASE + '/admin.html'); await bp.fill('#ad-pass', 'test-dashboard-pass'); await bp.click('#ad-login button');
  await bp.waitForSelector('#ad-body:not([hidden])');
  assert.ok((await bp.textContent('#ad-books')).includes(bref)); assert.ok((await bp.textContent('#ad-todo')).includes('Collect the balance'));
  await bp.click(`#bk-${bref} .tb-more summary`); await bp.click(`#bk-${bref} .tb-manage`); await bp.waitForSelector('#ad-manage[open]');
  assert.ok((await bp.textContent('#mg')).includes('Remaining balance') && (await bp.textContent('#mg')).includes('Recorded twice'));
  await bp.goto(BASE + '/admin.html'); await bp.waitForSelector('#ad-body:not([hidden])'); // the password is remembered for this tab
  await bp.close();
  ok('the dashboard page shows the booking card, the to-do list and the Manage panel with amounts and history');

  // Changes after booking: the customer asks, the team drafts and reviews a revision, it only replaces the booking once accepted
  console.log('booking changes');
  const { changeLink } = await import('../lib/status-link.js');
  x = await api({ ...base, plan: { ...base.plan, participants: 10, wax: false, addons: ['bl-arch'] } }, { 'X-Forwarded-For': '10.0.5.1' });
  assert.equal(x.s, 200); const cref = x.b.ref;
  assert.ok(mails().at(-1).text.includes('/change.html?ref=' + cref)); ok('the confirmation email has the customer’s own “Request a change” link');
  const cbook = async () => (await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === cref);
  const ck = sent().at(-1).reply_markup.inline_keyboard.flat();
  await tap(ck.find((b) => b.text.includes('Bloom confirmed')).url); await tap(ck.find((b) => b.text.includes('Deposit paid')).url, { amount: '100' });
  let c1 = await cbook(); const orig = c1.totalCents; assert.ok(c1.state === 'booked' && c1.paidCents === 10000);
  const cl = new URL(changeLink('http://x', cref));
  const chBad = await p2.evaluate(async (ref) => (await fetch('/api/change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, t: 'nope', text: 'More kids' }) })).status, cref);
  assert.equal(chBad, 400);
  const chOk = await p2.evaluate(async ([ref, t]) => (await fetch('/api/change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, t, text: 'We are now 15 kids, and no balloon arch please. Can we add photos?' }) })).status, [cref, cl.searchParams.get('t')]);
  assert.equal(chOk, 200); assert.ok(sent().at(-1).text.includes('Change requested') && sent().at(-1).text.includes('15 kids'));
  c1 = await cbook(); assert.ok(c1.changes.length === 1 && c1.todos.some((t) => t.startsWith('Customer asked for a change')) && c1.totalCents === orig);
  ok('a customer’s change request reaches Telegram and the dashboard, and changes nothing by itself');
  const newPlan = { participants: 15, experience: 'both', wax: false, addons: ['js-photo-1'], date: base.plan.date, start: '10:00', end: '12:00' };
  assert.equal((await admPost({ action: 'revise', ref: cref, by: '', plan: newPlan })).s, 400);
  let rvr = await admPost({ action: 'revise', ref: cref, plan: newPlan, note: 'WhatsApp 3 Nov' }); assert.equal(rvr.s, 200);
  const rev = rvr.b.revision; assert.ok(rev.n === 2 && rev.status === 'draft' && rev.diff.includes('Participants: 10 → 15') && rev.diff.some((d) => d.startsWith('Removed: ') && d.includes('balloon arch (Bloom)')) && rev.diff.some((d) => d.startsWith('Added:')));
  assert.deepEqual(rev.vendors.map((v) => v.name + ':' + v.action).sort(), ['Bloom:cancel', 'J Square Photography:confirm']);
  c1 = await cbook(); assert.ok(c1.totalCents === orig && c1.todos.includes('Review and send revised quotation R2'));
  assert.equal((await admPost({ action: 'revise', ref: cref, plan: { ...newPlan, participants: 16 } })).s, 409);
  ok('a draft revision is priced on the server, lists what changed and which vendors to re-confirm or cancel, and leaves the confirmed booking alone');
  assert.equal((await admPost({ action: 'revision', ref: cref, n: 2, step: 'apply' })).s, 409);
  rvr = await admPost({ action: 'revision', ref: cref, n: 2, step: 'send' }); assert.equal(rvr.s, 200);
  const rm = mails().at(-1); assert.ok(rm.subject === `Your revised Confetti Club quotation | Q-${cref}-R2` && rm.attachments[0] === `Confetti-Club-Quotation-Q-${cref}-R2.pdf` && rm.text.includes('Deposit received') && rm.text.includes('until you accept'));
  c1 = await cbook(); assert.ok(c1.totalCents === orig && c1.todos.includes('Waiting for the customer to accept R2') && c1.todos.includes('Tell Bloom their items are cancelled (R2)'));
  ok('after review, the revised quotation R2 is emailed as “pending your acceptance”; the booking is still unchanged');
  assert.equal((await admPost({ action: 'revision', ref: cref, n: 2, step: 'apply' })).s, 409);
  await admPost({ action: 'revision', ref: cref, n: 2, step: 'accept' });
  assert.equal((await admPost({ action: 'revision', ref: cref, n: 2, step: 'apply' })).s, 409); // vendors still to do
  await admPost({ action: 'revision', ref: cref, n: 2, step: 'vendor', vendor: 'Bloom' });
  await admPost({ action: 'revision', ref: cref, n: 2, step: 'vendor', vendor: 'J Square Photography' });
  rvr = await admPost({ action: 'revision', ref: cref, n: 2, step: 'apply' }); assert.equal(rvr.s, 200);
  c1 = await cbook();
  assert.ok(c1.version === 2 && c1.participants === 15 && c1.totalCents === rev.totalCents && c1.originalTotalCents === orig && c1.paidCents === 10000 && c1.balanceCents === rev.totalCents - 10000);
  assert.deepEqual(c1.vendors.map((v) => v.name + ':' + !!v.ok), ['J Square Photography:true']);
  assert.ok(c1.history.some((h) => h.what.startsWith('Applied R2') && h.by === 'Tester') && c1.history.some((h) => h.what.startsWith('Customer accepted R2')));
  ok('only after the customer accepts and every vendor step is done does R2 replace the booking: original, revised, received and balance all kept');

  // Thank-you reward for the family who referred a friend
  console.log('referral rewards');
  x = await api({ ...base, plan: { ...base.plan, wax: false, addons: [] }, contact: { ...base.contact, parentName: 'Mia Tan' } }, { 'X-Forwarded-For': '10.0.6.1' });
  assert.equal(x.s, 200); const miaRef = x.b.ref, miaCode = /\?ref=([A-Z]+-[A-Z0-9]{4})/.exec(sent().at(-1).text)[1];
  const after = sent().at(-1).reply_markup.inline_keyboard.flat().find((b) => b.text.includes('After the party')).url;
  assert.ok(decodeURIComponent(after).includes('a free squishy at any Tom & Stefanie store')); ok('the after-party message tells families about the thank-you reward');
  x = await api({ ...base, plan: { ...base.plan, wax: false, addons: [] }, referral: { code: miaCode }, emailToken: issueVerified('sara@example.com'), contact: { ...base.contact, parentName: 'Sara Lim', email: 'sara@example.com', phone: '98887777' } }, { 'X-Forwarded-For': '10.0.6.2' });
  const friendRef = x.b.ref, fk = sent().at(-1).reply_markup.inline_keyboard.flat();
  const total = (await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === friendRef).totalCents;
  await tap(fk.find((b) => b.text.includes('Deposit paid')).url, { amount: '100' });
  let rws = (await adm('test-dashboard-pass')).b.rewards; assert.ok(!rws.some((r) => r.friendRef === friendRef)); // not yet paid in full
  await tap(fk.find((b) => b.text.includes('Paid in full')).url, { amount: ((total - 10000) / 100).toFixed(2) });
  const rmsg = sent().at(-1); assert.ok(rmsg.text.includes('Referral reward owed') && rmsg.text.includes(miaRef) && rmsg.reply_markup.inline_keyboard.flat()[0].url.startsWith('https://wa.me/'));
  let rw = (await adm('test-dashboard-pass')).b.rewards.find((r) => r.friendRef === friendRef);
  assert.ok(rw && rw.status === 'owed' && rw.referrerRef === miaRef && /^SQ-[A-Z2-9]{4}$/.test(rw.voucher));
  ok('when a referred friend’s party is paid in full, the referring family is owed a free-squishy voucher, with a ready WhatsApp message in Telegram');
  const fbk = (await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === friendRef), lastP = fbk.payments.filter((p) => p.kind !== 'reversal').at(-1);
  await admPost({ action: 'reverse', ref: friendRef, paymentId: lastP.id, reason: 'Bank transfer bounced' });
  rw = (await adm('test-dashboard-pass')).b.rewards.find((r) => r.friendRef === friendRef); assert.equal(rw.status, 'void');
  await admPost({ action: 'payment', ref: friendRef, kind: 'payment', cents: lastP.cents, note: 'paid again' });
  rw = (await adm('test-dashboard-pass')).b.rewards.find((r) => r.friendRef === friendRef); assert.equal(rw.status, 'owed');
  ok('an unsent reward is voided if the payment is reversed, and owed again once it’s paid');
  assert.equal((await admPost({ action: 'reward', ref: friendRef, step: 'redeemed' })).s, 409);
  assert.equal((await admPost({ action: 'reward', ref: friendRef, step: 'sent' })).s, 200);
  assert.equal((await admPost({ action: 'reward', ref: friendRef, step: 'redeemed' })).s, 200);
  rw = (await adm('test-dashboard-pass')).b.rewards.find((r) => r.friendRef === friendRef); assert.ok(rw.status === 'redeemed' && rw.sent.by === 'Tester');
  ok('the reward is marked sent, then redeemed in store, each with who and when');

  // Recognising the same customer without log-ins: verified email or WhatsApp number, and company occasions
  console.log('returning customers and occasions');
  const ze = 'zoe@acme.example', reqMsg = (r) => sent().find((m) => m.text && m.text.includes(r) && m.text.includes('New Confetti Club request'));
  x = await api({ ...base, bookingFor: 'company', corporate: { occasion: 'family-day', yearly: true }, emailToken: issueVerified(ze), contact: { ...base.contact, parentName: 'Zoe Ng', email: ze, phone: '96660001', companyName: 'Zeta Pte Ltd' } }, { 'X-Forwarded-For': '10.0.7.1' });
  assert.equal(x.s, 200); const zRef = x.b.ref, zMsg = reqMsg(zRef), zCode = /\?ref=([A-Z]+-[A-Z0-9]{4})/.exec(zMsg.text)[1];
  assert.ok(zMsg.text.includes('Occasion: <b>Family day</b> · held every year') && !zMsg.text.includes('Returning customer'));
  const zb = (await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === zRef); assert.ok(zb.occasion === 'family-day' && zb.yearly === true && !zb.returning.length);
  ok('companies can say what the occasion is and that they hold it every year; Telegram and the dashboard show it');
  const zl = { contacted: 'x', confirmed: 'x', paid: 'x' }, Stats2 = await import('../lib/stats.js');
  const ahead = (d) => { const t = new Date(zb.date + 'T00:00:00Z'); t.setUTCFullYear(t.getUTCFullYear() + 1); t.setUTCDate(t.getUTCDate() - d); return t.toISOString().slice(0, 10); };
  assert.ok(Stats2.todosFor(zb, zl, ahead(80)).some((t) => t.startsWith('Ask Zeta Pte Ltd about booking again: their Family Day, held every year')));
  assert.ok(!Stats2.todosFor({ ...zb, yearly: false }, zl, ahead(80)).some((t) => t.includes('booking again'))); // not yearly: nearer the time
  ok('the “book again?” reminder names the occasion, and comes about 13 weeks ahead for a yearly event');
  x = await api({ ...base, emailToken: issueVerified(ze), contact: { ...base.contact, parentName: 'Zoe Ng', email: ze, phone: '96660002' } }, { 'X-Forwarded-For': '10.0.7.2' });
  let m2 = reqMsg(x.b.ref);
  assert.ok(m2.text.includes('Returning customer') && m2.text.includes(zRef) && m2.text.includes('Same email'));
  assert.deepEqual((await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === x.b.ref).returning, [zRef]);
  ok('a second request with the same verified email is flagged as a returning customer, with their earlier booking');
  x = await api({ ...base, referral: { code: zCode }, emailToken: issueVerified('zoe.other@example.com'), contact: { ...base.contact, parentName: 'Z Ng', email: 'zoe.other@example.com', phone: '96660001' } }, { 'X-Forwarded-For': '10.0.7.3' });
  m2 = reqMsg(x.b.ref);
  assert.ok(m2.text.includes('their own referral code') && m2.text.includes('Same WhatsApp number'));
  const sb = (await adm('test-dashboard-pass')).b.bookings.find((q) => q.ref === x.b.ref); assert.ok(sb.selfReferral && sb.discountCents === 0);
  ok('using your own referral link (same WhatsApp number, different email and name) is caught: no $10 off and no reward');


  // The daily Telegram bump
  assert.equal((await fetch(BASE + '/api/digest')).status, 401); assert.equal((await fetch(BASE + '/api/digest', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  ok('the daily to-do bump can only be triggered with the cron secret');
  const dg = await fetch(BASE + '/api/digest', { headers: { Authorization: 'Bearer test-cron-secret-123456' } }); assert.equal(dg.status, 200);
  const dm = sent().at(-1), dk = dm.reply_markup.inline_keyboard.flat();
  assert.ok(dm.text.includes('Confetti Club to-do') && dm.text.includes('Deposit paid, balance to collect') && dm.text.includes('Collect the balance'));
  const payBtn = dk.find((b) => b.text.startsWith('💰 Paid in full') && b.url.includes(bref)); assert.ok(payBtn && dk.some((b) => b.text.includes('Open the dashboard')));
  ok('the bump lists pending bookings by stage, with a button for each one’s next step');
  await tap(payBtn.url, { amount: ((await book()).balanceCents / 100).toFixed(2) }); assert.equal((await book()).state, 'paid');
  ok('tapping a button in the bump updates the dashboard');
  const sn = await p2.evaluate(async () => (await fetch('/api/admin', { method: 'POST', headers: { Authorization: 'Bearer test-dashboard-pass', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'digest' }) })).json());
  assert.ok(sn.ok && sent().at(-1).text.includes('Confetti Club to-do')); ok('“Send to-do list to Telegram” on the dashboard sends it straight away');
  const cross = await fetch(`${BASE}/api/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify(base) });
  assert.equal(cross.status, 403); ok('cross-site posts are refused (403)');
  let codes = [];
  for (let i = 0; i < 6; i++) codes.push((await api({ ...base, plan: { ...base.plan, addons: ['nope'] } }, { 'X-Forwarded-For': '10.0.0.9' })).s);
  assert.deepEqual(codes, [400, 400, 400, 400, 400, 429]); ok('more than 5 requests in 10 minutes from one address gets 429');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(!html.includes('test:token') && !/TELEGRAM_BOT_TOKEN|SMTP_PASS|api\.telegram\.org/.test(html));
  ok('no Telegram token or Telegram URL anywhere in the page');

  // Scorecard on the dashboard: visits by source, costs and targets saved by the team, worked out automatically
  console.log('scorecard');
  const ev = (body, ip) => p2.evaluate(async ([body, ip]) => (await fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(body) })).status, [body, ip]);
  assert.equal(await ev({ type: 'visit', source: 'outlet' }, '10.0.8.1'), 200); assert.equal(await ev({ type: 'visit', source: '<script>' }, '10.0.8.1'), 200);
  let sc = (await adm('test-dashboard-pass')).b.scorecard;
  assert.ok(sc && sc.touch.find((t) => t.key === 'outlet').visits >= 1 && sc.funnel[0].step === 'Visits & scans' && !sc.costsSet);
  assert.equal((await admPost({ action: 'settings', settings: { targetParties: 12, kitCents: 450, staffCents: 8000, rewardCents: 600, capsulePrintCents: 5000 } })).s, 200);
  assert.equal((await admPost({ action: 'settings', by: '', settings: {} })).s, 400);
  sc = (await adm('test-dashboard-pass')).b.scorecard;
  assert.ok(sc.costsSet && sc.settings.targetParties === 12 && sc.settings.savedBy === 'Tester' && sc.kpis.paidParties >= 1 && sc.kpis.contributionPerPartyCents !== null && sc.weeks.length === 6);
  x = await api({ ...base, emailToken: issueVerified('ivy@example.com'), referral: { source: 'outlet' }, contact: { ...base.contact, parentName: 'Ivy Teo', email: 'ivy@example.com', phone: '97770001' } }, { 'X-Forwarded-For': '10.0.8.2' });
  const scd = (await adm('test-dashboard-pass')).b;
  assert.ok(scd.ok, JSON.stringify(scd).slice(0, 200));
  assert.equal(scd.bookings.find((q) => q.ref === x.b.ref).source, 'outlet'); assert.ok(scd.scorecard.touch.find((t) => t.key === 'outlet').requests >= 1);
  ok('the dashboard scorecard counts visits by source, credits each request to its touchpoint, and works out contribution, CAC and ROI once costs are saved');

  console.log('not configured');
  const env2 = { ...env, PORT: '3101' }; delete env2.TELEGRAM_BOT_TOKEN;
  await start('dev/server.mjs', env2);
  const nc = await fetch('http://localhost:3101/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(base) });
  assert.equal(nc.status, 503); ok('without the bot token set, requests are refused (503), never "sent"');  const env3 = { ...env, PORT: '3102' }; delete env3.MAIL_TRANSPORT;
  await start('dev/server.mjs', env3);
  const nm = await fetch('http://localhost:3102/api/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', email: 'a@example.com' }) });
  const nr = await fetch('http://localhost:3102/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(base) });
  assert.equal(nm.status, 503); assert.equal(nr.status, 503); ok('without email set up, codes and requests are refused (503)');

  console.log(`\n${passed} end-to-end checks passed`);
} finally {
  await browser.close();
  for (const p of procs) p.kill();
}
