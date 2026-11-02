// Level layout and scenery: sky, parallax layers, terrain, lava and the throne room.
import {W,H,G,TAU,ARENA_X,ARENA_END,clamp,hash,mix,oval,tri} from "./core";
import type {Plat,Enemy} from "./core";

// ---------------------------------------------------------------- Level data

const ground=(x0:number,x1:number):Plat=>({kind:"ground",x:x0,y:G,w:x1-x0,h:40});
const float=(x:number,y:number,w:number):Plat=>({kind:"float",x,y,w,h:22});
// Moving platform oscillating around (ox, oy) by `range` along x (mx) or y (my).
const mover=(ox:number,oy:number,w:number,mx:number,my:number,range:number,speed:number):Plat=>
 ({kind:"move",x:ox,y:oy,w,h:16,ox,oy,mx,my,range,speed,dx:0,dy:0});

export const platforms:Plat[]=[
 // Floor, with gaps and lava pits between segments.
 ground(0,900),ground(1010,1700),ground(1810,2600),ground(3100,3800),ground(3920,4600),
 ground(5200,5900),ground(6020,6600),ground(6800,7150),ground(7400,ARENA_END+240),
 // Sunny Meadow.
 float(300,410,150),float(560,330,140),float(1100,400,150),float(1350,320,130),float(1560,250,120),
 float(1950,390,150),float(2200,320,140),
 // Whispering Forest.
 mover(2720,420,110,1,0,80,.025),float(2930,380,110),
 float(3250,420,120),float(3420,350,120),float(3590,280,120),float(3760,210,110),
 float(4200,190,130),float(4400,170,130),
 // Sunset Canyon.
 mover(4640,420,100,0,1,60,.03),float(4800,370,100),mover(5000,400,100,1,0,70,.03),
 float(5350,410,130),float(5550,330,130),float(5750,260,110),
 // Burning Castle.
 float(6665,420,70),float(7000,380,110),mover(7240,420,90,1,0,60,.03),
];

export const lavaPits=[{x:6600,w:200},{x:7150,w:250}];
export const springs=[{x:1640},{x:4130}];
// Power mushrooms, standing on the ground or on floating islands.
export const mushroomData=[
 {x:700,y:G},{x:1620,y:250},{x:3815,y:210},{x:4265,y:190},{x:5805,y:260},{x:6300,y:G},{x:7055,y:380},
];
export const checkpoints=[2250,4350,6100];
export const zones=[
 {x:0,name:"Sunny Meadow"},{x:2400,name:"Whispering Forest"},{x:4500,name:"Sunset Canyon"},
 {x:6000,name:"Burning Castle"},{x:ARENA_X,name:"Throne Room"},
];

const row=(x:number,y:number,n:number,dx=30)=>Array.from({length:n},(_,i)=>({x:x+i*dx,y}));
const arc=(xc:number,y:number,n:number)=>Array.from({length:n},(_,i)=>({x:xc+(i-(n-1)/2)*26,y:y-Math.sin(Math.PI*i/(n-1))*55}));
export const coinsData=[
 ...row(320,370,4),...row(580,290,4),...arc(955,410,5),...row(1120,360,4),...row(1370,280,3),
 ...row(1575,210,3),...arc(1755,410,5),...row(1970,350,4),...row(2220,280,4),
 ...row(2950,340,3),...row(3270,380,3),...row(3440,310,3),...row(3610,240,3),...row(3775,170,3),
 ...row(4215,150,4,28),...row(4415,130,4,28),
 ...row(4815,330,3,28),...row(5365,370,4),...row(5565,290,4),...row(5765,220,3),...arc(5960,410,5),
 ...row(6250,450,5),...row(7015,340,4,28),...row(7480,450,5),
];

const walker=(kind:"pawn"|"spiky",x:number,min:number,max:number,floor=G,vx=-1.1):Enemy=>
 ({kind,x,y:floor-27,vx:kind==="spiky"?vx*.8:vx,vy:0,min,max,ox:x,oy:floor-27,alive:true,squash:0,t:0});
const bat=(x:number,y:number,range:number):Enemy=>
 ({kind:"bat",x,y,vx:0,vy:0,min:range,max:0,ox:x,oy:y,alive:true,squash:0,t:Math.floor(hash(x)*600)});
