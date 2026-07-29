import supabase from './db-client.js';
import { cors, getUser } from './auth.js';
import { registerStudyActivity } from './streak-utils.js';

const OPENROUTER_MODEL = 'openrouter/free';

function localFeedback(topic, explanation) {
  const words = explanation.trim().split(/\s+/).length;
  const hasExample = /example|like|imagine|such as/i.test(explanation);
  const hasCause = /because|therefore|so that|means/i.test(explanation);
  const score = Math.min(96, 48 + Math.min(28, Math.floor(words / 3)) + (hasExample ? 10 : 0) + (hasCause ? 10 : 0));
  return {
    score,
    strength: hasExample ? 'You used an analogy or example, making the central idea easier to visualize.' : 'You communicated the central idea in your own words instead of hiding behind jargon.',
    question: `What causes ${topic} to happen, and what would change if one key condition were removed?`,
    suggestion: `Add one everyday analogy and explicitly connect each cause to its effect. Then explain ${topic} again in three sentences without technical terms.`,
    encouragement: score >= 80 ? 'That was a clear, confident explanation!' : 'Good foundation—one more simple example will make it click.',
  };
}

async function assessWithOpenRouter(topic, explanation, profile) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const systemPrompt = `You are the curious Feynman Buddy. Assess understanding for ${profile?.course || 'a student'}. Return ONLY JSON with score, strength, question, suggestion, encouragement.`;
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
      temperature: 0.25,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Topic: ${topic}\nExplanation: ${explanation}` },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content?.trim() || '';
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
      strength: String(parsed.strength),
      question: String(parsed.question),
      suggestion: String(parsed.suggestion),
      encouragement: String(parsed.encouragement),
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const user = await getUser(req);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const topic = req.body.topic?.trim();
    const explanation = req.body.explanation?.trim();
    if (!topic || !explanation) return res.status(400).json({ error: 'Topic and explanation are required' });
    const { data: profile } = await supabase.from('profiles').select('course,subjects,study_goals').eq('user_id', user.id).maybeSingle();
    const aiFeedback = await assessWithOpenRouter(topic, explanation, profile);
    const feedback = aiFeedback || localFeedback(topic, explanation);
    const { error } = await supabase.from('feynman_sessions').insert({ user_id: user.id, topic, explanation, score: feedback.score, feedback });
    if (error) throw error;
    await registerStudyActivity(user.id);
    return res.status(201).json({ ...feedback, provider: aiFeedback ? 'openrouter' : 'built-in' });
  } catch (error) {
    return res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message });
  }
}
