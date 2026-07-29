import supabase from './db-client.js';
import { cors, getUser } from './auth.js';

const clean = body => ({
  date: body.date,
  subject: body.subject?.trim(),
  start_time: body.start_time,
  end_time: body.end_time,
  checklist: Array.isArray(body.checklist) ? body.checklist : [],
  event_type: body.event_type || '',
  event_title: body.event_title?.trim() || '',
  planned_pomodoros: Math.max(0, Number(body.planned_pomodoros) || 0),
  completed_pomodoros: Math.max(0, Number(body.completed_pomodoros) || 0),
  notes: body.notes?.trim() || '',
});

export default async function handler(req, res) {
  cors(res); res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const user = await getUser(req);
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('planner_entries').select('*').eq('user_id', user.id).order('date').order('start_time');
      if (error) throw error;
      return res.json(data || []);
    }
    if (req.method === 'POST' && req.body.generate) {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('subjects,weaknesses,strengths,preferred_time').eq('user_id', user.id).single();
      if (profileError) throw profileError;
      const subjects = (profile.subjects || '').split(',').map(x => x.trim()).filter(Boolean);
      if (!subjects.length) return res.status(400).json({ error: 'Add subjects to your profile before generating a schedule.' });
      const weakText = (profile.weaknesses || '').toLowerCase();
      const sorted = [...subjects].sort((a,b) => Number(weakText.includes(b.toLowerCase())) - Number(weakText.includes(a.toLowerCase())));
      const base = new Date(); base.setHours(12,0,0,0);
      const slots = profile.preferred_time === 'Morning' ? ['07:00','08:00'] : profile.preferred_time === 'Afternoon' ? ['15:00','16:00'] : profile.preferred_time === 'Late night' ? ['21:00','22:00'] : ['17:00','18:00'];
      const rows = sorted.slice(0, 7).map((subject, index) => {
        const date = new Date(base); date.setDate(base.getDate() + index);
        const weak = weakText.includes(subject.toLowerCase());
        const endHour = String(Number(slots[1].slice(0,2)) + (weak ? 1 : 0)).padStart(2,'0') + slots[1].slice(2);
        return { user_id: user.id, date: date.toISOString().slice(0,10), subject, start_time: slots[0], end_time: endHour, checklist: [{ id: `${Date.now()}-${index}`, text: `Review ${subject}`, completed: false }], event_type: '', event_title: '', planned_pomodoros: weak ? 4 : 2, completed_pomodoros: 0, notes: weak ? 'Extra focus allocated based on your profile.' : '' };
      });
      const { data, error } = await supabase.from('planner_entries').insert(rows).select();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'POST') {
      const entry = clean(req.body);
      if (!entry.date || !entry.subject || !entry.start_time || !entry.end_time) return res.status(400).json({ error: 'Date, subject, start time, and end time are required.' });
      const { data, error } = await supabase.from('planner_entries').insert({ ...entry, user_id: user.id }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const entry = clean(req.body);
      const { data, error } = await supabase.from('planner_entries').update(entry).eq('id', req.body.id).eq('user_id', user.id).select().single();
      if (error) throw error;
      return res.json(data);
    }
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('planner_entries').delete().eq('id', req.body.id).eq('user_id', user.id);
      if (error) throw error;
      return res.json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message });
  }
}
