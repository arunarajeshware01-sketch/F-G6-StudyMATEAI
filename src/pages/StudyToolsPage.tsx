import { useEffect, useState } from 'react';
import { Brain, CalendarClock, Dices, Repeat, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { Card, Loading, PageTitle } from '../components/UI';

export default function StudyToolsPage() {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => { api('profile').then(setProfile); }, []);
  if (!profile) return <Loading />;

  const subjects = (profile.subjects || '').split(',').map((x: string) => x.trim()).filter(Boolean);
  const weak = (profile.weaknesses || '').split(',').map((x: string) => x.trim()).filter(Boolean);

  const intervals = [1, 3, 7, 14, 30];
  const today = new Date();
  const spacedSchedule = subjects.slice(0, 5).flatMap((sub: string, idx: number) =>
    intervals.map((days) => {
      const d = new Date(today); d.setDate(d.getDate() + days + idx);
      return { subject: sub, day: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), interval: days };
    })
  );

  const interleave = [...weak, ...subjects.filter((s: string) => !weak.includes(s))].slice(0, 4);

  return <>
    <PageTitle eyebrow="Study smarter, not harder" title="Study Tools" desc="Spaced repetition and interleaving to boost long-term retention." />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-center gap-2"><Repeat className="text-violet-500" /><h2 className="text-xl font-bold">Spaced Repetition</h2></div>
        <p className="text-sm text-slate-500">Review material at increasing intervals to counter memory decay.</p>
        <div className="mt-5 space-y-3">
          {subjects.length === 0 && <p className="text-sm text-slate-500">Add subjects in your profile to generate a review schedule.</p>}
          {spacedSchedule.slice(0, 8).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-2xl bg-white/50 p-3 dark:bg-white/[.04]">
              <div><p className="text-sm font-semibold">{s.subject}</p><p className="text-xs text-slate-500">Review after {s.interval} days</p></div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-500">{s.day}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="mb-4 flex items-center gap-2"><Dices className="text-cyan-500" /><h2 className="text-xl font-bold">Interleaving</h2></div>
        <p className="text-sm text-slate-500">Mix different topics in one session instead of blocking one subject for hours.</p>
        <div className="mt-5 space-y-3">
          {interleave.length === 0 && <p className="text-sm text-slate-500">Add subjects and weaknesses to generate a mixed session.</p>}
          {interleave.map((sub: string, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/50 p-3 dark:bg-white/[.04]">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/10 text-sm font-bold text-violet-500">{i + 1}</span>
              <div><p className="text-sm font-semibold">{sub}</p><p className="text-xs text-slate-500">{weak.includes(sub) ? 'Weak area — priority focus' : 'Neutral — maintenance review'}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => alert('Start a focus session and rotate through these subjects every 15-20 minutes!')} className="btn-primary mt-5 w-full"><Sparkles size={16} /> Start interleaved session</button>
      </Card>
    </div>
    <Card className="mt-5">
      <h2 className="text-xl font-bold">How these techniques work</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-violet-500/10 p-5">
          <CalendarClock className="mb-3 text-violet-500" />
          <b className="text-sm">Spaced Repetition</b>
          <p className="mt-2 text-xs leading-5 text-slate-500">Your brain forgets on a predictable curve. Reviewing just before you forget strengthens the memory trace each time, making recall effortless.</p>
        </div>
        <div className="rounded-2xl bg-cyan-500/10 p-5">
          <Brain className="mb-3 text-cyan-500" />
          <b className="text-sm">Interleaving</b>
          <p className="mt-2 text-xs leading-5 text-slate-500">When you mix subjects, your brain works harder to distinguish concepts. This extra effort creates stronger, more flexible understanding than blocked practice.</p>
        </div>
      </div>
    </Card>
  </>;
}
