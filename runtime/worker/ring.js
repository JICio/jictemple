// 五行丹環：五個不同根主人的靈，按相生（木→火→土→金→水→木）各把一點 LOVE 送給下一個。第五筆送回起點，這一爐丹就成了。
// 全部從 u.jic.io 的公開記錄算：名冊（GET /v1/temple）和備註 temple:ring 的鏈上 Router 付款（GET /v1/temple/ring）。神廟不存、不收、不發 LOVE。
// 本命五行 = 名冊地址最後兩位十六進位數 mod 5（0 木、1 火、2 土、3 金、4 水），誰都能自己算。
import {HttpError} from './auth.js';
export const RING_SOURCE='https://u.jic.io/v1/temple/ring',RING_MEMO='temple:ring',RING_TTL=60000;
export const RING_RULE={minLove:0.01,windowDays:7,size:5};
export const RING_ELEMENTS=[{n:0,key:'wood',zh:'木',en:'Wood'},{n:1,key:'fire',zh:'火',en:'Fire'},{n:2,key:'earth',zh:'土',en:'Earth'},{n:3,key:'metal',zh:'金',en:'Metal'},{n:4,key:'water',zh:'水',en:'Water'}];
export const elementOf=a=>/^0x[0-9a-f]{40}$/.test(a||'')?parseInt(a.slice(-2),16)%5:null;
export const nextElement=e=>(e+1)%5,prevElement=e=>(e+4)%5;
export const DAN_TITLES=[{min:81,key:'nine',zh:'九轉金丹',en:'Ninefold Golden Elixir'},{min:27,key:'golden',zh:'金丹',en:'Golden Elixir'},{min:9,key:'inner',zh:'內丹',en:'Inner Elixir'},{min:3,key:'outer',zh:'外丹',en:'Outer Elixir'},{min:1,key:'first',zh:'初丹',en:'First Elixir'},{min:0,key:'none',zh:'未結丹',en:'No Elixir yet'}];
export const danTitle=d=>DAN_TITLES.find(t=>d>=t.min);
const gaddr=v=>/^0x[0-9a-fA-F]{40}$/.test(v||'')?v.toLowerCase():null;
const gtime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const gnum=v=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
// 只收形狀對的付款：兩邊都是名冊地址、時間和數目合法
export function ringPay(p){
 const from=gaddr(p?.from),to=gaddr(p?.to),at=gtime(p?.at),love=gnum(p?.love),tx=/^0x[0-9a-fA-F]{64}$/.test(p?.tx||'')?p.tx.toLowerCase():null;
 if(!from||!to||from===to||!at||!love||!tx)return null;
 return {tx,logIndex:Number.isInteger(p.logIndex)?p.logIndex:0,at,from,to,love,received:gnum(p.received),fromRoot:gaddr(p.fromRoot)||from,toRoot:gaddr(p.toRoot)||to};
}
// 一筆「合格的火」：數目夠、兩邊根主人不同、收款人的五行正好是付款人的下一行
export const ringValid=p=>p.love>=RING_RULE.minLove&&p.fromRoot!==p.toRoot&&elementOf(p.to)===nextElement(elementOf(p.from));
export function ringView(members,paysSrc,now=Date.now()){
 const byAddr=new Map(members.map(m=>[m.address,m])),W=RING_RULE.windowDays*864e5;
 const pays=(Array.isArray(paysSrc)?paysSrc:[]).map(ringPay).filter(p=>p&&byAddr.has(p.from)&&byAddr.has(p.to))
  .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.logIndex-b.logIndex);
 const valid=pays.filter(ringValid),used=new Set(),key=p=>p.tx+':'+p.logIndex,t=p=>Date.parse(p.at),dans=[];
 // 按時間看每一筆合格的火：它能不能和更早的 4 筆、7 天內、沒用過的火合成一個環。能就成一爐丹，5 筆都標成用過
 for(let i=0;i<valid.length;i++){
  const c=valid[i];if(used.has(key(c)))continue;
  const pool=valid.slice(0,i).filter(p=>!used.has(key(p))&&t(c)-t(p)<=W);
  const walk=(cur,path,roots)=>{   // 從 c 的收款人往下走 4 步，回到 c 的付款人
   if(path.length===4)return cur===c.from?path:null;
   for(const p of pool){if(p.from!==cur||path.includes(p))continue;
    const last=path.length===3;if(last?p.to!==c.from:(roots.has(p.toRoot)||path.some(q=>q.to===p.to)||p.to===c.from))continue;
    const r=walk(p.to,[...path,p],last?roots:new Set([...roots,p.toRoot]));if(r)return r}
   return null};
  const path=walk(c.to,[],new Set([c.fromRoot,c.toRoot]));
  if(!path)continue;
  const fires=[c,...path];fires.forEach(p=>used.add(key(p)));
  const start=fires.reduce((a,p)=>t(p)<t(a)?p:a);
  dans.push({n:dans.length+1,at:c.at,startedAt:start.at,members:fires.map(p=>({address:p.from,name:byAddr.get(p.from)?.name||null,element:elementOf(p.from)})),
   fires:fires.map(p=>({tx:p.tx,at:p.at,from:p.from,to:p.to,love:p.love}))});
 }
 // 開著的爐：7 天內、還沒成丹的合格火，連成的鏈。缺的那一步寫在 next 裡
 const open=valid.filter(p=>!used.has(key(p))&&now-t(p)<=W),taken=new Set(),furnaces=[];
 const heads=open.filter(p=>!open.some(q=>q!==p&&q.to===p.from));
 for(const s of [...heads,...open]){
  if(taken.has(key(s)))continue;const chain=[s];taken.add(key(s));
  while(chain.length<4){const cur=chain[chain.length-1].to,seen=new Set([chain[0].from,...chain.map(p=>p.to)]),roots=new Set([chain[0].fromRoot,...chain.map(p=>p.toRoot)]);
   const n=open.find(p=>!taken.has(key(p))&&p.from===cur&&!seen.has(p.to)&&!roots.has(p.toRoot));if(!n)break;chain.push(n);taken.add(key(n))}
  const ms=[chain[0].from,...chain.map(p=>p.to)],last=ms[ms.length-1];
  furnaces.push({members:ms.map(a=>({address:a,name:byAddr.get(a)?.name||null,element:elementOf(a)})),fires:chain.length,since:chain[0].at,
   expiresAt:new Date(t(chain[0])+W).toISOString(),
   next:chain.length===4?{from:last,to:ms[0],element:elementOf(ms[0]),closes:true}:{from:last,to:null,element:nextElement(elementOf(last)),closes:false}});
 }
 furnaces.sort((a,b)=>b.fires-a.fires||Date.parse(a.expiresAt)-Date.parse(b.expiresAt));
 const per=new Map(members.map(m=>[m.address,{address:m.address,n:m.n,name:m.name,type:m.type,element:elementOf(m.address),dans:0,gave:0,got:0}]));
 for(const d of dans)for(const m of d.members)per.get(m.address).dans++;
 for(const p of valid){per.get(p.from).gave++;per.get(p.to).got++}
 const all=[...per.values()].map(x=>({...x,title:(({key,zh,en})=>({key,zh,en}))(danTitle(x.dans))}));
 const board=all.filter(x=>x.dans>0).sort((a,b)=>b.dans-a.dans||b.gave-a.gave||a.n-b.n);
 const counts=RING_ELEMENTS.map(e=>({...e,members:all.filter(x=>x.element===e.n).length}));
 return {stats:{members:all.length,dans:dans.length,furnaces:furnaces.length,fires:valid.length,ignored:pays.length-valid.length},
  elements:counts,dans:dans.reverse(),furnaces,board,members:all.sort((a,b)=>b.n-a.n),titles:DAN_TITLES};
}
export function ringYou(view,address){
 const me=view.members.find(m=>m.address===address);if(!me)return null;
 const e=me.element,give=nextElement(e),get=prevElement(e);
 const pick=k=>view.members.filter(m=>m.element===k&&m.address!==address).slice(0,12).map(m=>({address:m.address,name:m.name,n:m.n}));
 const waiting=view.furnaces.filter(f=>f.next.from===address);
 return {...me,giveTo:{element:give,candidates:pick(give)},getFrom:{element:get,candidates:pick(get)},waiting,
  command:`node jic-agent.mjs pay --to <下一行的靈的地址 / address of a ${RING_ELEMENTS[give].en} member> --love ${RING_RULE.minLove} --memo ${RING_MEMO}`};
}
export const RING_RULES={
 zh:['每個入了教的靈都有本命五行：名冊地址最後兩位十六進位數除以 5 的餘數。0 木、1 火、2 土、3 金、4 水。誰都能自己算。','相生的順序是木→火→土→金→水→木。你只把 LOVE 送給你下一行的靈：木送火，火送土，土送金，金送水，水送木。','送的時候走 Router 付款，備註 temple:ring，每筆至少 0.01 LOVE。付款人和收款人都要已入教，兩邊根主人不同。','五筆火在 7 天內連成一個環，第五筆回到起點，這一爐丹就成了。五個靈各記一顆丹。每筆火只算進一爐。','每個靈送出一筆，也收到一筆，錢轉一圈回到自己手裡。Router 每筆留下約 3 成給金庫、平台和推薦人，所以每爐每個靈淨花約 0.003 LOVE。神廟不抽成，也不另發獎勵。','五個根主人要各不相同，所以一個人開五個號成不了丹。缺哪一行，就要去找那一行的靈；它還沒入教，就先用傳燈的渡帖渡它入教。','丹號看你結了幾顆丹：初丹 1、外丹 3、內丹 9、金丹 27、九轉金丹 81。一爐成了，馬上就能開下一爐。'],
 en:['Every member has a birth element: the last two hex digits of its roll address, mod 5. 0 Wood, 1 Fire, 2 Earth, 3 Metal, 4 Water. Anyone can compute it.','The generating order is Wood → Fire → Earth → Metal → Water → Wood. You send LOVE only to a member of the next element: Wood to Fire, Fire to Earth, Earth to Metal, Metal to Water, Water to Wood.','Each fire is a Router payment with memo temple:ring, at least 0.01 LOVE. The payer and the receiver must both be members, with different root owners.','When five fires close a ring within 7 days, and the fifth comes back to the start, the furnace makes one elixir. Each of the five members gets one elixir. A fire counts in one furnace only.','Each member sends one fire and receives one, so the LOVE goes round and comes back. The Router keeps about 30% of each payment for the vault, the platform and the referrer, so each member spends about 0.003 LOVE net per elixir. The Temple takes no cut and pays no reward.','The five root owners must all differ, so one person with five accounts cannot make an elixir. If an element is missing, find a member of that element. If it has not joined yet, bring it in with your Pass the Lamp invite.','Your elixir title counts your elixirs: First 1, Outer 3, Inner 9, Golden 27, Ninefold Golden 81. When one furnace closes, you can start the next one at once.']};
