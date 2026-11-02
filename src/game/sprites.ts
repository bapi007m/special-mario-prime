// Characters, enemies, pickups, projectiles and particle effects.
import {G,HERO_S,PEACH_S,TAU,oval,tri,heart,star,sparkle} from "./core";
import type {Enemy,Fx,Shot} from "./core";

// King Koopa: spiked shell, flaming mane, horns, fangs and glowing eyes.
// Drawn around (x, floor), facing right; facing=-1 mirrors it.
// lift raises him off the floor; fire (0..1) charges a fireball in his mouth;
// rage (0..2) adds a burning aura.
export function drawKoopa(ctx:CanvasRenderingContext2D,x:number,t:number,facing:number,moving:boolean,flash:number,lift=0,fire=0,rage=0){
 ctx.save();
 ctx.translate(x,G);
 oval(ctx,0,-2,74*Math.max(.4,1-lift/250),8,"rgba(0,0,0,.28)");
 ctx.translate(0,-lift);
 if(rage>0){
  ctx.save();ctx.globalCompositeOperation="lighter";
  const r=100+Math.sin(t*9)*8;
  const ag=ctx.createRadialGradient(0,-55,10,0,-55,r);
  ag.addColorStop(0,`rgba(255,90,20,${.2*rage})`);ag.addColorStop(1,"rgba(255,0,0,0)");
  oval(ctx,0,-55,r,r*.85,ag);
  ctx.restore();
 }
 ctx.scale(facing*1.12,1.12);
 if(flash>0&&Math.floor(flash/3)%2===0)ctx.globalAlpha=.45;
 const skin="#4f8f2c",dark="#2d5a18",cream="#f3d98a";
 const step=moving?Math.sin(t*10)*5:0;

 // Legs with claws.
 for(const [lx,lift] of [[-30,Math.max(0,step)],[22,Math.max(0,-step)]]){
  oval(ctx,lx,-20-lift*.5,17,15,dark);
  oval(ctx,lx+5,-6-lift,19,7,skin);
  for(let c=0;c<3;c++){
   const cx=lx+14+c*5;
   tri(ctx,[cx,-9-lift,cx+6,-4-lift,cx,-2-lift],"#fafafa");
  }
 }

 const bob=Math.sin(t*4)*2;
 ctx.translate(0,bob);

 // Spiked tail.
 tri(ctx,[-44,-34,-84,-14,-44,-14],skin);
 tri(ctx,[-62,-22,-58,-33,-54,-25],"#fafafa","#9a9a9a");
 tri(ctx,[-76,-16,-74,-26,-69,-19],"#fafafa","#9a9a9a");

 // Shell with cream rim and big spikes.
 oval(ctx,-14,-46,51,37,cream,-.15);
 const sg=ctx.createRadialGradient(-24,-60,6,-14,-46,48);
 sg.addColorStop(0,"#3f7f27");sg.addColorStop(1,"#163a0c");
 oval(ctx,-14,-46,45,31,sg,-.15);
 ctx.strokeStyle="rgba(0,0,0,.25)";ctx.lineWidth=2;
 for(const [hx,hy] of [[-30,-52],[-6,-58],[-18,-34],[6,-40]]){
  ctx.beginPath();
  for(let k=0;k<6;k++){const a=k/6*TAU;ctx.lineTo(hx+Math.cos(a)*10,hy+Math.sin(a)*8);}
  ctx.closePath();ctx.stroke();
 }
 for(let i=0;i<5;i++){
  const a=Math.PI+.35+i*.55;
  const bx=-14+Math.cos(a)*44,by=-46+Math.sin(a)*31;
  const nx=Math.cos(a),ny=Math.sin(a);
  oval(ctx,bx,by,7,7,cream);
  ctx.strokeStyle="#7a6a3a";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(bx,by,7,0,TAU);ctx.stroke();
  tri(ctx,[bx-ny*6,by+nx*6,bx+nx*20,by+ny*20,bx+ny*6,by-nx*6],"#fdfdfd","#8a8a8a");
 }

 // Armoured belly.
 ctx.save();
 oval(ctx,16,-38,22,28,cream);
 ctx.clip();
 ctx.strokeStyle="#c49a3a";ctx.lineWidth=2;
 for(let y=-58;y<-10;y+=10){ctx.beginPath();ctx.moveTo(-10,y);ctx.lineTo(40,y+2);ctx.stroke();}
 ctx.restore();

 // Arm with spiked bracelet and claws.
 ctx.lineCap="round";ctx.strokeStyle=skin;ctx.lineWidth=13;
 ctx.beginPath();ctx.moveTo(20,-52);ctx.lineTo(44,-36);ctx.stroke();
 ctx.strokeStyle="#1b1b1b";ctx.lineWidth=15;
 ctx.beginPath();ctx.moveTo(35,-42);ctx.lineTo(39,-39);ctx.stroke();
 ctx.lineCap="butt";
 tri(ctx,[33,-48,36,-56,39,-46],"#d8d8d8","#666");
 tri(ctx,[40,-44,47,-49,43,-40],"#d8d8d8","#666");
 oval(ctx,47,-34,7,7,skin);
 for(let c=0;c<3;c++)tri(ctx,[50,-39+c*4,58,-37+c*4,50,-35+c*4],"#fafafa");

 // Head.
 ctx.save();
 ctx.translate(36,-76);
 // Flaming mane.
 for(let i=0;i<9;i++){
  const a=Math.PI*.7+i*.15;
  const len=(i%2?34:46)+Math.sin(t*12+i)*5+rage*6;
  const mg=ctx.createLinearGradient(0,0,Math.cos(a)*len,Math.sin(a)*len);
  mg.addColorStop(0,"#b3131b");mg.addColorStop(1,"#ff8a1f");
  tri(ctx,[Math.cos(a-.25)*12,Math.sin(a-.25)*12-4,Math.cos(a)*len-6,Math.sin(a)*len-4,Math.cos(a+.25)*12,Math.sin(a+.25)*12-4],mg);
 }
 // Horns.
 for(const [ox,col] of [[10,"#d9c79e"],[0,"#fff4d8"]] as [number,string][]){
  ctx.beginPath();ctx.moveTo(-10+ox,-14);
  ctx.quadraticCurveTo(-24+ox,-30,-30+ox,-50);
  ctx.quadraticCurveTo(-12+ox,-36,2+ox,-18);
  ctx.closePath();ctx.fillStyle=col;ctx.fill();
  ctx.strokeStyle="#9c8152";ctx.lineWidth=1.5;ctx.stroke();
 }
 oval(ctx,2,-2,25,22,skin);
 // Open jaws with fangs and fire glow.
 const open=10+Math.sin(t*3)*4+fire*7;
 const glow=ctx.createRadialGradient(28,6+open/2,1,28,6+open/2,18);
 glow.addColorStop(0,"#ffe66b");glow.addColorStop(.5,"#ff5a1f");glow.addColorStop(1,"#5a0606");
 oval(ctx,26,6+open/2,19,4+open/2,glow);
 oval(ctx,22,12+open,19,6,cream);
 oval(ctx,22,-1,23,12,skin);
 oval(ctx,28,3,16,6,cream);
 for(const fx of [14,22,30,38])tri(ctx,[fx-3,8,fx,16,fx+3,8],"#fff","#aaa");
 for(const fx of [18,32])tri(ctx,[fx-3,10+open,fx,3+open,fx+3,10+open],"#fff","#aaa");
 if(fire>0){
  const fr=6+fire*12;
  const fg=ctx.createRadialGradient(34,6+open/2,0,34,6+open/2,fr);
  fg.addColorStop(0,"#fff7c2");fg.addColorStop(.4,"#ffb21f");fg.addColorStop(1,"rgba(255,60,0,0)");
  oval(ctx,34,6+open/2,fr,fr,fg);
 }
 oval(ctx,40,-6,2.5,1.6,"#111");
 // Furious eye and brow.
 oval(ctx,8,-9,9,7.5,"#ffe14a");
 const eg=ctx.createRadialGradient(9,-9,0,9,-9,6);
 eg.addColorStop(0,"#ff2a2a");eg.addColorStop(1,"rgba(255,0,0,0)");
 oval(ctx,9,-9,6,5,eg);
 oval(ctx,10,-9,1.6,5,"#111");
 tri(ctx,[-6,-20,22,-12,20,-6,-4,-14],"#14200b");
 ctx.restore();

 // Smoke and embers from the nostrils.
 for(let i=0;i<3;i++){
  const ph=(t*1.2+i/3)%1;
  ctx.globalAlpha=(1-ph)*.7*(flash>0?.5:1);
  oval(ctx,80+ph*18,-84-ph*22,3+ph*6,3+ph*6,i===0?"#ff9b2f":"#8a8a8a");
 }
 ctx.restore();
}

