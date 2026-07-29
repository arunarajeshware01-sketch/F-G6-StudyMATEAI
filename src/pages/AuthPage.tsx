import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Chrome, Eye, EyeOff, Mail, Sparkles } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import Aurora from '../components/Aurora/Aurora';

type View = 'login' | 'forgot';

export default function AuthPage() {
  const initialForgot = location.pathname === '/forgot-password' || new URLSearchParams(location.search).get('forgot') === '1';
  const [signup, setSignup] = useState(false); const [show, setShow] = useState(false); const [view, setView] = useState<View>(initialForgot ? 'forgot' : 'login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pop = () => setView(location.pathname === '/forgot-password' ? 'forgot' : 'login');
    addEventListener('popstate', pop); return () => removeEventListener('popstate', pop);
  }, []);

  function navigate(next: View, path: string) { history.pushState({}, '', path); setView(next); setError(''); setSuccess(''); }

  async function authSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    const result = signup ? await supabase.auth.signUp({ email, password, options: { data: { name } } }) : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setError(result.error.message);
    setBusy(false);
  }

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) return setError('Enter a valid email address.');
    setBusy(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    console.info('[password-recovery] resetPasswordForEmail', { redirectTo });
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo });
    if (resetError) setError(resetError.message);
    else setSuccess('Password reset link sent. Check your email and follow the secure link.');
    setBusy(false);
  }

  function back() { navigate('login', '/'); }

  return <main className="login-page relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-2"><div className="aurora-background" aria-hidden="true"><Aurora colorStops={["#7C3AED","#60A5FA","#3B82F6"]} amplitude={1.1} blend={0.35} speed={0.45}/></div><div className="background-overlay" aria-hidden="true"/><section className="login-content relative hidden flex-col justify-between p-14 lg:flex"><div className="flex items-center gap-3 text-white"><span className="rounded-2xl bg-violet-600 p-3"><BookOpen/></span><b className="text-2xl">StudyMate AI</b></div><div className="max-w-xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-200"><Sparkles size={15}/>Your personal learning companion</div><h1 className="text-6xl font-bold leading-[1.05] text-white">Turn curiosity into <span className="gradient-text">confidence.</span></h1><p className="mt-6 text-lg leading-8 text-slate-400">Plan smarter, focus deeper, and master any concept by teaching it to your curious AI buddy.</p></div><p className="text-sm text-slate-600">Built for ambitious learners.</p></section><section className="login-content relative grid place-items-center p-5"><div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.06] p-7 shadow-2xl backdrop-blur-2xl sm:p-9"><div className="mb-7 lg:hidden"><span className="text-xl font-bold text-white">StudyMate <span className="text-cyan-300">AI</span></span></div>{view!=='login'&&<button onClick={back} className="mb-5 flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Back to sign in</button>}{success&&<p className="mb-4 flex gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="shrink-0" size={18}/>{success}</p>}{error&&<p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

  {view==='login'&&<><h2 className="text-3xl font-bold text-white">{signup?'Create your account':'Welcome back'}</h2><p className="mt-2 text-sm text-slate-400">{signup?'Start your personalized learning journey.':'Pick up where your progress left off.'}</p><form onSubmit={authSubmit} className="mt-7 space-y-4">{signup&&<input className="input-dark" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required/>}<input className="input-dark" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required/><div className="relative"><input className="input-dark pr-12" type={show?'text':'password'} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" onClick={()=>setShow(!show)} className="absolute right-4 top-3.5 text-slate-500">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{!signup&&<button type="button" onClick={()=>navigate('forgot','/forgot-password')} className="block text-sm font-semibold text-cyan-300">Forgot password?</button>}<button disabled={busy} className="btn-primary w-full">{busy?'Please wait…':signup?'Create account':'Sign in'}</button></form><div className="my-5 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10"/>OR<span className="h-px flex-1 bg-white/10"/></div><button onClick={signInWithGoogle} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5"><Chrome size={18}/>Continue with Google</button><p className="mt-6 text-center text-sm text-slate-400">{signup?'Already a member?':'New to StudyMate?'} <button onClick={()=>setSignup(!signup)} className="font-bold text-cyan-300">{signup?'Sign in':'Create account'}</button></p></>}

  {view==='forgot'&&<><div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300"><Mail/></div><h2 className="mt-5 text-3xl font-bold text-white">Forgot password?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Enter your account email. Supabase will send you a secure password reset link.</p><form onSubmit={sendResetLink} className="mt-7 space-y-4"><input autoFocus className="input-dark" type="email" placeholder="Account email address" value={email} onChange={e=>setEmail(e.target.value)} required/><button disabled={busy} className="btn-primary w-full">{busy?'Sending reset link…':'Send Reset Link'}</button></form><p className="mt-5 text-center text-xs leading-5 text-slate-500">The link is sent by Supabase Auth. No verification code is required.</p></>}
  </div></section></main>;
}
