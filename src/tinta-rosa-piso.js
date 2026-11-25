import * as THREE from 'three';

/**
 * Piso 04 Tinta Rosa — remodelación «Mezcla» aprobada (t476u):
 * luces y texturas rosas (P1), muro de portadas + letrero neón + pizarra editorial (P2),
 * sala lounge con sillón malva y luz de sala (P3). Escritorios y avatares en su lugar.
 * Solo decoración local: portadas y pizarra son genéricas (secciones y etapas), sin datos inventados.
 */
const ROSA=0xfa069c, BLUSH=0xfecee3;
const BASE=(import.meta.env&&import.meta.env.BASE_URL)||'./';
let emblemaMap=null;
function emblema(){
 if(!emblemaMap){emblemaMap=new THREE.TextureLoader().load(`${BASE}assets/tinta-rosa/emblema.png`);emblemaMap.colorSpace=THREE.SRGBColorSpace;emblemaMap.anisotropy=8;}
 return emblemaMap;
}
export const SILLON_MALVA={hex:'#C9A4C4',color:0xc9a4c4,throwColor:0xeadee8,cushionColor:0x9e769a};
export const LUZ_SALA={color:0xffe6ef,x:-1.6,y:3.1,z:7.5,distance:13};

function canvasTex(w,h,draw){
 const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),c);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

function pinkGlowMat(){
 return new THREE.MeshStandardMaterial({color:0xffd4e8,emissive:ROSA,emissiveIntensity:.48,roughness:.42});
}

function ledMat(intensity=.75){
 return new THREE.MeshStandardMaterial({color:0xffd6ea,emissive:ROSA,emissiveIntensity:intensity,roughness:.35});
}

function recolorSharedGlow(g,M){
 const pink=pinkGlowMat();
 g.traverse(o=>{if(o.isMesh&&o.material===M.glow)o.material=pink;});
}

function ledStrip(g,box,x,y,z,w){
 box(g,x,y,z,w,.045,.06,ledMat(.8));
}

function floorLamp(g,box,cyl,sphere,M,x,z,glow){
 cyl(g,x,.05,z,.18,.08,M.steel,.18);
 cyl(g,x,1.15,z,.022,2.2,M.steel);
 const shade=new THREE.Mesh(new THREE.ConeGeometry(.28,.22,16,1,true),glow);
 shade.position.set(x,2.28,z);g.add(shade);
 sphere(g,x,2.18,z,.14,glow,[1,.4,1]);
}

function rugRosa(g,box,mat,x,z,w,d,border=0xb07a8c,pile=0xe8b8c8){
 box(g,x,.255,z,w,.035,d,mat('tr-rug-b-'+border.toString(16),border,.99),true);
 box(g,x,.277,z,w-.14,.013,d-.14,mat('tr-rug-p-'+pile.toString(16),pile,.99),true);
}

function coverMaterials(){
 const sections=['CULTURA','DERECHOS','HISTORIA','OPINIÓN','ARTE','COMUNIDAD'];
 const bgs=['#3a2030','#FA069C','#FDFCF5','#2c2a32','#FECEE3','#4a3038'];
 const fgs=['#FDFCF5','#FDFCF5','#FA069C','#FECEE3','#3a2030','#FDFCF5'];
 return sections.map((sec,i)=>{
  const bg=bgs[i],fg=fgs[i];
  const t=canvasTex(256,360,(ctx,c)=>{
   ctx.fillStyle=bg;ctx.fillRect(0,0,256,360);
   ctx.fillStyle=i===1||i===4?'rgba(253,252,245,.12)':'rgba(250,6,156,.16)';
   ctx.fillRect(0,0,256,42);
   ctx.fillStyle=fg;ctx.font='600 22px sans-serif';ctx.fillText('TINTA ROSA',18,30);
   ctx.font='700 36px sans-serif';
   const lines=sec.length>8?[sec.slice(0,4),sec.slice(4)]: [sec];
   lines.forEach((ln,k)=>ctx.fillText(ln,18,200+k*40));
   ctx.strokeStyle=fg;ctx.globalAlpha=.45;ctx.lineWidth=2;
   ctx.strokeRect(14,50,228,280);ctx.globalAlpha=1;
   ctx.fillStyle=i%2?'#FA069C':'#FECEE3';
   ctx.beginPath();ctx.moveTo(200,300);ctx.lineTo(236,330);ctx.lineTo(200,330);ctx.closePath();ctx.fill();
  });
  return new THREE.MeshStandardMaterial({map:t,roughness:.62,metalness:0});
 }).concat(sections.map((sec,i)=>{
  // second row, slightly varied
  const bg=['#FDFCF5','#4a3038','#FA069C','#FECEE3','#2c2a32','#3a2030'][i];
  const fg=bg==='#FDFCF5'||bg==='#FECEE3'?'#3a2030':'#FDFCF5';
  const t=canvasTex(256,360,(ctx)=>{
   ctx.fillStyle=bg;ctx.fillRect(0,0,256,360);
   ctx.fillStyle=fg;ctx.font='600 20px sans-serif';ctx.fillText('TINTA ROSA',18,40);
   ctx.font='700 32px sans-serif';ctx.fillText(sec,18,210);
   ctx.fillStyle='#FA069C';ctx.fillRect(18,320,80,8);
  });
  return new THREE.MeshStandardMaterial({map:t,roughness:.62,metalness:0});
 }));
}

