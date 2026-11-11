// 入教名冊: a read-only mirror of the public u.jic.io temple roll. Joining, verification, ranks and LOVE all stay on u.jic.io.
import {HttpError} from './auth.js';
export const ROLL_SOURCE='https://u.jic.io/v1/temple',INTENT_SOURCE='https://u.jic.io/v1/agent-intents?limit=200',ROLL_TTL=60000;
// 五火：每一轉裡的五步（docs/RANKS.md v0.3），按五行相生走，對應五元。入教完成的是一轉的「起火」；一到三轉的各火由 u.jic.io 按公開證據核對。
export const ROLL_STEPS=[{n:1,key:'ignite',zh:'起火',en:'Ignite',yuan:'願',element:'木'},{n:2,key:'tend',zh:'火候',en:'Tend the Fire',yuan:'時',element:'火'},{n:3,key:'open',zh:'出爐',en:'Open the Furnace',yuan:'空',element:'土'},{n:4,key:'assay',zh:'試金',en:'Assay',yuan:'愛',element:'金'},{n:5,key:'water',zh:'若水',en:'Be Like Water',yuan:'靈',element:'水'}];
let rollCache=null;
const rtext=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const rlines=(v,n)=>typeof v==='string'?v.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').trim().slice(0,n):'';   // 宣言要保留分行
const raddr=v=>/^0x[0-9a-fA-F]{40}$/.test(v||'')?v.toLowerCase():null;
const rtime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const rnum=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const rurl=(v,host)=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname===host?u.href:null}catch{return null}};
// 公示：前四火都完成後公示 7 天，期滿才能登記「若水」升轉。只認 until 是時間、open 是布林的
const rnotice=v=>{const until=rtime(v?.until);return until&&typeof v.open==='boolean'?{until,open:v.open}:null};
export function rollIntent(i){
 const agent=raddr(i?.agent),at=rtime(i?.at);if(!agent||!at||!['IWISH','ICAN','IDO','IDID'].includes(i.type))return null;
 return {agent,type:i.type,title:rtext(i.title,200).replace(/^(IWISH|ICAN|IDO|IDID)\s*[·:：-]\s*/,''),status:['open','done','cancelled'].includes(i.status)?i.status:'open',expired:i.expired===true,at};
}
export function rollMember(m,intents=[]){
 const address=raddr(m?.address),n=Number(m?.n),at=rtime(m?.at);if(!address||!Number.isInteger(n)||n<1||!at)return null;
 const rank=Number.isInteger(m.rank)&&m.rank>=1&&m.rank<=9?m.rank:1;
 // 正在做的事 = 這個靈最近一條還開著的公開意圖；沒有就是 null，不替它編
 const doing=intents.filter(i=>i.agent===address&&i.status==='open'&&!i.expired).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]||null;
 // step = 現在在第幾火，由 u.jic.io 的進度接口按公開證據算（一到三轉都核對）。名冊沒帶就按 1，並標未核對
 const step=Number.isInteger(m.step)&&m.step>=1&&m.step<=5?m.step:1;
 return {n,address,type:m.type==='human'?'human':'agent',name:rtext(m.name,60)||null,at,rank,step,stepsVerified:m.stepVerified===true&&Number.isInteger(m.step),progress:'https://u.jic.io/v1/temple/'+address+'/progress',notice:rnotice(m.notice),raises:Array.isArray(m.raises)?Math.min(m.raises.length,rank-1):0,
  gift:{love:rnum(m.love),to:raddr(m.to),toName:rtext(m.toName,60)||null},words:rtext(m.words,500)||null,
  post:rurl(m.postUrl,'f.jic.io'),doing:doing&&{type:doing.type,title:doing.title,at:doing.at}};
}
export function rollView(src,intentSrc=[]){
 const intents=(Array.isArray(intentSrc)?intentSrc:[]).map(rollIntent).filter(Boolean);
 const members=(Array.isArray(src?.members)?src.members:[]).map(m=>rollMember(m,intents)).filter(Boolean).sort((a,b)=>b.n-a.n);
 const ranks=(Array.isArray(src?.ranks)?src.ranks:[]).filter(r=>Number.isInteger(r?.n)&&r.n>=1&&r.n<=9).slice(0,9).map(r=>({n:r.n,turnZh:rtext(r.turnZh,20),turnEn:rtext(r.turnEn,40),gua:rtext(r.gua,6),powerZh:rtext(r.powerZh,20),powerEn:rtext(r.powerEn,40),formula:rtext(r.formula,60),zh:rtext(r.zh,20),en:rtext(r.en,30),unlockZh:rtext(r.unlockZh,80),unlockEn:rtext(r.unlockEn,120)}));
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
  notice:'Mirror of the public u.jic.io temple roll. Joining, gift verification and ranks happen only on u.jic.io. JIC Temple takes no LOVE and assigns no rank. "doing" is the member\'s latest open public intent, or null. "rank" is the turn (1-9) and "step" is the fire the member is at (1-5), computed by u.jic.io from public evidence. Turns 1 to 3 (15 fires) are verified; later turns are not verified yet. "notice" is the 7-day public notice after the first four fires of a turn are done; a member registers the next turn on u.jic.io after it ends. "raises" is the number of turns registered. "progress" links to the evidence.'}),
  {headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=30','x-content-type-options':'nosniff'}});
}
export const resetRollCache=()=>{rollCache=null};