const bubble=(x:number,phase:number):Enemy=>
 ({kind:"bubble",x,y:G+20,vx:0,vy:0,min:0,max:0,ox:phase,oy:G+20,alive:true,squash:0,t:0});

export const enemyData:Enemy[]=[
 walker("pawn",500,300,870),walker("pawn",1250,1020,1670),walker("pawn",1380,1350,1450,320),
 walker("pawn",2050,1830,2570),walker("pawn",2350,1830,2570,G,1.1),
 bat(2850,300,90),walker("pawn",3300,3110,3770),walker("spiky",3550,3110,3770),bat(3500,240,120),
 walker("pawn",4000,3930,4570),walker("pawn",4450,3930,4570,G,1.1),
 bat(4900,290,100),walker("spiky",5300,5210,5870),walker("pawn",5500,5210,5870),
 walker("pawn",5560,5550,5650,330),walker("spiky",5800,5210,5870),bat(5650,210,80),
 walker("spiky",6300,6030,6570),walker("pawn",6450,6030,6570),walker("spiky",6950,6810,7120),
 walker("pawn",7550,7410,7650),
 bubble(6640,0),bubble(6760,70),bubble(7220,30),bubble(7340,100),
];

// ---------------------------------------------------------------- Sky and parallax

type Pal={top:string;bot:string;sun:string;far:string;mid:string;near:string;cloud:string};
const PAL:[number,Pal][]=[
 [0,{top:"#3d9df5",bot:"#c4ecff",sun:"#fff3b0",far:"#8fb8e0",mid:"#58b368",near:"#3a9150",cloud:"#ffffff"}],
 [2400,{top:"#2f8fd0",bot:"#c4f0de",sun:"#fff3b0",far:"#6fa6a0",mid:"#2c7f55",near:"#1d5e3c",cloud:"#f4fff9"}],
 [4500,{top:"#ff6b6b",bot:"#ffd28a",sun:"#ffe08a",far:"#c96a6a",mid:"#a24a3c",near:"#6e3328",cloud:"#ffd6c0"}],
 [6200,{top:"#120a25",bot:"#5e1a2f",sun:"#ff9a6a",far:"#2e2140",mid:"#1f1530",near:"#120c1c",cloud:"#3a2a4a"}],
];

// Colours blend over the 800px before each new zone.
function palette(x:number):Pal{
 for(let i=0;i<PAL.length-1;i++){
  const [x1,b]=PAL[i+1];
  if(x<x1){
   const k=clamp((x-(x1-800))/800,0,1),a=PAL[i][1];
   if(k===0)return a;
   const out={} as Pal;
   for(const key of Object.keys(a) as (keyof Pal)[])out[key]=mix(a[key],b[key],k);
   return out;
  }
 }
 return PAL[PAL.length-1][1];
}

const ridgeY=(X:number,base:number,amp:number,seed:number)=>
 base-(Math.sin(X*.0031+seed)*amp+Math.sin(X*.0083+seed*2)*amp*.45+Math.sin(X*.019+seed*3)*amp*.15);

function ridge(ctx:CanvasRenderingContext2D,cam:number,f:number,base:number,amp:number,seed:number,fill:string|CanvasGradient){
 ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(0,H);
 for(let sx=0;sx<=W+16;sx+=16)ctx.lineTo(sx,ridgeY(sx+cam*f,base,amp,seed));
 ctx.lineTo(W,H);ctx.closePath();ctx.fill();
}

function cloud(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,col:string,night:number){
 oval(ctx,x+40*s,y+15*s,50*s,13*s,mix(col,"#000000",.15+night*.2));
 for(const [dx,dy,r] of [[0,10,20],[24,0,28],[54,4,24],[78,12,16]])oval(ctx,x+dx*s,y+dy*s,r*s,r*s,col);
 oval(ctx,x+28*s,y-8*s,15*s,8*s,"rgba(255,255,255,.35)");
}