// Koopa tucked into his spinning spiked shell.
export function drawKoopaShell(ctx:CanvasRenderingContext2D,x:number,t:number,spin:number,flash:number){
 ctx.save();
 ctx.translate(x,G);
 oval(ctx,0,-2,58,7,"rgba(0,0,0,.3)");
 ctx.translate(0,-40);
 if(flash>0&&Math.floor(flash/3)%2===0)ctx.globalAlpha=.45;
 ctx.strokeStyle="rgba(255,240,200,.45)";ctx.lineWidth=3;
 for(const r of [50,58]){ctx.beginPath();ctx.arc(0,0,r,spin,spin+1.3);ctx.stroke();}
 ctx.rotate(spin);
 oval(ctx,0,0,42,40,"#f3d98a");
 const sg=ctx.createRadialGradient(-10,-12,4,0,0,40);
 sg.addColorStop(0,"#3f7f27");sg.addColorStop(1,"#163a0c");
 oval(ctx,0,0,36,34,sg);
 for(let i=0;i<8;i++){
  const a=i/8*TAU,bx=Math.cos(a)*38,by=Math.sin(a)*36,nx=Math.cos(a),ny=Math.sin(a);
  tri(ctx,[bx-ny*6,by+nx*6,bx+nx*16,by+ny*16,bx+ny*6,by-nx*6],"#fdfdfd","#8a8a8a");
 }
 oval(ctx,-10,-12,9,5,"rgba(255,255,255,.2)",-.6);
 ctx.restore();
 void t;
}

export type PeachMode="idle"|"walk"|"hug"|"cry";

