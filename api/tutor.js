import supabase from './db-client.js';
import { cors, getUser } from './auth.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openrouter/free';

async function callOpenRouter(message, profile, history) {
  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error('OPENROUTER_API_KEY is not available in the serverless runtime.');
    error.status = 503;
    throw error;
  }
  const messages = history.slice(-10).map(item => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: String(item.content) }));
  messages.push({ role: 'user', content: message });
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://studymate.app',
        'X-OpenRouter-Title': 'StudyMate',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 1500,
        temperature: 0.4,
        messages: [
          { role: 'system', content: `You are Mate, StudyMate AI's tutor. Student course: ${profile?.course || 'unknown'}. Subjects: ${profile?.subjects || 'unknown'}. Teach step by step, adapt to the learner, and finish with a check-for-understanding question.` },
          ...messages,
        ],
      }),
    });
  } catch (error) {
    const wrapped = new Error(`Network request to OpenRouter failed: ${error.message}`); wrapped.status = 502; throw wrapped;
  }
  const body = await response.text();
  if (!response.ok) { const error = new Error(`OpenRouter API failed (${response.status}): ${body}`); error.status = response.status; error.details = body; throw error; }
  const payload = JSON.parse(body);
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) { const error = new Error(`OpenRouter returned no text content: ${body}`); error.status = 502; throw error; }
  return answer;
}

export default async function handler(req, res) {
  cors(res); res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const user = await getUser(req);
    if (!user?.id) return res.status(401).json({ error: 'Invalid authenticated user.' });
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('tutor_messages').select('*').eq('user_id', user.id).order('created_at');
      if (error) throw error;
      return res.json(data);
    }
    if (req.method === 'POST') {
      const content = req.body.message?.trim();
      if (!content) return res.status(400).json({ error: 'Message required' });
      const [{ data: profile, error: profileError }, { data: history, error: historyError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('tutor_messages').select('role,content,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      if (profileError) throw profileError;
      if (historyError) throw historyError;
      const reply = await callOpenRouter(content, profile, (history || []).reverse());
      const { data, error } = await supabase.from('tutor_messages').insert([
        { user_id: user.id, role: 'user', content },
        { user_id: user.id, role: 'assistant', content: reply },
      ]).select();
      if (error) throw error;
      return res.status(201).json({ messages: data, provider: 'openrouter', model: OPENROUTER_MODEL });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tutor API error:', { message: error.message, status: error.status, details: error.details, hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY) });
    return res.status(error.message === 'Unauthorized' ? 401 : error.status || 500).json({ error: error.message, status: error.status, details: error.details });
  }
}