function tree(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,kind:number,col:string){
 const dark=mix(col,"#000000",.3);
 if(kind===0){
  ctx.fillStyle=dark;ctx.fillRect(x-2*s,y-18*s,4*s,18*s);
  oval(ctx,x,y-26*s,14*s,13*s,col);oval(ctx,x-8*s,y-20*s,9*s,8*s,col);oval(ctx,x+8*s,y-20*s,9*s,8*s,col);
  oval(ctx,x-4*s,y-31*s,6*s,4*s,"rgba(255,255,255,.12)");
 }else if(kind===1){
  ctx.fillStyle=dark;ctx.fillRect(x-2*s,y-10*s,4*s,10*s);
  for(let i=0;i<3;i++)tri(ctx,[x-(16-i*4)*s,y-(8+i*12)*s,x,y-(30+i*12)*s,x+(16-i*4)*s,y-(8+i*12)*s],col);
 }else if(kind===2){
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-13*s,y);ctx.lineTo(x-9*s,y-42*s);ctx.lineTo(x+7*s,y-48*s);ctx.lineTo(x+13*s,y);ctx.fill();
  ctx.fillStyle="rgba(255,200,150,.12)";ctx.fillRect(x-8*s,y-40*s,4*s,40*s);
 }else{
  ctx.strokeStyle=col;ctx.lineWidth=3*s;ctx.lineCap="round";ctx.beginPath();
  ctx.moveTo(x,y);ctx.lineTo(x,y-30*s);ctx.moveTo(x,y-18*s);ctx.lineTo(x-10*s,y-28*s);
  ctx.moveTo(x,y-24*s);ctx.lineTo(x+9*s,y-36*s);ctx.stroke();ctx.lineCap="butt";
 }
}

// Distant castle that rises on the horizon as the hero nears the end.
function castleSilhouette(ctx:CanvasRenderingContext2D,cam:number,t:number,a:number){
 const sx=560+(7600-cam)*.3;
 if(sx>W+200||a<=0)return;
 ctx.save();ctx.globalAlpha=a;ctx.fillStyle="#0c0716";
 for(const [x,y,w] of [[sx-160,200,50],[sx+110,180,50],[sx-110,240,220],[sx-30,130,60]]){
  ctx.fillRect(x,y,w,H-y);
  for(let bx=x;bx<x+w;bx+=12)ctx.fillRect(bx,y-8,7,8);
 }
 tri(ctx,[sx-36,130,sx,80,sx+36,130],"#0c0716");
 ctx.strokeStyle="#0c0716";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,80);ctx.lineTo(sx,58);ctx.stroke();
 tri(ctx,[sx,58,sx+18+Math.sin(t*4)*3,63,sx,68],"#8e1426");
 for(const [x,y] of [[sx-140,240],[sx+130,220],[sx-14,170],[sx+6,200],[sx-70,280],[sx+50,280]]){
  ctx.fillStyle=`rgba(255,${170+Math.sin(t*3+x)*30|0},70,${.7+.3*Math.sin(t*5+y)})`;
  ctx.fillRect(x,y,8,12);
 }
 ctx.restore();
}

