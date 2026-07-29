import { useEffect,useState,useRef } from 'react';import { Camera,Save,Trash2,Crop } from 'lucide-react';import { api } from '../lib/api';import { Card,Loading,PageTitle } from '../components/UI';

export default function ProfilePage({onUpdated}:{onUpdated?:(profile:any)=>void}){
  const[p,setP]=useState<any>(null),[saved,setSaved]=useState(false),[error,setError]=useState('');
  const[cropSrc,setCropSrc]=useState<string|null>(null);const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{api('profile').then(setP)},[]);
  if(!p)return <Loading/>;

  async function save(e:React.FormEvent){e.preventDefault();if(!p.name?.trim()){setError('Please enter the name you want StudyMate to display.');return}setError('');const updated=await api<any>('profile',{method:'PUT',body:JSON.stringify(p)});setP(updated);onUpdated?.(updated);setSaved(true);setTimeout(()=>setSaved(false),2000)}

  async function removeAvatar(){const updated=await api<any>('profile',{method:'PUT',body:JSON.stringify({avatar_url:''})});setP(updated);onUpdated?.(updated)}

  function onFile(file:File){
    const reader=new FileReader();
    reader.onload=()=>{setCropSrc(reader.result as string)};
    reader.readAsDataURL(file);
  }

  async function doCrop(){
    if(!cropSrc||!canvasRef.current)return;
    const img=new Image();
    img.onload=async()=>{
      const size=Math.min(img.width,img.height);
      const canvas=canvasRef.current!;
      canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d')!;
      ctx.drawImage(img,(img.width-size)/2,(img.height-size)/2,size,size,0,0,256,256);
      canvas.toBlob(async(blob)=>{
        if(!blob)return;
        const reader=new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend=async()=>{
          const base64=(reader.result as string).split(',')[1];
          try{
            const r=await api<any>('upload',{method:'POST',body:JSON.stringify({fileName:'avatar.png',fileBase64:base64,contentType:'image/png'})});
            const updated=await api<any>('profile',{method:'PUT',body:JSON.stringify({avatar_url:r.url})});
            setP(updated);onUpdated?.(updated);setCropSrc(null);
          }catch(e:any){setError('Upload failed: '+e.message)}
        };
      },'image/png');
    };
    img.src=cropSrc;
  }

  return <><PageTitle eyebrow="Make it yours" title="Student profile" desc="Choose the name StudyMate uses in your greeting and throughout your workspace."/><form onSubmit={save} className="grid gap-5 lg:grid-cols-[.65fr_1.35fr]"><Card className="text-center"><div className="relative mx-auto h-28 w-28"><div className="grid h-full w-full place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 text-3xl font-bold text-white">{p.avatar_url?<img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover"/>:(p.name?.[0]||'S')}</div><label className="absolute -bottom-2 -right-2 cursor-pointer rounded-xl bg-slate-900 p-2 text-white"><Camera size={16}/><input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}/></label></div><h2 className="mt-5 text-xl font-bold">{p.name||'Your name'}</h2><p className="text-sm text-slate-500">{p.course||'Add your course'}</p><div className="mt-4 flex justify-center gap-2">{p.avatar_url&&<button type="button" onClick={removeAvatar} className="flex items-center gap-1 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500"><Trash2 size={13}/> Remove photo</button>}<label className="flex cursor-pointer items-center gap-1 rounded-xl bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-500"><Crop size={13}/> Change photo<input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}/></label></div><div className="mt-6 rounded-2xl bg-violet-500/10 p-4 text-left text-sm"><b className="text-violet-500">Display name</b><p className="mt-1">This is the name shown on your dashboard and navigation.</p></div></Card><Card>{error&&<p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-500">{error}</p>}<label className="block rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-violet-500">What should StudyMate call you?<input required className="input text-slate-800 dark:text-white" value={p.name||''} onChange={e=>setP({...p,name:e.target.value})} placeholder="Enter your preferred name"/></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label>Age<input className="input" type="number" value={p.age||''} onChange={e=>setP({...p,age:+e.target.value})}/></label><label>Class / course<input className="input" value={p.course||''} onChange={e=>setP({...p,course:e.target.value})}/></label><label>Preferred study time<select className="input" value={p.preferred_time||'Evening'} onChange={e=>setP({...p,preferred_time:e.target.value})}><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Late night</option></select></label></div><label className="mt-4 block">Subjects (comma separated)<input className="input" value={p.subjects||''} onChange={e=>setP({...p,subjects:e.target.value})}/></label><label className="mt-4 block">Study goals<textarea className="input min-h-20" value={p.study_goals||''} onChange={e=>setP({...p,study_goals:e.target.value})}/></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label>Strengths<textarea className="input min-h-20" value={p.strengths||''} onChange={e=>setP({...p,strengths:e.target.value})}/></label><label>Areas to improve<textarea className="input min-h-20" value={p.weaknesses||''} onChange={e=>setP({...p,weaknesses:e.target.value})}/></label></div><button className="btn-primary mt-6"><Save size={17}/>{saved?'Saved!':'Save profile'}</button></Card></form>{cropSrc&&<div className="modal"><div className="glass w-full max-w-md rounded-3xl p-6 text-center"><h2 className="text-xl font-bold">Crop your photo</h2><p className="mt-2 text-sm text-slate-500">A square crop will be centered automatically.</p><canvas ref={canvasRef} className="mx-auto mt-4 hidden"/><img src={cropSrc} alt="Preview" className="mx-auto mt-4 max-h-48 rounded-2xl object-contain"/><div className="mt-6 flex gap-3"><button onClick={()=>setCropSrc(null)} className="glass flex-1 rounded-xl py-3">Cancel</button><button onClick={doCrop} className="btn-primary flex-1">Crop & save</button></div></div></div>}</>;
}