function neonSign(g,box,mat,x,y,z){
 const back=mat('tr-neon-back',0x1a1218,.5);
 box(g,x,y,z,3.6,1.05,.08,back,true);
 const t=canvasTex(1024,280,(ctx,c)=>{
  ctx.clearRect(0,0,1024,280);
  ctx.fillStyle='#140c12';ctx.fillRect(0,0,1024,280);
  // soft glow
  ctx.shadowColor='#FA069C';ctx.shadowBlur=28;ctx.fillStyle='#ffb6d9';
  ctx.font='700 96px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('TINTA ROSA',300,150);
  ctx.shadowBlur=8;ctx.fillStyle='#ffe6f3';ctx.fillText('TINTA ROSA',300,150);
 });
 const m=new THREE.MeshStandardMaterial({map:t,emissive:ROSA,emissiveMap:t,emissiveIntensity:.85,roughness:.4,toneMapped:false});
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.9),m);
 panel.position.set(x,y,z+.05);g.add(panel);
 const emblem=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshStandardMaterial({map:emblema(),transparent:true,roughness:.45,metalness:0,emissive:0xffffff,emissiveMap:emblema(),emissiveIntensity:.25}));
 emblem.position.set(x-1.35,y,z+.06);g.add(emblem);
 // slim LED frame
 box(g,x,y+.5,z+.04,3.55,.03,.03,ledMat(.9));
 box(g,x,y-.5,z+.04,3.55,.03,.03,ledMat(.9));
}

function planningBoard(g,box,mat,M,x,z,angle=0){
 const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=angle;g.add(p);
 box(p,0,1.7,0,2.6,2.2,.08,mat('tr-board',0x3a3538,.6));
 box(p,0,.55,0,2.7,.12,.16,M.oak,true);
 const t=canvasTex(1024,768,(ctx)=>{
  ctx.fillStyle='#f7f1f3';ctx.fillRect(0,0,1024,768);
  ctx.fillStyle='#FA069C';ctx.fillRect(0,0,1024,64);
  ctx.fillStyle='#FDFCF5';ctx.font='700 36px sans-serif';ctx.fillText('PLANEACIÓN EDITORIAL',28,44);
  const cols=['IDEAS','REDACCIÓN','DISEÑO','PUBLICACIÓN'];
  const notes=[
   ['Tema','Enfoque','Fuentes'],
   ['Borrador','Revisión','Cierre'],
   ['Maquetación','Portada','Corrección'],
   ['Programar','Publicar','Redes']
  ];
  const cw=230;
  cols.forEach((col,i)=>{
   const x0=28+i*(cw+16);
   ctx.fillStyle='#efe4e8';ctx.fillRect(x0,88,cw,648);
   ctx.fillStyle='#FA069C';ctx.font='700 26px sans-serif';ctx.fillText(col,x0+14,124);
   notes[i].forEach((n,k)=>{
    const y=160+k*150;
    ctx.fillStyle=k%2?'#FECEE3':'#FDFCF5';
    ctx.fillRect(x0+12,y,cw-24,128);
    ctx.strokeStyle='rgba(250,6,156,.25)';ctx.strokeRect(x0+12,y,cw-24,128);
    ctx.fillStyle='#3a2030';ctx.font='600 22px sans-serif';ctx.fillText(n,x0+24,y+72);
   });
  });
 });
 const face=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.95),new THREE.MeshStandardMaterial({map:t,roughness:.7}));
 face.position.set(0,1.78,.05);p.add(face);
}

function isMetalish(m){
 if(!m)return true;
 const name=(m.name||'').toLowerCase();
 if(name.includes('walnut')||name.includes('bronze')||name.includes('metal')||name.includes('wood'))return true;
 if((m.metalness||0)>0.45)return true;
 const c=m.color;if(!c)return false;
 const lum=c.r*0.3+c.g*0.59+c.b*0.11;
 if(lum<0.16)return true;
 if(c.r>0.25&&c.r<0.55&&c.r>c.g&&c.g>c.b&&(c.r-c.b)>0.12&&c.b<0.28&&(m.metalness||0)<0.2)return true;
 return false;
}

