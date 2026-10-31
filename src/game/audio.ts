// Synthesized sound effects, music and Princess Peach's voice (Web Audio + Speech Synthesis).

let actx:AudioContext|null=null,master:GainNode|null=null,noiseBuf:AudioBuffer|null=null,muted=false;
const VOL=.7;

export function unlockAudio(){
 try{
  if(!actx){
   actx=new AudioContext();
   master=actx.createGain();master.gain.value=muted?0:VOL;
   master.connect(actx.createDynamicsCompressor()).connect(actx.destination);
   noiseBuf=actx.createBuffer(1,actx.sampleRate,actx.sampleRate);
   const d=noiseBuf.getChannelData(0);
   for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
   window.setInterval(schedule,25);
  }
  if(actx.state==="suspended")void actx.resume();
  if("speechSynthesis" in window)speechSynthesis.getVoices();
 }catch{/* audio unavailable */}
}

export function toggleMute(){
 muted=!muted;
 if(master)master.gain.value=muted?0:VOL;
 if(muted&&"speechSynthesis" in window)speechSynthesis.cancel();
 return muted;
}

const mtof=(m:number)=>440*Math.pow(2,(m-69)/12);
const now=()=>actx?actx.currentTime:0;

function note(at:number,f:number,dur:number,type:OscillatorType,vol:number,to=f,filter=0){
 if(!actx||!master)return;
 const o=actx.createOscillator(),g=actx.createGain();
 o.type=type;o.frequency.setValueAtTime(f,at);
 if(to!==f)o.frequency.exponentialRampToValueAtTime(to,at+dur);
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+.008);
 g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 let src:AudioNode=o;
 if(filter){const lp=actx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=filter;o.connect(lp);src=lp;}
 src.connect(g).connect(master);o.start(at);o.stop(at+dur+.05);
}

function noise(at:number,dur:number,vol:number,type:BiquadFilterType,freq:number,to=freq){
 if(!actx||!master||!noiseBuf)return;
 const s=actx.createBufferSource(),f=actx.createBiquadFilter(),g=actx.createGain();
 s.buffer=noiseBuf;s.loop=true;
 f.type=type;f.frequency.setValueAtTime(freq,at);
 if(to!==freq)f.frequency.exponentialRampToValueAtTime(to,at+dur);
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+.01);
 g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 s.connect(f).connect(g).connect(master);s.start(at);s.stop(at+dur+.05);
}

const kick=(t:number)=>note(t,150,.2,"sine",.55,40);
const snare=(t:number)=>{noise(t,.14,.28,"highpass",1500);note(t,190,.09,"triangle",.15,120);};
const hat=(t:number)=>noise(t,.04,.08,"highpass",7000);
const tom=(t:number)=>note(t,95,.35,"sine",.5,48);

const SFX={
 coin:()=>{const t=now();note(t,988,.07,"square",.06);note(t+.07,1319,.3,"square",.06);},
 jump:()=>note(now(),330,.15,"square",.035,700),
 squish:()=>{const t=now();note(t,420,.09,"square",.07,110);note(t+.08,660,.12,"square",.05,1320);},
 spring:()=>note(now(),160,.35,"square",.06,900),
 check:()=>{const t=now();[660,880,1320].forEach((f,i)=>note(t+i*.08,f,.25,"square",.05));},
 oneup:()=>{const t=now();[660,784,1047,1319].forEach((f,i)=>note(t+i*.09,f,.2,"square",.05));},
 hurt:()=>note(now(),700,.45,"square",.06,140),
 fire:()=>{const t=now();noise(t,.45,.25,"bandpass",1400,300);note(t,320,.35,"sawtooth",.06,90);},
 meteor:()=>{const t=now();noise(t,.5,.3,"lowpass",1200,100);note(t,90,.4,"sine",.3,40);},
 quake:()=>{const t=now();note(t,70,.6,"sine",.6,30);noise(t,.5,.35,"lowpass",300,80);},
 rumble:()=>noise(now(),1.2,.35,"lowpass",160,60),
 slam:()=>{const t=now();noise(t,.5,.5,"lowpass",700,90);note(t,65,.5,"square",.2,30);},
 thunder:()=>{const t=now();noise(t,.12,.6,"highpass",2500);noise(t+.05,2,.7,"lowpass",900,50);},
 boom:()=>{const t=now();note(t,55,1.2,"sawtooth",.4,28,400);noise(t,1,.6,"lowpass",600,50);kick(t);},
 brass:()=>{const t=now();for(const m of [28,40,47,52])note(t,mtof(m),2.2,"sawtooth",.13,mtof(m),900);note(t,110,1,"sine",.6,55);},
 roar:()=>{const t=now();noise(t,1.5,.55,"bandpass",600,140);note(t,95,1.5,"sawtooth",.28,45,700);note(t,101,1.5,"sawtooth",.22,48,700);},
 hit:()=>{const t=now();note(t,130,.3,"square",.22,45);noise(t,.25,.45,"lowpass",2500,200);note(t,880,.12,"square",.07,440);},
 clang:()=>{const t=now();note(t,1200,.3,"triangle",.12,1100);note(t,1830,.25,"square",.04);},
 shell:()=>note(now(),420,.14,"square",.06,180),
};
export type SfxName=keyof typeof SFX;
export function sfx(n:SfxName){if(actx?.state==="running"&&!muted)SFX[n]();}

// ---- Music sequencer: 32 eighth-note steps per track. ----
type Track={bpm:number;lead:number[];bass:number[];drums:string;loop:boolean;
  leadType:OscillatorType;bassType:OscillatorType;leadVol:number;bassVol:number;
  leadLen?:number;bassLen?:number;leadFilter?:number;bassFilter?:number;stabs?:boolean};

