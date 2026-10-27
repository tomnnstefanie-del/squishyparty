// Static server for the offline preview (npm run preview first): http://localhost:4173 opens .preview/index.html. No APIs, no secrets.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const root = process.argv[2];
const port = Number(process.argv[3] || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const handler = async (req, res) => {
  try {
    // The bare address (and the sticker's /c) open the site preview
    const path0 = new URL(req.url, 'http://x').pathname;
    if (path0 === '/' || path0 === '/c') { res.writeHead(302, { Location: '/.preview/index.html' + (path0 === '/c' ? '?src=capsule#offer' : ''), 'Cache-Control': 'no-store' }); return res.end(); }
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\\/])+/, '');
    if (p.includes('..')) throw new Error('bad path');
    let file = join(root, p);
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    // no-store: the preview is rebuilt often, so the browser must never show an old copy
    res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
};
// Loopback only (this computer), on both IPv4 and IPv6 so "localhost" works whichever one the browser picks.
createServer(handler).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://localhost:${port}`));
createServer(handler).listen(port, '::1').on('error', () => {});