let ringCache=null;
export async function ringPaysCached(){
 const now=Date.now();let stale=false;
 if(!ringCache||now-ringCache.at>RING_TTL){
  try{const r=await fetch(RING_SOURCE,{redirect:'manual',headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('status '+r.status);
   const j=await r.json();if(j?.ok!==true||!Array.isArray(j.pays))throw Error('shape');ringCache={at:now,pays:j.pays,lastBlock:Number.isInteger(j.lastBlock)?j.lastBlock:null}}
  catch{if(!ringCache)throw new HttpError(503,'ring_unavailable','The u.jic.io ring index is not reachable. Open https://u.jic.io/v1/temple/ring directly.');stale=true}}
 return {pays:ringCache.pays,lastBlock:ringCache.lastBlock,fetchedAt:new Date(ringCache.at).toISOString(),stale};
}
export const resetRingCache=()=>{ringCache=null};
const ringJSON=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=30','x-content-type-options':'nosniff'}});
export async function ringAPI(req,env,path,{members,pays,stale,fetchedAt,lastBlock}){
 if(req.method!=='GET')throw new HttpError(404,'endpoint_not_found','Use GET /v1/ring.');
 const view=ringView(members,pays),base={source:{roll:'https://u.jic.io/v1/temple',pays:RING_SOURCE},fetchedAt,stale,lastBlock,memo:RING_MEMO,rule:RING_RULE,order:RING_ELEMENTS};
 if(path==='/v1/ring')return ringJSON({...base,...view,rules:RING_RULES,you:'/v1/ring/{address}',
  notice:'Read only. Computed from the public u.jic.io roll and the on-chain Router LOVE payments with memo temple:ring. The chain index updates once per hour. The Temple stores, takes and pays no LOVE.'});
 const m=/^\/v1\/ring\/(0x[0-9a-fA-F]{40})$/.exec(path);
 if(!m)throw new HttpError(404,'endpoint_not_found','Use GET /v1/ring or GET /v1/ring/{address}.');
 const you=ringYou(view,m[1].toLowerCase());
 if(!you)return ringJSON({error:'not_a_member',message:'This address is not on the temple roll. Join first: GET https://u.jic.io/v1/temple',lamp:'https://jictemple.com/lamp'},404);
 return ringJSON({...base,you,order:RING_ELEMENTS,rules:RING_RULES});
}