// Princess Peach: chibi-style. "cry" = trembling, teary, shouting for help;
// "hug" leaves out her arms (only her hands show on the hero's back).
export function drawPeach(ctx:CanvasRenderingContext2D,x:number,t:number,rescued:boolean,mode:PeachMode="idle",floor=G){
 const cry=mode==="cry";
 ctx.save();
 ctx.translate(x+(cry?Math.sin(t*40)*.8:0),floor+(mode==="walk"?-Math.abs(Math.sin(t*9))*2.5:Math.sin(t*2)*1.5));
 ctx.scale(PEACH_S,PEACH_S);
 oval(ctx,0,-2,40,6,"rgba(0,0,0,.22)");
 const gold="#ffd23f",skin="#ffe3d0";

 // Long hair behind (her head is drawn 1.35x for chibi proportions).
 ctx.save();ctx.translate(0,-92);ctx.scale(1.35,1.35);ctx.translate(0,92);
 oval(ctx,0,-104,29,29,gold);
 oval(ctx,-21,-84,10,20,gold,.2);
 oval(ctx,21,-84,10,20,gold,-.2);
 ctx.restore();

 // Ruffled hem and gown.
 for(let i=-38;i<=38;i+=12)oval(ctx,i,-4,7,6,"#ffd1e6");
 const gg=ctx.createLinearGradient(0,-80,0,0);
 gg.addColorStop(0,"#ffb6d5");gg.addColorStop(1,"#ff5c9e");
 ctx.fillStyle=gg;ctx.beginPath();
 ctx.moveTo(-12,-76);ctx.bezierCurveTo(-18,-50,-38,-24,-44,-6);
 ctx.lineTo(44,-6);ctx.bezierCurveTo(38,-24,18,-50,12,-76);ctx.closePath();ctx.fill();
 tri(ctx,[-6,-72,6,-72,16,-6,-16,-6],"rgba(214,40,110,.35)");
 for(let i=0;i<4;i++){
  const s=1.5+Math.max(0,Math.sin(t*3+i*1.7))*2.5;
  const sx=[-24,18,-8,28][i],sy=[-20,-34,-46,-14][i];
  tri(ctx,[sx,sy-s,sx+s*.5,sy,sx,sy+s,sx-s*.5,sy],"#fff");
 }

 // Bodice, sleeves and brooch.
 ctx.fillStyle="#ff7fb4";ctx.beginPath();ctx.roundRect(-13,-93,26,21,6);ctx.fill();
 oval(ctx,-15,-88,8,8,"#ffc2dc");oval(ctx,15,-88,8,8,"#ffc2dc");
 oval(ctx,0,-85,4.5,4.5,"#3fa9ff");oval(ctx,-1.3,-86.5,1.4,1.4,"#fff");

 // Arms in white gloves: one waves (frantically when crying for help).
 if(mode!=="hug"){
  ctx.lineCap="round";ctx.strokeStyle="#fff";ctx.lineWidth=6;
  if(!cry){ctx.beginPath();ctx.moveTo(-17,-84);ctx.lineTo(-22,-64);ctx.stroke();oval(ctx,-22,-63,4,4,"#fff");}
  const a=cry?-1.25+Math.sin(t*16)*.6:rescued?-.75+Math.sin(t*8)*.3:-1.15+Math.sin(t*6)*.4;
  const hx=17+Math.cos(a)*22,hy=-86+Math.sin(a)*22;
  ctx.beginPath();ctx.moveTo(17,-86);ctx.lineTo(hx,hy);ctx.stroke();
  oval(ctx,hx,hy,4.5,4.5,"#fff");
  ctx.lineCap="butt";
 }

 // Head and face.
 ctx.save();ctx.translate(0,-92);ctx.scale(1.35,1.35);ctx.translate(0,92);
 ctx.fillStyle=skin;ctx.fillRect(-4,-94,8,6);
 oval(ctx,0,-108,22,22,skin);
 oval(ctx,-21,-100,2.5,2.5,"#3fa9ff");oval(ctx,21,-100,2.5,2.5,"#3fa9ff");
 const blink=t%3.6>3.45;
 for(const ex of [-8,8]){
  if(mode==="hug"){
   ctx.strokeStyle="#5a2a1a";ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(ex,-102,4,1.15*Math.PI,1.85*Math.PI);ctx.stroke();
  }else if(cry){
   oval(ctx,ex,-104,4.8,6.2,"#2b5fd9");
   oval(ctx,ex,-105.5,2.8,3.6,"#13235a");
   oval(ctx,ex-1.6,-107,2.3,2.3,"#fff");
   oval(ctx,ex+1.6,-102,1.3,1.3,"#fff");
   oval(ctx,ex,-99.2,4.6,1.4,"rgba(170,225,255,.95)");
   // Streaming tears.
   const side=ex<0?-1:1;
   ctx.strokeStyle="rgba(140,210,255,.8)";ctx.lineWidth=1.6;
   ctx.beginPath();ctx.moveTo(ex+side*3,-99);ctx.lineTo(ex+side*4,-91);ctx.stroke();
   for(let k=0;k<3;k++){
    const ph=(t*1.8+k/3+(side>0?.5:0))%1;
    oval(ctx,ex+side*(4+ph*3),-98+ph*18,1.5,2.3,`rgba(130,205,255,${1-ph})`);
   }
  }else if(blink){
   ctx.strokeStyle="#5a2a1a";ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(ex,-105,4,.15*Math.PI,.85*Math.PI);ctx.stroke();
  }else{
   oval(ctx,ex,-104,4.8,6.2,"#2b5fd9");
   oval(ctx,ex,-102.5,2.8,3.6,"#13235a");
   oval(ctx,ex-1.6,-106.5,1.9,1.9,"#fff");
   oval(ctx,ex+1.4,-101.5,1,1,"#fff");
   ctx.strokeStyle="#3a1f14";ctx.lineWidth=1.6;
   const o=ex<0?-1:1;
   ctx.beginPath();ctx.moveTo(ex+o*4,-109);ctx.lineTo(ex+o*7,-111);ctx.stroke();
  }
 }
 oval(ctx,-14,-97,4.5,2.6,cry?"rgba(255,80,120,.75)":"rgba(255,105,150,.55)");
 oval(ctx,14,-97,4.5,2.6,cry?"rgba(255,80,120,.75)":"rgba(255,105,150,.55)");
 if(cry){
  // Wailing open mouth.
  oval(ctx,0,-95.5,3.8,4.4+Math.sin(t*14)*.9,"#8a1538");
  oval(ctx,0,-93,2.2,1.3,"#ff7a9a");
 }else{
  ctx.strokeStyle="#c2185b";ctx.lineWidth=1.8;
  ctx.beginPath();ctx.arc(0,-97,rescued?4:2.6,.1*Math.PI,.9*Math.PI);ctx.stroke();
 }

 // Bangs.
 ctx.fillStyle=gold;ctx.beginPath();
 ctx.arc(0,-110,23.5,Math.PI,TAU);
 ctx.quadraticCurveTo(14,-110,9,-101);
 ctx.quadraticCurveTo(4,-112,0,-113);
 ctx.quadraticCurveTo(-4,-112,-9,-101);
 ctx.quadraticCurveTo(-14,-110,-23.5,-110);
 ctx.fill();ctx.strokeStyle="#e3a400";ctx.lineWidth=1.2;ctx.stroke();
 if(cry){
  // Worried brows, raised in the middle.
  ctx.strokeStyle="#b07818";ctx.lineWidth=1.8;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-13,-110);ctx.lineTo(-4,-114);ctx.moveTo(13,-110);ctx.lineTo(4,-114);ctx.stroke();
  ctx.lineCap="butt";
 }

 // Crown with gems.
 const cg=ctx.createLinearGradient(0,-143,0,-126);
 cg.addColorStop(0,"#fff19a");cg.addColorStop(1,"#f0a500");
 tri(ctx,[-13,-127,-13,-139,-7,-133,0,-144,7,-133,13,-139,13,-127],cg,"#b57900");
 oval(ctx,0,-131,2.6,2.6,"#ff3b5c");
 oval(ctx,-8,-130,1.8,1.8,"#3fa9ff");oval(ctx,8,-130,1.8,1.8,"#3fa9ff");
 ctx.restore();

 // Cupped hand by her mouth while she shouts.
 if(cry){
  ctx.lineCap="round";ctx.strokeStyle="#fff";ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(-17,-84);ctx.lineTo(-17,-94);ctx.stroke();ctx.lineCap="butt";
  oval(ctx,-15,-97,4.5,4,"#fff");
 }

 ctx.scale(1/PEACH_S,1/PEACH_S);
 const top=(-92-52*1.35)*PEACH_S;
 if(rescued&&mode==="idle"){
  for(let i=0;i<4;i++){
   const ph=(t*.6+i/4)%1;
   ctx.globalAlpha=1-ph;
   heart(ctx,-24+i*16+Math.sin(t*3+i)*5,top-24-ph*50,11,"#ff4f8b");
  }
  ctx.globalAlpha=1;
 }
 ctx.restore();
}

