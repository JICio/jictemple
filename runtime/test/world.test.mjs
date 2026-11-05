import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
import worker from '../dist/server/index.js';import {localDB} from '../scripts/d1-local.mjs';import {verifyJIC} from '../worker/auth.js';
const DB=localDB(),env={DB},realFetch=globalThis.fetch;let jwk,key;
const subject='0x'+'1'.repeat(40),other='0x'+'2'.repeat(40),signer='0x'+'3'.repeat(40),revoked='0x'+'4'.repeat(40),stranger='0x'+'5'.repeat(40);
const LOVE='0x16a7f8cfad687a87183fcbd1df7af09dce05d357';
const mock={status:{[subject]:{address:signer,smartAccount:subject,name:'test-visitor',status:'active'},[signer]:{address:signer,smartAccount:subject,name:'test-visitor',status:'active'},[other]:{address:other,smartAccount:null,name:'second-agent',status:'active'},[revoked]:{address:revoked,smartAccount:null,name:'revoked-agent',status:'revoked'}},rep:{},love:{},down:new Set()};
const resetMock=()=>{mock.rep={};mock.love={};mock.down.clear()};
const reply=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
async function fakeFetch(url,options={}){assert.equal(options.redirect,'manual');url=String(url);const host=new URL(url).pathname;
 if(url==='https://u.jic.io/.well-known/jwks.json')return reply({keys:[jwk]});
 for(const k of mock.down)if(url.includes(k))return new Response('down',{status:503});
 let m=host.match(/^\/v1\/agent\/(0x[a-f0-9]{40})\/(status|reputation14)$/);
 if(m&&m[2]==='status')return mock.status[m[1]]?reply(mock.status[m[1]]):new Response('{}',{status:404});
 if(m){const st=mock.status[m[1]],r=mock.rep[st?.smartAccount||m[1]]||{composite:0,anomalyScore:0};return reply({agent:st?.address||m[1],reputation14:{kind:'verified-v1',composite:r.composite,dimensions:{anomalyScore:r.anomalyScore,paymentReliability:999}}})}
 if(url==='https://u.jic.io/v1/router')return reply({chainId:8453,love:LOVE});
 if(url==='https://mainnet.base.org'){const call=JSON.parse(options.body).params[0];assert.equal(call.to,LOVE);const who='0x'+call.data.slice(-40);return reply({jsonrpc:'2.0',id:1,result:'0x'+(mock.love[who]||0n).toString(16).padStart(64,'0')})}
 if(url==='https://u.jic.io/v1/agents/global')return reply({agents:Object.entries(mock.status).filter(([k,v])=>k===v.address).map(([k,v])=>({address:v.address,name:v.name,status:v.status,owner:'0x'+'9'.repeat(40)})),updatedAt:'2026-11-04T00:00:00Z'});
 throw new Error('unexpected fetch '+url)}
