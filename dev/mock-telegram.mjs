// A stand-in for api.telegram.org used by the tests. Records every sendMessage call to dev/.outbox.json.
// Set FAIL=1 to make it return an error (to test the "not sent" path).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outbox = path.join(path.dirname(fileURLToPath(import.meta.url)), '.outbox.json');
const photos = path.join(path.dirname(fileURLToPath(import.meta.url)), '.photos.json'); // sendPhoto calls (moodboard images)
fs.writeFileSync(outbox, '[]'); fs.writeFileSync(photos, '[]');
const PORT = Number(process.env.MOCK_PORT || 8789);

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => { chunks.push(c); });
  req.on('end', () => {
    const raw = Buffer.concat(chunks), body = raw.toString('utf8');
    res.setHeader('Content-Type', 'application/json');
    const ph = /^\/bot([^/]+)\/send(Photo|Document)$/.exec(req.url);
    if (ph) { // sendPhoto (moodboard images) and sendDocument (PDF quotations) are both recorded in .photos.json
      const caption = (/name="caption"\r\n\r\n([^\r]*)/.exec(body) || [])[1] || '';
      const list = JSON.parse(fs.readFileSync(photos, 'utf8'));
      list.push({ token: ph[1], kind: ph[2], caption, bytes: raw.length, pdf: raw.includes(Buffer.from('%PDF-')), jpeg: raw.includes(Buffer.from([0xFF, 0xD8, 0xFF])), png: raw.includes(Buffer.from('PNG')) });
      fs.writeFileSync(photos, JSON.stringify(list, null, 2));
      return res.end(JSON.stringify({ ok: true, result: { message_id: list.length } }));
    }
    const m = /^\/bot([^/]+)\/sendMessage$/.exec(req.url);
    if (!m) { res.statusCode = 404; return res.end('{"ok":false,"description":"Not Found"}'); }
    if (process.env.FAIL === '1' || fs.existsSync(outbox + '.fail')) { res.statusCode = 500; return res.end('{"ok":false,"description":"mock failure"}'); }
    const list = JSON.parse(fs.readFileSync(outbox, 'utf8'));
    list.push({ token: m[1], ...JSON.parse(body) });
    fs.writeFileSync(outbox, JSON.stringify(list, null, 2));
    res.end(JSON.stringify({ ok: true, result: { message_id: list.length } }));
  });
}).listen(PORT, () => console.log(`mock Telegram on http://localhost:${PORT}`));