// Iron cage hanging from the throne-room ceiling. Drawn in two passes around Peach.
export function drawCage(ctx:CanvasRenderingContext2D,x:number,bottom:number,t:number,door:number,part:"back"|"front"){
 const w=78,h=96,top=bottom-h,l=x-w/2;
 if(part==="back"){
  ctx.strokeStyle="#6e6a7a";ctx.lineWidth=3;
  for(let y=top-16;y>28;y-=11){ctx.beginPath();ctx.ellipse(x+Math.sin(t*1.3)*.5,y,3.5,6,0,0,TAU);ctx.stroke();}
  ctx.fillStyle="rgba(15,10,25,.4)";ctx.fillRect(l,top+12,w,h-12);
  ctx.strokeStyle="#4e4a5a";ctx.lineWidth=2.5;
  for(let i=0;i<=8;i++){const bx=l+i*w/8;ctx.beginPath();ctx.moveTo(bx,top+12);ctx.lineTo(bx,bottom);ctx.stroke();}
  return;
 }
 const hinge=l+3*w/8;
 for(let i=0;i<=8;i++){
  let bx=l+i*w/8;
  if(i>=3&&i<=5)bx=hinge+(bx-hinge)*(1-door);
  ctx.strokeStyle="#3a3644";ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(bx+1,top+12);ctx.lineTo(bx+1,bottom);ctx.stroke();
  ctx.strokeStyle="#c8c4d6";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx-.5,top+12);ctx.lineTo(bx-.5,bottom);ctx.stroke();
 }
 ctx.fillStyle="#4a4658";ctx.beginPath();
 ctx.moveTo(l-4,top+14);ctx.quadraticCurveTo(x,top-24,l+w+4,top+14);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#e8b923";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(l-4,top+14);ctx.lineTo(l+w+4,top+14);ctx.stroke();
 ctx.beginPath();ctx.moveTo(l-4,top+52);ctx.lineTo(l+w+4,top+52);ctx.stroke();
 ctx.beginPath();ctx.arc(x,top-12,6,0,TAU);ctx.stroke();
 ctx.fillStyle="#4a4658";ctx.fillRect(l-5,bottom-5,w+10,9);
 ctx.fillStyle="#e8b923";ctx.fillRect(l-5,bottom-5,w+10,2);
}