export function drawBackground(ctx:CanvasRenderingContext2D,cam:number,t:number,lightning:number,lightX:number){
 const cx=cam+W/2,P=palette(cx);
 const night=clamp((cx-5600)/800,0,1),dusk=clamp((cx-3700)/800,0,1)*(1-night);
 const sky=ctx.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,P.top);sky.addColorStop(.75,P.bot);
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

 if(night>0){
  for(let i=0;i<70;i++){
   ctx.fillStyle=`rgba(255,255,255,${night*(.3+.6*Math.abs(Math.sin(t*1.5+i)))})`;
   ctx.fillRect(hash(i)*W,hash(i+99)*280,1.6,1.6);
  }
 }

 // Sun, sinking into a sunset and replaced by a blood moon at night.
 const sy=95+dusk*150;
 const sg=ctx.createRadialGradient(760,sy,10,760,sy,170);
 sg.addColorStop(0,P.sun);sg.addColorStop(1,"rgba(255,255,255,0)");
 ctx.globalAlpha=.55;oval(ctx,760,sy,170,170,sg);ctx.globalAlpha=1;
 if(night>.5){
  oval(ctx,760,sy,30,30,"#ffb48a");
  oval(ctx,750,sy-8,6,5,"rgba(160,60,40,.35)");oval(ctx,770,sy+6,8,6,"rgba(160,60,40,.3)");
 }else oval(ctx,760,sy,34,34,P.sun);

 for(let i=0;i<7;i++){
  const X=i*230+t*6-cam*.06;
  const x=((X%1610)+1610)%1610-200;
  cloud(ctx,x,50+hash(i)*120,.7+hash(i+3)*.6,P.cloud,night);
 }

 if(lightning>0){
  ctx.fillStyle=`rgba(230,220,255,${lightning/12*.55})`;ctx.fillRect(0,0,W,H);
  if(lightning>6){
   ctx.strokeStyle="#f4f0ff";ctx.lineWidth=3;ctx.beginPath();
   let bx=lightX;ctx.moveTo(bx,0);
   for(let y=30;y<320;y+=30){bx+=(hash(lightX+y)-.5)*60;ctx.lineTo(bx,y);}
   ctx.stroke();
  }
 }

 const fg=ctx.createLinearGradient(0,150,0,H);
 fg.addColorStop(0,mix(P.far,"#ffffff",.25));fg.addColorStop(1,P.far);
 ridge(ctx,cam,.15,330,70,0,fg);
 castleSilhouette(ctx,cam,t,night);

 // Hills with trees.
 const zone=cx<2400?0:cx<4500?1:cx<6200?2:3;
 ridge(ctx,cam,.35,385,40,1,P.mid);
 const treeCol=mix(P.mid,"#000000",.22);
 const start=Math.floor(cam*.35/60)-1;
 for(let k=start;k<start+W/60+3;k++){
  if(hash(k)<.45)continue;
  const X=k*60+hash(k+1)*30;
  tree(ctx,X-cam*.35,ridgeY(X,385,40,1)+4,.7+hash(k+2)*.6,zone,treeCol);
 }
 ridge(ctx,cam,.6,462,16,4,P.near);

 const hz=ctx.createLinearGradient(0,360,0,H);
 hz.addColorStop(0,"rgba(255,255,255,0)");hz.addColorStop(1,mix(P.bot,"#000000",.1).replace("rgb","rgba").replace(")",",.35)"));
 ctx.fillStyle=hz;ctx.fillRect(0,360,W,H-360);
}

// Floating pollen by day, rising embers near the castle (screen space).
export function drawAmbient(ctx:CanvasRenderingContext2D,cam:number,t:number){
 const cx=cam+W/2;
 if(cx>5800){
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=0;i<36;i++){
   const sp=20+hash(i)*40;
   const y=H-((t*sp+hash(i+1)*H)%(H+20));
   const x=((hash(i+2)*W*1.5-cam*.3+Math.sin(t+i)*20)%W+W)%W;
   oval(ctx,x,y,1.7,1.7,`rgba(255,${120+hash(i+3)*100|0},40,${.45+.4*Math.sin(t*5+i)})`);
  }
  ctx.restore();
 }else{
  for(let i=0;i<26;i++){
   const x=((hash(i)*W*1.4-cam*(.4+hash(i+4)*.4)+t*10)%W+W)%W;
   const y=80+hash(i+1)*360+Math.sin(t*1.3+i*2)*14;
   oval(ctx,x,y,2,2,`rgba(255,255,210,${.25+.35*Math.abs(Math.sin(t*1.7+i))})`);
  }
 }
}

export function drawVignette(ctx:CanvasRenderingContext2D){
 const v=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);
 v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.45)");
 ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}

// ---------------------------------------------------------------- Terrain

