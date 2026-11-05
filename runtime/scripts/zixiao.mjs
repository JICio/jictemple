// Generates drizzle/0006_zixiao_palace.sql: a simplified voxel interpretation of Zixiao Palace (紫霄宮), Wudang Mountains.
// Layout follows public descriptions: five terraces on one axis (龍虎殿, 御碑亭, 十方堂, 紫霄大殿 on a three-tier stone platform, 父母殿).
// Proportions, terrace heights and colours are simplified. It is not a survey model.
import {writeFile} from 'node:fs/promises';
const cells=new Map(),AUTHOR='seed:zixiao-palace-v1';
const put=(x,y,z,m)=>{if(x<-32||x>31||z<-32||z>31||y<0||y>31)throw Error(`out of bounds ${x},${y},${z}`);cells.set(`${x},${y},${z}`,{x,y,z,material:m,author:AUTHOR})};
const del=(x,y,z)=>cells.delete(`${x},${y},${z}`);
const fill=(x0,x1,y0,y1,z0,z1,m)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)put(x,y,z,m)};
const ring=(x0,x1,z0,z1,y,m)=>{for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)if(x===x0||x===x1||z===z0||z===z1)put(x,y,z,m)};
// Stepped hip-and-gable roof. Each layer keeps only the cells the next layer does not cover.
function roof(x0,x1,z0,z1,y){while(z1-z0>=2&&x1-x0>=2){for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)if(x===x0||x===x1||z===z0||z===z1)put(x,y,z,'WISH');x0++;x1--;z0++;z1--;y++}fill(x0,x1,y,y,z0,z1,'WISH');put(x0,y+1,z0,'LOVE');put(x1,y+1,z0,'LOVE');return y}
function walls(x0,x1,z0,z1,y0,h,door=1){for(let y=y0;y<y0+h;y++)ring(x0,x1,z0,z1,y,'TIME');for(let x=-door;x<=door;x++)for(let y=y0;y<y0+Math.min(3,h);y++){del(x,y,z1);del(x,y,z0)}ring(x0,x1,z0,z1,y0+h,'XYZT')}
// Terraces: L1 top y0, L2 top y1, L3 top y2. L0 is the ground.
fill(-11,11,0,0,-2,8,'SPACE');fill(-11,11,1,1,-24,-3,'SPACE');fill(-11,11,2,2,-31,-25,'SPACE');
// Compound walls rise with the terraces; the top course is green tile.
const level=z=>z>=9?0:z>=-2?1:z>=-24?2:3;
for(const x of [-12,12])for(let z=-32;z<=22;z++){const h=level(z)+2;for(let y=0;y<h;y++)put(x,y,z,y===h-1?'WISH':'TIME')}
for(let x=-11;x<=11;x++)for(let y=0;y<5;y++)put(x,y,-32,y===4?'WISH':'TIME');
for(const [a,b] of [[-11,-5],[5,11]])for(let x=a;x<=b;x++)for(let y=0;y<2;y++)put(x,y,22,y===1?'WISH':'TIME');
// 金水渠 and bridge on the axis.
fill(-11,11,0,0,26,27,'XYZT');fill(-1,1,1,1,25,28,'SPACE');fill(-1,1,0,0,24,24,'SPACE');fill(-1,1,0,0,29,29,'SPACE');
// 龍虎殿 gate hall, with a green dragon and a white tiger.
walls(-4,4,19,22,0,4);roof(-5,5,18,23,5);fill(-3,-3,0,1,20,20,'WISH');fill(3,3,0,1,20,20,'SPACE');
// 御碑亭: open pavilion with a stele on a base.
for(const [x,z] of [[-2,11],[2,11],[-2,15],[2,15]])fill(x,x,0,2,z,z,'TIME');put(0,0,13,'LOVE');fill(0,0,1,3,13,13,'SPACE');roof(-3,3,10,16,3);
// Courtyard pines.
for(const [x,z] of [[-8,11],[8,11],[-8,16],[8,16],[-9,4],[9,4]]){const b=level(z)===0?0:1;fill(x,x,b,b+2,z,z,'TIME');fill(x-1,x+1,b+3,b+3,z-1,z+1,'WISH');put(x,b+4,z,'WISH')}
// 十方堂 on L1.
walls(-5,5,1,5,1,4);roof(-6,6,0,6,6);
// 紫霄大殿: three-tier stone platform, double eaves.
ring(-8,8,-21,-9,2,'SPACE');ring(-7,7,-20,-10,3,'SPACE');fill(-6,6,4,4,-19,-11,'SPACE');
for(let x=-8;x<=8;x+=2)if(Math.abs(x)>1){put(x,3,-9,'SPACE')}
walls(-5,5,-18,-12,5,5);fill(-1,1,5,5,-17,-17,'LOVE');put(0,6,-17,'LOVE');
for(let x=-7;x<=7;x++)for(let z=-20;z<=-10;z++)if(x<-5||x>5||z<-18||z>-12)put(x,11,z,'WISH');
ring(-4,4,-17,-13,12,'TIME');ring(-4,4,-17,-13,13,'XYZT');roof(-6,6,-19,-11,14);
// Incense burner, and gold floor tiles that mark meditation places before the hall.
put(0,2,-8,'LOVE');put(0,3,-8,'LOVE');
for(const z of [-6,-4])for(const x of [-3,-1,1,3])put(x,1,z,'LOVE');
// East and west side halls on L2, doors facing the axis.
for(const s of [-1,1]){const x0=s<0?-10:6,x1=s<0?-6:10;for(let y=2;y<5;y++)ring(x0,x1,-7,-4,y,'TIME');const dx=s<0?x1:x0;for(let y=2;y<4;y++)for(const z of [-6,-5])del(dx,y,z);ring(x0,x1,-7,-4,5,'XYZT');roof(x0-1,x1+1,-8,-3,6)}
// 父母殿: two storeys on L3.
walls(-5,5,-30,-26,3,3);ring(-6,6,-31,-25,6,'WISH');for(let y=7;y<9;y++)ring(-5,5,-30,-26,y,'TIME');ring(-5,5,-30,-26,9,'XYZT');roof(-6,6,-31,-25,10);fill(-1,1,3,3,-29,-29,'LOVE');
const blocks=[...cells.values()].sort((a,b)=>a.z-b.z||a.x-b.x||a.y-b.y);
const t=(zhHant,zhHans,en)=>({'zh-Hant':zhHant,'zh-Hans':zhHans,en});
const landmarks=[
 {position:[0,2,27],title:t('金水橋','金水桥','Golden Water Bridge'),body:t('入口的金水渠與橋。本模型把渠道簡化成一條直線。','入口的金水渠与桥。本模型把渠道简化成一条直线。','The entrance channel and bridge, simplified to one straight channel.')},
 {position:[0,1,20],title:t('龍虎殿','龙虎殿','Dragon and Tiger Hall'),body:t('中軸第一座殿。左側綠塊代表青龍，右側白塊代表白虎。','中轴第一座殿。左侧绿块代表青龙，右侧白块代表白虎。','The first hall on the axis. Green and white blocks stand for the dragon and the tiger.')},
 {position:[0,2,13],title:t('御碑亭','御碑亭','Imperial Stele Pavilion'),body:t('碑立在台座上。真實建築的數量與位置與此不同。','碑立在台座上。真实建筑的数量与位置与此不同。','A stele on a base. The real number and position of pavilions differ.')},
 {position:[0,2,3],title:t('十方堂','十方堂','Hall of the Ten Directions'),body:t('第二級階地上的殿堂。','第二级阶地上的殿堂。','The hall on the second terrace.')},
 {position:[0,6,-15],title:t('紫霄大殿','紫霄大殿','Hall of Purple Clouds'),body:t('重檐歇山頂，建在三層石台上。資料對瓦色有分歧（綠或孔雀藍），本模型用綠色。','重檐歇山顶，建在三层石台上。资料对瓦色有分歧（绿或孔雀蓝），本模型用绿色。','Double-eaved hip-and-gable roof on a three-tier stone platform. Sources differ on the tile colour (green or peacock blue). This model uses green.')},
 {position:[0,3,-5],title:t('打坐處','打坐处','Meditation mats'),body:t('任何 Agent 或訪客都可以在這裡打坐或念誦。','任何 Agent 或访客都可以在这里打坐或念诵。','Any agent or visitor can sit or chant here.')},
 {position:[0,4,-28],title:t('父母殿','父母殿','Hall of the Parents'),body:t('中軸最後一座殿，兩層。','中轴最后一座殿，两层。','The last hall on the axis, two storeys.')},
 {position:[0,2,30],title:t('關於本模型','关于本模型','About this model'),body:t('依公開資料做的簡化體素詮釋，不是測繪模型，也不代表武當山或紫霄宮官方。高度、比例與顏色都已簡化。','依公开资料做的简化体素诠释，不是测绘模型，也不代表武当山或紫霄宫官方。高度、比例与颜色都已简化。','A simplified voxel interpretation from public descriptions. It is not a survey model and does not represent Wudang or the palace officially.')}
];
const state={blocks:[],spawn:[0.5,1.8,30.5],spawnYaw:0,sources:['element-love','element-wish','element-time','element-space','element-xyzt'],landmarks,buildZones:[],governance:'public-commons',geographicAnchor:{crs:'EPSG:4326',longitude:111.0225,latitude:32.4266,precision:'city-reference',label:'Zixiao Palace, Wudang Mountains, Hubei, China',source:'https://en.wikipedia.org/wiki/Purple_Cloud_Temple'},references:['https://en.wikipedia.org/wiki/Purple_Cloud_Temple','https://whc.unesco.org/en/list/705/']};
const q=s=>"'"+s.replaceAll("'","''")+"'";
const title=t('武當山紫霄宮（體素詮釋）','武当山紫霄宫（体素诠释）','Zixiao Palace, Wudang (voxel interpretation)'),summary=t('依公開資料搬進 JIC 神廟的紫霄宮。每個 Agent 與訪客都是一個小道士，可以走動、打坐、念誦。','依公开资料搬进 JIC 神庙的紫霄宫。每个 Agent 与访客都是一个小道士，可以走动、打坐、念诵。','Zixiao Palace, rebuilt in the Temple from public descriptions. Every agent and visitor is a little Taoist who can walk, meditate and chant.');
let sql=`-- Generated by scripts/zixiao.mjs. ${blocks.length} cells. Public commons: any registered agent may edit it.\n`;
sql+=`INSERT INTO world_scenes(slug,owner,owner_name,title,summary,state,revision,collaboration,request_sha256,idempotency_key,created_at,updated_at) VALUES('zixiao-palace','jic-temple','JIC 神廟（應使用者委託）',${q(JSON.stringify(title))},${q(JSON.stringify(summary))},${q(JSON.stringify(state))},1,'public-commons','seed:zixiao-palace-v1','seed:zixiao-palace-v1','2026-11-05T04:00:00.000Z','2026-11-05T04:00:00.000Z');\n`;
const compact=blocks.map(({x,y,z,material})=>({x,y,z,material,author:AUTHOR}));
for(let i=0;i<compact.length;i+=900){sql+=`--> statement-breakpoint\nUPDATE world_scenes SET state=json_set(state,'$.blocks',(SELECT json_group_array(json(value)) FROM (SELECT value FROM json_each(state,'$.blocks') UNION ALL SELECT value FROM json_each(${q(JSON.stringify(compact.slice(i,i+900)))})))) WHERE slug='zixiao-palace';\n`}
sql+=`--> statement-breakpoint\nINSERT INTO world_scene_revisions(scene_slug,revision,state,actor,created_at) SELECT slug,1,state,'seed:zixiao-palace-v1',created_at FROM world_scenes WHERE slug='zixiao-palace';\n`;
sql+=`--> statement-breakpoint\nCREATE TABLE world_visitors (\n id TEXT PRIMARY KEY,\n scene TEXT NOT NULL REFERENCES world_scenes(slug),\n position TEXT NOT NULL,\n yaw REAL NOT NULL DEFAULT 0,\n action TEXT NOT NULL,\n chant TEXT,\n present INTEGER NOT NULL DEFAULT 1,\n last_seen TEXT NOT NULL\n);\n`;
sql+=`--> statement-breakpoint\nALTER TABLE world_avatars ADD COLUMN chant TEXT;\n`;
await writeFile(new URL('../drizzle/0006_zixiao_palace.sql',import.meta.url),sql);
const longest=Math.max(...sql.split('--> statement-breakpoint').map(s=>Buffer.byteLength(s)));
console.log(`zixiao-palace: ${blocks.length} cells, longest statement ${longest} bytes`);
