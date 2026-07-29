import { cors } from './auth.js';

const OPENROUTER_MODEL = 'openrouter/free';

export default async function handler(req, res) {
  cors(res);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-StudyMate-Build', 'llama-3.2-3b-refresh-2026-07-16');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    return res.status(200).json({
      runtime: 'vercel-serverless-node',
      build: 'llama-3.2-3b-refresh-2026-07-16',
      environment: {
        OPENROUTER_API_KEY: Boolean(process.env.OPENROUTER_API_KEY),
        OPENROUTER_MODEL,
        NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: OPENROUTER_MODEL,
      },
    });
  } catch (error) {
    return res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message });
  }
}
