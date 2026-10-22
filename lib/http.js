// Small helpers shared by every API route: body parsing, same-origin check, client IP and a best-effort rate limiter.
export class HttpError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}

const MAX_BODY = 16 * 1024;

export async function readJson(req) {
  if (!String(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'Please send JSON.');
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) throw new HttpError(413, 'That request is too large.');
  if (req.body && typeof req.body === 'object') return req.body; // Vercel parses JSON for us
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    let size = 0; const chunks = [];
    for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new HttpError(413, 'That request is too large.'); chunks.push(c); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, 'Please refresh the page and try again.');
  }
}

/** Browsers send Origin on cross-site POSTs; refuse anything not from this site. */
export function assertSameOrigin(req) {
  const origin = req.headers.origin, host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin) return;
  let ok = false; try { ok = new URL(origin).host === host; } catch {}
  if (!ok) throw new HttpError(403, 'Not allowed.');
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

/** Returns a function key -> true when that key has gone over `max` hits in `windowMs`. Per server instance. */
export function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    list.push(now); hits.set(key, list);
    if (hits.size > 5000) hits.clear();
    return list.length > max;
  };
}

export function postOnly(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed.' }); return false; }
  return true;
}

export function fail(res, e, tag) {
  if (e instanceof HttpError) return res.status(e.status).json({ ok: false, error: e.message, field: e.field });
  if (e && e.name === 'RequestError') return res.status(400).json({ ok: false, error: e.message, field: e.field });
  console.error(`[${tag}]`, e && e.message);
  return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
}
