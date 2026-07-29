import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BookOpen, BrainCircuit, CalendarDays, ChartNoAxesCombined, CheckSquare2, Clock3, GraduationCap, LogOut, Menu, Moon, Sparkles, Sun, UserRound, X } from 'lucide-react';
import supabase from './lib/supabase';
import { handleGoogleRedirect } from './lib/googleAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import PlannerPage from './pages/PlannerPage';
import StudyHub from './pages/StudyHub';
import TutorPage from './pages/TutorPage';
import FeynmanPage from './pages/FeynmanPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import Onboarding from './components/Onboarding';
import { api } from './lib/api';
import FlashcardsPage from './pages/FlashcardsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { MusicProvider } from './contexts/MusicContext';
import MiniPlayer from './components/MiniPlayer';

handleGoogleRedirect();

type Page = 'dashboard'|'tasks'|'planner'|'hub'|'tutor'|'feynman'|'flashcards'|'analytics'|'profile';
const nav = [
  ['dashboard','Dashboard',GraduationCap],['tasks','Tasks',CheckSquare2],['planner','Planner',CalendarDays],
  ['hub','Study Hub',Clock3],['tutor','AI Tutor',BrainCircuit],['feynman','Feynman Buddy',Sparkles],
  ['flashcards','Flashcards',BrainCircuit],
  ['analytics','Analytics',ChartNoAxesCombined],['profile','Profile',UserRound],
] as const;

function Shell(){
 const { user, loading } = useAuth();
 const [page,setPage]=useState<Page>('dashboard'); const [open,setOpen]=useState(false);
 const [profile,setProfile]=useState<any>(null); const [profileLoading,setProfileLoading]=useState(true);
 const [dark,setDark]=useState(()=>localStorage.getItem('theme')!=='light');
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('theme',dark?'dark':'light')},[dark]);
 useEffect(()=>{if(!user){setProfile(null);setProfileLoading(false);return}setProfileLoading(true);api('profile').then(setProfile).finally(()=>setProfileLoading(false))},[user]);
 if(loading) return <div className="min-h-screen grid place-items-center bg-slate-950"><div className="loader"/></div>;
 if(!user) return <AuthPage/>;
 if(profileLoading) return <div className="min-h-screen grid place-items-center bg-slate-950"><div className="loader"/></div>;
 if(!profile?.name||!profile?.age||!profile?.course||!profile?.subjects||!profile?.study_goals) return <Onboarding initial={profile} onComplete={setProfile}/>;
 const pages:Record<Page,ReactElement>={dashboard:<Dashboard go={setPage}/>,tasks:<TasksPage/>,planner:<PlannerPage/>,hub:<StudyHub/>,tutor:<TutorPage/>,feynman:<FeynmanPage/>,flashcards:<FlashcardsPage/>,analytics:<AnalyticsPage/>,profile:<ProfilePage onUpdated={setProfile}/>};
 return <div className="min-h-screen text-slate-800 dark:text-slate-100">
  <div className="aurora"/><div className="scene-3d" aria-hidden="true"><i className="orb orb-one"/><i className="orb orb-two"/><i className="orb orb-three"/><i className="grid-plane"/></div><button onClick={()=>setOpen(true)} className="fixed left-4 top-4 z-30 rounded-xl glass p-2 lg:hidden" aria-label="Open menu"><Menu/></button>
  {open&&<div onClick={()=>setOpen(false)} className="fixed inset-0 z-30 bg-black/50 lg:hidden"/>}
  <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950/90 p-5 backdrop-blur-2xl transition-transform lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
   <div className="flex h-full flex-col">
    <div className="mb-6 flex items-center gap-3 px-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/25"><BookOpen className="text-white"/></div><div><b className="text-xl text-white">StudyMate <span className="text-cyan-300">AI</span></b><p className="text-xs text-slate-400">Learn smarter, every day.</p></div><button onClick={()=>setOpen(false)} className="ml-auto lg:hidden"><X/></button></div>
    <button onClick={()=>{setPage('profile');setOpen(false)}} className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 font-bold text-white">{profile.avatar_url?<img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover"/>:profile.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{profile.name}</p><p className="truncate text-xs text-slate-400">{profile.course}</p></div></button>
    <nav className="flex-1 space-y-1 overflow-y-auto pr-1 pb-4">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>{setPage(id);setOpen(false)}} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${page===id?'bg-gradient-to-r from-violet-600/80 to-indigo-600/60 text-white shadow-lg':'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon size={18}/>{label}{id==='feynman'&&<span className="ml-auto rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300">MAIN</span>}</button>)}</nav>
    <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-3"><button onClick={()=>setDark(!dark)} className="glass flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-slate-300">{dark?<Sun size={16}/>:<Moon size={16}/>} Theme</button><button onClick={()=>supabase.auth.signOut()} className="glass rounded-xl p-2.5 text-slate-300" title="Sign out"><LogOut size={17}/></button></div>
   </div>
  </aside>
  <main className="relative min-h-screen px-4 pb-20 pt-20 sm:px-7 lg:ml-72 lg:px-10 lg:pt-9"><div className="mx-auto max-w-7xl"><AnimatePresence mode="wait"><motion.div key={page} initial={{opacity:0,y:18,rotateX:-3}} animate={{opacity:1,y:0,rotateX:0}} exit={{opacity:0,y:-10}} transition={{duration:.32,ease:[.22,1,.36,1]}} style={{transformPerspective:1200}}>{pages[page]}</motion.div></AnimatePresence></div></main>
 </div>
}
export default function App(){
 if(window.location.pathname==='/reset-password') return <ResetPasswordPage/>;
 return <AuthProvider><MusicProvider><Shell/><MiniPlayer/></MusicProvider></AuthProvider>
}
