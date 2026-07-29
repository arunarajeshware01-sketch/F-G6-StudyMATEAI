import supabase from './db-client.js';
import { cors, getUser } from './auth.js';

const OPENROUTER_MODEL = 'openrouter/free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function systemPrompt(mode, profile) {
  const learner = profile
    ? `The learner is ${profile.name || 'a student'} in ${profile.course || 'an unspecified course'}. Subjects: ${profile.subjects || 'not provided'}. Goals: ${profile.study_goals || 'not provided'}. Strengths: ${profile.strengths || 'not provided'}. Areas to improve: ${profile.weaknesses || 'not provided'}.`
    : '';
  const modeRules = {
    Learning: 'Teach step by step, use a concrete analogy when useful, and finish with one brief check-for-understanding question.',
    Quiz: 'Act as a quiz coach. Ask one question at a time, wait for the answer, then give concise feedback before continuing.',
    Exam: 'Act as an exam-preparation coach. Prioritize high-yield concepts, common mistakes, and active recall.',
    Homework: 'Guide the reasoning without simply doing assessed work for the learner. Offer the next useful hint.',
  };
  return `You are Mate, the supportive and rigorous AI Tutor in StudyMate AI. ${learner}\n${modeRules[mode] || modeRules.Learning}\nUse clear Markdown. Be accurate, concise, encouraging, and adapt to the learner's level. Never claim you inspected an attachment unless its contents are present in the prompt.`;
}

function writeEvent(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

export default async function handler(req, res) {
  cors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);

    if (req.method === 'GET') {
      const conversationId = Number(req.query.conversationId);
      if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });
      const { data: conversation, error: conversationError } = await supabase
        .from('tutor_conversations').select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      const { data, error } = await supabase
        .from('tutor_chat_messages').select('*').eq('conversation_id', conversationId).eq('user_id', user.id).order('created_at');
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const conversationId = Number(req.body.conversationId);
    const message = String(req.body.message || '').trim();
    const mode = String(req.body.mode || 'Learning');
    if (!conversationId || !message) return res.status(400).json({ error: 'conversationId and message are required' });
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured on the server.' });

    const [{ data: conversation, error: conversationError }, { data: profile, error: profileError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from('tutor_conversations').select('*').eq('id', conversationId).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('tutor_chat_messages').select('role,content').eq('conversation_id', conversationId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
    ]);
    if (conversationError) throw conversationError;
    if (profileError) throw profileError;
    if (historyError) throw historyError;
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const orderedHistory = (history || []).reverse().map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.content || ''),
    }));

    console.log('Using OpenRouter model:', OPENROUTER_MODEL);

    let openRouterResponse;
    try {
      openRouterResponse = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': req.headers.origin || 'https://studymate.app',
          'X-OpenRouter-Title': 'StudyMate AI',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          max_tokens: 1500,
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt(mode, profile) },
            ...orderedHistory,
            { role: 'user', content: message },
          ],
        }),
      });
    } catch (networkError) {
      console.error('OpenRouter network error:', networkError);
      return res.status(502).json({ error: { message: 'Could not reach OpenRouter.', type: 'network_error', detail: networkError.message } });
    }

    let openRouterJson;
    try {
      openRouterJson = await openRouterResponse.json();
    } catch (parseError) {
      console.error('OpenRouter returned invalid JSON:', parseError);
      return res.status(502).json({ error: { message: 'OpenRouter returned an invalid JSON response.', type: 'invalid_response' } });
    }

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', openRouterResponse.status, openRouterJson);
      return res.status(openRouterResponse.status).json(openRouterJson);
    }

    const answer = openRouterJson.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      console.error('OpenRouter response contained no assistant text:', openRouterJson);
      return res.status(502).json(openRouterJson);
    }

    const { data: inserted, error: insertError } = await supabase.from('tutor_chat_messages').insert([
      { user_id: user.id, conversation_id: conversationId, role: 'user', content: message },
      { user_id: user.id, conversation_id: conversationId, role: 'assistant', content: answer },
    ]).select();
    if (insertError) throw insertError;

    const assistantMessage = inserted?.find(item => item.role === 'assistant') || {
      id: `assistant-${Date.now()}`, role: 'assistant', content: answer, created_at: new Date().toISOString(),
    };

    const conversationUpdate = { last_preview: answer.slice(0, 160), updated_at: new Date().toISOString() };
    if (req.body.isFirst && (!conversation.title || conversation.title === 'New conversation')) conversationUpdate.title = message.slice(0, 48);
    await supabase.from('tutor_conversations').update(conversationUpdate).eq('id', conversationId).eq('user_id', user.id);

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const chunkSize = 18;
    for (let index = 0; index < answer.length; index += chunkSize) {
      writeEvent(res, { type: 'chunk', text: answer.slice(index, index + chunkSize) });
    }
    writeEvent(res, { type: 'done', message: assistantMessage, provider: 'openrouter', model: OPENROUTER_MODEL });
    return res.end();
  } catch (error) {
    console.error('Tutor chat API error:', error);
    return res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message });
  }
}