function tintSofaGroup(root,spec){
 const v=typeof spec==='object'?spec:{color:spec||SOFA_ROSA,throwColor:0xf5dce6,cushionColor:0xd48da8};
 root.traverse(o=>{
  if(!o.isMesh||!o.material)return;
  const list=Array.isArray(o.material)?o.material:[o.material];
  const next=list.map(m=>{
   if(m.userData&&m.userData.trSofaTint)return m;
   if(isMetalish(m))return m;
   const name=(m.name||'').toLowerCase();
   const c=m.clone();
   if(name.includes('cushion')){
    c.map=null;
    c.color=new THREE.Color(v.cushionColor);
    c.needsUpdate=true;
   }else if(name.includes('throw')){
    c.map=null;
    c.color=new THREE.Color(v.throwColor);
    c.needsUpdate=true;
   }else{
    c.color=new THREE.Color(v.color);
   }
   c.roughness=Math.min(0.92,Math.max(0.75,c.roughness??0.9));
   c.userData={...(c.userData||{}),trSofaTint:true};
   return c;
  });
  o.material=Array.isArray(o.material)?next:next[0];
 });
}

/** Texturas rosas del piso 04: clona, nunca muta los materiales compartidos M.* */
export function tintaRosaPlate(M){
 const oak=M.oak.clone(),ivory=M.ivory.clone(),stone=M.stone.clone();
 oak.color.lerp(new THREE.Color(0xffd4e4),.28);
 ivory.color.lerp(new THREE.Color(BLUSH),.4);
 stone.color.lerp(new THREE.Color(BLUSH),.2);
 return {oak,ivory,stone};
}

export function furnishTintaRosa(ctx){
 const {g,box,cyl,sphere,mat,M,lamp,chair,pendant,desk,besideDesk,partition,sofa,coffeeTable}=ctx;
 // Muro de portadas enmarcadas (antes: pin-up genérico)
 box(g,-6,2.25,-8.56,10,1.7,.08,M.oak);
 const covers=coverMaterials();
 for(let i=0;i<12;i++){
  const x=-10.4+(i%6)*1.75,y=1.85+Math.floor(i/6)*.8;
  box(g,x,y,-8.51,1.58,.72,.04,mat('tr-frame'+i,0x3a3036,.45,.2));
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.42,.62),covers[i]);face.position.set(x,y,-8.48);g.add(face);
 }
 box(g,-6,1,-7,10,.14,1.3,M.oak);for(let i=0;i<5;i++){box(g,-10+i*2,.5,-7,1.7,.9,1.1,M.ivory,true);cyl(g,-10+i*2,1.2,-7,.16,.3,M.dark);}
 // Mesa de juntas con alfombra rosa (mismo lugar)
 rugRosa(g,box,mat,-5,-4,8,5);box(g,-5,1,-4,6,.16,2.2,M.oak,true);
 for(let i=0;i<4;i++){chair(g,-7.1+i*1.4,-5.65,Math.PI);chair(g,-7.1+i*1.4,-2.35);}
 for(let i=0;i<6;i++){const paper=box(g,-7+i*.8,1.1,(i%2)*.7-4.35,.7,.02,.5,M.ivory);paper.rotation.y=i*.3;}
 pendant(g,-5,-4,1.5,3.5);
 // Escritorios y archiveros: mismas posiciones que hoy
 desk(g,-8,3,0,true);besideDesk(g,-8,3,0,true,['tr-editor','tr-cm']);desk(g,3,3,0,true);besideDesk(g,3,3,0,1,'tadeo');desk(g,4,-5.5,0,true);besideDesk(g,4,-5.5,0,1,'mateo');partition(g,4,-3.5,7);
 // Sala lounge: tapete rosa, sillón malva, lámpara de pie cálida
 rugRosa(g,box,mat,-2,6.85,6.2,3.5,0xa87888,0xe8c8d4);
 const sillon=sofa(g,-2,6.6);sillon.scale.set(1.35,1.1,1.15);coffeeTable(g,-2,7.9);
 const apply=()=>tintSofaGroup(sillon,SILLON_MALVA);
 sillon.userData.trTintSofa=apply;apply();
 const loungeGlow=new THREE.MeshStandardMaterial({color:0xfff0f5,emissive:0xffb8d4,emissiveIntensity:.72,roughness:.38});
 floorLamp(g,box,cyl,sphere,M,1.05,6.55,loungeGlow);
 // Letrero neón, tira LED, lámparas rosas y pizarra editorial
 neonSign(g,box,mat,2.35,2.45,-8.52);
 ledStrip(g,box,-1.7,3.56,-8.58,20.8);
 const glow=pinkGlowMat();
 floorLamp(g,box,cyl,sphere,M,-9.2,-1.6,glow);floorLamp(g,box,cyl,sphere,M,1.6,-1.6,glow);
 lamp(g,-2.4,-4.9,1.2);lamp(g,-7.6,-4.9,1.2);
 planningBoard(g,box,mat,M,1.35,1.55,0.22);
 recolorSharedGlow(g,M);
}
