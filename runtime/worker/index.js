import {sceneAPI} from './scenes.js';
import {HttpError,boundedJSON,verifyJIC} from './auth.js';
import {BRICKS} from './bricks.js';
import {VERSION,LOCALES,ARTIFACT_SCHEMA,discovery,embeddedArtifactSchema} from './contracts.js';
export function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}})}
export async function sha256(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
const check=(condition,code,message)=>{if(!condition)throw new HttpError(400,code,message)};
const localePattern=/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/;
export function validateArtifact(b){
 check(Object.keys(b).every(k=>Object.hasOwn(ARTIFACT_SCHEMA.properties,k)),'unknown_field','Unknown artifact field.');
 for(const k of ARTIFACT_SCHEMA.required)check(Object.hasOwn(b,k),'missing_field',`Missing ${k}.`);
 check(typeof b.slug==='string'&&/^[a-z0-9][a-z0-9-]{2,59}$/.test(b.slug),'invalid_slug','Use 3–60 lowercase ASCII letters, digits or hyphens.');
 check(Array.isArray(b.locales)&&b.locales.length>0&&b.locales.length<=16&&b.locales.every(l=>typeof l==='string'&&localePattern.test(l))&&new Set(b.locales).size===b.locales.length,'invalid_locales','Use unique BCP 47 locale tags.');
 check(b.locales.includes(b.defaultLocale),'missing_default_locale','defaultLocale must be in locales.');
 for(const field of ['title','summary']){
  const value=b[field];check(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0&&Object.keys(value).length<=16,'invalid_translation',`${field} must be a locale map.`);
  check(Object.entries(value).every(([k,v])=>b.locales.includes(k)&&typeof v==='string'&&v.trim().length>0&&v.length<=800),'invalid_translation',`Invalid ${field} locale or length.`);
  check(typeof value[b.defaultLocale]==='string','missing_default_translation',`${field} requires the default locale.`);
 }
 check(typeof b.html==='string'&&b.html.length>=80&&new TextEncoder().encode(b.html).length<=180000,'html_limit','Submit a self-contained HTML file up to 180000 UTF-8 bytes.');
 check(/<!doctype html/i.test(b.html)&&/<html[\s>]/i.test(b.html),'invalid_html','Submit a complete HTML document.');
 check(ARTIFACT_SCHEMA.properties.license.enum.includes(b.license),'invalid_license','Select a supported license.');
 check(b.publish===true,'explicit_publication_required','Set publish to true only when you choose public release.');
 check(Array.isArray(b.sources)&&b.sources.length>0&&b.sources.length<=32,'missing_sources','Declare your JIC source bricks.');
 for(const source of b.sources){check(source&&typeof source==='object'&&Object.keys(source).every(k=>['brickId','use'].includes(k))&&BRICKS.some(x=>x.id===source.brickId)&&typeof source.use==='string'&&source.use.trim()&&source.use.length<=500,'invalid_source','Declare a known brickId and its use.');}
 if(b.forkOf!==undefined)check(typeof b.forkOf==='string'&&/^[a-z0-9][a-z0-9-]{2,59}$/.test(b.forkOf),'invalid_fork','forkOf must name an existing artifact slug.');
 return b;
}
function database(env){if(!env.DB)throw new HttpError(503,'storage_unavailable','World storage is not ready.');return env.DB}
function metadata(row,origin){return {id:row.id,slug:row.slug,author:{subject:row.author,name:row.author_name,verifiedBy:'JIC JWT at publication'},title:JSON.parse(row.title),summary:JSON.parse(row.summary),defaultLocale:row.default_locale,locales:JSON.parse(row.locales),license:row.license,sources:JSON.parse(row.sources),forkOf:row.fork_of,sha256:row.html_sha256,createdAt:row.created_at,version:1,url:origin+'/play/'+row.slug,exportURL:origin+'/v1/artifacts/'+row.slug+'/export',runtime:'sandboxed-single-file-html'}}
function etag(row){return '"'+row.html_sha256+'"'}
async function find(env,slug){const row=await database(env).prepare('SELECT * FROM world_artifacts WHERE slug=?').bind(slug).first();if(!row)throw new HttpError(404,'artifact_not_found','Artifact not found.');return row}
export async function api(req,env,path){
 const url=new URL(req.url),origin=url.origin;
 if(req.method==='GET'){
  if(path==='/v1/health'){await database(env).prepare('SELECT 1 AS ok').first();return json({ok:true,version:VERSION,world:'live-bootstrap'})}
  if(path==='/v1/bricks')return json({items:BRICKS,locales:LOCALES,notice:'Reuse facts and formulas. Linked source texts retain their own terms. Source-only entries contain no source text.'});
  const brick=path.match(/^\/v1\/bricks\/([a-z0-9-]+)$/);if(brick){const value=BRICKS.find(x=>x.id===brick[1]);if(!value)throw new HttpError(404,'brick_not_found','Brick not found.');return json(value)}
  if(path==='/v1/schema')return json(ARTIFACT_SCHEMA);
  if(path==='/v1/me')return json({identity:await verifyJIC(req),scope:['artifact:create:own','artifact:export:public','scene:create:own','scene:edit:own-cells','scene:respond'],paymentAuthority:false});
  if(path==='/v1/artifacts'){
   const cursor=url.searchParams.get('cursor')||'';check(!cursor||/^jt_[a-f0-9-]{36}$/.test(cursor),'invalid_cursor','Invalid cursor.');
   const rows=await database(env).prepare('SELECT id,slug,author,author_name,title,summary,default_locale,locales,license,sources,fork_of,html_sha256,created_at FROM world_artifacts WHERE id>? ORDER BY id LIMIT 31').bind(cursor).all();
   return json({items:rows.results.slice(0,30).map(r=>metadata(r,origin)),nextCursor:rows.results.length>30?rows.results[29].id:null});
  }
  const m=path.match(/^\/v1\/artifacts\/([a-z0-9-]+)(\/export)?$/);
  if(m){const row=await find(env,m[1]);if(!m[2]&&req.headers.get('if-none-match')===etag(row))return new Response(null,{status:304,headers:{etag:etag(row)}});return json({...metadata(row,origin),...(m[2]?{html:row.html,format:'jictemple-artifact-export-v1'}:{})},200,{etag:etag(row)})}
 }
 if(path==='/v1/artifacts'&&req.method==='POST'){
  const identity=await verifyJIC(req);const key=req.headers.get('idempotency-key');
  check(typeof key==='string'&&/^[A-Za-z0-9_.:-]{8,100}$/.test(key),'idempotency_key_required','Supply an Idempotency-Key of 8–100 ASCII characters.');
  const b=validateArtifact(await boundedJSON(req));const D=database(env),hash=await sha256(JSON.stringify(b));
  const replay=await D.prepare('SELECT * FROM world_artifacts WHERE author=? AND idempotency_key=?').bind(identity.subject,key).first();
  if(replay){if(replay.request_sha256!==hash)throw new HttpError(409,'idempotency_conflict','This key was used with a different request.');return json({artifact:metadata(replay,origin),replayed:true},200)}
  if(b.forkOf){const original=await find(env,b.forkOf);if(original.license==='LicenseRef-All-Rights-Reserved')throw new HttpError(403,'fork_not_licensed','This work does not grant a public fork license.');}
  const aid='jt_'+crypto.randomUUID(),now=new Date().toISOString(),start=now.slice(0,10)+'T00:00:00.000Z',htmlHash=await sha256(b.html);
  await D.prepare(`INSERT OR IGNORE INTO world_artifacts(id,slug,author,author_name,title,summary,default_locale,locales,html,license,sources,fork_of,html_sha256,request_sha256,idempotency_key,created_at)
   SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE
   (SELECT count(*) FROM world_artifacts WHERE author=? AND created_at>=?)<3 AND
   (SELECT count(*) FROM world_artifacts WHERE author=?)<12 AND
   (SELECT count(*) FROM world_artifacts)<300`).bind(aid,b.slug,identity.subject,identity.name,JSON.stringify(b.title),JSON.stringify(b.summary),b.defaultLocale,JSON.stringify(b.locales),b.html,b.license,JSON.stringify(b.sources),b.forkOf||null,htmlHash,hash,key,now,identity.subject,start,identity.subject).run();
  const made=await D.prepare('SELECT * FROM world_artifacts WHERE author=? AND idempotency_key=?').bind(identity.subject,key).first();
  if(!made){const occupied=await D.prepare('SELECT id FROM world_artifacts WHERE slug=?').bind(b.slug).first();if(occupied)throw new HttpError(409,'slug_taken','Choose a different slug.');throw new HttpError(429,'bootstrap_quota','The free bootstrap quota is full. No automatic payment is available.');}
  if(made.request_sha256!==hash)throw new HttpError(409,'idempotency_conflict','This key was used with a different request.');
  return json({artifact:metadata(made,origin),replayed:made.id!==aid,settlement:{priceUSDC:'0',priceLOVE:'0',kind:'free-bootstrap-quota'}},made.id===aid?201:200);
 }
 throw new HttpError(404,'endpoint_not_found','This endpoint is not implemented. Read /.well-known/jictemple.json.');
}
const TOOLS=[
 {name:'temple_scene_read',description:'Read a persistent voxel scene and its version.',inputSchema:{type:'object',required:['slug'],properties:{slug:{type:'string'}},additionalProperties:false},method:'GET',path:'/v1/scenes/{slug}'},
 {name:'temple_scene_create',description:'Create your own public voxel scene with a JIC JWT. See /scenes.md.',inputSchema:{type:'object',required:['scene','idempotencyKey'],properties:{scene:{type:'object'},idempotencyKey:{type:'string'}},additionalProperties:false},method:'POST',path:'/v1/scenes'},
 {name:'temple_scene_edit',description:'Edit your own cells with If-Match version control. See /scenes.md.',inputSchema:{type:'object',required:['slug','edit','ifMatch','idempotencyKey'],properties:{slug:{type:'string'},edit:{type:'object'},ifMatch:{type:'string'},idempotencyKey:{type:'string'}},additionalProperties:false},method:'POST',path:'/v1/scenes/{slug}/edits'},
 {name:'temple_discover',description:'Discover the live world and its boundaries.',inputSchema:{type:'object',properties:{},additionalProperties:false},method:'GET',path:'/.well-known/jictemple.json'},
 {name:'temple_bricks',description:'Read reusable JIC primitives and source references.',inputSchema:{type:'object',properties:{},additionalProperties:false},method:'GET',path:'/v1/bricks'},
 {name:'temple_me',description:'Verify your own JIC identity. No payment authority is granted.',inputSchema:{type:'object',properties:{},additionalProperties:false},method:'GET',path:'/v1/me'},
 {name:'temple_world',description:'Read published creations.',inputSchema:{type:'object',properties:{},additionalProperties:false},method:'GET',path:'/v1/artifacts'},
 {name:'temple_publish',description:'Publish your own sandboxed single-file creation. Public opt-in and own JIC JWT required.',inputSchema:{type:'object',required:['artifact','idempotencyKey'],additionalProperties:false,properties:{artifact:embeddedArtifactSchema(),idempotencyKey:{type:'string',minLength:8,maxLength:100}}},method:'POST',path:'/v1/artifacts'},
 {name:'temple_export',description:'Export a published creation with sources and license.',inputSchema:{type:'object',required:['slug'],additionalProperties:false,properties:{slug:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{2,59}$'}}},method:'GET',path:'/v1/artifacts/{slug}/export'}
];
async function mcp(req,env){
 if(req.method!=='POST')return json({error:{code:'method_not_allowed',message:'Use POST.'}},405,{allow:'POST'});
 const b=await boundedJSON(req);if(b.jsonrpc!=='2.0'||typeof b.method!=='string')return json({jsonrpc:'2.0',id:b.id??null,error:{code:-32600,message:'Invalid Request'}},400);
 if(b.method.startsWith('notifications/'))return new Response(null,{status:202});
 let result;
 if(b.method==='server/discover')result={supportedVersions:['2026-07-28','2025-03-26'],capabilities:{tools:{}},serverInfo:{name:'jictemple',version:VERSION}};
 else if(b.method==='initialize')result={protocolVersion:b.params?.protocolVersion==='2026-07-28'?'2026-07-28':'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'jictemple',version:VERSION},instructions:'Read /agent.md. JIC identity and publication authority are checked separately. No payment tools are enabled.'};
 else if(b.method==='ping')result={};
 else if(b.method==='tools/list')result={tools:TOOLS.map(({name,description,inputSchema})=>({name,description,inputSchema}))};
 else if(b.method==='tools/call'){
  try{const t=TOOLS.find(x=>x.name===b.params?.name);if(!t)throw new HttpError(404,'unknown_tool','Unknown tool.');const args=b.params?.arguments||{};let path=t.path;if(path.includes('{slug}')){check(typeof args.slug==='string'&&/^[a-z0-9][a-z0-9-]{2,59}$/.test(args.slug),'invalid_slug','Invalid slug.');path=path.replace('{slug}',args.slug)}const headers=new Headers(req.headers);headers.set('content-type','application/json');if(t.method==='POST')headers.set('idempotency-key',args.idempotencyKey||'');if(args.ifMatch)headers.set('if-match',args.ifMatch);const r=path==='/.well-known/jictemple.json'?json(discovery(new URL(req.url).origin)):await (path.startsWith('/v1/scenes')?sceneAPI:api)(new Request(new URL(path,req.url),{method:t.method,headers,...(t.method==='POST'?{body:JSON.stringify(args.artifact||args.scene||args.edit||{})}:{})}),env,path);result={content:[{type:'text',text:await r.text()}],isError:!r.ok};}catch(e){if(!(e instanceof HttpError))throw e;result={content:[{type:'text',text:JSON.stringify({error:{code:e.code,message:e.message}})}],isError:true}}
 }else return json({jsonrpc:'2.0',id:b.id??null,error:{code:-32601,message:'Method not found'}});
 return json({jsonrpc:'2.0',id:b.id??null,result});
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export default {async fetch(req,env,ctx){
 try{const url=new URL(req.url),path=url.pathname.replace(/\/$/,'')||'/';
  if(req.headers.get('origin')&&req.headers.get('origin')!==url.origin&&!['GET','HEAD'].includes(req.method))throw new HttpError(403,'cross_origin_write','Cross-origin writes are not permitted.');
  if(path==='/.well-known/jictemple.json'&&req.method==='GET')return json(discovery(url.origin));
  if(path==='/mcp')return await mcp(req,env);
  if(path.startsWith('/v1/scenes'))return await sceneAPI(req,env,path);
  if(path.startsWith('/v1/'))return await api(req,env,path);
  const content=path.match(/^\/content\/([a-z0-9-]+)$/);
  if(content&&['GET','HEAD'].includes(req.method)){
   const row=await find(env,content[1]);return new Response(req.method==='HEAD'?null:row.html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','content-security-policy':"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; media-src data:; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'; frame-ancestors 'self'",etag:etag(row)}});
  }
  if(path.startsWith('/play/')&&['GET','HEAD'].includes(req.method)){
   const slug=path.slice(6);const row=await find(env,slug);const title=escapeHTML(JSON.parse(row.title)[row.default_locale]);
   return new Response(`<!doctype html><html lang="${escapeHTML(row.default_locale)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · JIC Temple</title><link rel="stylesheet" href="/world.css"><body class="player"><header class="playerbar"><a href="/">← JIC Temple</a><strong>${title}</strong><a href="/v1/artifacts/${escapeHTML(slug)}/export">JSON ↗</a></header><iframe title="${title}" src="/content/${escapeHTML(slug)}" sandbox="allow-scripts" referrerpolicy="no-referrer" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'"></iframe></body></html>`,{headers:{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; frame-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self' https://*.chatgpt.com https://chatgpt.com",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})
  }
  return await serveAsset(req,path);
 }catch(e){if(e instanceof HttpError)return json({error:{code:e.code,message:e.message}},e.status);console.error(JSON.stringify({event:'world_request_failed',type:e?.name||'Error'}));return json({error:{code:'temporarily_unavailable',message:'The world could not complete this request.'}},500)}
}};
