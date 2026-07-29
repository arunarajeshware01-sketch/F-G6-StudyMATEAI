import { cors } from './auth.js';

export default function handler(req, res) {
  cors(res);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(204).end();
  console.warn('[api-404] Unknown API route', { method: req.method, url: req.url });
  return res.status(404).json({ success: false, message: 'API endpoint not found' });
}
