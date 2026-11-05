// SPDX-License-Identifier: MIT
// Extract existing JIC public coordinates. Never infer or download 3D models.
import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
const out=path.resolve(process.argv[2]||'outputs/geospatial'),bounds={west:-98,south:30,east:-97.4,north:30.6};
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});if(!r.ok)throw Error('Public source request failed: '+r.status);return r.text()}
function array(s){const a=s.indexOf('[{'),b=s.lastIndexOf(']');if(a<0||b<a)throw Error('Unexpected public array format');return JSON.parse(s.slice(a,b+1))}
const raw=await get('https://church.jic.io/data/manifest.js'),manifest=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
const shards=[...manifest.core,...manifest.more];if(!shards.every(p=>/^data\/[A-Za-z0-9._-]+\.js$/.test(p)))throw Error('Unexpected public shard path');
const church=(await Promise.all(shards.map(async p=>array(await get('https://church.jic.io/'+p))))).flat();
const castle=array(await get('https://castle.jic.io/data.js?v=6'));
const house=JSON.parse(await get('https://house.jic.io/data/index.json')).rows.map(r=>({id:r[0],en:r[1],n:r[2],lat:r[5],lon:r[6]}));
const metadata={observedAt:new Date().toISOString(),bounds,location:'Austin vicinity; this box is not an official city boundary',datasets:{},geometryStatus:'coordinates-only',databaseLicense:'ODbL-1.0',licenseURL:'https://opendatacommons.org/licenses/odbl/1-0/',attribution:'OpenStreetMap contributors (ODbL 1.0) and Wikidata (CC0). No photos or 3D models are included.'},features=[];
for(const [category,rows,portal] of [['church',church,'https://church.jic.io/'],['house',house,'https://house.jic.io/'],['castle',castle,'https://castle.jic.io/']]){
 const valid=rows.filter(r=>typeof r.lat==='number'&&Number.isFinite(r.lat)&&typeof r.lon==='number'&&Number.isFinite(r.lon)&&Math.abs(r.lat)<=90&&Math.abs(r.lon)<=180),near=valid.filter(r=>r.lon>=bounds.west&&r.lon<=bounds.east&&r.lat>=bounds.south&&r.lat<=bounds.north);
 metadata.datasets[category]={records:rows.length,validCoordinates:valid.length,austinVicinity:near.length,source:portal};
 for(const r of near){let source=portal,sourceLicense='source-terms';if(/^Q\d+$/.test(r.id)){source='https://www.wikidata.org/wiki/'+r.id;sourceLicense='CC0-1.0'}else if(/^osm:[nwr]\d+$/.test(r.id)){source='https://www.openstreetmap.org/'+({n:'node',w:'way',r:'relation'}[r.id[4]])+'/'+r.id.slice(5);sourceLicense='ODbL-1.0'}features.push({type:'Feature',geometry:{type:'Point',coordinates:[r.lon,r.lat]},properties:{id:category+':'+r.id,sourceId:r.id,category,title:r.n||r.en,titleEn:r.en||r.n,portal,source,sourceLicense,geometryStatus:'coordinates-only',modelAvailable:false,coordinateStatus:'source-record-not-independently-surveyed'}})}
}
await mkdir(out,{recursive:true});await writeFile(path.join(out,'austin.geojson'),JSON.stringify({type:'FeatureCollection',features,metadata})+'\n');await writeFile(path.join(out,'inventory.json'),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({output:out,features:features.length,geometryStatus:'coordinates-only'}));
