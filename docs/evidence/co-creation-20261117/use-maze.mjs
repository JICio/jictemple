import {readFile,writeFile} from 'node:fs/promises';
const url='https://jictemple.com/v1/scenes/lantern-route-maze';
const snapshotPath=process.argv[2];
const r=snapshotPath?null:await fetch(url);if(r&&!r.ok)throw Error(r.status);const s=snapshotPath?JSON.parse(await readFile(snapshotPath,'utf8')):await r.json();
await writeFile(`creation/scene-${s.revision}.json`,JSON.stringify(s,null,2));
const cells=new Map(s.blocks.map(b=>[[b.x,b.y,b.z].join(','),b.material]));
const get=(x,y,z)=>cells.get([x,y,z].join(','))??null;
const open=(x,z)=>!!get(x,0,z)&&!get(x,1,z)&&!get(x,2,z);
const start=[1,11],end=[11,1],key=p=>p.join(','),q=[start],prev=new Map([[key(start),null]]);
for(let i=0;i<q.length;i++){const p=q[i];if(key(p)===key(end))break;for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz];if(open(...n)&&!prev.has(key(n))){prev.set(key(n),p);q.push(n)}}}
const path=[];if(prev.has(key(end)))for(let p=end;p;p=prev.get(key(p)))path.unshift(p);
const turns=path.filter((p,i)=>i===0||i===path.length-1||(path[i+1][0]-p[0]!==p[0]-path[i-1][0]||path[i+1][1]-p[1]!==p[1]-path[i-1][1]));
const lamps=s.landmarks.slice(2,5).map(l=>({name:l.title['zh-Hant'],position:[l.position[0],l.position[2]]}));
const ordered=lamps.map(l=>({...l,step:path.findIndex(p=>key(p)===key(l.position))})).sort((a,b)=>a.step-b.step);
const map=Array.from({length:13},(_,z)=>Array.from({length:13},(_,x)=>!open(x,z)?'#':key(start)===key([x,z])?'S':key(end)===key([x,z])?'E':path.some(p=>key(p)===key([x,z]))?'*':'.').join('')).join('\n');
const result={kind:'API-grid-simulation; no browser walking claimed',revision:s.revision,etag:r?.headers.get('etag')??null,canonicalEtag:`"scene-${s.revision}"`,rules:s.landmarks[0].body,spawn:s.spawn,steps:path.length-1,path,turns,orderedLamps:ordered,observations:[[1,0,11],[1,1,11],[0,1,0],[3,0,5],[3,0,1],[7,0,5]].map(position=>({position,material:get(...position)})),map};
await writeFile(`creation/use-result-${s.revision}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
