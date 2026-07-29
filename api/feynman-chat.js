import supabase from './db-client.js';
import { cors, getUser } from './auth.js';

const OPENROUTER_MODEL = 'openrouter/free';

function localChatReply(topic, previousFeedback, userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('yes') || lower.includes('sure') || lower.includes('okay') || lower.includes('let')) {
    return `Great! Let's dive deeper into ${topic}. ${previousFeedback.suggestion} Start by writing one sentence that explains the core idea to a 10-year-old.`;
  }
  if (lower.includes('no') || lower.includes('not') || lower.includes('hard')) {
    return `That's completely fine! Learning takes time. Let's make it simpler: what is the ONE thing about ${topic} that you do understand? Build from there.`;
  }
  if (lower.includes('why') || lower.includes('how')) {
    return `Excellent question! That's exactly the kind of thinking that leads to real understanding. ${previousFeedback.question} Try answering in your own words, and I'll help refine it.`;
  }
  return `I love that you're engaging with this! Let's keep building your understanding of ${topic}. ${previousFeedback.question} Give it your best shot—there are no wrong answers here, only steps forward.`;
}

async function askOpenRouterChat(topic, explanation, previousFeedback, userMessage, profile) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const systemPrompt = `You are Buddy, the curious Feynman AI in StudyMate AI. The student just explained "${topic}" and scored ${previousFeedback.score}/100. You asked: "${previousFeedback.question}". You suggested: "${previousFeedback.suggestion}".\n\nNow the student is replying to you. Be encouraging, ask one focused follow-up, and help them close the gap in their understanding. Keep it conversational and warm.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://studymate.app',
        'X-OpenRouter-Title': 'StudyMate',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 800,
        temperature: 0.4,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const user = await getUser(req);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { topic, explanation, previousFeedback, userMessage } = req.body;
    const { data: profile } = await supabase.from('profiles').select('course').eq('user_id', user.id).maybeSingle();
    const reply = await askOpenRouterChat(topic, explanation, previousFeedback, userMessage, profile) || localChatReply(topic, previousFeedback, userMessage);
    return res.json({ response: reply });
  } catch (error) {
    return res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message });
  }
}