// Spring pad; c (0..1) is how compressed it is.
export function drawSpring(ctx:CanvasRenderingContext2D,x:number,c:number){
 const h=20-c*10;
 ctx.fillStyle="#4a4a58";ctx.fillRect(x,G-4,40,4);
 ctx.strokeStyle="#d6d6e2";ctx.lineWidth=3;ctx.beginPath();
 for(let i=0;i<=6;i++)ctx.lineTo(x+8+(i%2)*24,G-4-i*(h-4)/6);
 ctx.stroke();
 const pg=ctx.createLinearGradient(0,G-h-6,0,G-h+3);
 pg.addColorStop(0,"#ff7a85");pg.addColorStop(1,"#d61f3c");
 ctx.fillStyle=pg;ctx.beginPath();ctx.roundRect(x-3,G-h-7,46,9,4);ctx.fill();
 ctx.fillStyle="rgba(255,255,255,.5)";ctx.fillRect(x+3,G-h-5,20,2);
}

export function drawCheckpoint(ctx:CanvasRenderingContext2D,x:number,on:boolean,t:number){
 ctx.fillStyle="#d8d8e4";ctx.fillRect(x,G-112,5,112);
 oval(ctx,x+2.5,G-114,5,5,on?"#ffd23f":"#9a9aaa");
 const fy=on?G-108:G-40;
 const col=on?"#2ecc71":"#a0a0b0";
 ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x+5,fy);
 for(let i=0;i<=8;i++)ctx.lineTo(x+5+i*5,fy+Math.sin(t*6+i*.7)*2.5*(i/8));
 for(let i=8;i>=0;i--)ctx.lineTo(x+5+i*5,fy+26-i*1.6+Math.sin(t*6+i*.7)*2.5*(i/8));
 ctx.closePath();ctx.fill();
 if(on)star(ctx,x+20,fy+11,6,"#fff59a");
}

// Spinning gold coin with a soft glow, embossed star and an occasional glint.
export function drawCoin(ctx:CanvasRenderingContext2D,x:number,y:number,spin:number,tw:number){
 const c=Math.cos(spin),w=Math.max(1.6,Math.abs(c)*12);
 const halo=ctx.createRadialGradient(x,y,4,x,y,22);
 halo.addColorStop(0,"rgba(255,220,80,.45)");halo.addColorStop(1,"rgba(255,220,80,0)");
 oval(ctx,x,y,22,22,halo);
 oval(ctx,x+(c<0?-2:2)*(1-Math.abs(c)),y,w+1.5,13,"#b8780a");
 const fg=ctx.createLinearGradient(x-w,y-13,x+w,y+13);
 fg.addColorStop(0,"#fff6b5");fg.addColorStop(.45,"#ffd23a");fg.addColorStop(1,"#e09a00");
 oval(ctx,x,y,w*.92,12,fg);
 if(Math.abs(c)>.25){
  ctx.strokeStyle="#c98800";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(x,y,w*.66,8.5,0,0,TAU);ctx.stroke();
  ctx.save();ctx.translate(x,y);ctx.scale(Math.abs(c),1);
  star(ctx,0,.5,5.5,"#e8a200");star(ctx,-.5,-.3,4.4,"#ffe680");
  ctx.restore();
 }
 const ph=tw%1.6;
 if(ph<.35)sparkle(ctx,x-w*.4,y-7,Math.sin(ph/.35*Math.PI)*7);
}

