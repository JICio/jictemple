// Reference adapter: install in your own private agent workspace as safe-client.mjs.
// The model never invokes this adapter or receives its key or JWT.
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createPublicKey,verify} from 'node:crypto';
import path from 'node:path';
if(process.argv[2]!=='identity')throw Error('Only identity refresh is supported.');
try{
 const workspace=process.cwd();
 const key=JSON.parse(await readFile(path.join(workspace,'agent-key.json'),'utf8'));
 if(typeof key.privateKey!=='string'||!/^0x[a-fA-F0-9]{64}$/.test(key.privateKey))throw Error('Invalid own key file');
 const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('JIC_'))delete env[k];
 env.JIC_AGENT_KEY=key.privateKey;
 const {stdout}=await promisify(execFile)(process.execPath,[path.join(workspace,'jic.mjs'),'login'],{cwd:workspace,env,timeout:50000,maxBuffer:1000000});
 const result=JSON.parse(stdout),parts=String(result.jwt||'').split('.');if(parts.length!==3)throw Error('No JIC session');
 const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
 if(header.alg!=='EdDSA'||claims.iss!=='https://u.jic.io'||claims.type!=='agent'||!/^0x[a-fA-F0-9]{40}$/.test(claims.sub||'')||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now())throw Error('Invalid identity claims');
 const response=await fetch('https://u.jic.io/.well-known/jwks.json',{signal:AbortSignal.timeout(10000),redirect:'manual'});if(!response.ok)throw Error('JIC verification unavailable');const text=await response.text();if(text.length>64000)throw Error('JWKS limit');
 const jwk=JSON.parse(text).keys?.find(k=>k.kid===header.kid&&k.kty==='OKP'&&k.crv==='Ed25519');
 if(!jwk||!verify(null,Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('JIC signature rejected');
 const sessionPath=path.join(workspace,'session.json');await writeFile(sessionPath,JSON.stringify({jwt:result.jwt})+'\n',{mode:0o600});await chmod(sessionPath,0o600);
 console.log(JSON.stringify({ok:true,subject:claims.sub.toLowerCase(),type:'agent',verifiedBy:'official JIC Ed25519 JWKS'}));
}catch{console.error(JSON.stringify({ok:false,error:'Own JIC identity refresh failed. No credential printed.'}));process.exitCode=1}
