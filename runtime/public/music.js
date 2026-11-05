// 仙樂: procedural Daoist-style ambience. No recordings. Pentatonic qin plucks, drone, chime; woodblock while chanting.
(()=>{
const L={'zh-Hant':['仙樂：關','仙樂：開'],'zh-Hans':['仙乐：关','仙乐：开'],en:['Music: off','Music: on']};
const SCALE=[146.83,164.81,185,220,246.94];// D gong mode: 宮商角徵羽
let ctx=null,out=null,on=false,timer=0,next=0,phrase=0,step=2,lastBowl=0,lastKnock=0,want=false;
try{want=localStorage.getItem('jictemple.music')==='on'}catch{}
const api=window.JICMusic={chanting:false,toggle(){set(!on)}};
function note(i){const o=Math.floor(i/5),k=((i%5)+5)%5;return SCALE[k]*2**o}
function reverb(){const n=ctx.sampleRate*3.2,b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n)**2.6}const r=ctx.createConvolver();r.buffer=b;return r}
function init(){ctx=new (window.AudioContext||window.webkitAudioContext)();out=ctx.createGain();out.gain.value=0;const dry=ctx.createGain(),wet=ctx.createGain(),r=reverb();dry.gain.value=.55;wet.gain.value=.45;out.connect(dry).connect(ctx.destination);out.connect(r).connect(wet).connect(ctx.destination);
 for(const [f,g] of [[73.42,.05],[110,.025],[146.83,.012]]){const o=ctx.createOscillator(),a=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();o.type='sine';o.frequency.value=f;a.gain.value=g;l.frequency.value=.05+Math.random()*.05;lg.gain.value=g*.6;l.connect(lg).connect(a.gain);o.connect(a).connect(out);o.start();l.start()}}
function pluck(t,f,v=.16){const a=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(f*7,t);lp.frequency.exponentialRampToValueAtTime(f*1.6,t+1.8);a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(v,t+.008);a.gain.exponentialRampToValueAtTime(.0001,t+3.4);lp.connect(a).connect(out);
 for(const [m,type,g] of [[1,'triangle',1],[2,'sine',.35],[3,'sine',.12]]){const o=ctx.createOscillator(),og=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f*m*1.012,t);o.frequency.exponentialRampToValueAtTime(f*m,t+.12);if(Math.random()<.3){o.frequency.setValueAtTime(f*m,t+.9);o.frequency.linearRampToValueAtTime(f*m*1.02,t+1.3);o.frequency.linearRampToValueAtTime(f*m,t+1.7)}og.gain.value=g;o.connect(og).connect(lp);o.start(t);o.stop(t+3.5)}}
function bowl(t){for(const [m,g,d] of [[1,.07,7],[2.76,.03,5],[5.4,.012,3]]){const o=ctx.createOscillator(),a=ctx.createGain();o.frequency.value=293.66*m/2;a.gain.setValueAtTime(g,t);a.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(a).connect(out);o.start(t);o.stop(t+d+.1)}}
function knock(t){const o=ctx.createOscillator(),a=ctx.createGain();o.frequency.setValueAtTime(520,t);o.frequency.exponentialRampToValueAtTime(380,t+.08);a.gain.setValueAtTime(.12,t);a.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(a).connect(out);o.start(t);o.stop(t+.16)}
function tick(){const now=ctx.currentTime,until=now+.4;if(next<now)next=now+.1;
 if(api.chanting){if(lastKnock<now)lastKnock=now+.05;while(lastKnock<until){knock(lastKnock);lastKnock+=.65}}
 if(now-lastBowl>24+Math.random()*20){lastBowl=now;bowl(now+.1)}
 while(next<until){if(phrase<=0){phrase=5+Math.floor(Math.random()*5);next+=2.5+Math.random()*3;continue}
  step=Math.max(0,Math.min(12,step+[-2,-1,-1,0,1,1,2][Math.floor(Math.random()*7)]));const f=note(step);pluck(next,f);if(Math.random()<.18)pluck(next+.04,f/2,.08);
  phrase--;next+=[.7,.9,1.2,1.6][Math.floor(Math.random()*4)]}}
function label(){const b=document.getElementById('music');if(!b)return;const l=L[document.documentElement.lang]||L['zh-Hant'];b.textContent=l[on?1:0];b.setAttribute('aria-pressed',on)}
function set(v){on=v;try{localStorage.setItem('jictemple.music',on?'on':'off')}catch{}
 try{if(on){if(!ctx)init();ctx.resume();next=Math.max(next,ctx.currentTime+.2);out.gain.cancelScheduledValues(ctx.currentTime);out.gain.linearRampToValueAtTime(.9,ctx.currentTime+2);clearInterval(timer);timer=setInterval(tick,200)}
 else if(ctx){out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setValueAtTime(out.gain.value,ctx.currentTime);out.gain.linearRampToValueAtTime(0,ctx.currentTime+.8);clearInterval(timer);setTimeout(()=>{if(!on)ctx.suspend()},900)}}catch{on=false}label()}
function ready(){const b=document.getElementById('music');if(b)b.onclick=()=>set(!on);label();new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 if(want)addEventListener('pointerdown',()=>{if(!on)set(true)},{once:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',ready):ready();
document.addEventListener('visibilitychange',()=>{if(ctx&&on)document.hidden?ctx.suspend():ctx.resume()});
})();