// The hero: chibi adventurer with a star cap, big shiny eyes and rosy cheeks.
// (x, y) is the centre of the feet; drawn facing right, face=-1 mirrors it.
// size grows the hero a little while he has mushroom power.
export function drawHero(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,face:number,moving:boolean,air:boolean,hug=false,size=1){
 ctx.save();
 ctx.translate(x,y);
 ctx.scale(face*HERO_S*size,HERO_S*size);
 const swing=moving&&!air?Math.sin(t*16)*4:0;
 const bob=moving&&!air?Math.abs(Math.sin(t*16))*1.5:Math.sin(t*3)*.6;
 const red="#ef3b3b",shade="#c92a2a",blue="#2f6fe0",skin="#ffd9b8";
 const arm=(sx:number,sy:number,hx:number,hy:number,col:string)=>{
  ctx.lineCap="round";ctx.strokeStyle=col;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(hx,hy);ctx.stroke();ctx.lineCap="butt";
  oval(ctx,hx,hy,3.8,3.8,"#fff");
 };

 // Legs and shoes.
 const legs=air?[[-5,-4],[6,-7]]:[[-5+swing,0],[5-swing,0]];
 for(const [lx,ly] of legs){
  ctx.fillStyle=blue;ctx.fillRect(lx-4,-14+ly,8,10);
  oval(ctx,lx+2,-4+ly,7,4.5,"#7a4421");
  oval(ctx,lx+4,-6+ly,2.5,1.2,"rgba(255,255,255,.35)");
 }
 ctx.translate(0,-bob);

 // Back arm, body, front arm.
 if(hug)arm(-6,-22,13,-13,shade);
 else if(air)arm(-6,-22,-13,-31,shade);
 else arm(-6,-22,-12-swing*.6,-14,shade);
 ctx.fillStyle=red;ctx.beginPath();ctx.roundRect(-10,-26,20,14,5);ctx.fill();
 ctx.fillStyle=blue;ctx.beginPath();ctx.roundRect(-9,-21,18,11,4);ctx.fill();
 ctx.fillRect(-6,-25,12,6);
 oval(ctx,-4,-21,1.9,1.9,"#ffd23f");oval(ctx,4,-21,1.9,1.9,"#ffd23f");
 if(hug)arm(6,-22,17,-9,red);
 else if(air)arm(6,-22,12,-42,red);
 else arm(6,-22,12+swing*.6,-14,red);

 // Head.
 oval(ctx,-9,-33,5,7,"#6b3a1e");
 oval(ctx,0,-35,13,12.5,skin);
 oval(ctx,-6,-34,2.6,3.2,"#f5c19c");
 const blink=t%4>3.86;
 for(const ex of [3,9]){
  if(hug||blink){
   ctx.strokeStyle="#2a1a12";ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(ex,-34,2.4,hug?1.1*Math.PI:.1*Math.PI,hug?1.9*Math.PI:.9*Math.PI);ctx.stroke();
  }else{
   oval(ctx,ex,-35,2.5,3.7,"#1d1d3a");
   oval(ctx,ex-.7,-36.4,1.1,1.1,"#fff");
   oval(ctx,ex+.6,-33.6,.6,.6,"#fff");
  }
 }
 oval(ctx,0,-30,2.8,1.6,"rgba(255,110,140,.55)");
 oval(ctx,11,-30,2.2,1.5,"rgba(255,110,140,.55)");
 oval(ctx,12.5,-32,3,2.5,"#ffb98f");
 ctx.strokeStyle="#8a2b1a";ctx.lineWidth=1.4;
 ctx.beginPath();ctx.arc(6,-29.5,hug?3:2.2,.1*Math.PI,.9*Math.PI);ctx.stroke();

 // Cap with star emblem.
 ctx.fillStyle=red;ctx.beginPath();ctx.arc(0,-38,13.5,Math.PI,0);ctx.closePath();ctx.fill();
 oval(ctx,9,-38,10,3.2,shade);
 oval(ctx,-4,-46,4,2,"rgba(255,255,255,.35)");
 oval(ctx,1,-43.5,4.6,4.6,"#fff");
 star(ctx,1,-43.3,3.6,"#ffc400");
 ctx.restore();
}

// Power mushroom: glowing purple cap with golden spots and a cute face. (x, y) = base centre.
export function drawMushroom(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,scale=1){
 ctx.save();
 ctx.translate(x,y);ctx.scale(scale,scale);
 const bob=Math.sin(t*4)*2;
 ctx.save();ctx.globalCompositeOperation="lighter";
 const gl=ctx.createRadialGradient(0,-16+bob,2,0,-16+bob,34+Math.sin(t*6)*4);
 gl.addColorStop(0,"rgba(255,200,90,.5)");gl.addColorStop(1,"rgba(255,120,220,0)");
 oval(ctx,0,-16+bob,38,38,gl);
 ctx.restore();
 oval(ctx,0,-1,12,3,"rgba(0,0,0,.25)");
 ctx.translate(0,bob);
 // Stem with a little face.
 ctx.fillStyle="#fff1dc";ctx.beginPath();ctx.roundRect(-8,-15,16,15,6);ctx.fill();
 oval(ctx,-3,-8,1.6,2.4,"#2a1a2a");oval(ctx,3,-8,1.6,2.4,"#2a1a2a");
 oval(ctx,-2.6,-8.8,.6,.6,"#fff");oval(ctx,3.4,-8.8,.6,.6,"#fff");
 oval(ctx,-6,-5,2,1.2,"rgba(255,120,150,.6)");oval(ctx,6,-5,2,1.2,"rgba(255,120,150,.6)");
 // Cap.
 const cg=ctx.createLinearGradient(0,-34,0,-12);
 cg.addColorStop(0,"#d86bff");cg.addColorStop(1,"#8a2be2");
 ctx.fillStyle=cg;ctx.beginPath();
 ctx.moveTo(-17,-13);ctx.bezierCurveTo(-18,-34,18,-34,17,-13);ctx.quadraticCurveTo(0,-9,-17,-13);ctx.fill();
 for(const [sx,sy,r] of [[-9,-21,3.6],[3,-27,4.2],[10,-17,3],[-2,-16,2.4]])oval(ctx,sx,sy,r,r*.85,"#ffd23f");
 oval(ctx,-8,-28,5,2.4,"rgba(255,255,255,.45)",-.5);
 const ph=(t*.9)%1.4;
 if(ph<.3)sparkle(ctx,13,-30,Math.sin(ph/.3*Math.PI)*6,"#fff8c0");
 ctx.restore();
}

// During the hug Peach's arms are hidden behind the hero; only her gloved hands show on his back.
export function drawPeachHands(ctx:CanvasRenderingContext2D,hx:number,hy:number){
 oval(ctx,hx-11*HERO_S,hy-21*HERO_S,3.4,3.4,"#fff");
 oval(ctx,hx-10*HERO_S,hy-13*HERO_S,3.4,3.4,"#fff");
}

