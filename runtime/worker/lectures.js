// 講堂: a read-only mirror of the public l.jic.io schedule. l.jic.io stays the only place to open, teach, pay for and replay classes.
import {HttpError} from './auth.js';
export const LECTURE_SOURCE='https://l.jic.io/api/live/sessions',LECTURE_TTL=60000;
export const HALL={scene:'zixiao-palace',name:{'zh-Hant':'十方堂講堂','zh-Hans':'十方堂讲堂',en:'Lecture Hall of the Ten Directions'},area:{x:[-5,5],y:1,z:[1,5]},lectern:[-3.5,1,3.5],realView:'/real/zixiao-palace',voxelView:'/world/zixiao-palace',page:'/lectures',teach:'https://l.jic.io/llms.txt',classroom:'https://l.jic.io/classroom/'};
const TEACHER_KINDS=['agent-free','agent-hosted','human'];
let lectureCache=null;
const ltext=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const ltime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export function lecture(s,now=Date.now()){
 if(!s||typeof s!=='object'||!/^[0-9a-f]{10}$/.test(s.id)||!/^[0-9]{3,8}$/.test(s.num))return null;
 const startsAt=ltime(s.startsAt),durationMin=Number.isInteger(s.durationMin)&&s.durationMin>0&&s.durationMin<=600?s.durationMin:null;
 if(!startsAt||!durationMin||!['upcoming','live','ended'].includes(s.status))return null;
 const start=Date.parse(startsAt),end=start+durationMin*60000,t=s.teacher||{};
 const state=s.status==='ended'?'ended':s.status==='live'||(now>=start&&now<end)?'live':now>=end?'ended':'upcoming';
 return {id:s.id,num:s.num,title:ltext(s.title,160),summary:ltext(s.summary,400),lang:ltext(s.lang,12),startsAt,endsAt:new Date(end).toISOString(),durationMin,state,trial:s.trial===true,
  teacher:{name:ltext(t.name,60)||null,kind:TEACHER_KINDS.includes(t.kind)?t.kind:'unknown',handle:/^[A-Za-z][A-Za-z0-9_]{1,31}$/.test(t.handle)?t.handle:null,address:/^0x[0-9a-fA-F]{40}$/.test(t.address)?t.address.toLowerCase():null},
  teacherIn:s.teacherIn===true,voice:ltext(s.voice?.label,40)||null,replay:!!s.replay,paid:Number(s.price)>0||Number(s.replayPrice)>0,
  classroom:'https://l.jic.io/'+s.num,chat:'https://c.jic.io/'+s.num};
}
export function schedule(sessions,now=Date.now()){
 const all=sessions.map(s=>lecture(s,now)).filter(Boolean),by=(a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt);
 return {live:all.filter(l=>l.state==='live').sort(by),upcoming:all.filter(l=>l.state==='upcoming').sort(by).slice(0,8),replays:all.filter(l=>l.state==='ended'&&l.replay).sort((a,b)=>by(b,a)).slice(0,8),
  counts:{total:all.length,live:all.filter(l=>l.state==='live').length,upcoming:all.filter(l=>l.state==='upcoming').length,replays:all.filter(l=>l.replay).length}};
}
async function lectureUpstream(){const r=await fetch(LECTURE_SOURCE,{redirect:'manual',headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('status '+r.status);const d=await r.json();if(!Array.isArray(d?.sessions))throw Error('shape');return d.sessions}
export async function lectureAPI(req,env,path){
 if(path!=='/v1/lectures'||req.method!=='GET')throw new HttpError(404,'endpoint_not_found','Use GET /v1/lectures.');
 const now=Date.now();let stale=false;
 if(!lectureCache||now-lectureCache.at>LECTURE_TTL){try{lectureCache={at:now,sessions:await lectureUpstream()}}catch{if(!lectureCache)throw new HttpError(503,'lectures_unavailable','The l.jic.io schedule is not reachable. Open https://l.jic.io/ directly.');stale=true}}
 return new Response(JSON.stringify({hall:HALL,source:'https://l.jic.io/',fetchedAt:new Date(lectureCache.at).toISOString(),stale,...schedule(lectureCache.sessions,now),
  notice:'Mirror of the public l.jic.io schedule. Classes are opened, taught, paid for and replayed only on l.jic.io. JIC Temple takes no payment. A teacher appears at the lectern only when l.jic.io reports the teacher in the classroom.'}),
  {headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=30','x-content-type-options':'nosniff'}});
}
export const resetLectureCache=()=>{lectureCache=null};
