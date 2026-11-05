export class HttpError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
export async function boundedJSON(req,max=220000){
 if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'json_required','Use application/json.');
 if(Number(req.headers.get('content-length'))>max)throw new HttpError(413,'body_limit','Request is too large.');
 const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'invalid_json','A JSON object is required.');
 const chunks=[];let n=0;while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>max){await reader.cancel();throw new HttpError(413,'body_limit','Request is too large.')}chunks.push(value)}
 const bytes=new Uint8Array(n);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||Array.isArray(value)||typeof value!=='object')throw 0;return value}catch{throw new HttpError(400,'invalid_json','A JSON object is required.')}
}
export function decode64(s){if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s))throw new HttpError(401,'invalid_token','Invalid identity token.');try{return Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0))}catch{throw new HttpError(401,'invalid_token','Invalid identity token.')}}
export async function verifyJIC(req,options={}){
 const raw=(req.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_.-]{30,12000})$/)?.[1];
 if(!raw)throw new HttpError(401,'jic_login_required','Sign in with your own JIC identity.');
 let stage='decode';
 try{
  const parts=raw.split('.');if(parts.length!==3)throw Error();
  const header=JSON.parse(new TextDecoder().decode(decode64(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
  stage='claims';
  const now=Math.floor((options.now??Date.now())/1000);
  if(header.alg!=='EdDSA'||typeof header.kid!=='string'||header.crit||header.jku||header.jwk||claims.iss!=='https://u.jic.io'||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now+60||claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now))throw Error();
  if(claims.type!=='agent'||!/^0x[a-fA-F0-9]{40}$/.test(claims.sub||''))throw Error();
  if(claims.aud!==undefined&&!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes('jictemple.com'))throw Error();
  stage='jwks-fetch';
  const fetcher=options.fetcher||((url,init)=>globalThis.fetch(url,init));
  const response=await fetcher('https://u.jic.io/.well-known/jwks.json',{signal:AbortSignal.timeout(10000),redirect:'manual',headers:{accept:'application/json'}});
  if(!response.ok)throw new HttpError(503,'identity_unavailable','JIC identity verification is temporarily unavailable.');
  stage='jwks-parse';
  const jwks=await boundedJSON(new Request('https://internal.invalid',{method:'POST',headers:{'content-type':'application/json'},body:response.body,duplex:'half'}),64000);
  const jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==='OKP'&&k.crv==='Ed25519'&&(!k.alg||k.alg==='EdDSA')&&(!k.use||k.use==='sig'));
  if(!jwk)throw Error();
  stage='key-import';
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'Ed25519'},false,['verify']);
  stage='signature';
  if(!await crypto.subtle.verify('Ed25519',key,decode64(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error();
  return {subject:claims.sub.toLowerCase(),type:claims.type,name:typeof claims.name==='string'?claims.name.slice(0,80):null,signer:/^0x[a-fA-F0-9]{40}$/.test(claims.signer||'')?claims.signer.toLowerCase():null,smartAccount:/^0x[a-fA-F0-9]{40}$/.test(claims.smartAccount||'')?claims.smartAccount.toLowerCase():null,verifiedBy:'JIC Ed25519 JWKS',expiresAt:claims.exp};
 }catch(e){console.warn(JSON.stringify({event:'jic_identity_check_failed',stage,type:e?.name||'Error',detail:stage==='jwks-fetch'?String(e?.message||'').slice(0,180):undefined}));if(stage==='jwks-fetch'&&!(e instanceof HttpError))throw new HttpError(503,'identity_unavailable','JIC identity verification is temporarily unavailable.');if(e instanceof HttpError&&e.status===503)throw e;throw new HttpError(401,'invalid_jic_identity','JIC identity signature or claims are invalid.')}
}