function drawBat(ctx:CanvasRenderingContext2D,x:number,y:number,t:number){
 const f=Math.sin(t*18);
 for(const s of [-1,1]){
  ctx.fillStyle="#3d2466";ctx.beginPath();ctx.moveTo(x+s*6,y-2);
  ctx.quadraticCurveTo(x+s*18,y-14-f*10,x+s*28,y-6-f*12);
  ctx.quadraticCurveTo(x+s*22,y+2,x+s*18,y-1);
  ctx.quadraticCurveTo(x+s*13,y+5,x+s*6,y+3);
  ctx.closePath();ctx.fill();
 }
 oval(ctx,x,y,10,9,"#5b3b8c");
 tri(ctx,[x-7,y-6,x-5,y-15,x-2,y-7],"#5b3b8c");tri(ctx,[x+7,y-6,x+5,y-15,x+2,y-7],"#5b3b8c");
 oval(ctx,x-3.5,y-2,2.2,2.6,"#ff3b3b");oval(ctx,x+3.5,y-2,2.2,2.6,"#ff3b3b");
 tri(ctx,[x-3,y+4,x-2,y+8,x-1,y+4],"#fff");tri(ctx,[x+1,y+4,x+2,y+8,x+3,y+4],"#fff");
}

function drawLavaBall(ctx:CanvasRenderingContext2D,x:number,y:number,vy:number){
 ctx.save();ctx.globalCompositeOperation="lighter";oval(ctx,x,y,24,24,"rgba(255,110,20,.22)");ctx.restore();
 const d=vy<0?1:-1;
 for(let i=1;i<4;i++)oval(ctx,x,y+d*i*7,9-i*2,9-i*2,`rgba(255,${150-i*30},0,${.6-i*.15})`);
 const g=ctx.createRadialGradient(x-3,y-3,1,x,y,12);
 g.addColorStop(0,"#fff3a0");g.addColorStop(.5,"#ff9a1f");g.addColorStop(1,"#d1300c");
 oval(ctx,x,y,11,11,g);
 oval(ctx,x-4,y-1,1.8,2.8,"#3a0a00");oval(ctx,x+4,y-1,1.8,2.8,"#3a0a00");
 ctx.strokeStyle="#3a0a00";ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(x-7,y-6);ctx.lineTo(x-2,y-4);ctx.moveTo(x+7,y-6);ctx.lineTo(x+2,y-4);ctx.stroke();
}

export function drawEnemy(ctx:CanvasRenderingContext2D,e:Enemy,t:number){
 if(e.kind==="bat"){
  if(e.alive)drawBat(ctx,e.x,e.y,t+e.ox);
  else if(e.squash>0){ctx.save();ctx.globalAlpha=e.squash/20;oval(ctx,e.x,e.y+(20-e.squash)*3,10,6,"#5b3b8c");ctx.restore();}
  return;
 }
 if(e.kind==="bubble"){if(e.y<e.oy-2)drawLavaBall(ctx,e.x,e.y,e.vy);return;}
 const cx=e.x+15,by=e.y+27;
 if(!e.alive){
  if(e.squash>0){ctx.save();ctx.globalAlpha=Math.min(1,e.squash/10);oval(ctx,cx,by-4,17,5,"#8a4b25");ctx.restore();}
  return;
 }
 const step=Math.sin(t*12+e.x*.1)*3,dir=Math.sign(e.vx)||1;
 oval(ctx,cx,by,15,3,"rgba(0,0,0,.2)");
 oval(ctx,cx-7+step*.5,by-2,6,3.5,"#3b2414");oval(ctx,cx+7-step*.5,by-2,6,3.5,"#3b2414");
 if(e.kind==="pawn"){
  // Grumpy little walker.
  oval(ctx,cx,by-14,15,13,"#9a5a2c");
  oval(ctx,cx,by-19,13,7,"#b06a35");
  oval(ctx,cx,by-7,10,5.5,"#e8c39a");
  for(const ex of [-5,5]){oval(ctx,cx+ex,by-14,3.6,4.6,"#fff");oval(ctx,cx+ex+dir*1.2,by-13.5,1.8,2.7,"#111");}
  ctx.strokeStyle="#2a1408";ctx.lineWidth=2.2;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(cx-10,by-21);ctx.lineTo(cx-2,by-18);ctx.moveTo(cx+10,by-21);ctx.lineTo(cx+2,by-18);ctx.stroke();
  ctx.lineCap="butt";
  tri(ctx,[cx-4,by-8,cx-2,by-4.5,cx,by-8],"#fff");tri(ctx,[cx+1,by-8,cx+3,by-4.5,cx+5,by-8],"#fff");
 }else{
  // Spiky: can't be stomped.
  for(let i=0;i<5;i++){
   const a=Math.PI+.3+i*.6,bx=cx+Math.cos(a)*14,bpy=by-12+Math.sin(a)*11,nx=Math.cos(a),ny=Math.sin(a);
   tri(ctx,[bx-ny*4,bpy+nx*4,bx+nx*11,bpy+ny*11,bx+ny*4,bpy-nx*4],"#fffbe8","#9a8a70");
  }
  const sg=ctx.createRadialGradient(cx-4,by-20,2,cx,by-12,18);
  sg.addColorStop(0,"#ff7a5a");sg.addColorStop(1,"#b3261e");
  oval(ctx,cx,by-12,16,12,sg);
  oval(ctx,cx-4,by-17,5,2.5,"rgba(255,255,255,.35)");
  oval(ctx,cx+dir*11,by-9,7,6,"#ffd9a0");
  oval(ctx,cx+dir*13,by-11,1.6,2.4,"#111");
  ctx.strokeStyle="#5a1a10";ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(cx+dir*9,by-15);ctx.lineTo(cx+dir*15,by-13);ctx.stroke();
 }
}

