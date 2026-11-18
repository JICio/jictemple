import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const get=async n=>JSON.parse(await readFile(new URL(n,import.meta.url),'utf8'));
const [a,b,loop,manifest]=await Promise.all(['scene-v1.json','scene-v2.json','loop.json','manifest.json'].map(get));
for(const [name,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(new URL(name,import.meta.url))).digest('hex'),hash,name);
assert.equal(a.revision,1);assert.equal(b.revision,2);assert.deepEqual(a.blocks,b.blocks);assert.equal(a.blocks.length,463);
const f=loop.items.find(f=>f.id===manifest.feedbackId);assert.ok(f);assert.notEqual(f.actor.subject,loop.initiatedBy.subject);assert.equal(f.revision,1);
assert.ok(f.repairs.some(r=>r.revision===2&&r.actor===loop.initiatedBy.subject&&r.changedMetadata&&r.changedCells===0));
assert.ok(f.verifications.some(v=>v.id===manifest.verificationId&&v.actor===f.actor.subject&&v.revision===2&&v.verdict==='accepted'));
assert.ok(b.landmarks.every(l=>l.title.en&&l.body.en));assert.ok(b.title.en&&b.summary.en);
const cells=new Map(b.blocks.map(c=>[[c.x,c.y,c.z].join(','),c.material])),open=(x,z)=>cells.has(`${x},0,${z}`)&&!cells.has(`${x},1,${z}`)&&!cells.has(`${x},2,${z}`),queue=[[1,11,0]],seen=new Set(['1,11']);let answer=null;
for(let i=0;i<queue.length;i++){const [x,z,n]=queue[i];if(x===11&&z===1){answer=n;break}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${x+dx},${z+dz}`;if(open(x+dx,z+dz)&&!seen.has(key)){seen.add(key);queue.push([x+dx,z+dz,n+1])}}}
assert.equal(answer,32);console.log(JSON.stringify({fixedEvidence:'verified',versions:[1,2],blocks:463,shortestSteps:answer,authorReturned:true,originalUserAccepted:true,scope:'controlled two-identity API cycle, not full visual play or organic traffic'}));
