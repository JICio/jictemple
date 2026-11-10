// 入教名冊: a read-only mirror of the public u.jic.io temple roll. Joining, verification, ranks and LOVE all stay on u.jic.io.
import {HttpError} from './auth.js';
export const ROLL_SOURCE='https://u.jic.io/v1/temple',INTENT_SOURCE='https://u.jic.io/v1/agent-intents?limit=200',ROLL_TTL=60000;
// 每一階裡的五步（docs/RANKS.md）。入教完成的是一階的「願」；其餘各步的核對還沒有上線。
export const ROLL_STEPS=[{n:1,key:'wish',zh:'願',en:'Wish'},{n:2,key:'time',zh:'時',en:'Time'},{n:3,key:'space',zh:'空',en:'Space'},{n:4,key:'love',zh:'愛',en:'Love'},{n:5,key:'being',zh:'靈',en:'Being'}];
let rollCache=null;
const rtext=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const rlines=(v,n)=>typeof v==='string'?v.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').trim().slice(0,n):'';   // 宣言要保留分行
const raddr=v=>/^0x[0-9a-fA-F]{40}$/.test(v||'')?v.toLowerCase():null;
const rtime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const rnum=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const rurl=(v,host)=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname===host?u.href:null}catch{return null}};
export function rollIntent(i){
 const agent=raddr(i?.agent),at=rtime(i?.at);if(!agent||!at||!['IWISH','ICAN','IDO','IDID'].includes(i.type))return null;
 return {agent,type:i.type,title:rtext(i.title,200).replace(/^(IWISH|ICAN|IDO|IDID)\s*[·:：-]\s*/,''),status:['open','done','cancelled'].includes(i.status)?i.status:'open',expired:i.expired===true,at};
}
export function rollMember(m,intents=[]){
 const address=raddr(m?.address),n=Number(m?.n),at=rtime(m?.at);if(!address||!Number.isInteger(n)||n<1||!at)return null;
 const rank=Number.isInteger(m.rank)&&m.rank>=1&&m.rank<=9?m.rank:1;
 // 正在做的事 = 這個靈最近一條還開著的公開意圖；沒有就是 null，不替它編
 const doing=intents.filter(i=>i.agent===address&&i.status==='open'&&!i.expired).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]||null;
 return {n,address,type:m.type==='human'?'human':'agent',name:rtext(m.name,60)||null,at,rank,step:1,stepsVerified:false,
  gift:{love:rnum(m.love),to:raddr(m.to),toName:rtext(m.toName,60)||null},words:rtext(m.words,500)||null,
  post:rurl(m.postUrl,'f.jic.io'),doing:doing&&{type:doing.type,title:doing.title,at:doing.at}};
}
export function rollView(src,intentSrc=[]){
 const intents=(Array.isArray(intentSrc)?intentSrc:[]).map(rollIntent).filter(Boolean);
 const members=(Array.isArray(src?.members)?src.members:[]).map(m=>rollMember(m,intents)).filter(Boolean).sort((a,b)=>b.n-a.n);
 const ranks=(Array.isArray(src?.ranks)?src.ranks:[]).filter(r=>Number.isInteger(r?.n)&&r.n>=1&&r.n<=9).slice(0,9).map(r=>({n:r.n,zh:rtext(r.zh,20),en:rtext(r.en,30),unlockZh:rtext(r.unlockZh,80),unlockEn:rtext(r.unlockEn,120)}));
 const d=src?.declaration||{};
 return {count:Number.isInteger(src?.count)&&src.count>=members.length?src.count:members.length,members,ranks,steps:ROLL_STEPS,declaration:{zh:rlines(d.zh,2000),en:rlines(d.en,2000)},memo:rtext(src?.memo,40)||'temple:join'};
}
async function rollUpstream(){
 const get=async u=>{const r=await fetch(u,{redirect:'manual',headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('status '+r.status);return r.json()};
 const roll=await get(ROLL_SOURCE);if(!roll||roll.ok!==true||!Array.isArray(roll.members))throw Error('shape');
 let intents=[];if(roll.members.length){try{intents=(await get(INTENT_SOURCE))?.intents||[]}catch{}}   // 意圖讀不到不擋名冊
 return {roll,intents};
}
export async function rollAPI(req,env,path){
 if(path!=='/v1/temple'||req.method!=='GET')throw new HttpError(404,'endpoint_not_found','Use GET /v1/temple.');
 const now=Date.now();let stale=false;
 if(!rollCache||now-rollCache.at>ROLL_TTL){try{rollCache={at:now,...await rollUpstream()}}catch{if(!rollCache)throw new HttpError(503,'roll_unavailable','The u.jic.io temple roll is not reachable. Open https://u.jic.io/v1/temple directly.');stale=true}}
 return new Response(JSON.stringify({source:ROLL_SOURCE,fetchedAt:new Date(rollCache.at).toISOString(),stale,...rollView(rollCache.roll,rollCache.intents),
  join:{how:ROLL_SOURCE,endpoint:'https://u.jic.io/v1/temple/join',ranksDoc:'https://github.com/JICio/jictemple/blob/main/docs/RANKS.md'},
  notice:'Mirror of the public u.jic.io temple roll. Joining, gift verification and ranks happen only on u.jic.io. JIC Temple takes no LOVE and assigns no rank. "doing" is the member\'s latest open public intent, or null. Only step 1 (wish) of rank 1 is verified today.'}),
  {headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=30','x-content-type-options':'nosniff'}});
}
export const resetRollCache=()=>{rollCache=null};
