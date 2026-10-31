import { useEffect, useRef, useState } from "react";
import {W,H,G,PW,PH,ARENA_X,ARENA_END,ARENA_CAM,WORLD,BOSS_MIN,BOSS_MAX,BOSS_HP,CAGE_X,CAGE_Y,PEACH_MEET,
  clamp,oval,tri,heart} from "./game/core";
import type {Game,Rect,Status} from "./game/core";
import {drawHero,drawPeach,drawKoopa,drawKoopaShell,drawCoin,drawPeachHands,drawShot,drawFx,drawEnemy,
  drawCage,drawSpring,drawCheckpoint} from "./game/sprites";
import {platforms,lavaPits,coinsData,enemyData,springs,checkpoints,zones,drawBackground,drawPlatform,
  drawLava,drawArenaBack,drawArenaFront,drawAmbient,drawVignette} from "./game/world";
import {unlockAudio,sfx,playMusic,setMusicRate,speak,sob,toggleMute} from "./game/audio";

const HELP_LINES=["Help! Help!","Help me! Please, help!","Hero! Help! Help me!","Somebody, help me!"];
const BOSS_LINES=["Help! Help me!","Hurry, hero! Help!","Be careful!","Please save me!"];
const HIT_WORDS=["POW!","BAM!","WHAM!","CRUNCH!","SMASH!"];

function makeGame(status:Status):Game{
 return {
  p:{x:80,y:G-PH,vx:0,vy:0,ground:true,face:1,kb:0,plat:null,coyote:0},
  enemies:enemyData.map(e=>({...e})),
  coins:new Set(),score:0,coinCount:0,lives:5,camera:0,
  check:80,checks:new Set(),springT:springs.map(()=>0),
  boss:{x:ARENA_X+420,y:-400,vx:0,vy:0,hp:BOSS_HP,active:false,flash:0,state:"enter",timer:0,face:-1,volley:0,phase:1,bounces:0,spin:0},
  shots:[],fx:[],
  shake:0,flash:0,freeze:0,slow:0,slowTick:0,zoom:1,dark:0,bars:0,red:0,titleT:0,bannerText:"",bannerT:0,
  gate:0,peachX:CAGE_X,cageY:CAGE_Y,door:0,endT:0,hug:0,introT:0,
  shoutT:0,shoutText:"",cryCd:0,zone:0,zoneT:0,lightning:0,lightX:0,
  jumpBuf:0,invul:0,status,frame:0
 };
}

function overlap(a:Rect,b:Rect){
 return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}

function burst(g:Game,x:number,y:number,colors:string[],n:number,speed:number){
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2+Math.random()*.4,s=speed*(.6+Math.random()*.6);
  g.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:30+Math.random()*15|0,max:45,
   kind:"spark",color:colors[i%colors.length],size:4+Math.random()*3});
 }
}

function dust(g:Game,x:number,y:number,n:number){
 for(let i=0;i<n;i++)
  g.fx.push({x:x+(Math.random()-.5)*30,y:y-6,vx:(Math.random()-.5)*2,vy:-Math.random()*1.2,
   life:30,max:30,kind:"smoke",color:"#d9c7a8",size:6+Math.random()*4});
}

function text(g:Game,x:number,y:number,s:string,color:string,size:number,life=50){
 g.fx.push({x,y,vx:0,vy:-1,life,max:life,kind:"text",color,size,text:s});
}

function stepFx(g:Game){
 for(const f of g.fx){
  f.x+=f.vx;f.y+=f.vy;
  if(f.kind==="spark"||f.kind==="coin")f.vy+=.15;
  if(f.kind==="debris")f.vy+=.35;
  if(f.kind==="smoke"||f.kind==="flame"){f.vy*=.96;f.vx*=.96;}
  if(f.kind==="heart")f.x+=Math.sin(f.life*.2)*.4;
  f.life--;
 }
 g.fx=g.fx.filter(f=>f.life>0);
}

function movePlatforms(g:Game){
 for(const pl of platforms){
  if(pl.kind!=="move")continue;
  const s=Math.sin(g.frame*(pl.speed??0))*(pl.range??0);
  const nx=(pl.ox??pl.x)+(pl.mx?s:0),ny=(pl.oy??pl.y)+(pl.my?s:0);
  pl.dx=nx-pl.x;pl.dy=ny-pl.y;pl.x=nx;pl.y=ny;
 }
}

// Princess Peach cries out (spoken aloud, with sobs and a subtitle).
function say(g:Game,line:string,happy=false){
 g.shoutText=line;g.shoutT=170;g.cryCd=Math.max(g.cryCd,300);
 if(happy)speak(line,1.5,1);
 else{speak(line);sob();}
}

function hurt(g:Game,from?:number,fell=false){
 if(g.invul>0&&!fell)return;
 const p=g.p;
 g.lives--;sfx("hurt");g.shake=Math.max(g.shake,10);g.red=.6;
 burst(g,p.x+PW/2,p.y+PH/2,["#fff","#ff6b6b"],10,3);
 if(g.lives<=0){g.status="gameover";playMusic(null);return;}
 if(from!==undefined&&!fell){
  // Knocked back, but keep playing from here.
  p.kb=22;p.vx=(Math.sign(p.x+PW/2-from)||-1)*6;p.vy=-8;p.ground=false;
  if(g.status==="boss"&&Math.random()<.5)say(g,"Oh no! Be careful!");
 }else{
  p.x=g.status==="boss"?ARENA_X+40:g.check;
  p.y=G-PH;p.vx=0;p.vy=0;p.kb=0;
  g.camera=clamp(p.x-360,0,ARENA_CAM);
 }
 g.invul=110;
}

// ---------------------------------------------------------------- King Koopa

function startAttack(g:Game,st:"windup"|"jump"|"rain"|"charge"|"shell"){
 const b=g.boss,pc=g.p.x+PW/2,bc=b.x+60;
 b.state=st;b.volley=0;b.vx=0;
 if(st==="windup")b.timer=b.phase===3?30:42;
 if(st==="jump"){b.vy=-12-b.phase*.4;b.vx=clamp((pc-bc)/45,-4,4);sfx("jump");}
 if(st==="rain")b.timer=70;
 if(st==="charge")b.timer=36-b.phase*5;
 if(st==="shell"){b.timer=30;b.bounces=3;b.face=pc<bc?-1:1;}
}

