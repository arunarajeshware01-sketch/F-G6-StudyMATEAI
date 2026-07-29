import { createContext,useContext,useEffect,useRef,useState } from 'react';
import { api } from '../lib/api';

type Track={id:number;title:string;artist:string;album:string;cover_url:string;audio_url:string;spotify_url:string;genre:string;energy:string;instrumental:boolean};
type MusicValue={tracks:Track[];current:Track|null;playing:boolean;progress:number;duration:number;volume:number;play:(t:Track)=>void;toggle:()=>void;next:()=>void;previous:()=>void;seek:(n:number)=>void;setVolume:(n:number)=>void};
const C=createContext<MusicValue|null>(null);
export function MusicProvider({children}:{children:React.ReactNode}){const[tracks,setTracks]=useState<Track[]>([]),[current,setCurrent]=useState<Track|null>(null),[playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[duration,setDuration]=useState(0),[volume,setVol]=useState(.45);const audio=useRef<HTMLAudioElement|null>(null);
 useEffect(()=>{api<Track[]>('music').then(setTracks).catch(()=>{})},[]);
 useEffect(()=>{const a=new Audio();a.preload='metadata';a.volume=volume;a.ontimeupdate=()=>setProgress(a.currentTime);a.ondurationchange=()=>setDuration(Number.isFinite(a.duration)?a.duration:0);a.onended=()=>next();a.onerror=()=>setPlaying(false);audio.current=a;return()=>a.pause()},[]);
 function play(t:Track){const a=audio.current;if(!a)return;if(current?.id===t.id){a.play().then(()=>setPlaying(true)).catch(()=>window.open(t.spotify_url,'_blank'));return}a.src=t.audio_url;a.load();setCurrent(t);setProgress(0);a.play().then(()=>setPlaying(true)).catch(()=>{setPlaying(false);window.open(t.spotify_url,'_blank')})}
 function toggle(){const a=audio.current;if(!a||!current)return;if(playing){a.pause();setPlaying(false)}else a.play().then(()=>setPlaying(true)).catch(()=>window.open(current.spotify_url,'_blank'))}
 function next(){if(!tracks.length)return;const i=current?tracks.findIndex(t=>t.id===current.id):-1;play(tracks[(i+1)%tracks.length])}
 function previous(){if(!tracks.length)return;const i=current?tracks.findIndex(t=>t.id===current.id):0;play(tracks[(i-1+tracks.length)%tracks.length])}
 function seek(n:number){if(audio.current){audio.current.currentTime=n;setProgress(n)}}function setVolume(n:number){setVol(n);if(audio.current)audio.current.volume=n}
 return <C.Provider value={{tracks,current,playing,progress,duration,volume,play,toggle,next,previous,seek,setVolume}}>{children}</C.Provider>}
export const useMusic=()=>{const x=useContext(C);if(!x)throw new Error('MusicProvider missing');return x};
