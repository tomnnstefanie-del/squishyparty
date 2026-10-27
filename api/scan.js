// GET /c (rewritten here by vercel.json): the QR sticker on every capsule lid. Counts the scan, then opens the offer.
import { recordScan } from '../lib/stats.js';

export default async function handler(req, res) {
  await recordScan();
  res.setHeader('Cache-Control', 'no-store'); // every scan reaches us
  res.statusCode = 307; res.setHeader('Location', '/?src=capsule#offer'); res.end();
}