type PatKey="dirt"|"sand"|"brick"|"wall";
const pats:Partial<Record<PatKey,CanvasPattern|null>>={};
function pat(ctx:CanvasRenderingContext2D,key:PatKey):CanvasPattern|string{
 if(pats[key]===undefined){
  const c=document.createElement("canvas"),w=64,h=key==="brick"||key==="wall"?32:64;
  c.width=w;c.height=h;
  const x=c.getContext("2d")!;
  if(key==="dirt"||key==="sand"){
   const d=key==="dirt";
   x.fillStyle=d?"#8b4f27":"#c8743f";x.fillRect(0,0,w,h);
   for(let i=0;i<40;i++){
    x.fillStyle=hash(i*9.1)>.5?(d?"#6f3c1c":"#a85d30"):(d?"#a8693a":"#dc8d55");
    x.beginPath();x.ellipse(hash(i*3.1)*w,hash(i*7.7)*h,1+hash(i*1.3)*3,(1+hash(i*1.3)*3)*.7,0,0,TAU);x.fill();
   }
   if(!d){
    x.strokeStyle="rgba(120,50,20,.35)";x.lineWidth=2;
    for(const yy of [14,38,54]){x.beginPath();x.moveTo(0,yy);x.bezierCurveTo(20,yy-4,44,yy+4,64,yy);x.stroke();}
   }
  }else{
   const b=key==="brick";
   x.fillStyle=b?"#2a2433":"#191420";x.fillRect(0,0,w,h);
   for(let r=0;r<2;r++)for(let k=-1;k<3;k++){
    const bx=k*32+(r?16:0),by=r*16;
    x.fillStyle=b?"#4a4258":"#2b2436";x.fillRect(bx+1,by+1,30,14);
    x.fillStyle=b?"#5d5470":"#372f45";x.fillRect(bx+1,by+1,30,2);
   }
  }
  pats[key]=ctx.createPattern(c,"repeat");
 }
 return pats[key]??"#555";
}

type Style="grass"|"sand"|"stone";
const styleAt=(x:number):Style=>x>=6000?"stone":x>=4400?"sand":"grass";

function topCap(ctx:CanvasRenderingContext2D,x0:number,x1:number,y:number,style:Style){
 if(style==="grass"){
  const gg=ctx.createLinearGradient(0,y-4,0,y+12);
  gg.addColorStop(0,"#8be35f");gg.addColorStop(1,"#38a047");
  ctx.fillStyle=gg;ctx.fillRect(x0,y-3,x1-x0,13);
  ctx.fillStyle="#38a047";
  for(let sx=Math.floor(x0/14)*14;sx<x1;sx+=14){ctx.beginPath();ctx.arc(Math.max(x0+7,Math.min(x1-7,sx+7)),y+10,7,0,Math.PI);ctx.fill();}
  for(let sx=Math.ceil(x0/6)*6;sx<x1-4;sx+=6){const h=3+hash(sx)*6;tri(ctx,[sx,y-2,sx+2,y-2-h,sx+4,y-2],"#9cf06e");}
  for(let sx=Math.ceil(x0/40)*40;sx<x1-10;sx+=40){
   if(hash(sx*.7)<.75)continue;
   const fx=sx+hash(sx)*30,col=["#fff","#ffd23f","#ff7fb4"][Math.floor(hash(sx+1)*3)];
   ctx.strokeStyle="#2f8a3a";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(fx,y);ctx.lineTo(fx,y-6);ctx.stroke();
   for(let k=0;k<5;k++)oval(ctx,fx+Math.cos(k*1.26)*3,y-8+Math.sin(k*1.26)*3,2,2,col);
   oval(ctx,fx,y-8,1.6,1.6,"#ffb000");
  }
 }else if(style==="sand"){
  const gg=ctx.createLinearGradient(0,y-4,0,y+10);
  gg.addColorStop(0,"#f8c97f");gg.addColorStop(1,"#d98a45");
  ctx.fillStyle=gg;ctx.fillRect(x0,y-3,x1-x0,11);
  for(let sx=Math.ceil(x0/22)*22;sx<x1-4;sx+=22)oval(ctx,sx+hash(sx)*10,y+1,2.5,1.5,"#b8682f");
 }else{
  ctx.fillStyle="#6f6488";ctx.fillRect(x0,y-3,x1-x0,9);
  ctx.fillStyle="#9286b0";ctx.fillRect(x0,y-3,x1-x0,2);
  ctx.fillStyle="rgba(0,0,0,.35)";
  for(let sx=Math.ceil(x0/48)*48;sx<x1;sx+=48)ctx.fillRect(sx,y-3,2,9);
 }
}

function shade(ctx:CanvasRenderingContext2D,y0:number,y1:number,a:number){
 const sh=ctx.createLinearGradient(0,y0,0,y1);
 sh.addColorStop(0,"rgba(0,0,0,0)");sh.addColorStop(1,`rgba(0,0,0,${a})`);
 return sh;
}