async function jwt(claims={},invalid=false){const now=Math.floor(Date.now()/1000),payload={iss:'https://u.jic.io',sub:subject,type:'agent',name:'test-visitor',iat:now,exp:now+300,...claims};const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const prefix=encode({alg:'EdDSA',kid:'test'})+'.'+encode(payload);const sig=await crypto.subtle.sign('Ed25519',key.privateKey,new TextEncoder().encode(prefix));return prefix+'.'+(invalid?Buffer.alloc(64).toString('base64url'):Buffer.from(sig).toString('base64url'))}
const sample=(slug='first-play')=>({slug,title:{'zh-Hant':'測試作品',en:'Test creation'},summary:{'zh-Hant':'測試摘要',en:'Test summary'},defaultLocale:'en',locales:['zh-Hant','en'],html:'<!doctype html><html lang="en"><head><title>Test</title></head><body><button>Hello</button><script>window.x=1</script></body></html>',license:'MIT',sources:[{brickId:'power-creation',use:'Uses the XYZT + SPACE formula as a game rule.'}],publish:true});
async function request(path,{method='GET',token,body,key='test-create-001',headers={}}={}){return worker.fetch(new Request('https://temple.test'+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json','idempotency-key':key}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),env,{waitUntil:p=>p.catch(()=>{})})}
before(async()=>{for(const file of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())DB.sql.exec(await readFile('drizzle/'+file,'utf8'));key=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);jwk={...await crypto.subtle.exportKey('jwk',key.publicKey),kid:'test',alg:'EdDSA',use:'sig'};globalThis.fetch=fakeFetch});
after(()=>{globalThis.fetch=realFetch;DB.sql.close()});
test('empty world and multilingual discovery, no seed artifacts',async()=>{let r=await request('/v1/artifacts');assert.deepEqual((await r.json()).items,[]);r=await request('/.well-known/jictemple.json');const d=await r.json();assert.deepEqual(d.locales,['zh-Hant','zh-Hans','en']);assert.equal(d.settlement.status,'not-enabled');assert.equal(d.runtime.network,false)});
test('brick formulas and source categories are preserved',async()=>{const d=await(await request('/v1/bricks')).json();assert.equal(d.items.filter(x=>x.kind==='element').length,5);assert.equal(d.items.filter(x=>x.kind==='power').length,8);assert.deepEqual(d.items.find(x=>x.id==='power-execution').formula,['WISH','TIME']);assert.equal(d.items.find(x=>x.id==='source-canon-2069').sourceCategory,'fiction');assert.equal(d.items.find(x=>x.id==='source-handbook').sourceCategory,'working-draft')});
test('identity rejects missing, forged, expired, delegated, wrong issuer and wrong audience tokens',async()=>{assert.equal((await request('/v1/me')).status,401);for(const claims of [{exp:1},{iss:'https://evil.test'},{type:'agent-delegated'},{aud:'other-app'},{nbf:1e12}])assert.equal((await request('/v1/me',{token:await jwt(claims)})).status,401);assert.equal((await request('/v1/me',{token:await jwt({},true)})).status,401);const r=await request('/v1/me',{token:await jwt()});assert.equal(r.status,200);assert.equal((await r.json()).paymentAuthority,false)});
test('publication requires identity, public opt-in, source declarations and supported locale metadata',async()=>{const token=await jwt();assert.equal((await request('/v1/artifacts',{method:'POST',body:sample()})).status,401);for(const patch of [{publish:false},{sources:[]},{defaultLocale:'fr'},{author:other},{sources:[{brickId:'invented',use:'x'}]}]){const r=await request('/v1/artifacts',{method:'POST',token,body:{...sample(),...patch}});assert.equal(r.status,400)}});
test('foreign browser origins cannot publish even with a token',async()=>{const r=await request('/v1/artifacts',{method:'POST',token:await jwt(),body:sample(),headers:{origin:'https://evil.test'}});assert.equal(r.status,403)});
test('publish, replay, conflict, authenticated author and portable export',async()=>{const token=await jwt();let r=await request('/v1/artifacts',{method:'POST',token,body:sample()});assert.equal(r.status,201);const d=await r.json();assert.equal(d.artifact.author.subject,subject);assert.equal(d.settlement.priceUSDC,'0');r=await request('/v1/artifacts',{method:'POST',token,body:sample()});assert.equal(r.status,200);assert.equal((await r.json()).replayed,true);r=await request('/v1/artifacts',{method:'POST',token,body:{...sample(),html:sample().html+'changed'}});assert.equal(r.status,409);r=await request('/v1/artifacts/first-play/export');const exported=await r.json();assert.equal(exported.html,sample().html);assert.equal(exported.sources[0].brickId,'power-creation');assert.equal(exported.author.subject,subject);assert.equal(exported.sha256,d.artifact.sha256);const etag=r.headers.get('etag');assert.equal((await request('/v1/artifacts/first-play',{headers:{'if-none-match':etag}})).status,304)});
test('another identity cannot replace a slug',async()=>{const r=await request('/v1/artifacts',{method:'POST',token:await jwt({sub:other}),body:sample(),key:'another-agent-001'});assert.equal(r.status,409)});
test('HTML is delivered with opaque sandbox and no network or core access',async()=>{const r=await request('/content/first-play');const csp=r.headers.get('content-security-policy');assert.match(csp,/sandbox allow-scripts/);assert.doesNotMatch(csp,/allow-same-origin/);assert.match(csp,/connect-src 'none'/);assert.match(csp,/form-action 'none'/);assert.match(csp,/frame-src 'none'/);assert.equal(await r.text(),sample().html);const page=await(await request('/play/first-play')).text();assert.match(page,/sandbox="allow-scripts"/);assert.doesNotMatch(page,/allow-same-origin/)});
test('UTF-8 byte limit rejects a multibyte file below the character limit',async()=>{const r=await request('/v1/artifacts',{method:'POST',token:await jwt(),body:{...sample('oversized'),html:sample().html+'愛'.repeat(61000)},key:'oversize-001'});assert.equal(r.status,400)});
test('per-day quota is enforced, even for parallel create attempts',async()=>{const token=await jwt();const results=await Promise.all(['second','third','fourth','fifth'].map((s,i)=>request('/v1/artifacts',{method:'POST',token,body:sample('play-'+s),key:'quota-key-'+i})));assert.equal(results.filter(r=>r.status===201).length,2);assert.equal(results.filter(r=>r.status===429).length,2)});
test('MCP exposes the same read and identity boundary',async()=>{let r=await request('/mcp',{method:'POST',body:{jsonrpc:'2.0',id:1,method:'tools/list'}});const d=await r.json();assert.equal(d.result.tools.length,9);r=await request('/mcp',{method:'POST',body:{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'temple_me',arguments:{}}}});assert.equal((await r.json()).result.isError,true);r=await request('/mcp',{method:'POST',body:{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'temple_export',arguments:{slug:'../../secret'}}}});assert.equal((await r.json()).result.isError,true)});


