// Local dev server that behaves like Vercel: serves public/ and runs api/request.js.
// Usage: node dev/server.mjs  (reads .env.local if present)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { default: handler } = await import('../api/request.js');
const PORT = Number(process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/request') {
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    try { await handler(req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end('{"ok":false}'); }
    return;
  }
  const file = path.join(root, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
  if (!file.startsWith(path.join(root, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Squishy Party dev server on http://localhost:${PORT}`));