export function drawPlatform(ctx:CanvasRenderingContext2D,pl:Plat,t:number,cam:number){
 const style=styleAt(pl.x);
 if(pl.kind==="move"){
  const {x,y,w}=pl,metal=style==="stone";
  oval(ctx,x+w/2,y+28,w*.4,4,"rgba(0,0,0,.18)");
  const g=ctx.createLinearGradient(0,y,0,y+16);
  g.addColorStop(0,metal?"#a7a2bd":"#e0a462");g.addColorStop(1,metal?"#5d5873":"#8a5a2c");
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,w,16,5);ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,.3)";ctx.lineWidth=1.5;
  for(let px=x+22;px<x+w-6;px+=22){ctx.beginPath();ctx.moveTo(px,y+2);ctx.lineTo(px,y+14);ctx.stroke();}
  for(const rx of [x+6,x+w-6])oval(ctx,rx,y+8,2.5,2.5,"#ffd23f");
  const c=`rgba(255,255,200,${.5+.4*Math.sin(t*6)})`,m=x+w/2;
  if(pl.mx){tri(ctx,[m-16,y+8,m-10,y+4,m-10,y+12],c);tri(ctx,[m+16,y+8,m+10,y+4,m+10,y+12],c);}
  else{tri(ctx,[m-5,y+6,m,y+2,m+5,y+6],c);tri(ctx,[m-5,y+10,m,y+14,m+5,y+10],c);}
  return;
 }
 if(pl.kind==="ground"){
  const x0=Math.max(pl.x,cam-30),x1=Math.min(pl.x+pl.w,cam+W+30);
  if(x1<=x0)return;
  ctx.fillStyle=pat(ctx,style==="stone"?"brick":style==="sand"?"sand":"dirt");
  ctx.fillRect(x0,pl.y,x1-x0,H-pl.y+20);
  ctx.fillStyle=shade(ctx,pl.y,H,.5);ctx.fillRect(x0,pl.y,x1-x0,H-pl.y+20);
  topCap(ctx,x0,x1,pl.y,style);
  ctx.fillStyle="rgba(0,0,0,.3)";
  if(pl.x>=x0-1)ctx.fillRect(pl.x,pl.y+8,7,H-pl.y);
  if(pl.x+pl.w<=x1+1)ctx.fillRect(pl.x+pl.w-7,pl.y+8,7,H-pl.y);
  return;
 }
 const {x,y,w}=pl;
 if(style==="stone"){
  ctx.fillStyle=pat(ctx,"brick");ctx.fillRect(x,y,w,pl.h+6);
  ctx.fillStyle=shade(ctx,y,y+pl.h+6,.45);ctx.fillRect(x,y,w,pl.h+6);
  topCap(ctx,x,x+w,y,style);
  return;
 }
 // Floating island with a rounded earthy underside.
 ctx.beginPath();ctx.moveTo(x,y+4);ctx.lineTo(x+w,y+4);
 ctx.quadraticCurveTo(x+w-4,y+30,x+w*.65,y+42);ctx.quadraticCurveTo(x+w/2,y+52,x+w*.35,y+42);
 ctx.quadraticCurveTo(x+4,y+30,x,y+4);ctx.closePath();
 ctx.fillStyle=pat(ctx,style==="sand"?"sand":"dirt");ctx.fill();
 ctx.fillStyle=shade(ctx,y,y+52,.55);ctx.fill();
 if(style==="grass"){
  ctx.strokeStyle="#2f7d3a";ctx.lineWidth=2;
  for(let i=0;i<3;i++){
   const rx=x+w*(.28+i*.22),len=12+hash(x+i)*16,sw=Math.sin(t*1.5+i+x)*2;
   ctx.beginPath();ctx.moveTo(rx,y+34);ctx.quadraticCurveTo(rx+sw,y+34+len/2,rx-sw,y+34+len);ctx.stroke();
   oval(ctx,rx-sw,y+35+len,3,2,"#4caf50");
  }
 }
 topCap(ctx,x,x+w,y,style);
}