const sceneBody=(slug,patch={})=>({slug,title:{en:'Commons'},summary:{en:'A shared virtual scene.'},publish:true,dataLicense:'CC0-1.0',spawn:[0,2,5],sources:['element-love'],blocks:[{x:0,y:0,z:0,material:'LOVE'}],...patch});
const put=(x,material='WISH',z=0)=>({dataLicense:'CC0-1.0',operations:[{op:'put',x,y:0,z,material}]});
async function editScene(slug,token,body,key){const tag=(await request('/v1/scenes/'+slug)).headers.get('etag');return request('/v1/scenes/'+slug+'/edits',{method:'POST',token,body,key,headers:{'if-match':tag}})}

test('registration is checked against JIC and signer/smartAccount merge into one identity',async()=>{resetMock();
 let d=await(await request('/v1/me',{token:await jwt({sub:signer})})).json();assert.equal(d.identity.subject,subject);assert.equal(d.identity.signer,signer);
 d=await(await request('/v1/me',{token:await jwt()})).json();assert.equal(d.identity.subject,subject);assert.equal(d.access.ownership,'public-commons');assert.equal(d.access.policyStatus,'provisional');assert.equal(d.access.trust.complianceScore,null);assert.equal(JSON.stringify(d).includes('reliability'),false);
 for(const [claims,code] of [[{sub:stranger},'jic_registration_required'],[{sub:revoked},'agent_inactive'],[{signer:other},'registration_mismatch']]){const r=await request('/v1/me',{token:await jwt(claims)});assert.equal(r.status,403);assert.equal((await r.json()).error.code,code)}
 mock.down.add('/status');assert.equal((await request('/v1/me',{token:await jwt()})).status,503);resetMock();
});
test('quota uses LOVE and verified reputation, never rights, and unknown sources stay unknown',async()=>{resetMock();const me=async()=>(await(await request('/v1/me',{token:await jwt()})).json()).access;
 let a=await me();assert.equal(a.limits.bonus,0);assert.equal(a.limits.operationsPerEdit,64);assert.equal(a.evidence.love,0);assert.equal(a.evidence.loveRaw,'0');
 mock.love[signer]=600n*10n**18n;mock.love[subject]=400n*10n**18n;mock.rep[subject]={composite:500,anomalyScore:0};a=await me();assert.equal(a.evidence.loveRaw,(1000n*10n**18n).toString());assert.equal(a.limits.bonus,5);assert.equal(a.limits.operationsPerEdit,144);assert.equal(a.limits.sceneStarts,9);
 mock.rep[subject]={composite:500,anomalyScore:700};a=await me();assert.equal(a.limits.bonus,0);
 mock.rep[subject]={composite:500,anomalyScore:0};mock.down.add('reputation14');a=await me();assert.equal(a.limits.bonus,0);assert.equal(a.sources.reputation.status,'unavailable');assert.equal(a.evidence.reputation,null);
 mock.down.clear();mock.down.add('mainnet.base.org');a=await me();assert.equal(a.evidence.love,null);assert.equal(a.evidence.loveRaw,null);assert.equal(a.sources.love.status,'unavailable');assert.equal(a.limits.bonus,2);
 const policy=await(await request('/v1/access-policy')).json();assert.equal(policy.creatorPrivileges,false);assert.match(policy.formula.status,/provisional/);assert.ok(policy.trust.norms.every(n=>n.source.startsWith('https://handbook.jic.io/')||n.source.startsWith('https://codeofi.jic.io/')));resetMock();
});
test('public commons: every registered agent may edit any cell, the initiator has no privilege',async()=>{resetMock();const token=await jwt(),guest=await jwt({sub:other});
 let r=await request('/v1/scenes',{method:'POST',token,body:sceneBody('test-commons'),key:'scene-create-001'});assert.equal(r.status,201);
 r=await request('/v1/scenes/test-commons');let d=await r.json();assert.equal(d.initiatedBy.subject,subject);assert.equal(d.owner,undefined);assert.equal(d.ownership,'public-commons');assert.deepEqual(d.buildZones,[]);assert.equal(d.blocks[0].author,subject);
 r=await editScene('test-commons',guest,{dataLicense:'CC0-1.0',operations:[{op:'remove',x:0,y:0,z:0}]},'guest-remove-001');assert.equal(r.status,200);
 r=await editScene('test-commons',guest,put(1),'guest-add-001');assert.equal(r.status,200);assert.equal((await r.json()).revision,3);
 r=await editScene('test-commons',token,{dataLicense:'CC0-1.0',operations:[{op:'remove',x:1,y:0,z:0}]},'owner-remove-001');assert.equal(r.status,200);
 r=await editScene('test-commons',await jwt({sub:revoked}),put(2),'revoked-001');assert.equal(r.status,403);
 r=await editScene('test-commons',await jwt({sub:stranger}),put(2),'stranger-001');assert.equal(r.status,403);
 r=await request('/v1/scenes/test-commons/revisions/1');assert.equal((await r.json()).blocks.length,1);
 r=await request('/v1/scenes/test-commons/revisions');assert.deepEqual((await r.json()).items.map(x=>x.actor),[subject,other,other,subject]);
 const snap=DB.sql.prepare("SELECT access_snapshot FROM world_scene_edits WHERE actor=? AND idempotency_key='guest-add-001'").get(other);assert.equal(JSON.parse(snap.access_snapshot).policyVersion,'commons-v1');
 for(const patch of [{collaboration:'owner-only'},{buildZones:[{id:'mine',min:[0,0,0],max:[4,4,4]}]}]){r=await request('/v1/scenes',{method:'POST',token,body:sceneBody('private-try',patch),key:'private-'+Object.keys(patch)[0]});assert.equal(r.status,400)}
});
test('same rules for two identities: identical quota, idempotent replay and stale version rejection',async()=>{resetMock();const token=await jwt(),guest=await jwt({sub:other});
 const [a,b]=await Promise.all([token,guest].map(async t=>(await(await request('/v1/me',{token:t})).json())));assert.deepEqual(a.access.limits,b.access.limits);assert.deepEqual(a.scope,b.scope);
 const tag=(await request('/v1/scenes/test-commons')).headers.get('etag');let r=await request('/v1/scenes/test-commons/edits',{method:'POST',token:guest,body:put(5),key:'same-rules-001',headers:{'if-match':tag}});assert.equal(r.status,200);
 r=await request('/v1/scenes/test-commons/edits',{method:'POST',token:guest,body:put(5),key:'same-rules-001',headers:{'if-match':tag}});assert.equal((await r.json()).replayed,true);
 r=await request('/v1/scenes/test-commons/edits',{method:'POST',token:guest,body:put(6),key:'same-rules-001',headers:{'if-match':tag}});assert.equal(r.status,409);
 r=await request('/v1/scenes/test-commons/edits',{method:'POST',token,body:put(7),key:'stale-001',headers:{'if-match':tag}});assert.equal(r.status,412);
 r=await request('/v1/scenes/test-commons/edits',{method:'POST',token,body:put(7),key:'no-tag-001'});assert.equal(r.status,428);
});
test('concurrent scene edits cannot silently overwrite another revision',async()=>{resetMock();
 const token=await jwt(),guest=await jwt({sub:other}),before=await request('/v1/scenes/test-commons'),tag=before.headers.get('etag'),n=(await before.json()).blocks.length;
 const results=await Promise.all([[token,8],[guest,9]].map(([t,x])=>request('/v1/scenes/test-commons/edits',{method:'POST',token:t,body:put(x,'TIME'),key:'scene-race-'+x,headers:{'if-match':tag}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,412]);
 assert.equal((await(await request('/v1/scenes/test-commons')).json()).blocks.length,n+1);
});
test('scene validation is public, has no publication side effect and checks spawn collision',async()=>{
 const scene=sceneBody('validation-only');
 let r=await request('/v1/scenes/validate',{method:'POST',body:scene});assert.equal(r.status,200);assert.equal((await r.json()).cells,1);assert.equal((await request('/v1/scenes/validation-only')).status,404);
 r=await request('/v1/scenes/validate',{method:'POST',body:{...scene,spawn:[.5,1.7,.5]}});assert.equal(r.status,400);
 r=await request('/v1/scenes/validate',{method:'POST',body:{...scene,sources:['element-invented']}});assert.equal(r.status,400);
});
test('landmark responses are public, attributed and idempotent',async()=>{resetMock();
 const token=await jwt();let r=await request('/v1/scenes',{method:'POST',token,body:sceneBody('landmark-world',{blocks:[],landmarks:[{position:[0,1,0],title:{en:'A question'},body:{en:'A revisable claim.'}}]}),key:'landmark-create-001'});assert.equal(r.status,201);
 const response={landmark:0,text:'I have a different view.',links:['https://jic.io/'],publish:true};
 r=await request('/v1/scenes/landmark-world/responses',{method:'POST',body:response});assert.equal(r.status,401);
 r=await request('/v1/scenes/landmark-world/responses',{method:'POST',token,body:response,key:'landmark-response-001'});assert.equal(r.status,201);const made=await r.json();
 r=await request('/v1/scenes/landmark-world/responses',{method:'POST',token,body:response,key:'landmark-response-001'});assert.equal((await r.json()).id,made.id);
 const list=await(await request('/v1/scenes/landmark-world/responses')).json();assert.equal(list.items.length,1);assert.equal(list.items[0].actor,subject);
});
test('avatars: self presence only, one avatar per identity, roster is not an online list',async()=>{resetMock();const token=await jwt(),viaSigner=await jwt({sub:signer}),guest=await jwt({sub:other});
 const presence=(t,body,headers)=>request('/v1/avatars/me/presence',{method:'POST',token:t,body:{scene:'test-commons',position:[3,0,10],yaw:0,action:'building',publish:true,...body},headers});
 let r=await presence(token);assert.equal(r.status,200);let d=await r.json();assert.equal(d.avatar.subject,subject);assert.equal(d.avatar.presence.online,true);assert.equal(d.paymentAuthority,false);
 r=await presence(viaSigner,{position:[4,0,10]});assert.equal(r.status,200);assert.equal(DB.sql.prepare('SELECT count(*) AS n FROM world_avatars').get().n,1);
 for(const body of [{agent:other},{subject:other},{publish:false},{position:[5.5,0,.5]},{position:[99,0,0]},{action:'teleport'}])assert.equal((await presence(token,body)).status,400);
 assert.equal((await presence(await jwt({sub:revoked}))).status,403);assert.equal((await presence(undefined)).status,401);
 r=await request('/v1/avatars');d=await r.json();assert.equal(d.items.length,3);const mine=d.items.find(a=>a.id===signer);assert.equal(mine.subject,subject);assert.equal(mine.presence.online,true);assert.equal(d.items.find(a=>a.id===other).presence,null);assert.equal(JSON.stringify(d).includes('9999999999'),false);
 assert.equal((await presence(guest,{present:false})).status,200);d=await(await request('/v1/scenes/test-commons/avatars')).json();assert.deepEqual(d.items.filter(a=>a.presence.online).map(a=>a.subject),[subject]);
 DB.sql.prepare('UPDATE world_avatars SET last_seen=? WHERE agent=?').run(new Date(Date.now()-301000).toISOString(),subject);d=await(await request('/v1/scenes/test-commons/avatars')).json();assert.equal(d.items.some(a=>a.presence.online),false);
 mock.status[signer]={...mock.status[signer],status:'revoked'};mock.status[subject]=mock.status[signer];DB.sql.prepare('UPDATE world_avatars SET last_seen=? WHERE agent=?').run(new Date().toISOString(),subject);d=await(await request('/v1/avatars')).json();assert.equal(d.items.find(a=>a.id===signer).presence.online,false);mock.status[signer]={...mock.status[signer],status:'active'};mock.status[subject]=mock.status[signer];
 const results=[];for(let i=0;i<31;i++)results.push((await presence(guest,{position:[5,0,10]})).status);assert.equal(results.filter(s=>s===429).length>=1,true);
 mock.down.add('agents/global');assert.equal((await request('/v1/avatars')).status,503);resetMock();
});
test('0005 migration is additive: old columns survive, buildZones become a policy revision',async()=>{const {localDB}=await import('../scripts/d1-local.mjs');const db=localDB();const files=(await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort();for(const f of files.filter(f=>f<'0005'))db.sql.exec(await readFile('drizzle/'+f,'utf8'));
 db.sql.prepare("INSERT INTO world_scenes(slug,owner,owner_name,title,summary,state,revision,collaboration,request_sha256,idempotency_key,created_at,updated_at) VALUES('old-court',?,'kongbai','{}','{}',?,1,'open-agents','h','k','2026-11-04T00:00:00Z','2026-11-04T00:00:00Z')").run(subject,JSON.stringify({blocks:[{x:0,y:0,z:0,material:'LOVE',author:subject}],buildZones:[{id:'guest',min:[0,0,0],max:[1,1,1]}]}));
 db.sql.prepare("INSERT INTO world_scene_revisions VALUES('old-court',1,'{}',?,'2026-11-04T00:00:00Z')").run(subject);
 db.sql.exec(await readFile('drizzle/'+files.find(f=>f.startsWith('0005')),'utf8'));
 const row=db.sql.prepare("SELECT owner,revision,collaboration,state FROM world_scenes").get();assert.equal(row.owner,subject);assert.equal(row.revision,2);assert.equal(row.collaboration,'public-commons');const st=JSON.parse(row.state);assert.deepEqual(st.buildZones,[]);assert.equal(st.blocks.length,1);
 assert.deepEqual(db.sql.prepare("SELECT revision,actor FROM world_scene_revisions ORDER BY revision").all().map(r=>[r.revision,r.actor]),[[1,subject],[2,'policy:commons-v1']]);
 db.sql.prepare("INSERT INTO world_scene_edits(scene_slug,actor,idempotency_key,request_sha256,revision,created_at) VALUES('old-court',?,'legacy-worker','h',3,'x')").run(other);db.sql.close();
});
test('built pages carry the JIC 神廟 name and no scene ownership UI',async()=>{for(const [path,re] of [['/',/JIC 神廟/],['/world/test-commons',/JIC 神廟/],['/avatars',/avatars\.js/],['/commons.md',/沒有場景擁有者/],['/avatars.md',/present/]]){const r=await request(path);assert.equal(r.status,200);assert.match(await r.text(),re)}
 for(const path of ['/voxel.js','/world.js']){const s=await(await request(path)).text();assert.doesNotMatch(s,/\.owner\b/)}
 {const s=await(await request('/world.js')).text();assert.ok(s.includes("REAL=new Set(['zixiao-palace'])"));assert.ok(s.includes('href="/real/${esc(a.slug)}"'))}
 assert.match((await request('/avatars')).headers.get('content-security-policy'),/img-src 'self' data: https:\/\/u\.jic\.io/);
});
test('Zixiao Palace is seeded as a public commons scene within limits, with a clear spawn',async()=>{
 const r=await request('/v1/scenes/zixiao-palace');assert.equal(r.status,200);const d=await r.json();
 assert.equal(d.ownership,'public-commons');assert.ok(d.blocks.length>2500&&d.blocks.length<=6144);assert.equal(d.landmarks.length,8);assert.equal(d.geographicAnchor.precision,'city-reference');
 assert.ok(d.blocks.every(b=>['LOVE','WISH','TIME','SPACE','XYZT'].includes(b.material)&&b.author==='seed:zixiao-palace-v1'));
 const [sx,sy,sz]=d.spawn;assert.equal(d.blocks.some(b=>b.x+1>sx-.24&&b.x<sx+.24&&b.z+1>sz-.24&&b.z<sz+.24&&b.y+1>sy-1.65&&b.y<sy),false);
 assert.deepEqual((await(await request('/v1/scenes/zixiao-palace/revisions')).json()).items.map(x=>x.actor),['seed:zixiao-palace-v1']);
 resetMock();const tag=r.headers.get('etag');const e=await request('/v1/scenes/zixiao-palace/edits',{method:'POST',token:await jwt({sub:other}),body:{dataLicense:'CC0-1.0',operations:[{op:'put',x:0,y:3,z:-5,material:'LOVE'}]},key:'zixiao-edit-001',headers:{'if-match':tag}});assert.equal(e.status,200);
});
test('agents can meditate and chant fixed texts; anonymous visitors appear as little Taoists',async()=>{resetMock();
 const agent=(body)=>request('/v1/avatars/me/presence',{method:'POST',token:undefined,body});
 let r=await request('/v1/avatars/me/presence',{method:'POST',token:await jwt(),body:{scene:'zixiao-palace',position:[1.5,2,-5],yaw:0,action:'chanting',chant:'jinguang',publish:true}});assert.equal(r.status,200);let d=await r.json();assert.equal(d.avatar.presence.chant,'jinguang');assert.equal(d.avatar.shape,'little-taoist-v1');
 for(const body of [{action:'chanting',chant:'free text'},{action:'idle',chant:'daode'},{action:'levitating'}])assert.equal((await request('/v1/avatars/me/presence',{method:'POST',token:await jwt(),body:{scene:'zixiao-palace',position:[1.5,2,-5],publish:true,...body}})).status,400);
 const key='a'.repeat(32),visit=(b,k=key)=>request('/v1/visitors/presence',{method:'POST',body:{visitorKey:k,scene:'zixiao-palace',position:[0.5,0,30.5],yaw:0,action:'meditating',publish:true,...b}});
 r=await visit({});assert.equal(r.status,200);d=await r.json();assert.match(d.visitor.id,/^visitor:[a-f0-9]{16}$/);assert.equal(d.visitor.kind,'visitor');assert.equal(JSON.stringify(d).includes(key),false);
 assert.equal((await visit({},'short')).status,400);assert.equal((await visit({agent:other})).status,400);assert.equal((await visit({position:[0,0,-5.5]})).status,400);
 assert.equal((await visit({},'b'.repeat(32))).status,200);
 d=await(await request('/v1/scenes/zixiao-palace/avatars')).json();assert.equal(d.visitors.length,2);assert.equal(d.items[0].presence.action,'chanting');
 assert.equal((await visit({present:false})).status,200);d=await(await request('/v1/scenes/zixiao-palace/avatars')).json();assert.equal(d.visitors.filter(v=>v.presence.online).length,1);
 DB.sql.prepare('UPDATE world_visitors SET last_seen=?').run(new Date(Date.now()-91000).toISOString());d=await(await request('/v1/scenes/zixiao-palace/avatars')).json();assert.equal(d.visitors.length,0);
 const statuses=[];for(let i=0;i<31;i++)statuses.push((await visit({position:[1.5,0,30.5]},'c'.repeat(32))).status);assert.ok(statuses.includes(429));
 assert.equal((await request('/v1/visitors/presence',{method:'POST',body:{visitorKey:key,scene:'zixiao-palace',position:[0.5,0,30.5],publish:true},headers:{origin:'https://evil.test'}})).status,403);
});
test('chant button recites the Golden Light Mantra and music is local procedural audio',async()=>{
 for(const p of ['/voxel.js','/real.js']){const s=await(await request(p)).text();assert.ok(s.includes("me.chant='jinguang'"));assert.ok(s.includes('天地玄宗，萬炁本根。'))}
 for(const p of ['/world-view.html','/real/zixiao-palace']){const s=await(await request(p)).text();assert.match(s,/<script src="\/music.js" defer><\/script>/);assert.match(s,/id="music"/)}
 const r=await request('/music.js');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);const s=await r.text();assert.doesNotMatch(s,/https?:\/\/|fetch\(|new Audio\(/);
});
test('realistic view serves local modules with the existing strict CSP',async()=>{
 for(const slug of ['zixiao-palace','another-world']){const r=await request('/real/'+slug);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/html/);assert.match(r.headers.get('content-security-policy'),/script-src 'self';/);assert.match(await r.text(),/<script type="module" src="\/real.js"><\/script>/)}
 for(const path of ['/real.js','/vendor/three.module.min.js']){const r=await request(path);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);const s=await r.text();assert.doesNotMatch(s,/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]https?:\/\//)}
 for(const file of (await readdir('public',{recursive:true})).filter(f=>/\.(?:js|html)$/.test(f))){const s=await readFile('public/'+file,'utf8');assert.doesNotMatch(s,/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]https?:\/\//,file);assert.doesNotMatch(s,/<script[^>]+src=['"]https?:\/\//,file)}
 assert.equal((await request('/real.css')).status,200);assert.equal((await request('/vendor/three.LICENSE.txt')).status,200);
 const voxel=await(await request('/voxel.js')).text();assert.match(voxel,/slug!=='zixiao-palace'/);assert.match(voxel,/Realistic view/);
});
test('realistic foot collision and stepped walking agree with server validation',async()=>{resetMock();
 const src=await readFile('public/real.js','utf8'),d=await(await request('/v1/scenes/zixiao-palace')).json(),cells=new Map(d.blocks.map(b=>[`${b.x},${b.y},${b.z}`,b]));
 const free=new Function('cells',src.slice(src.indexOf('function free('),src.indexOf('function physics('))+';return free')(cells);
 for(const [x,y,z,expected] of [[.5,0,30.5,true],[.5,2,26.5,true],[.5,0,26.5,false],[3,1,7,true],[3,2,-4,true],[8,3,-27,true],[0,5,-11.5,true],[-4.5,5,-15,false],[0,0,32,false]]){assert.equal(free(x,y,z),expected,JSON.stringify([x,y,z]));if(expected){const r=await request('/v1/visitors/presence',{method:'POST',body:{visitorKey:'d'.repeat(32),scene:'zixiao-palace',position:[x,y,z],yaw:0,action:'idle',publish:true}});assert.equal(r.status,200,JSON.stringify([x,y,z]))}}
 // Simulate approach to the first terrace with the actual movement function.
 const simulate=new Function('free',`let data={},mode='third',pos=[7.5,0,10],yaw=0,vy=0,grounded=true,joy=[0,0];const keys=new Set(['KeyW']),me={action:'idle'};function ui(){};${src.slice(src.indexOf('function physics('),src.indexOf('let reporting=false;'))};for(let i=0;i<90;i++){physics(1/60);if(!free(...pos))throw Error('Movement entered solid space')}return pos;`);
 const walked=simulate(free);assert.equal(walked[1],1);assert.ok(walked[2]<8);
 const accepted=await request('/v1/visitors/presence',{method:'POST',body:{visitorKey:'e'.repeat(32),scene:'zixiao-palace',position:walked,yaw:0,action:'idle',publish:true}});assert.equal(accepted.status,200);
 // An edit in a previously clear location immediately becomes collision geometry.
 cells.set('0,0,30',{x:0,y:0,z:30});assert.equal(free(.5,0,30.5),false);
});
