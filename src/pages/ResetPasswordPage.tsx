import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import supabase from '../lib/supabase';

type RecoveryState = 'checking' | 'valid' | 'invalid' | 'success';

function scorePassword(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(4, score);
}

export default function ResetPasswordPage() {
  const [state, setState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const recoverySessionReady = useRef(false);
  const strength = useMemo(() => scorePassword(password), [password]);
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-slate-300', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-emerald-500'];

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) setState(current => current === 'checking' ? 'invalid' : current); }, 8000);
    console.info('[password-recovery] URL received after redirect', {
      href: window.location.href,
      pathname: window.location.pathname,
      hasCode: new URLSearchParams(window.location.search).has('code'),
      hasAccessToken: new URLSearchParams(window.location.hash.replace(/^#/, '')).has('access_token'),
      error: new URLSearchParams(window.location.search).get('error'),
      errorCode: new URLSearchParams(window.location.search).get('error_code'),
    });

    // The shared Supabase client has detectSessionInUrl enabled. It is the sole
    // owner of code/OTP redemption. Manually exchanging the same one-time code
    // here would consume it twice and make Supabase report otp_expired.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.info('[password-recovery] Auth event received', { event, hasSession: Boolean(session) });
      if (session) console.info('[password-recovery] Session created', { userId: session.user.id, expiresAt: session.expires_at });
      if (session?.user) console.info('[password-recovery] Session user', { id: session.user.id, email: session.user.email });
      if (event === 'PASSWORD_RECOVERY' && session && active) {
        recoverySessionReady.current = true;
        window.history.replaceState({}, '', '/reset-password');
        setState('valid');
      }
    });

    // Covers the case where detectSessionInUrl completed before React mounted
    // the listener. This does not redeem the code; it only reads the session.
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        console.error('[password-recovery] Session lookup failed', { message: sessionError.message });
        setState('invalid');
        return;
      }
      if (session) {
        console.info('[password-recovery] Session created', { userId: session.user.id, expiresAt: session.expires_at });
        console.info('[password-recovery] Session user', { id: session.user.id, email: session.user.email });
        recoverySessionReady.current = true;
        window.history.replaceState({}, '', '/reset-password');
        setState('valid');
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.get('error')) {
          console.error('[password-recovery] Supabase redirect error', {
            error: params.get('error'), errorCode: params.get('error_code'), description: params.get('error_description'),
          });
          setState('invalid');
        }
      }
    });
    return () => { active = false; window.clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (strength < 2) return setError('Choose a stronger password with a number, uppercase letter, or symbol.');
    if (password !== confirm) return setError('The passwords do not match.');
    if (!recoverySessionReady.current) return setError('The recovery session is not ready. Please open a new reset link.');
    setSaving(true);
    console.info('[password-recovery] updateUser execution', { recoverySessionReady: recoverySessionReady.current });
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      if (/expired|invalid|session/i.test(updateError.message)) setState('invalid');
      return;
    }
    setState('success');
    await supabase.auth.signOut();
    window.setTimeout(() => { window.location.replace('/?login=1'); }, 1800);
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-5 text-white"><div className="aurora"/><div className="scene-3d" aria-hidden="true"><i className="orb orb-one"/><i className="orb orb-two"/></div><section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.07] p-7 shadow-2xl backdrop-blur-2xl sm:p-9"><div className="mb-7 flex items-center gap-3"><span className="rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 p-3"><BookOpen/></span><div><b className="text-xl">StudyMate AI</b><p className="text-xs text-slate-400">Secure password recovery</p></div></div>
  {state==='checking'&&<div className="py-12 text-center"><LoaderCircle className="mx-auto animate-spin text-cyan-300" size={38}/><h1 className="mt-5 text-2xl font-bold">Verifying your reset link</h1><p className="mt-2 text-sm text-slate-400">Please wait while we securely create your recovery session.</p></div>}
  {state==='invalid'&&<div className="py-6 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-300"><AlertCircle size={32}/></span><h1 className="mt-5 text-2xl font-bold">Reset link unavailable</h1><p className="mt-3 text-sm leading-6 text-slate-400">This password reset link is invalid or has expired. Please request a new password reset email.</p><button onClick={()=>window.location.replace('/?forgot=1')} className="btn-primary mt-7 w-full">Request a new reset link</button></div>}
  {state==='success'&&<div className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300"><CheckCircle2 size={34}/></span><h1 className="mt-5 text-2xl font-bold">Password updated successfully.</h1><p className="mt-3 text-sm text-slate-400">Redirecting you to Login…</p></div>}
  {state==='valid'&&<><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-300"><KeyRound/></span><h1 className="mt-5 text-3xl font-bold">Create a new password</h1><p className="mt-2 text-sm text-slate-400">Choose a strong password you have not used before.</p>{error&&<p className="mt-4 flex gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300"><AlertCircle size={17}/>{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-slate-300">New Password<div className="relative mt-2"><input className="input-dark pr-12" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required/><button type="button" onClick={()=>setShow(!show)} className="absolute right-4 top-3.5 text-slate-500"><Eye size={18}/></button></div></label><div><div className="flex gap-1.5">{[1,2,3,4].map(i=><i key={i} className={`h-1.5 flex-1 rounded-full ${strength>=i?colors[strength]:'bg-white/10'}`}/>)}</div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-slate-500">8+ characters, mixed case, number or symbol</span><b className={strength>=3?'text-emerald-300':'text-amber-300'}>{labels[strength]}</b></div></div><label className="block text-slate-300">Confirm Password<input className="input-dark mt-2" type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/></label><button disabled={saving} className="btn-primary mt-2 w-full">{saving?<><LoaderCircle className="animate-spin" size={18}/>Updating…</>:<><ShieldCheck size={18}/>Update password</>}</button></form></>}
  </section></main>;
}