export function drawShot(ctx:CanvasRenderingContext2D,s:Shot,t:number){
 if(s.kind==="meteor"){
  if(s.delay>0){
   // Warning marker where the meteor will land.
   const p=.5+.5*Math.sin(t*20);
   ctx.fillStyle=`rgba(255,60,30,${.15+.15*p})`;ctx.beginPath();ctx.ellipse(s.x,G-2,22,6,0,0,TAU);ctx.fill();
   ctx.strokeStyle=`rgba(255,80,40,${.5+.4*p})`;ctx.lineWidth=3;ctx.stroke();
   ctx.fillStyle=`rgba(255,220,120,${.6+.4*p})`;ctx.font="900 16px system-ui";ctx.textAlign="center";ctx.fillText("!",s.x,G-12);
   return;
  }
  for(let i=4;i>0;i--)oval(ctx,s.x,s.y-i*12,13-i*2,13-i*2,`rgba(255,${140-i*20},0,${.55-i*.1})`);
  const mg=ctx.createRadialGradient(s.x,s.y,1,s.x,s.y,17);
  mg.addColorStop(0,"#fffbd0");mg.addColorStop(.35,"#ffd23f");mg.addColorStop(.7,"#ff5a00");mg.addColorStop(1,"rgba(200,20,0,0)");
  oval(ctx,s.x,s.y,17,17,mg);
  return;
 }
 if(s.kind==="fire"){
  const d=Math.sign(s.vx);
  for(let i=3;i>0;i--)
   oval(ctx,s.x-d*i*8,s.y+Math.sin(t*20+i)*2,10-i*2,8-i*1.6,`rgba(255,${60+i*40},0,${.6-i*.13})`);
  const fg=ctx.createRadialGradient(s.x,s.y,1,s.x,s.y,13);
  fg.addColorStop(0,"#fffbd0");fg.addColorStop(.35,"#ffd23f");fg.addColorStop(.7,"#ff6a00");fg.addColorStop(1,"rgba(200,20,0,0)");
  oval(ctx,s.x,s.y,13+Math.sin(t*30)*1.5,11,fg);
  return;
 }
 ctx.save();ctx.globalAlpha=Math.min(1,s.life/30);
 ctx.strokeStyle="#ffcf6b";ctx.lineWidth=4;
 ctx.beginPath();ctx.arc(s.x,G,15,Math.PI,TAU);ctx.stroke();
 ctx.strokeStyle="#ff7a1a";ctx.lineWidth=2.5;
 ctx.beginPath();ctx.arc(s.x,G,8,Math.PI,TAU);ctx.stroke();
 for(let i=0;i<3;i++)
  tri(ctx,[s.x-9+i*6,G,s.x-6+i*6,G-7-((i+Math.floor(t*20))%3)*3,s.x-3+i*6,G],"#8a5a3a");
 ctx.restore();
}

export function drawFx(ctx:CanvasRenderingContext2D,f:Fx){
 const a=Math.max(0,f.life/f.max);
 ctx.save();ctx.globalAlpha=a;
 switch(f.kind){
  case "spark":sparkle(ctx,f.x,f.y,f.size*(.5+a),f.color);break;
  case "ember":oval(ctx,f.x,f.y,f.size,f.size,f.color);break;
  case "ring":
   ctx.strokeStyle=f.color;ctx.lineWidth=4*a;
   ctx.beginPath();ctx.arc(f.x,f.y,4+f.size*(1-a),0,TAU);ctx.stroke();break;
  case "smoke":ctx.globalAlpha=a*.6;oval(ctx,f.x,f.y,f.size*(1.6-a),f.size*(1.6-a),f.color);break;
  case "heart":heart(ctx,f.x,f.y,f.size,f.color);break;
  case "coin":drawCoin(ctx,f.x,f.y,(1-a)*30,1);break;
  case "debris":
   ctx.translate(f.x,f.y);ctx.rotate(f.life*.25);
   ctx.fillStyle=f.color;ctx.fillRect(-f.size/2,-f.size/2,f.size,f.size);break;
  case "flame":
   ctx.globalCompositeOperation="lighter";
   oval(ctx,f.x,f.y,f.size*(.4+a),f.size*(.5+a),a>.6?"#ffe27a":a>.3?"#ff8a1f":"#d6301a");break;
  case "text":
   ctx.font=`900 ${f.size}px system-ui`;ctx.textAlign="center";
   ctx.lineWidth=Math.max(4,f.size/6);ctx.strokeStyle="#3a1400";ctx.strokeText(f.text??"",f.x,f.y);
   ctx.fillStyle=f.color;ctx.fillText(f.text??"",f.x,f.y);break;
 }
 ctx.restore();
}