export function drawLava(ctx:CanvasRenderingContext2D,pit:{x:number;w:number},t:number){
 const top=G+10;
 ctx.save();ctx.globalCompositeOperation="lighter";
 const gl=ctx.createLinearGradient(0,top-140,0,top);
 gl.addColorStop(0,"rgba(255,90,0,0)");gl.addColorStop(1,"rgba(255,90,0,.35)");
 ctx.fillStyle=gl;ctx.fillRect(pit.x-30,top-140,pit.w+60,140);
 ctx.restore();
 const lg=ctx.createLinearGradient(0,top,0,H);
 lg.addColorStop(0,"#fff07a");lg.addColorStop(.12,"#ff9a00");lg.addColorStop(.5,"#d2300a");lg.addColorStop(1,"#5a0a05");
 ctx.fillStyle=lg;ctx.beginPath();ctx.moveTo(pit.x,H);
 for(let x=pit.x;x<=pit.x+pit.w;x+=8)ctx.lineTo(x,top+Math.sin(x*.08+t*3)*3+Math.sin(x*.03-t*2)*2);
 ctx.lineTo(pit.x+pit.w,H);ctx.closePath();ctx.fill();
 ctx.strokeStyle="rgba(255,255,200,.5)";ctx.lineWidth=2;
 for(let i=0;i<3;i++){
  const x=pit.x+((hash(pit.x+i)*pit.w+t*20*(i%2?1:-1))%pit.w+pit.w)%pit.w;
  ctx.beginPath();ctx.moveTo(x,top+14+i*6);ctx.lineTo(x+18,top+15+i*6);ctx.stroke();
 }
 for(let i=0;i<4;i++){
  const ph=(t*.7+hash(pit.x+i))%1,x=pit.x+10+hash(pit.x*3+i)*(pit.w-20);
  ctx.strokeStyle=`rgba(255,240,160,${1-ph})`;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,top+4-ph*3,2+ph*5,Math.PI,TAU);ctx.stroke();
 }
}

// ---------------------------------------------------------------- Throne room

export function flame(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,s:number){
 const f=Math.sin(t*20+x)*2;
 oval(ctx,x,y-10*s,7*s,13*s+f,"#ff6a00");
 oval(ctx,x,y-8*s,5*s,9*s+f*.6,"#ffb21f");
 oval(ctx,x,y-6*s,2.5*s,5*s,"#fff3b0");
}

function banner(ctx:CanvasRenderingContext2D,x:number,y:number,t:number){
 const sw=Math.sin(t*1.5+x)*3;
 ctx.fillStyle="#e8b923";ctx.fillRect(x-22,y-4,44,5);
 ctx.fillStyle="#8e1426";ctx.beginPath();
 ctx.moveTo(x-17,y);ctx.lineTo(x+17,y);ctx.lineTo(x+17+sw,y+120);ctx.lineTo(x+sw,y+106);ctx.lineTo(x-17+sw,y+120);
 ctx.closePath();ctx.fill();ctx.strokeStyle="#e8b923";ctx.lineWidth=2;ctx.stroke();
 tri(ctx,[x-9+sw*.5,y+70,x+sw*.5,y+36,x+9+sw*.5,y+70],"#e8b923");
 tri(ctx,[x-4+sw*.5,y+68,x+sw*.5,y+52,x+4+sw*.5,y+68],"#8e1426");
}

function torch(ctx:CanvasRenderingContext2D,x:number,y:number,t:number){
 ctx.fillStyle="#3a3040";ctx.fillRect(x-4,y,8,22);
 tri(ctx,[x-10,y,x+10,y,x+5,y+10,x-5,y+10],"#55486a");
 ctx.save();ctx.globalCompositeOperation="lighter";
 const r=110+Math.sin(t*13+x)*8;
 const gl=ctx.createRadialGradient(x,y-10,4,x,y-10,r);
 gl.addColorStop(0,"rgba(255,160,60,.45)");gl.addColorStop(1,"rgba(255,120,40,0)");
 oval(ctx,x,y-10,r,r,gl);
 ctx.restore();
 flame(ctx,x,y-2,t,1);
}

