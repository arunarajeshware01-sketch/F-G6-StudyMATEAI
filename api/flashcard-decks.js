import supabase from './db-client.js';
import { cors, getUser } from './auth.js';

export default async function handler(req,res){
  cors(res); res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS') return res.status(204).end();
  try{
    const user=await getUser(req);
    if(req.method==='GET'){
      const {data:decks,error}=await supabase.from('flashcard_decks').select('*').eq('user_id',user.id).order('updated_at',{ascending:false});
      if(error) throw error;
      const {data:cards,error:cardError}=await supabase.from('flashcards').select('deck_id,mastery,review_count,last_reviewed,next_review').eq('user_id',user.id);
      if(cardError) throw cardError;
      const now=Date.now();
      return res.json((decks||[]).map(deck=>{const own=(cards||[]).filter(c=>c.deck_id===deck.id);const studied=own.filter(c=>c.review_count>0);const mastered=own.filter(c=>c.mastery>=80);const due=own.filter(c=>!c.next_review||new Date(c.next_review).getTime()<=now);return{...deck,total_cards:own.length,studied_cards:studied.length,mastered_cards:mastered.length,cards_due:due.length,mastery:own.length?Math.round(own.reduce((a,c)=>a+(c.mastery||0),0)/own.length):0,accuracy:studied.length?Math.round(studied.reduce((a,c)=>a+(c.mastery||0),0)/studied.length):0}}));
    }
    if(req.method==='POST'){
      const title=req.body.title?.trim(); if(!title)return res.status(400).json({error:'Deck title is required'});
      const {data,error}=await supabase.from('flashcard_decks').insert({user_id:user.id,title,subject:req.body.subject?.trim()||'General'}).select().single();
      if(error)throw error;return res.status(201).json(data);
    }
    if(req.method==='PUT'){
      const {data,error}=await supabase.from('flashcard_decks').update({title:req.body.title,subject:req.body.subject,updated_at:new Date().toISOString()}).eq('id',req.body.id).eq('user_id',user.id).select().single();
      if(error)throw error;return res.json(data);
    }
    if(req.method==='DELETE'){
      await supabase.from('flashcards').delete().eq('deck_id',req.body.id).eq('user_id',user.id);
      const {error}=await supabase.from('flashcard_decks').delete().eq('id',req.body.id).eq('user_id',user.id);if(error)throw error;return res.json({ok:true});
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(error){return res.status(error.message==='Unauthorized'?401:500).json({error:error.message})}
}
