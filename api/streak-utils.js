import supabase from './db-client.js';

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayDifference(later, earlier) {
  const a = new Date(`${later}T00:00:00.000Z`);
  const b = new Date(`${earlier}T00:00:00.000Z`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export async function getCurrentStreak(userId) {
  const today = isoDay();
  const { data, error } = await supabase.from('user_streaks').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: created, error: createError } = await supabase.from('user_streaks').insert({ user_id: userId, study_streak: 0, last_study_date: null }).select().single();
    if (createError) throw createError;
    return created;
  }
  if (data.last_study_date && dayDifference(today, data.last_study_date) > 1 && data.study_streak !== 0) {
    const { data: reset, error: resetError } = await supabase.from('user_streaks').update({ study_streak: 0 }).eq('user_id', userId).select().single();
    if (resetError) throw resetError;
    return reset;
  }
  return data;
}

export async function registerStudyActivity(userId) {
  const today = isoDay();
  const current = await getCurrentStreak(userId);
  if (current.last_study_date === today) return current;
  const gap = current.last_study_date ? dayDifference(today, current.last_study_date) : null;
  const nextStreak = gap === 1 ? current.study_streak + 1 : 1;
  const { data, error } = await supabase.from('user_streaks').update({ study_streak: nextStreak, last_study_date: today }).eq('user_id', userId).select().single();
  if (error) throw error;
  return data;
}
