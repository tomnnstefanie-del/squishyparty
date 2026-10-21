// A stand-in for api.telegram.org used by the tests. Records every sendMessage call to dev/.outbox.json.
// Set FAIL=1 to make it return an error (to test the "not sent" path).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outbox = path.join(path.dirname(fileURLToPath(import.meta.url)), '.outbox.json');
fs.writeFileSync(outbox, '[]');
const PORT = Number(process.env.MOCK_PORT || 8789);

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = /^\/bot([^/]+)\/sendMessage$/.exec(req.url);
    res.setHeader('Content-Type', 'application/json');
    if (!m) { res.statusCode = 404; return res.end('{"ok":false,"description":"Not Found"}'); }
    if (process.env.FAIL === '1' || fs.existsSync(outbox + '.fail')) { res.statusCode = 500; return res.end('{"ok":false,"description":"mock failure"}'); }
    const list = JSON.parse(fs.readFileSync(outbox, 'utf8'));
    list.push({ token: m[1], ...JSON.parse(body) });
    fs.writeFileSync(outbox, JSON.stringify(list, null, 2));
    res.end(JSON.stringify({ ok: true, result: { message_id: list.length } }));
  });
}).listen(PORT, () => console.log(`mock Telegram on http://localhost:${PORT}`));
