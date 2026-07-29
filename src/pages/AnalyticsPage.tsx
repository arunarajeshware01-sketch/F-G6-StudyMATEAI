import { useEffect,useState } from 'react';import { Award,Brain,Clock3,Flame,Trophy,Target,BookOpen } from 'lucide-react';import { api } from '../lib/api';import { Card,Loading,PageTitle } from '../components/UI';

export default function AnalyticsPage(){
  const[d,setD]=useState<any>(null);
  useEffect(()=>{const load=()=>api('dashboard').then(setD);load();const timer=setInterval(load,10000);return()=>clearInterval(timer)},[]);
  if(!d)return <Loading/>;
  const subjects=d.subjects||[];
  const maxMinutes=Math.max(1,...subjects.map((s:any)=>s.minutes||0));
  const unlocked=[d.totalMinutes>0,d.streak>=3,d.completed>=5,d.bestFeynmanScore>=80];
  const achs=[{name:'First Focus',desc:'Complete a session',icon:BookOpen},{name:'Momentum',desc:'3-day study streak',icon:Flame},{name:'Task Tamer',desc:'Finish 5 tasks',icon:Target},{name:'Deep Thinker',desc:'Score 80+ with Buddy',icon:Brain}];
  return <><PageTitle eyebrow="Your growth, made visible" title="Live learning analytics" desc="Every value begins at zero and updates from your actual study activity."/>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[Clock3,'Total focus',`${d.totalMinutes||0} min`,d.totalMinutes>0],[Brain,'Focus score',`${d.focusScore||0}%`,d.focusScore>0],[Flame,'Current streak',`${d.streak||0} days`,d.streak>0],[Trophy,'Tasks finished',d.completed||0,d.completed>0]].map(([Icon,x,y,active]:any)=><Card key={x} className={active?'':'opacity-60'}><Icon className={`mb-4 ${active?'text-violet-500':'text-slate-400'}`}/><p className="text-sm text-slate-500">{x}</p><b className="text-2xl">{y}</b></Card>)}</div>
  <div className="mt-5 grid gap-5 lg:grid-cols-2">
    <Card><h2 className="text-xl font-bold">Subject progress</h2><div className="mt-6 space-y-5">{subjects.map((s:any)=><div key={s.subject}><div className="mb-2 flex justify-between text-sm"><b>{s.subject}</b><span>{s.minutes} min</span></div><div className="h-2 rounded-full bg-slate-200 dark:bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{width:`${Math.min(100,(s.minutes/maxMinutes)*100)}%`}}/></div></div>)}{!subjects.length&&<p className="text-sm text-slate-500">No generated values. Complete a focus session to start tracking progress.</p>}</div></Card>
    <Card><h2 className="text-xl font-bold">Achievements</h2><div className="mt-5 grid grid-cols-2 gap-3">{achs.map((a,i)=>{const Icon=a.icon;return<div key={a.name} className={`rounded-2xl p-4 ${unlocked[i]?'bg-amber-500/10':'bg-slate-200/50 opacity-50 dark:bg-white/5'}`}><Icon className={`mb-3 ${unlocked[i]?'text-amber-500':'text-slate-400'}`}/><b className="text-sm">{a.name}</b><p className="mt-1 text-xs text-slate-500">{unlocked[i]?'Unlocked!':a.desc}</p></div>})}</div></Card>
  </div></>;
}