const bars=(roots:number[],pat:(r:number)=>number[])=>roots.flatMap(pat);

const TRACKS={
 // Bright adventure theme.
 level:{bpm:150,loop:true,leadType:"square",bassType:"triangle",leadVol:.045,bassVol:.2,
  lead:[72,0,76,79,84,79,76,0,81,0,79,76,77,76,74,0,77,0,81,84,81,77,74,77,79,0,74,79,83,0,86,0],
  bass:bars([48,45,41,43],r=>[r,r+12,r+7,r+12,r,r+12,r+7,r+12]),drums:"khshkksh".repeat(4)},
 // Eerie approach to the castle.
 castle:{bpm:92,loop:true,leadType:"triangle",bassType:"sawtooth",leadVol:.08,bassVol:.1,leadLen:2.5,bassFilter:600,
  lead:[69,0,0,72,71,0,68,0,69,0,0,76,75,0,0,0,74,0,0,72,71,0,68,0,69,0,0,0,64,0,0,0],
  bass:bars([33,33,29,28],r=>[r,0,0,0,r,0,r+12,0]),drums:"t...t.t.".repeat(4)},
 // Ominous drone and heartbeat for King Koopa's entrance.
 intro:{bpm:70,loop:true,leadType:"sawtooth",bassType:"sawtooth",leadVol:.035,bassVol:.22,leadLen:7.5,bassLen:7.6,leadFilter:900,bassFilter:300,
  lead:bars([64,65,64,63],r=>[r,0,0,0,0,0,0,0]),bass:bars([28,28,29,28],r=>[r,0,0,0,0,0,0,0]),drums:"t.t.....".repeat(4)},
 // Driving battle theme; speeds up as Koopa gets angrier.
 boss:{bpm:168,loop:true,leadType:"square",bassType:"sawtooth",leadVol:.05,bassVol:.14,bassFilter:1100,stabs:true,
  lead:[76,0,75,76,79,0,77,76,74,0,76,77,76,75,74,71,76,0,75,76,79,81,82,0,83,82,81,79,77,76,75,76],
  bass:[40,40,52,40,41,40,52,40,40,40,52,40,43,41,40,38,40,40,52,40,41,40,52,40,40,40,52,40,47,46,45,44],
  drums:"xhShxkSh".repeat(4)},
 // Victory fanfare (plays once).
 victory:{bpm:132,loop:false,leadType:"square",bassType:"triangle",leadVol:.06,bassVol:.22,leadLen:1.8,bassLen:3,
  lead:[67,72,76,79,84,0,79,0,80,0,84,0,87,0,0,0,82,0,86,0,89,0,0,0,88,88,88,0,91,0,0,0],
  bass:[48,0,0,0,48,0,0,0,44,0,0,0,44,0,0,0,46,0,0,0,46,0,0,0,48,0,48,0,48,0,0,0],
  drums:"k...k...k...k...k...k...kSkSk..."},
} satisfies Record<string,Track>;
export type TrackName=keyof typeof TRACKS;

let track:Track|null=null,current:TrackName|null=null,step=0,nextAt=0,rate=1;

export function playMusic(name:TrackName|null){
 if(name===current)return;
 current=name;track=name?TRACKS[name]:null;step=0;
 nextAt=now()+.08;
}
export function setMusicRate(r:number){rate=r;}

function drum(d:string,t:number){
 if(d==="k"||d==="x")kick(t);
 if(d==="s"||d==="S")snare(t);
 if(d==="h"||d==="x"||d==="S")hat(t);
 if(d==="t")tom(t);
}

function schedule(){
 if(!actx||!track)return;
 const spb=60/(track.bpm*rate)/2;
 if(nextAt<actx.currentTime-.25)nextAt=actx.currentTime+.05;
 while(nextAt<actx.currentTime+.15){
  const n=track.lead.length;
  if(!track.loop&&step>=n){track=null;current=null;return;}
  const i=step%n,b=track.bass[i],l=track.lead[i];
  if(b)note(nextAt,mtof(b),spb*(track.bassLen??.9),track.bassType,track.bassVol,mtof(b),track.bassFilter??1200);
  if(l)note(nextAt,mtof(l),spb*(track.leadLen??1.4),track.leadType,track.leadVol,mtof(l),track.leadFilter??0);
  if(track.stabs&&i%8===0)for(const m of [52,59,64])note(nextAt,mtof(m),spb*1.5,"sawtooth",.045,mtof(m),2200);
  drum(track.drums[i]??".",nextAt);
  nextAt+=spb;step++;
 }
}

// ---- Princess Peach's voice. ----
function pickVoice(){
 const vs=speechSynthesis.getVoices();
 return vs.find(v=>v.lang.startsWith("en")&&/samantha|victoria|karen|zira|female|susan|tessa|moira|fiona|aria|jenny/i.test(v.name))
  ??vs.find(v=>v.lang.startsWith("en"))??null;
}

// High-pitched, hurried speech so her cries sound frantic.
export function speak(text:string,pitch=2,speed=1.15){
 if(muted||!("speechSynthesis" in window))return;
 const u=new SpeechSynthesisUtterance(text);
 u.pitch=pitch;u.rate=speed;u.volume=1;
 const v=pickVoice();if(v)u.voice=v;
 speechSynthesis.cancel();speechSynthesis.speak(u);
}

// Little shaky sobs after she cries out.
export function sob(){
 if(!actx||muted)return;
 const t=now()+1.1;
 for(let i=0;i<4;i++)note(t+i*.18,760-i*45,.15,"triangle",.07,560-i*45);
}
