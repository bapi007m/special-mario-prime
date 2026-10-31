// Shared constants, types and small drawing helpers.

export const W=960,H=540,G=500,PW=38,PH=48;
// Hero and Peach are drawn at the same height (about 60px).
export const HERO_S=1.15,PEACH_S=.37;
export const TAU=Math.PI*2;

// The throne room at the end of the level.
export const ARENA_X=7700,ARENA_END=8460,WORLD=ARENA_END,ARENA_CAM=7600;
export const BOSS_MIN=ARENA_X+30,BOSS_MAX=ARENA_END-160,BOSS_HP=6;
export const CAGE_X=ARENA_END-110,CAGE_Y=G-230,PEACH_MEET=CAGE_X-90;

export type Rect={x:number;y:number;w:number;h:number};
export type Plat=Rect&{kind:"ground"|"float"|"move";ox?:number;oy?:number;mx?:number;my?:number;range?:number;speed?:number;dx?:number;dy?:number};
export type EnemyKind="pawn"|"bat"|"spiky"|"bubble";
export type Enemy={kind:EnemyKind;x:number;y:number;vx:number;vy:number;min:number;max:number;ox:number;oy:number;alive:boolean;squash:number;t:number};
export type FxKind="spark"|"ring"|"text"|"smoke"|"heart"|"coin"|"ember"|"debris"|"flame";
export type Fx={x:number;y:number;vx:number;vy:number;life:number;max:number;kind:FxKind;color:string;size:number;text?:string};
export type Shot={x:number;y:number;vx:number;vy:number;kind:"fire"|"wave"|"meteor";life:number;delay:number;high:boolean};
export type BossState="enter"|"roar"|"walk"|"windup"|"rain"|"charge"|"dash"|"jump"|"shell"|"rest"|"stagger";
export type Status="title"|"playing"|"intro"|"boss"|"ending"|"won"|"gameover";
export type Boss={x:number;y:number;vx:number;vy:number;hp:number;active:boolean;flash:number;
  state:BossState;timer:number;face:number;volley:number;phase:number;bounces:number;spin:number};

export type Game={
  p:{x:number;y:number;vx:number;vy:number;ground:boolean;face:number;kb:number;plat:Plat|null;coyote:number};
  enemies:Enemy[];
  coins:Set<number>;
  score:number;
  coinCount:number;
  lives:number;
  camera:number;
  check:number;
  checks:Set<number>;
  springT:number[];
  boss:Boss;
  shots:Shot[];
  fx:Fx[];
  // Screen effects.
  shake:number;flash:number;freeze:number;slow:number;slowTick:number;zoom:number;
  dark:number;bars:number;red:number;titleT:number;bannerText:string;bannerT:number;
  // Story state.
  gate:number;peachX:number;cageY:number;door:number;endT:number;hug:number;introT:number;
  shoutT:number;shoutText:string;cryCd:number;zone:number;zoneT:number;lightning:number;lightX:number;
  jumpBuf:number;
  invul:number;
  status:Status;
  frame:number;
};

export function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v));}

// Deterministic 0..1 noise, used for scenery placement.
export function hash(n:number){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);}

function rgb(c:string):number[]{
 if(c[0]==="#"){const n=parseInt(c.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
 return c.slice(c.indexOf("(")+1,-1).split(",").map(Number);
}
export function mix(a:string,b:string,k:number){
 const x=rgb(a),y=rgb(b);
 return `rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*k)).join(",")})`;
}

export function oval(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient,rot=0){
 ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rot,0,TAU);ctx.fill();
}

export function tri(ctx:CanvasRenderingContext2D,pts:number[],fill:string|CanvasGradient,stroke?:string){
 ctx.beginPath();ctx.moveTo(pts[0],pts[1]);
 for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
}

export function heart(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,fill:string){
 ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x,y+s*.35);
 ctx.bezierCurveTo(x,y,x-s*.5,y,x-s*.5,y+s*.35);
 ctx.bezierCurveTo(x-s*.5,y+s*.65,x,y+s*.8,x,y+s);
 ctx.bezierCurveTo(x,y+s*.8,x+s*.5,y+s*.65,x+s*.5,y+s*.35);
 ctx.bezierCurveTo(x+s*.5,y,x,y,x,y+s*.35);ctx.fill();
}

export function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,fill:string){
 ctx.beginPath();
 for(let i=0;i<10;i++){
  const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;
  ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);
 }
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}

export function sparkle(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,fill="#fff"){
 tri(ctx,[x,y-s,x+s*.28,y-s*.28,x+s,y,x+s*.28,y+s*.28,x,y+s,x-s*.28,y+s*.28,x-s,y,x-s*.28,y-s*.28],fill);
}