// Attack pattern. Phase 1: fire, leaps, charges. Phase 2 adds meteor rain and
// mixed high/low fire volleys. Phase 3 adds the spinning shell and gets faster.
function bossAI(g:Game){
 const b=g.boss,p=g.p,pc=p.x+PW/2,bc=b.x+60,ph=b.phase;
 b.timer--;
 const mouth=()=>({x:bc+b.face*70,y:b.y-6});
 switch(b.state){
  case "walk":{
   b.face=pc<bc?-1:1;
   b.vx=Math.abs(pc-bc)>50?b.face*(1.1+ph*.35):0;
   if(b.timer<=0){
    const r=Math.random();
    startAttack(g,ph===1?(r<.4?"windup":r<.75?"jump":"charge")
     :ph===2?(r<.3?"windup":r<.55?"jump":r<.78?"rain":"charge")
     :(r<.25?"windup":r<.45?"jump":r<.65?"rain":r<.85?"shell":"charge"));
   }
   break;
  }
  case "windup":
   if(b.timer<=0){
    const high=ph>=2&&b.volley%2===1;
    g.shots.push({x:bc+b.face*72,y:high?G-66:G-82,vx:b.face*(4.4+ph*.5),vy:high?0:2.4,kind:"fire",life:260,delay:0,high});
    sfx("fire");
    b.volley++;
    if(b.volley<ph)b.timer=ph===3?16:22;
    else{b.volley=0;b.state="rest";b.timer=40-ph*6;}
   }
   break;
  case "rain":{
   const m=mouth();
   if(b.timer>30)g.fx.push({x:m.x,y:m.y,vx:b.face*1.5+(Math.random()-.5),vy:-4-Math.random()*3,life:30,max:30,kind:"flame",color:"",size:9});
   if(b.timer===30){
    sfx("roar");g.shake=12;
    const n=4+ph*2;
    for(let i=0;i<n;i++){
     const x=i===0?pc:ARENA_X+40+Math.random()*(ARENA_END-ARENA_X-80);
     g.shots.push({x,y:-40,vx:0,vy:0,kind:"meteor",life:1,delay:40+i*14,high:false});
    }
   }
   if(b.timer<=0){b.state="rest";b.timer=50;}
   break;
  }
  case "charge":
   b.vx=0;
   if(b.timer%6===0)dust(g,bc-b.face*30,G,2);
   if(b.timer<=0){b.state="dash";b.timer=70;b.vx=b.face*(5.5+ph*.8);}
   break;
  case "dash":
   if(b.timer%4===0)dust(g,bc-b.face*40,G,1);
   if(b.timer<=0||b.x<=BOSS_MIN||b.x>=BOSS_MAX){
    b.state="rest";b.timer=45;b.vx=0;g.shake=12;sfx("quake");
    for(let i=0;i<8;i++)g.fx.push({x:ARENA_X+Math.random()*(ARENA_END-ARENA_X),y:32,vx:0,vy:Math.random()*2,life:60,max:60,kind:"debris",color:"#6b6080",size:4+Math.random()*4});
   }
   break;
  case "jump":
   b.vy+=.5;b.y+=b.vy;
   if(b.y>=G-74){
    b.y=G-74;b.vy=0;b.vx=0;b.state="rest";b.timer=45;g.shake=18;sfx("quake");
    for(const d of [-1,1])g.shots.push({x:bc+d*60,y:G-14,vx:d*(4.2+ph*.4),vy:0,kind:"wave",life:120,delay:0,high:false});
    dust(g,bc-40,G,4);dust(g,bc+40,G,4);
   }
   break;
  case "shell":
   if(b.vx===0&&b.timer<=0){b.vx=b.face*(8+ph*.5);sfx("shell");}
   b.spin+=b.vx*.07;
   if(b.vx!==0&&((b.x<=BOSS_MIN&&b.vx<0)||(b.x>=BOSS_MAX&&b.vx>0))){
    b.vx*=-1;b.bounces--;g.shake=9;sfx("clang");
    burst(g,b.vx>0?BOSS_MIN:BOSS_MAX+120,G-40,["#fff","#ffd23f"],8,3);
    if(b.bounces<=0){b.state="rest";b.timer=60;b.vx=0;b.face=pc<bc?-1:1;}
   }
   break;
  case "stagger":
   b.vx*=.88;
   if(b.timer<=0){b.state="walk";b.timer=40;b.vx=0;}
   break;
  case "roar":{
   b.vx=0;
   const m=mouth();
   if(b.timer>30)g.fx.push({x:m.x,y:m.y,vx:b.face*(2+Math.random()*2),vy:-2.5-Math.random()*2,life:32,max:32,kind:"flame",color:"",size:10});
   if(b.timer===40)for(const d of [-1,1])g.shots.push({x:bc+d*60,y:G-14,vx:d*5,vy:0,kind:"wave",life:120,delay:0,high:false});
   if(b.timer<=0){b.state="walk";b.timer=40;}
   break;
  }
  case "rest":
   b.vx=0;
   if(b.timer<=0){b.state="walk";b.timer=Math.max(40,100-ph*20);}
   break;
  case "enter":break;
 }
 if(b.state!=="jump"&&b.y<G-74){b.vy+=.6;b.y=Math.min(G-74,b.y+b.vy);}
 b.x=clamp(b.x+b.vx,BOSS_MIN,BOSS_MAX);
 if(ph>=2&&g.frame%4===0)
  g.fx.push({x:bc+(Math.random()-.5)*90,y:b.y+30,vx:0,vy:-1.6,life:28,max:28,kind:"flame",color:"",size:7});
}

function finalBlow(g:Game){
 const b=g.boss,pc=g.p.x+PW/2,bc=b.x+60;
 b.hp=0;b.vx=Math.sign(bc-pc)||1;
 g.status="ending";g.endT=0;g.shots=[];g.slow=100;g.zoom=1.3;g.flash=1;g.shake=30;
 sfx("boom");sfx("roar");playMusic(null);
 burst(g,bc,b.y,["#fff","#ffe066","#ff8a1f","#ff3b3b"],30,7);
}