export function drawArenaBack(ctx:CanvasRenderingContext2D,t:number,lightning:number){
 const L=ARENA_X-60,R=ARENA_END+240;
 ctx.fillStyle=pat(ctx,"wall");ctx.fillRect(L,0,R-L,G);
 const dg=ctx.createLinearGradient(0,0,0,G);
 dg.addColorStop(0,"rgba(0,0,0,.65)");dg.addColorStop(.6,"rgba(0,0,0,.2)");dg.addColorStop(1,"rgba(60,0,0,.35)");
 ctx.fillStyle=dg;ctx.fillRect(L,0,R-L,G);

 // Gothic windows onto the storm.
 for(const wx of [ARENA_X+140,ARENA_X+380,ARENA_X+620]){
  const path=()=>{ctx.beginPath();ctx.moveTo(wx-42,250);ctx.lineTo(wx-42,118);ctx.arc(wx,118,42,Math.PI,0);ctx.lineTo(wx+42,250);ctx.closePath();};
  ctx.save();path();
  const sg=ctx.createLinearGradient(0,76,0,250);
  sg.addColorStop(0,"#1a0d2e");sg.addColorStop(1,"#7a1f2f");
  ctx.fillStyle=sg;ctx.fill();
  if(lightning>0){ctx.fillStyle=`rgba(235,225,255,${lightning/12})`;ctx.fill();}
  ctx.clip();
  ctx.strokeStyle="rgba(200,200,255,.22)";ctx.lineWidth=1;
  for(let i=0;i<14;i++){
   const rx=wx-50+((i*17+t*160)%100),ry=76+((i*37+t*420)%180);
   ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-6,ry+16);ctx.stroke();
  }
  ctx.restore();
  path();ctx.strokeStyle="#16111f";ctx.lineWidth=8;ctx.stroke();
  ctx.lineWidth=3;ctx.beginPath();
  for(const bx of [wx-21,wx,wx+21]){ctx.moveTo(bx,78);ctx.lineTo(bx,250);}
  ctx.moveTo(wx-42,170);ctx.lineTo(wx+42,170);ctx.stroke();
  ctx.fillStyle="#4a4258";ctx.fillRect(wx-52,248,104,10);
 }

 for(const px of [ARENA_X+20,ARENA_X+260,ARENA_X+500,ARENA_X+740]){
  const pg=ctx.createLinearGradient(px,0,px+44,0);
  pg.addColorStop(0,"#2a2436");pg.addColorStop(.5,"#5a5070");pg.addColorStop(1,"#2a2436");
  ctx.fillStyle=pg;ctx.fillRect(px,30,44,G-30);
  ctx.fillStyle="#3c3450";ctx.fillRect(px-8,30,60,18);ctx.fillRect(px-8,G-24,60,24);
  banner(ctx,px+22,62,t);
  torch(ctx,px+22,266,t);
 }

 ctx.fillStyle="#120e1a";ctx.fillRect(L,0,R-L,30);
 ctx.fillStyle="#3a3248";ctx.fillRect(L,28,R-L,4);
}

// Entrance portcullis (gate 0 = open, 1 = slammed shut) and the far wall.
export function drawArenaFront(ctx:CanvasRenderingContext2D,gate:number){
 const gx=ARENA_X-60;
 ctx.fillStyle=pat(ctx,"brick");ctx.fillRect(gx,0,60,G-150);
 ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(gx,0,60,G-150);
 ctx.fillStyle="#5d5470";ctx.fillRect(gx-6,G-160,72,12);
 const bottom=G-150+gate*150;
 if(gate>0){
  ctx.strokeStyle="#2e2c36";ctx.lineWidth=5;ctx.beginPath();
  for(let bx=gx+6;bx<gx+60;bx+=12){ctx.moveTo(bx,G-150);ctx.lineTo(bx,bottom);}
  for(let by=G-138;by<bottom;by+=30){ctx.moveTo(gx,by);ctx.lineTo(gx+60,by);}
  ctx.stroke();
  ctx.strokeStyle="#77748a";ctx.lineWidth=1.5;ctx.beginPath();
  for(let bx=gx+6;bx<gx+60;bx+=12){ctx.moveTo(bx-1.5,G-150);ctx.lineTo(bx-1.5,bottom);}
  ctx.stroke();
  for(let bx=gx+6;bx<gx+60;bx+=12)tri(ctx,[bx-4,bottom,bx,bottom+9,bx+4,bottom],"#2e2c36");
 }
 ctx.fillStyle=pat(ctx,"brick");ctx.fillRect(ARENA_END,0,260,H);
 const eg=ctx.createLinearGradient(ARENA_END,0,ARENA_END+40,0);
 eg.addColorStop(0,"rgba(0,0,0,.6)");eg.addColorStop(1,"rgba(0,0,0,.2)");
 ctx.fillStyle=eg;ctx.fillRect(ARENA_END,0,260,H);
}
