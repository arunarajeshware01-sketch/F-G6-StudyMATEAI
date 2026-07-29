import { useState } from 'react';
import { BookOpen, Check, ChevronRight, Clock3, Sparkles, Target, UserRound } from 'lucide-react';
import { api } from '../lib/api';

export default function Onboarding({ initial, onComplete }: { initial: any; onComplete: (profile: any) => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    ...initial,
    name: initial?.name || '', age: initial?.age || '', course: initial?.course || '',
    subjects: initial?.subjects || '', study_goals: initial?.study_goals || '',
    preferred_time: initial?.preferred_time || 'Evening', strengths: initial?.strengths || '', weaknesses: initial?.weaknesses || '',
  });
  const steps = [
    { icon: UserRound, title: 'Tell us about you', text: 'Your profile helps StudyMate personalize every recommendation.' },
    { icon: BookOpen, title: 'What are you studying?', text: 'Add your current class and the subjects you want to improve.' },
    { icon: Target, title: 'Shape your study plan', text: 'Set a goal and tell your AI buddy where you feel strongest.' },
  ];
  function next() {
    setError('');
    if (step === 0 && (!form.name.trim() || !form.age || !form.course.trim())) return setError('Please complete your name, age, and class or course.');
    if (step === 1 && !form.subjects.trim()) return setError('Add at least one subject.');
    setStep(step + 1);
  }
  async function finish() {
    if (!form.study_goals.trim()) return setError('Add one study goal to continue.');
    setBusy(true); setError('');
    try { onComplete(await api('profile', { method: 'PUT', body: JSON.stringify(form) })); }
    catch (e: any) { setError(e.message); setBusy(false); }
  }
  const info = steps[step], Icon = info.icon;
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-5 text-white"><div className="aurora"/><div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur-2xl sm:p-10"><div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><span className="rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 p-3"><Sparkles/></span><div><b className="text-xl">StudyMate AI</b><p className="text-xs text-slate-400">Let’s personalize your workspace</p></div></div><span className="text-xs text-slate-400">Step {step + 1} of 3</span></div><div className="mb-8 flex gap-2">{steps.map((_,i)=><div key={i} className={`h-1.5 flex-1 rounded-full ${i<=step?'bg-gradient-to-r from-violet-500 to-cyan-400':'bg-white/10'}`}/>)}</div><Icon className="mb-4 text-cyan-300" size={30}/><h1 className="text-3xl font-bold">{info.title}</h1><p className="mt-2 text-sm text-slate-400">{info.text}</p>{error&&<p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}<div className="mt-7 space-y-4">{step===0&&<><label className="block text-slate-300">Full name<input className="input-dark" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-slate-300">Age<input className="input-dark" type="number" min="5" max="100" value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/></label><label className="block text-slate-300">Class / course<input className="input-dark" value={form.course} onChange={e=>setForm({...form,course:e.target.value})} placeholder="e.g. Grade 11, Computer Science"/></label></div></>}{step===1&&<><label className="block text-slate-300">Subjects<input className="input-dark" value={form.subjects} onChange={e=>setForm({...form,subjects:e.target.value})} placeholder="Math, Physics, English"/><span className="mt-2 block text-xs font-normal text-slate-500">Separate subjects with commas.</span></label><label className="block text-slate-300"><span className="flex items-center gap-2"><Clock3 size={14}/> Preferred study time</span><select className="input-dark" value={form.preferred_time} onChange={e=>setForm({...form,preferred_time:e.target.value})}><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Late night</option></select></label></>}{step===2&&<><label className="block text-slate-300">Main study goal<textarea className="input-dark min-h-20" value={form.study_goals} onChange={e=>setForm({...form,study_goals:e.target.value})} placeholder="What would you like to achieve?"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-slate-300">Strengths<textarea className="input-dark min-h-20" value={form.strengths} onChange={e=>setForm({...form,strengths:e.target.value})} placeholder="What comes naturally?"/></label><label className="block text-slate-300">Areas to improve<textarea className="input-dark min-h-20" value={form.weaknesses} onChange={e=>setForm({...form,weaknesses:e.target.value})} placeholder="Where do you need support?"/></label></div></>}</div><div className="mt-8 flex justify-between"><button onClick={()=>setStep(Math.max(0,step-1))} className={`rounded-xl px-5 py-3 text-sm font-semibold text-slate-300 ${step===0?'invisible':''}`}>Back</button>{step<2?<button onClick={next} className="btn-primary">Continue <ChevronRight size={17}/></button>:<button disabled={busy} onClick={finish} className="btn-primary">{busy?'Creating your workspace…':<>Finish setup <Check size={17}/></>}</button>}</div></div></main>
}