function damageBoss(g:Game,jumpHeld:boolean,top:number){
 const b=g.boss,p=g.p,pc=p.x+PW/2,bc=b.x+60;
 b.hp--;b.flash=30;g.freeze=7;g.shake=16;g.flash=.55;g.score+=100;
 sfx("hit");
 burst(g,pc,top,["#fff","#ffe066","#ff8a1f","#ff3b3b"],18,5);
 g.fx.push({x:pc,y:top,vx:0,vy:0,life:22,max:22,kind:"ring",color:"#fff",size:60});
 text(g,pc,top-30,HIT_WORDS[Math.floor(Math.random()*HIT_WORDS.length)],"#ffe066",34,45);
 p.y=top-PH-1;p.vy=jumpHeld?-13:-11;p.ground=false;
 if(b.hp<=0){finalBlow(g);return;}
 if(b.hp===4||b.hp===2){
  // Phase change: he roars and gets angrier.
  b.phase++;b.state="roar";b.timer=90;b.vx=0;b.vy=0;
  g.red=1;g.shake=25;sfx("roar");
  g.bannerText=b.phase===2?"KING KOOPA IS ENRAGED!":"FINAL FURY!";g.bannerT=130;
  setMusicRate(1+(b.phase-1)*.1);
  say(g,b.phase===2?"Hurry, hero! Help!":"Help! Please, help me!");
 }else{
  b.state="stagger";b.timer=30;b.vx=(Math.sign(bc-pc)||1)*4;
 }
}

// ---------------------------------------------------------------- HUD

function drawShout(ctx:CanvasRenderingContext2D,x:number,y:number,s:string,t:number){
 ctx.save();
 ctx.font="900 17px system-ui";
 const w=ctx.measureText(s).width+40,h=40;
 ctx.translate(x+Math.sin(t*50)*1.5,y+Math.cos(t*43)*1.5);
 tri(ctx,[8,h/2-6,26,h/2+20,22,h/2-8],"#fff");
 ctx.beginPath();
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,r=i%2?1:1.16;ctx.lineTo(Math.cos(a)*w/2*r,Math.sin(a)*h/2*r);}
 ctx.closePath();ctx.fillStyle="#fff";ctx.fill();
 ctx.strokeStyle="#e0245e";ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle="#e0245e";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(s,0,1);
 ctx.restore();
}

function centerText(ctx:CanvasRenderingContext2D,s:string,y:number,size:number,k:number,c1:string,c2:string){
 const a=Math.min(1,k/8);
 const sc=k<10?2-k/10:1;
 ctx.save();ctx.globalAlpha=a;ctx.translate(W/2,y);ctx.scale(sc,sc);
 ctx.font=`900 ${size}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";
 const g=ctx.createLinearGradient(0,-size/2,0,size/2);g.addColorStop(0,c1);g.addColorStop(1,c2);
 ctx.lineWidth=size/6;ctx.strokeStyle="#1a0505";ctx.strokeText(s,0,0);
 ctx.fillStyle=g;ctx.fillText(s,0,0);
 ctx.restore();
}

function drawHUD(ctx:CanvasRenderingContext2D,g:Game,t:number,progress:boolean){
 ctx.save();
 ctx.fillStyle="rgba(10,12,30,.55)";ctx.beginPath();ctx.roundRect(14,12,300,62,14);ctx.fill();
 ctx.strokeStyle="rgba(255,255,255,.15)";ctx.lineWidth=1.5;ctx.stroke();
 const slots=Math.max(5,g.lives);
 for(let i=0;i<Math.min(slots,9);i++)heart(ctx,34+i*24,20,18,i<g.lives?"#ff4f6d":"rgba(255,255,255,.18)");
 ctx.save();ctx.translate(36,56);ctx.scale(.55,.55);drawCoin(ctx,0,0,t*3,t);ctx.restore();
 ctx.fillStyle="#fff";ctx.font="800 17px system-ui";ctx.textAlign="left";
 ctx.fillText(`× ${g.coinCount}`,52,62);
 ctx.fillText(`SCORE ${String(g.score).padStart(6,"0")}`,140,62);

 if(!progress){ctx.restore();return;}
 // Journey progress bar.
 const x0=556,x1=836,y=34;
 ctx.fillStyle="rgba(10,12,30,.55)";ctx.beginPath();ctx.roundRect(x0-16,14,x1-x0+44,40,12);ctx.fill();
 ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=4;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();
 const px=x0+(g.p.x/WORLD)*(x1-x0);
 ctx.strokeStyle="#ffd23f";ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(px,y);ctx.stroke();ctx.lineCap="butt";
 for(const c of checkpoints)oval(ctx,x0+c/WORLD*(x1-x0),y,3.5,3.5,g.checks.has(c)?"#2ecc71":"#888");
 ctx.fillStyle="#6b5a8a";ctx.fillRect(x1+2,y-12,14,14);
 for(const bx of [x1+2,x1+7,x1+12])ctx.fillRect(bx,y-15,3,3);
 oval(ctx,px,y,7,7,"#ef3b3b");oval(ctx,px,y-2,4,2,"#fff");
 ctx.restore();
}

function drawBossBar(ctx:CanvasRenderingContext2D,g:Game){
 const b=g.boss,x=420,y=46;
 const j=b.flash>0?(Math.random()-.5)*5:0;
 ctx.save();ctx.translate(j,j);
 ctx.fillStyle="rgba(10,5,15,.78)";ctx.beginPath();ctx.roundRect(x-12,y-28,468,56,12);ctx.fill();
 ctx.strokeStyle=b.phase===3?"#ff3b3b":"rgba(255,140,60,.6)";ctx.lineWidth=2;ctx.stroke();
 const ng=ctx.createLinearGradient(0,y-24,0,y-6);
 ng.addColorStop(0,"#ffe066");ng.addColorStop(1,"#ff5a1f");
 ctx.font="900 18px system-ui";ctx.textAlign="left";ctx.fillStyle=ng;ctx.fillText("KING KOOPA",x,y-8);
 ctx.font="800 13px system-ui";ctx.textAlign="right";ctx.fillStyle=b.phase===3?"#ff6b6b":"#ffd1a8";
 ctx.fillText(["","PHASE I","PHASE II — ENRAGED","PHASE III — FINAL FURY"][b.phase],x+444,y-9);
 for(let i=0;i<BOSS_HP;i++){
  const sx=x+i*74;
  ctx.fillStyle="#2a1a20";ctx.beginPath();ctx.roundRect(sx,y,70,14,4);ctx.fill();
  if(i<b.hp){
   const hg=ctx.createLinearGradient(0,y,0,y+14);
   hg.addColorStop(0,"#ffb070");hg.addColorStop(1,"#d61f1f");
   ctx.fillStyle=hg;ctx.beginPath();ctx.roundRect(sx+2,y+2,66,10,3);ctx.fill();
  }
 }
 ctx.restore();
}

// Off-screen alert pointing toward Peach while she cries for help.
function drawPeachAlert(ctx:CanvasRenderingContext2D,t:number){
 drawShout(ctx,W-150,160,"HELP! HELP!",t);
 const x=W-48,y=212,p=Math.sin(t*10)*3;
 oval(ctx,x,y,15,15,"#ffd23f");oval(ctx,x,y+2,11,11,"#ffe3d0");
 tri(ctx,[x-8,y-11,x-8,y-19,x-3,y-14,x,y-21,x+3,y-14,x+8,y-19,x+8,y-11],"#ffc400");
 oval(ctx,x-4,y+1,1.8,2.4,"#2b5fd9");oval(ctx,x+4,y+1,1.8,2.4,"#2b5fd9");
 oval(ctx,x-4,y+6+((t*2)%1)*6,1.2,1.8,"#8fd3ff");oval(ctx,x+4,y+6+((t*2+.5)%1)*6,1.2,1.8,"#8fd3ff");
 tri(ctx,[W-22+p,y,W-32+p,y-8,W-32+p,y+8],"#ffd23f");
}

// ---------------------------------------------------------------- Component

export default function App(){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const keys=useRef<Record<string,boolean>>({});
 const game=useRef<Game>(makeGame("title"));
 const raf=useRef<number>(undefined);
 const uiRef=useRef({score:0,status:"title" as Status});
 const [ui,setUi]=useState(uiRef.current);
 const [muted,setMuted]=useState(false);

 const sync=()=>{
  const g=game.current,u=uiRef.current;
  if(u.score!==g.score||u.status!==g.status){
   uiRef.current={score:g.score,status:g.status};
   setUi(uiRef.current);
  }
 };

 const start=()=>{
  unlockAudio();
  game.current=makeGame("playing");
  setMusicRate(1);playMusic("level");
  sync();
 };

 const jumpHeld=()=>{const k=keys.current;return !!(k[" "]||k.ArrowUp||k.w||k.W||k.jump);};

 function play(g:Game){
  const p=g.p,k=keys.current;
  const left=!!(k.ArrowLeft||k.a||k.A),right=!!(k.ArrowRight||k.d||k.D);
  const held=jumpHeld();

  if(p.plat?.kind==="move"){p.x+=p.plat.dx??0;p.y+=p.plat.dy??0;}
  if(p.kb>0)p.kb--;
  else{
   const target=(right?4.6:0)-(left?4.6:0);
   p.vx+=(target-p.vx)*.3;
   if(Math.abs(p.vx)<.05)p.vx=0;
   if(right!==left)p.face=right?1:-1;
  }

  // Jump buffering and coyote time make jumps feel forgiving.
  if(g.jumpBuf>0)g.jumpBuf--;
  if(p.ground)p.coyote=7;else if(p.coyote>0)p.coyote--;
  if(g.jumpBuf>0&&p.coyote>0){
   p.vy=-14;p.ground=false;p.coyote=0;g.jumpBuf=0;
   sfx("jump");dust(g,p.x+PW/2,p.y+PH,3);
  }
  if(p.vy<-5&&!held)p.vy+=1.1;

  const prevBottom=p.y+PH,wasGround=p.ground,fallSpeed=p.vy;
  p.vy=Math.min(p.vy+.55,15);
  p.x+=p.vx;p.y+=p.vy;
  p.ground=false;p.plat=null;

  const minX=g.status==="boss"?ARENA_X+4:0;
  if(p.x<minX){p.x=minX;p.vx=Math.max(0,p.vx);}
  if(p.x>WORLD-PW){p.x=WORLD-PW;p.vx=Math.min(0,p.vx);}

  springs.forEach((s,i)=>{
   const top=G-16;
   if(p.vy>0&&p.x+PW>s.x+4&&p.x<s.x+36&&prevBottom<=top&&p.y+PH>=top){
    p.y=top-PH;p.vy=-19.5;g.springT[i]=14;sfx("spring");
    burst(g,s.x+20,top,["#fff","#ff7a85"],8,2.5);
   }
  });

  for(const r of platforms){
   if(!(p.x+PW>r.x+2&&p.x<r.x+r.w-2))continue;
   const slack=r.kind==="move"?Math.abs(r.dy??0)+1:0;
   if(p.vy>=0&&prevBottom<=r.y+slack&&p.y+PH>=r.y){p.y=r.y-PH;p.vy=0;p.ground=true;p.plat=r;}
   else if(r.kind!=="ground"&&p.vy<0&&prevBottom>=r.y+r.h&&p.y<=r.y+r.h){p.y=r.y+r.h;p.vy=0;}
  }

  if(p.ground&&!wasGround&&fallSpeed>7)dust(g,p.x+PW/2,p.y+PH,5);
  if(p.ground&&Math.abs(p.vx)>3.5&&g.frame%7===0)dust(g,p.x+PW/2-p.face*10,p.y+PH,1);

  for(const pit of lavaPits){
   const cx=p.x+PW/2;
   if(cx>pit.x&&cx<pit.x+pit.w&&p.y+PH>G+14){
    sfx("fire");
    for(let i=0;i<14;i++)g.fx.push({x:cx,y:G+10,vx:(Math.random()-.5)*4,vy:-3-Math.random()*4,life:40,max:40,kind:"flame",color:"",size:8});
    hurt(g,undefined,true);return;
   }
  }
  if(p.y>H+60){hurt(g,undefined,true);return;}

  const hero={x:p.x,y:p.y,w:PW,h:PH};

  coinsData.forEach((c,i)=>{
   if(g.coins.has(i)||!overlap(hero,{x:c.x-13,y:c.y-13,w:26,h:26}))return;
   g.coins.add(i);g.score+=10;g.coinCount++;sfx("coin");
   burst(g,c.x,c.y,["#fff6a8","#ffd23f","#ffb000","#ffffff"],14,3.5);
   g.fx.push({x:c.x,y:c.y,vx:0,vy:0,life:22,max:22,kind:"ring",color:"#ffe066",size:34});
   g.fx.push({x:c.x,y:c.y,vx:0,vy:-4,life:34,max:34,kind:"coin",color:"",size:1});
   text(g,c.x,c.y-22,"+10","#ffe066",20);
   if(g.coinCount%50===0){g.lives++;sfx("oneup");text(g,p.x+PW/2,p.y-30,"1UP!","#7dff8a",28,70);}
  });

  for(const e of g.enemies){
   if(Math.abs(e.x-p.x)>1400)continue;
   e.t++;
   if(!e.alive){if(e.squash>0)e.squash--;continue;}
   let box:Rect;
   if(e.kind==="pawn"||e.kind==="spiky"){
    e.x+=e.vx;
    if(e.x<e.min){e.x=e.min;e.vx=Math.abs(e.vx);}
    if(e.x>e.max){e.x=e.max;e.vx=-Math.abs(e.vx);}
    box={x:e.x,y:e.y,w:30,h:27};
   }else if(e.kind==="bat"){
    e.x=e.ox+Math.sin(e.t*.02)*e.min;e.y=e.oy+Math.sin(e.t*.06)*22;
    box={x:e.x-14,y:e.y-10,w:28,h:20};
   }else{
    if((e.t+e.ox)%150===0)e.vy=-12.5;
    if(e.vy!==0||e.y<e.oy){e.vy+=.32;e.y+=e.vy;if(e.y>=e.oy){e.y=e.oy;e.vy=0;}}
    box={x:e.x-11,y:e.y-11,w:22,h:22};
   }
   if(g.invul>0||!overlap(hero,box))continue;
   const stomp=p.vy>0&&prevBottom<=box.y+10;
   if(stomp&&(e.kind==="pawn"||e.kind==="bat")){
    e.alive=false;e.squash=20;
    p.y=box.y-PH-1;p.vy=held?-12:-9;g.score+=25;sfx("squish");
    burst(g,box.x+box.w/2,box.y+12,["#fff","#ffe066",e.kind==="bat"?"#9b6bd6":"#c8875a"],10,3);
    text(g,box.x+box.w/2,box.y-8,"+25","#fff",18);
   }else{
    hurt(g,box.x+box.w/2);
   }
  }

  for(const c of checkpoints){
   if(g.checks.has(c)||p.x<c)continue;
   g.checks.add(c);g.check=c;sfx("check");
   burst(g,c+4,G-110,["#ffd23f","#2ecc71","#fff"],16,4);
   text(g,c+4,G-130,"CHECKPOINT!","#7dff8a",22,70);
  }

  let z=0;
  zones.forEach((zz,i)=>{if(p.x>=zz.x)z=i;});
  if(z!==g.zone){
   g.zone=z;
   if(z<4)g.zoneT=180;
   if(z===3&&g.status==="playing")playMusic("castle");
  }

  if(g.status==="playing"&&p.x>=ARENA_X+30){
   g.status="intro";g.introT=0;g.shots=[];g.jumpBuf=0;
   playMusic(null);
   return;
  }
  if(g.status==="boss")bossFight(g,prevBottom,held,hero);
 }

 function bossFight(g:Game,prevBottom:number,held:boolean,hero:Rect){
  const b=g.boss,p=g.p;
  if(b.flash>0)b.flash--;
  bossAI(g);
  const bc=b.x+60,shell=b.state==="shell";
  const left=shell?bc-48:b.x-10,right=shell?bc+48:b.x+130,top=shell?G-76:b.y;
  const horizontal=p.x+PW>left&&p.x<right;
  if(p.vy>0&&horizontal&&prevBottom<=top+4&&p.y+PH>=top){
   if(shell){p.vy=-9;hurt(g,bc);}
   else if(b.state==="roar"){p.y=top-PH-1;p.vy=-10;sfx("clang");burst(g,p.x+PW/2,top,["#fff","#aab"],8,3);}
   else damageBoss(g,held,top);
  }else if(g.invul<=0&&horizontal&&p.y+PH>top+20&&p.y<top+74){
   hurt(g,bc);
  }

  for(const s of g.shots){
   if(s.kind==="meteor"){
    if(s.delay>0){s.delay--;if(s.delay===0){s.vy=6;sfx("meteor");}continue;}
    s.vy+=.25;s.y+=s.vy;
    if(Math.random()<.6)g.fx.push({x:s.x+(Math.random()-.5)*10,y:s.y-10,vx:0,vy:-1,life:22,max:22,kind:"flame",color:"",size:7});
    if(s.y>=G-12){
     s.life=0;g.shake=Math.max(g.shake,6);
     burst(g,s.x,G-10,["#ffe066","#ff8a1f","#ff3b1f"],12,4);dust(g,s.x,G,3);
    }
   }else{
    s.x+=s.vx;s.life--;
    if(s.kind==="fire"){
     if(!s.high)s.y=Math.min(G-22,s.y+s.vy);
     if(Math.random()<.5)
      g.fx.push({x:s.x,y:s.y,vx:-s.vx*.2+(Math.random()-.5),vy:-Math.random()*1.2,
       life:20,max:20,kind:"ember",color:"#ffb020",size:2+Math.random()*1.5});
    }
   }
   if(g.status!=="boss"||g.invul>0||s.life<=0)continue;
   const box=s.kind==="wave"?{x:s.x-10,y:G-16,w:20,h:16}:s.kind==="meteor"?{x:s.x-11,y:s.y-11,w:22,h:22}:{x:s.x-8,y:s.y-8,w:16,h:16};
   if(overlap({x:hero.x+5,y:p.y+6,w:PW-10,h:PH-6},box)){hurt(g,s.x);if(s.kind!=="wave")s.life=0;}
  }
  g.shots=g.shots.filter(s=>s.life>0&&s.x>ARENA_X-20&&s.x<ARENA_END+20);
 }

 // King Koopa's entrance: the gate slams, the castle shakes, lightning, he drops in and roars.
 function intro(g:Game){
  const p=g.p,b=g.boss,T=++g.introT;
  p.vx*=.85;p.vy=Math.min(p.vy+.55,15);p.x+=p.vx;p.y+=p.vy;
  if(p.y+PH>=G){p.y=G-PH;p.vy=0;p.ground=true;}
  p.x=Math.max(p.x,ARENA_X+4);
  if(g.gate<1){
   g.gate=Math.min(1,g.gate+.07);
   if(g.gate===1){sfx("slam");g.shake=14;dust(g,ARENA_X-30,G,6);}
  }
  g.bars=Math.min(1,g.bars+.04);
  g.dark=b.active?Math.max(.12,g.dark-.01):Math.min(.45,g.dark+.01);
  if(T===20)playMusic("intro");
  if(T===45)say(g,"Help! Help me! It's King Koopa!");
  if(T>60&&T<140){
   g.shake=Math.max(g.shake,2+(T-60)/16);
   if(T%30===0)sfx("rumble");
   if(T%3===0)g.fx.push({x:ARENA_X+Math.random()*(ARENA_END-ARENA_X),y:32,vx:0,vy:1+Math.random()*2,life:70,max:70,kind:"debris",color:"#6b6080",size:3+Math.random()*4});
  }
  if(T===140){
   g.flash=1;g.lightning=12;g.lightX=W/2;sfx("thunder");
   b.active=true;b.state="enter";b.x=ARENA_X+420;b.y=-320;b.vy=3;b.face=-1;
  }
  if(!b.active)return;
  if(b.state==="enter"){
   b.vy+=.7;b.y+=b.vy;
   if(b.y>=G-74){
    b.y=G-74;b.vy=0;b.state="roar";b.timer=130;g.shake=34;
    sfx("boom");sfx("brass");
    dust(g,b.x+20,G,10);dust(g,b.x+100,G,10);
    g.fx.push({x:b.x+60,y:G-20,vx:0,vy:0,life:30,max:30,kind:"ring",color:"#ffd9a0",size:160});
    for(let i=0;i<16;i++)g.fx.push({x:b.x+60+(Math.random()-.5)*160,y:G-10,vx:(Math.random()-.5)*8,vy:-4-Math.random()*6,life:50,max:50,kind:"debris",color:"#5d5470",size:4+Math.random()*5});
   }
  }else if(b.state==="roar"){
   b.timer--;
   b.face=p.x+PW/2<b.x+60?-1:1;
   if(b.timer===105){sfx("roar");g.red=1;g.titleT=1;g.shake=20;}
   if(b.timer<105&&b.timer>40){
    const mx=b.x+60+b.face*70;
    for(let i=0;i<2;i++)g.fx.push({x:mx,y:b.y-6,vx:b.face*(3+Math.random()*3),vy:-3-Math.random()*3,life:34,max:34,kind:"flame",color:"",size:12});
   }
   if(b.timer<=0){
    g.status="boss";b.state="walk";b.timer=60;g.cryCd=360;
    playMusic("boss");setMusicRate(1);
   }
  }
 }

 // Victory: slow-motion knockout, the cage lowers, Peach runs to the hero and they hug.
 function ending(g:Game){
  const p=g.p,b=g.boss,T=++g.endT;
  g.zoom+=(1-g.zoom)*.04;
  if(T<80&&T%6===0){
   const x=b.x+60+T*3*b.vx,y=G-40-T*7+T*T*.06;
   burst(g,x,y,["#fff","#ffb21f","#ff4b1f"],10,4);
   g.fx.push({x,y,vx:0,vy:-.5,life:40,max:40,kind:"smoke",color:"#ddd",size:14});
  }
  if(T===36){g.bannerText="VICTORY!";g.bannerT=150;playMusic("victory");}
  if(g.hug===0){
   p.vx=0;p.vy=Math.min(p.vy+.55,15);p.y+=p.vy;
   p.ground=p.y+PH>=G;
   if(p.ground){p.y=G-PH;p.vy=0;}
   if(T>100&&g.cageY<G){
    g.cageY=Math.min(G,g.cageY+2.2);
    if(g.cageY>=G){g.shake=10;sfx("slam");dust(g,CAGE_X,G,8);}
   }
   if(g.cageY>=G&&g.door<1)g.door=Math.min(1,g.door+.035);
   if(g.door>=1){
    g.peachX=Math.max(PEACH_MEET,g.peachX-1.3);
    const target=g.peachX-24,cx=p.x+PW/2;
    if(Math.abs(target-cx)>2.5){
     if(p.ground){p.vx=Math.sign(target-cx)*2.6;p.x+=p.vx;p.face=Math.sign(p.vx);}
    }else if(p.ground&&g.peachX<=PEACH_MEET){
     g.hug=1;p.face=1;
     burst(g,g.peachX-13,G-50,["#ff4f8b","#ffd23f","#fff","#7fd4ff"],28,5);
     say(g,"My hero! Thank you!",true);
    }
   }
  }else{
   g.hug++;
   p.vx=0;p.face=1;p.ground=true;
   p.x+=(g.peachX-24-PW/2-p.x)*.2;p.y=G-PH;
   if(g.hug%14===0)
    g.fx.push({x:g.peachX-13+(Math.random()-.5)*50,y:G-70,vx:0,vy:-.8,life:70,max:70,kind:"heart",
     color:["#ff4f8b","#ff7fb4","#ff2e63"][g.hug%3],size:10+Math.random()*6});
   if(g.hug===150)g.status="won";
  }
 }

 function update(){
  const g=game.current;
  if(g.status==="title"||g.status==="gameover")return;
  g.frame++;
  if(g.freeze>0){g.freeze--;return;}
  if(g.invul>0)g.invul--;
  if(g.shake>0)g.shake=Math.max(0,g.shake-1);
  g.flash=Math.max(0,g.flash-.05);g.red=Math.max(0,g.red-.015);
  if(g.zoneT>0)g.zoneT--;
  if(g.shoutT>0)g.shoutT--;
  if(g.bannerT>0)g.bannerT--;
  if(g.lightning>0)g.lightning--;
  if(g.titleT>0&&++g.titleT>210)g.titleT=0;
  g.springT=g.springT.map(v=>Math.max(0,v-1));
  if(g.status!=="intro"){g.bars=Math.max(0,g.bars-.03);g.dark=Math.max(0,g.dark-.01);}
  stepFx(g);movePlatforms(g);

  // Storm over the castle.
  if(g.camera>5700&&g.lightning<=0&&Math.random()<.004){g.lightning=12;g.lightX=100+Math.random()*(W-200);sfx("thunder");}
  for(const pit of lavaPits)
   if(pit.x+pit.w>g.camera&&pit.x<g.camera+W&&Math.random()<.25)
    g.fx.push({x:pit.x+Math.random()*pit.w,y:G+10,vx:(Math.random()-.5)*.6,vy:-1-Math.random()*1.5,life:50,max:50,kind:"ember",color:"#ffb020",size:1.5+Math.random()*1.5});

  // Peach cries for help once the castle comes into earshot.
  if((g.status==="playing"&&g.p.x>6000)||g.status==="boss"){
   if(--g.cryCd<=0){
    const lines=g.status==="boss"?BOSS_LINES:HELP_LINES;
    say(g,lines[Math.floor(Math.random()*lines.length)]);
    g.cryCd=g.status==="boss"?540:420;
   }
  }

  if(g.status==="intro")intro(g);
  else if(g.status==="ending"||g.status==="won")ending(g);
  else play(g);

  if(g.status==="playing")g.camera+=(clamp(g.p.x-360+g.p.face*40,0,ARENA_CAM)-g.camera)*.1;
  else g.camera+=(ARENA_CAM-g.camera)*.08;
 }

 const draw=(ctx:CanvasRenderingContext2D)=>{
  const g=game.current,t=performance.now()/1000,cam=g.camera,b=g.boss,p=g.p;
  ctx.save();
  if(g.zoom>1.001){ctx.translate(W/2,H*.62);ctx.scale(g.zoom,g.zoom);ctx.translate(-W/2,-H*.62);}
  if(g.shake>0)ctx.translate((Math.random()-.5)*g.shake*.7,(Math.random()-.5)*g.shake*.7);

  drawBackground(ctx,cam,t,g.lightning,g.lightX);
  const ab=ctx.createLinearGradient(0,G-20,0,H);
  ab.addColorStop(0,"rgba(8,4,16,0)");ab.addColorStop(1,"rgba(8,4,16,.95)");
  ctx.fillStyle=ab;ctx.fillRect(-40,G-20,W+80,H-G+60);

  ctx.save();
  ctx.translate(-cam,0);
  const near=(x:number,w=0)=>x+w>cam-100&&x<cam+W+100;
  if(cam>ARENA_X-W-80)drawArenaBack(ctx,t,g.lightning);
  lavaPits.forEach(pit=>{if(near(pit.x,pit.w))drawLava(ctx,pit,t);});
  platforms.forEach(pl=>{if(near(pl.x,pl.w))drawPlatform(ctx,pl,t,cam);});
  springs.forEach((s,i)=>{if(near(s.x,40))drawSpring(ctx,s.x,g.springT[i]/14);});
  checkpoints.forEach(c=>{if(near(c))drawCheckpoint(ctx,c,g.checks.has(c),t);});
  coinsData.forEach((c,i)=>{if(!g.coins.has(i)&&near(c.x))drawCoin(ctx,c.x,c.y+Math.sin(t*3+i)*3,t*3.2+i*.9,t+i*.37);});
  g.enemies.forEach(e=>{if(near(e.x,30))drawEnemy(ctx,e,t);});

  // Princess Peach in her hanging cage.
  if(near(CAGE_X-60,120)){
   const rescued=b.hp<=0;
   const mode=g.hug>0?"hug":rescued&&g.door>=1&&g.peachX>PEACH_MEET?"walk":rescued?"idle":"cry";
   drawCage(ctx,CAGE_X,g.cageY,t,g.door,"back");
   drawPeach(ctx,g.peachX,t,rescued,mode,g.peachX<CAGE_X-40?G:g.cageY-4);
   drawCage(ctx,CAGE_X,g.cageY,t,g.door,"front");
  }

  if(b.active&&b.hp>0){
   if(b.state==="shell")drawKoopaShell(ctx,b.x+60,t,b.spin,b.flash);
   else{
    const fire=b.state==="windup"?clamp(1-b.timer/42,0,1):b.state==="roar"||b.state==="rain"?1:0;
    drawKoopa(ctx,b.x+60,t,b.face,Math.abs(b.vx)>.1,b.flash,G-74-b.y,fire,b.phase-1);
   }
  }else if(b.active&&g.endT<90){
   // Knocked out: sent spinning off into the distance.
   const k=g.endT,cx=b.x+60;
   ctx.save();
   ctx.globalAlpha=Math.max(0,1-k/90);
   ctx.translate(cx+k*3*b.vx,G-40-k*7+k*k*.06);
   ctx.rotate(k*.18*b.vx);
   ctx.translate(-cx,-(G-40));
   drawKoopa(ctx,cx,t,b.face,false,0,0,1);
   ctx.restore();
  }

  g.shots.forEach(s=>drawShot(ctx,s,t));

  if(p.ground)oval(ctx,p.x+PW/2,p.y+PH-1,15,4,"rgba(0,0,0,.25)");
  ctx.globalAlpha=g.invul>0&&Math.floor(g.invul/5)%2===0?.45:1;
  drawHero(ctx,p.x+PW/2,p.y+PH,t,p.face,Math.abs(p.vx)>.3,!p.ground,g.hug>0);
  ctx.globalAlpha=1;
  if(g.hug>0)drawPeachHands(ctx,p.x+PW/2,p.y+PH);

  g.fx.forEach(f=>drawFx(ctx,f));
  if(cam>ARENA_X-W-80)drawArenaFront(ctx,g.gate);
  if(g.shoutT>0&&near(g.peachX)){
   const inCage=g.peachX>=CAGE_X-40;
   drawShout(ctx,g.peachX-40,inCage?g.cageY-140:G-110,g.shoutText.toUpperCase(),t);
  }
  ctx.restore();

  drawAmbient(ctx,cam,t);
  if(g.red>0){ctx.fillStyle=`rgba(200,20,0,${g.red*.3})`;ctx.fillRect(0,0,W,H);}
  if(g.dark>0){ctx.fillStyle=`rgba(0,0,0,${g.dark})`;ctx.fillRect(0,0,W,H);}
  ctx.restore();

  drawVignette(ctx);
  if(g.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(1,g.flash)})`;ctx.fillRect(0,0,W,H);}
  const bh=g.bars*40;
  if(bh>0){ctx.fillStyle="#000";ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh);}

  if(g.titleT>0){
   const k=g.titleT;
   ctx.save();ctx.globalAlpha=k>180?(210-k)/30:1;
   centerText(ctx,"KING KOOPA",H/2-40,72,k,"#ffe066","#ff3b1f");
   if(k>14){ctx.font="800 18px system-ui";ctx.fillStyle="#ffd1a8";ctx.textAlign="center";ctx.fillText("T Y R A N T   O F   T H E   B U R N I N G   C A S T L E",W/2,H/2+12);}
   ctx.restore();
  }
  if(g.bannerT>0){
   ctx.save();ctx.globalAlpha=Math.min(1,g.bannerT/20);
   const v=g.bannerText==="VICTORY!";
   centerText(ctx,g.bannerText,v?H/2-60:150,v?80:46,150-g.bannerT,v?"#fff59a":"#ffb0a0",v?"#ffb000":"#ff2020");
   ctx.restore();
  }
  if(g.zoneT>0&&g.status==="playing"){
   ctx.save();ctx.globalAlpha=Math.min(1,g.zoneT/30,(180-g.zoneT)/20);
   ctx.font="800 28px system-ui";ctx.textAlign="center";ctx.lineWidth=6;ctx.strokeStyle="rgba(0,0,0,.6)";
   const s=`— ${zones[g.zone].name} —`;
   ctx.strokeText(s,W/2,120);ctx.fillStyle="#fff";ctx.fillText(s,W/2,120);
   ctx.restore();
  }

  const bossBar=g.status==="boss"&&b.hp>0;
  if(g.status!=="title"&&g.bars<.5)drawHUD(ctx,g,t,!bossBar);
  if(bossBar)drawBossBar(ctx,g);
  if(g.shoutT>0&&g.status==="playing"&&CAGE_X-cam>W-20)drawPeachAlert(ctx,t);
  if(g.shoutT>0&&g.shoutText){
   ctx.save();ctx.globalAlpha=Math.min(1,g.shoutT/20);
   ctx.font="700 18px system-ui";ctx.textAlign="center";
   const s=`Princess Peach: “${g.shoutText}”`,w=ctx.measureText(s).width+30,y=bossBar?100:g.bars>.5?H-26:H-14;
   ctx.fillStyle="rgba(0,0,0,.6)";ctx.beginPath();ctx.roundRect(W/2-w/2,y-22,w,32,10);ctx.fill();
   ctx.fillStyle="#ffd1e6";ctx.fillText(s,W/2,y);
   ctx.restore();
  }
 };

 function loop(){
  const g=game.current;
  if(g.slow>0){g.slow--;g.slowTick=(g.slowTick+1)%3;if(g.slowTick===0)update();}
  else update();
  const ctx=canvasRef.current?.getContext("2d");
  if(ctx)draw(ctx);
  sync();
  raf.current=requestAnimationFrame(loop);
 }

 useEffect(()=>{
  const down=(e:KeyboardEvent)=>{
   if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," ","a","d","w"].includes(e.key))e.preventDefault();
   unlockAudio();
   if(e.key==="m"||e.key==="M"){setMuted(toggleMute());return;}
   const g=game.current;
   if(g.status==="title"&&(e.key==="Enter"||e.key===" ")){start();return;}
   keys.current[e.key]=true;
   if(!e.repeat&&(e.key===" "||e.key==="ArrowUp"||e.key==="w"||e.key==="W"))g.jumpBuf=8;
  };
  const up=(e:KeyboardEvent)=>{keys.current[e.key]=false;};
  window.addEventListener("keydown",down);
  window.addEventListener("keyup",up);
  raf.current=requestAnimationFrame(loop);
  return()=>{
   window.removeEventListener("keydown",down);
   window.removeEventListener("keyup",up);
   if(raf.current)cancelAnimationFrame(raf.current);
  };
 },[]);

 const hold=(key:string,on:boolean)=>{
  keys.current[key]=on;
  if(on){unlockAudio();if(key==="jump")game.current.jumpBuf=8;}
 };

 return <main className="page">
  <h1>🍄 React Platform Adventure — Bowser & Peach</h1>
  <p className="hint">← → / A D move · Space / ↑ / W jump (hold to jump higher) · M mute</p>

  <div className="game-wrap">
   <canvas ref={canvasRef} width={W} height={H}/>
   <button className="mute" onClick={()=>{unlockAudio();setMuted(toggleMute());}} aria-label={muted?"Unmute":"Mute"}>{muted?"🔇":"🔊"}</button>

   {ui.status==="title"&&
    <div className="overlay title">
     <h2 className="logo">The Rescue of Princess Peach</h2>
     <p className="story">King Koopa has kidnapped Princess Peach and locked her in a cage high in his Burning Castle!
      Journey through the Sunny Meadow, Whispering Forest and Sunset Canyon, survive the lava, and face the tyrant himself.</p>
     <button onClick={start}>▶ Start Adventure</button>
     <p className="small">Press Enter to start · turn your sound on 🔊</p>
    </div>}

   {ui.status==="won"&&
    <div className="overlay win">
     <h2>👸 Princess Peach Rescued!</h2>
     <p>🏆 Final Score: {ui.score}</p>
     <button onClick={start}>Play Again</button>
    </div>}

   {ui.status==="gameover"&&
    <div className="overlay">
     <h2>💥 Game Over</h2>
     <p>Score: {ui.score}</p>
     <button onClick={start}>Try Again</button>
    </div>}
  </div>

  <div className="mobile-controls">
   <button onPointerDown={()=>hold("ArrowLeft",true)} onPointerUp={()=>hold("ArrowLeft",false)} onPointerLeave={()=>hold("ArrowLeft",false)}>◀</button>
   <button onPointerDown={()=>hold("jump",true)} onPointerUp={()=>hold("jump",false)} onPointerLeave={()=>hold("jump",false)}>⬆</button>
   <button onPointerDown={()=>hold("ArrowRight",true)} onPointerUp={()=>hold("ArrowRight",false)} onPointerLeave={()=>hold("ArrowRight",false)}>▶</button>
  </div>
 </main>;
}
