import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Procedural, locally generated materials and furniture; no remote models or textures. */
export function createFurnishings(){
 const sofaSlots=[];let detailedSofa=null;
 function installSofa(slot){if(!detailedSofa)return;slot.clear();const model=detailedSofa.clone(true);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});slot.add(model);}
 new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/atelier-sofa.glb`,gltf=>{detailedSofa=gltf.scene;sofaSlots.forEach(installSofa);},undefined,()=>console.warn('El modelo detallado local no se pudo cargar; se conserva mobiliario básico.'));
 const materialCache=new Map();
 const mat=(key,color,roughness=.7,metalness=0)=>{if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materialCache.get(key);};
 // Local deterministic surfaces: restrained oak, pale veined stone and woven upholstery.
 function texture(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');let seed=19;
  const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  if(kind==='oak'){
   ctx.fillStyle='#b49b81';ctx.fillRect(0,0,512,512);
   for(let row=0;row<8;row++){ctx.fillStyle=`rgba(${row%3===0?'65,42,29':'238,222,204'},.055)`;ctx.fillRect(0,row*64,512,64);
    for(let j=0;j<70;j++){const y=row*64+rand()*64;ctx.strokeStyle=`rgba(${rand()>.45?'64,43,31':'249,228,200'},${.025+rand()*.095})`;ctx.lineWidth=.4+rand()*.6;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=512;x+=8)ctx.lineTo(x,y+Math.sin(x*.018+row)*1.4+Math.sin(x*.06+j)*.3);ctx.stroke();}
    ctx.fillStyle='rgba(62,44,33,.2)';ctx.fillRect(0,row*64,512,.65);ctx.fillRect((row*173)%512,row*64,.6,64);
   }
  }else if(kind==='stone'){
   ctx.fillStyle='#e9e6df';ctx.fillRect(0,0,512,512);
   for(let i=0;i<18000;i++){ctx.fillStyle=`rgba(114,110,104,${rand()*.045})`;ctx.fillRect(rand()*512,rand()*512,1,1);}
   for(let i=0;i<9;i++){const y=rand()*512;ctx.beginPath();ctx.moveTo(-20,y);ctx.bezierCurveTo(120,y-110,320,y+75,540,y-80);ctx.strokeStyle='rgba(130,126,120,.055)';ctx.lineWidth=5+rand()*9;ctx.stroke();ctx.strokeStyle='rgba(115,111,107,.18)';ctx.lineWidth=.35+rand()*.8;ctx.stroke();}
  }else{
   ctx.fillStyle='#a8a5a0';ctx.fillRect(0,0,512,512);
   for(let i=0;i<512;i+=2){ctx.fillStyle=`rgba(245,240,232,${.07+rand()*.09})`;ctx.fillRect(i,0,1,512);ctx.fillStyle=`rgba(40,41,43,${.04+rand()*.08})`;ctx.fillRect(0,i,512,1);}
   for(let i=0;i<16000;i++){ctx.fillStyle=rand()>.5?'rgba(255,250,242,.09)':'rgba(45,43,42,.08)';ctx.fillRect(rand()*512,rand()*512,1,2);}
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(kind==='oak'?4:2,kind==='oak'?3:2);tex.anisotropy=8;return tex;
 }
 const oak=mat('oak',0xffffff,.57);oak.map=texture('oak');oak.bumpMap=oak.map;oak.bumpScale=.008;
 const stone=mat('stone',0xffffff,.3);stone.map=texture('stone');stone.bumpMap=stone.map;stone.bumpScale=.003;
 const fabric=mat('fabric',0xffffff,.96);fabric.map=texture('fabric');fabric.bumpMap=fabric.map;fabric.bumpScale=.012;
 const M={oak,stone,fabric,steel:mat('steel',0x30343b,.36,.72),ivory:mat('ivory',0xe9e7e1,.52),dark:mat('dark',0x252a31,.55),gold:mat('gold',0xbda276,.3,.72),green:mat('green',0x4e723e),soil:mat('soil',0x40382b),glass:new THREE.MeshPhysicalMaterial({color:0xc1ced9,roughness:.07,metalness:0,clearcoat:1,envMapIntensity:1.2,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}),glow:new THREE.MeshStandardMaterial({color:0xffe1af,emissive:0xffc77b,emissiveIntensity:1.2}),screen:new THREE.MeshStandardMaterial({color:0x17323a,emissive:0x264851,emissiveIntensity:.45})};
 // Shared dashboard texture is decorative, never a claim of connected telemetry.
 const dashboard=document.createElement('canvas');dashboard.width=1024;dashboard.height=576;
 const dc=dashboard.getContext('2d');dc.fillStyle='#101b29';dc.fillRect(0,0,1024,576);
 dc.fillStyle='#203449';dc.fillRect(0,0,1024,64);dc.font='600 26px sans-serif';dc.fillStyle='#e1e8ed';dc.fillText('ATELIER  /  VISTA DE DISEÑO',28,42);
 dc.font='18px sans-serif';dc.fillStyle='#aab9c9';dc.fillText('MAQUETA · SIN DATOS EN VIVO',620,40);
 for(let col=0;col<3;col++){const x=28+col*325;dc.fillStyle='#1b2c3e';dc.fillRect(x,88,298,88);dc.fillStyle='#8fa7bc';dc.font='18px sans-serif';dc.fillText(['PROYECTO','BIBLIOTECA','ENTORNO'][col],x+16,116);dc.fillStyle='#d5e2e9';dc.font='24px sans-serif';dc.fillText(['ATELIER','VISTA PREVIA','LOCAL'][col],x+16,151);}
 dc.fillStyle='#17283a';dc.fillRect(28,196,624,344);dc.fillRect(674,196,322,344);
 dc.strokeStyle='#31465b';dc.lineWidth=1;for(let y=244;y<500;y+=48){dc.beginPath();dc.moveTo(48,y);dc.lineTo(632,y);dc.stroke();}
 for(let series=0;series<2;series++){dc.strokeStyle=['#70b9c7','#c6ad7d'][series];dc.lineWidth=3;dc.beginPath();for(let i=0;i<24;i++){const x=48+i*25,y=400-Math.sin(i*.55+series)*42-i*3+series*65;if(i===0)dc.moveTo(x,y);else dc.lineTo(x,y);}dc.stroke();}
 dc.font='17px sans-serif';dc.fillStyle='#b1c4d2';dc.fillText('COMPOSICIÓN / MUESTRA VISUAL',48,226);
 for(let i=0;i<8;i++){dc.fillStyle='#334b60';dc.fillRect(694,222+i*37,278,21);dc.fillStyle=i%2?'#b39a6a':'#5f9fad';dc.fillRect(694,222+i*37,84+(i*43)%183,21);}
 const dashboardMap=new THREE.CanvasTexture(dashboard);dashboardMap.colorSpace=THREE.SRGBColorSpace;dashboardMap.anisotropy=8;
 const dashboardMaterial=new THREE.MeshBasicMaterial({map:dashboardMap,toneMapped:false});
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,64,10,64,64,64);sg.addColorStop(0,'rgba(5,8,7,.45)');sg.addColorStop(.6,'rgba(5,8,7,.16)');sg.addColorStop(1,'rgba(5,8,7,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const shadowMap=new THREE.CanvasTexture(shadowCanvas);const contactMat=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 function contact(g,w,d,z=0){const shadow=new THREE.Mesh(new THREE.PlaneGeometry(w,d),contactMat);shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.255,z);g.add(shadow);}
 const sphereGeo=new THREE.SphereGeometry(1,16,12),leafGeo=new THREE.SphereGeometry(1,6,4);
 const boxGeo=new THREE.BoxGeometry(1,1,1),roundGeo=new RoundedBoxGeometry(1,1,1,2,.09);
 function box(g,x,y,z,w,h,d,m=M.ivory,round=false){const a=new THREE.Mesh(round?roundGeo:boxGeo,m);a.position.set(x,y,z);a.scale.set(w,h,d);a.castShadow=!m.transparent;a.receiveShadow=true;g.add(a);return a;}
 function cyl(g,x,y,z,r,h,m=M.steel,r2=r){const a=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,h,20),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
 function sphere(g,x,y,z,r,m=M.green,scale=[1,1,1]){const a=new THREE.Mesh(sphereGeo,m);a.position.set(x,y,z);a.scale.set(scale[0]*r,scale[1]*r,scale[2]*r);a.castShadow=true;g.add(a);return a;}
 function group(g,x=0,z=0,angle=0){const a=new THREE.Group();a.position.set(x,0,z);a.rotation.y=angle;g.add(a);return a;}
 function plant(g,x,z,size=1){const p=group(g,x,z);p.scale.setScalar(size);contact(p,1.5,1.5);cyl(p,0,.38,0,.36,.75,M.stone,.46);cyl(p,0,.77,0,.37,.02,M.soil);cyl(p,0,1.35,0,.027,1.35,M.oak);
  const foliage=new THREE.InstancedMesh(leafGeo,mat('foliage',0xffffff,.9),48);const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();for(let i=0;i<48;i++){const a=i*2.399;const level=i%8;const radius=.2+(i%5)*.08;const pos=new THREE.Vector3(Math.cos(a)*radius,1.05+level*.15,Math.sin(a)*radius);rotation.setFromEuler(new THREE.Euler(.6+Math.sin(i)*.7,a,Math.cos(i)*.7));matrix.compose(pos,rotation,new THREE.Vector3(.11,.26,.035));foliage.setMatrixAt(i,matrix);foliage.setColorAt(i,new THREE.Color([0x557648,0x6b8550,0x455f37,0x83965a][i%4]));}foliage.castShadow=true;p.add(foliage);
  for(let i=0;i<5;i++){const a=i*2.4;const branch=cyl(p,Math.cos(a)*.17,1.35+i*.1,Math.sin(a)*.17,.012,.65,M.oak);branch.rotation.z=Math.cos(a)*.65;branch.rotation.x=Math.sin(a)*.65;}return p;}
 function tree(g,x,z,size=1){const p=group(g,x,z);p.scale.setScalar(size);const bark=mat('bark',0x574531,.95);cyl(p,0,1.9,0,.11,3.8,bark,.075);const foliage=new THREE.InstancedMesh(leafGeo,mat('tree-leaf',0xffffff,.9),420),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
  for(let branch=0;branch<7;branch++){const a=branch*2.399;const base=new THREE.Vector3(0,2.3+branch*.23,0),end=new THREE.Vector3(Math.cos(a)*1.1,3.8+branch*.3,Math.sin(a)*1.1),delta=end.clone().sub(base);const limb=cyl(p,0,0,0,.045,delta.length(),bark,.019);limb.position.copy(base.clone().add(end).multiplyScalar(.5));limb.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
  for(let i=0;i<420;i++){const a=i*2.399,r=Math.sqrt((i%53)/53)*1.45,y=3.15+(i%29)/29*2.75;const taper=Math.max(.35,1-Math.abs(y-4.5)*.35);const pos=new THREE.Vector3(Math.cos(a)*r*taper,y,Math.sin(a)*r*taper);rotation.setFromEuler(new THREE.Euler(Math.sin(i)*1.1,a,Math.cos(i*.7)));matrix.compose(pos,rotation,new THREE.Vector3(.1,.31,.035));foliage.setMatrixAt(i,matrix);foliage.setColorAt(i,new THREE.Color([0x425d37,0x567547,0x76894f,0x607b41][i%4]));}foliage.castShadow=true;p.add(foliage);return p;}
 function chair(g,x,z,angle=0,color=M.fabric){const c=group(g,x,z,angle);cyl(c,0,.42,0,.045,.65,M.steel);box(c,0,.75,0,.7,.17,.7,color,true);const back=box(c,0,1.12,.3,.69,.65,.13,color,true);back.rotation.x=-.09;const seam=mat('upholstery-seam',0x8e8c88,.96);for(const dx of [-.26,.26])box(c,dx,1.12,.226,.008,.47,.006,seam);box(c,0,.842,0,.54,.006,.008,seam);for(const dx of [-.38,.38]){box(c,dx,.97,.05,.06,.06,.48,M.steel);box(c,dx,.83,.21,.045,.25,.045,M.steel);}for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leg=box(c,Math.sin(a)*.21,.11,Math.cos(a)*.21,.045,.055,.48,M.steel);leg.rotation.y=a;sphere(c,Math.sin(a)*.43,.08,Math.cos(a)*.43,.065,M.dark);}return c;}
 function screen(g,x,y,z,w=1){box(g,x,y,z,w,.62,.065,M.dark,true);const face=new THREE.Mesh(new THREE.PlaneGeometry(w-.07,.54),dashboardMaterial);face.position.set(x,y,z+.037);g.add(face);box(g,x,y-.4,z,.06,.3,.06,M.steel);box(g,x,y-.54,z,.4,.035,.25,M.steel);box(g,x+w*.38,y-.285,z+.038,.017,.006,.004,mat('monitor-indicator',0x8fc5bb));}
 function lamp(g,x,z,y=1.1){cyl(g,x,y+.02,z,.17,.035,M.gold);cyl(g,x,y+.32,z,.025,.6,M.gold);const l=new THREE.Mesh(new THREE.ConeGeometry(.22,.14,20,1,true),M.gold);l.position.set(x,y+.64,z);g.add(l);sphere(g,x,y+.58,z,.12,M.glow,[1,.35,1]);}
 function desk(g,x,z,angle=0,double=false){const d=group(g,x,z,angle);contact(d,3.4,3.1,.4);box(d,0,1.08,0,2.4,.14,1.15,M.ivory,true);for(const dx of [-.92,.92])box(d,dx,.55,0,.07,1.03,.95,M.steel);box(d,.78,.55,0,.48,.95,.86,M.ivory,true);for(const y of [.34,.61,.88])box(d,.78,y,.439,.35,.018,.015,M.steel);screen(d,double?-.49:0,1.62,-.25,double?.85:1.03);if(double)screen(d,.49,1.62,-.25,.85);box(d,0,1.17,.25,.7,.025,.22,M.steel,true);for(let row=0;row<3;row++)for(let col=0;col<12;col++)box(d,-.305+col*.055,1.186,.18+row*.06,.044,.008,.045,M.ivory);box(d,0,1.186,.342,.28,.008,.025,M.ivory);box(d,.52,1.17,.27,.13,.05,.19,M.dark,true);cyl(d,-.86,1.25,.28,.075,.18,M.ivory);lamp(d,-.89,-.3);chair(d,0,1.05);d.scale.set(1.22,1.12,1.18);return d;}
 function archivero(g,x,z,angle=0,botId=null){
  const a=group(g,x,z,angle);a.userData.archivero=botId||true;
  a.scale.setScalar(1.25);
  const body=mat('archivero-body',0xd4dbe3,.5,.14);
  const face=mat('archivero-face',0xc5ced8,.42,.16);
  const accent=mat('archivero-accent',0xbcd9ec,.2,.12);
  accent.emissive=new THREE.Color(0xbcd9ec);accent.emissiveIntensity=1.7;accent.toneMapped=false;
  contact(a,1.15,.95);
  box(a,0,.92,0,.62,1.34,.56,body,true);
  box(a,0,1.62,0,.64,.08,.58,face,true);
  box(a,0,1.574,0.255,0.50,0.010,0.050,accent);
  box(a,0.255,1.574,0,0.050,0.010,0.50,accent);
  box(a,-0.255,1.574,0,0.050,0.010,0.50,accent);
  box(a,0,1.658,0.205,0.48,0.010,0.058,accent);
  box(a,0,1.658,-0.205,0.48,0.010,0.058,accent);
  box(a,0.205,1.658,0,0.058,0.010,0.40,accent);
  box(a,-0.205,1.658,0,0.058,0.010,0.40,accent);
  for(const y of [.48,.84,1.20]){
   box(a,0,y,.285,.52,.30,.07,face,true);
   box(a,0,y,.328,.16,.018,.022,M.steel);
  }
  box(a,0,.24,0,.60,.10,.54,M.steel,true);
  return a;
 }
 function besideDesk(g,x,z,angle=0,sides=1,botIds=null){
  const dist=2.14, back=-0.12;
  const list=(sides===true||sides==='both')?[-1,1]:(Array.isArray(sides)?sides:[sides]);
  const ids=Array.isArray(botIds)?botIds:[botIds,botIds];
  list.forEach((side,i)=>{
   const lx=side*dist, lz=back;
   const wx=x+Math.cos(angle)*lx-Math.sin(angle)*lz;
   const wz=z+Math.sin(angle)*lx+Math.cos(angle)*lz;
   archivero(g,wx,wz,angle,ids[i]||botIds||null);
  });
 }
 function sofa(g,x,z,angle=0){const s=group(g,x,z,angle);s.userData.assetSlot=true;sofaSlots.push(s);contact(s,4.4,2.4,.1);box(s,0,.28,0,3.5,.36,1.28,M.dark,true);box(s,0,.82,-.5,3.5,.96,.25,M.fabric,true);for(const dx of [-1.6,1.6])box(s,dx,.65,0,.33,.68,1.28,M.fabric,true);for(const dx of [-1,0,1]){box(s,dx,.56,.06,.95,.25,1.1,M.fabric,true);box(s,dx,.95,-.29,.9,.6,.19,M.fabric,true);}box(s,.95,1,.0,.48,.45,.18,mat('mustard',0xc09c53),true);const clothGeo=new THREE.PlaneGeometry(.7,1.4,8,20);const pp=clothGeo.attributes.position;for(let i=0;i<pp.count;i++){const u=pp.getX(i),v=(pp.getY(i)+.7)/1.4;pp.setXYZ(i,-.9+u,.69-Math.max(0,v-.65)*1.3+Math.sin(u*35)*.018,-.3+v*1.3);}clothGeo.computeVertexNormals();const clothMat=mat('throw',0xcab88e,.95);clothMat.side=THREE.DoubleSide;const cloth=new THREE.Mesh(clothGeo,clothMat);cloth.castShadow=true;s.add(cloth);installSofa(s);return s;}
 function rug(g,x,z,w,d){const border=mat('rug-border',0x787874,.99);border.map=fabric.map;border.bumpMap=fabric.bumpMap;border.bumpScale=.01;box(g,x,.255,z,w,.035,d,border,true);const pile=mat('rug-pile',0xb4b3b0,.99);pile.map=fabric.map;pile.bumpMap=fabric.bumpMap;pile.bumpScale=.018;box(g,x,.277,z,w-.14,.013,d-.14,pile,true);}
 function coffeeTable(g,x,z){box(g,x,.55,z,2,.13,1.15,M.stone,true);for(const dx of [-.7,.7])box(g,x+dx,.32,z,.1,.45,.6,M.steel);box(g,x-.4,.65,z,.65,.05,.45,M.ivory);box(g,x-.36,.69,z+.02,.5,.035,.36,M.oak);cyl(g,x+.55,.78,z,.12,.35,M.gold);sphere(g,x+.55,1.02,z,.2,M.green,[1,.6,1]);}
 function library(g,x,z,w=9){box(g,x,1.55,z,w,2.95,.48,M.oak);const bays=Math.floor(w/.9);for(let b=0;b<bays;b++)for(let row=0;row<4;row++){const xx=x-w/2+.48+b*.9;const yy=.3+row*.7;box(g,xx,yy+.24,z+.08,.82,.57,.4,M.dark);for(let j=0;j<5;j++){const color=[0xc1946e,0xe0d2a7,0x8ba5a0,0x9a7160,0x6c7870][(j+row+b)%5];const book=box(g,xx-.31+j*.145,yy+.23,z+.22,.105,.34+(j%3)*.06,.22,mat('book'+color,color));if(j===4)book.rotation.z=.16;const spine=mat('book-spine-gilt',0xbba98b,.62);for(const band of [-.1,.11]){const mark=box(g,book.position.x,book.position.y+band,z+.333,.078,.013,.003,spine);if(j===4){mark.position.x-=Math.sin(.16)*band;mark.rotation.z=.16;}}}box(g,xx,yy+.55,z+.3,.76,.018,.03,M.glow);}}
 function roundTable(g,x,z,r=1.2,count=4){cyl(g,x,1,z,r,.16,M.oak);cyl(g,x,.55,z,r*.3,.85,M.steel);for(let i=0;i<count;i++){const a=i*Math.PI*2/count;chair(g,x+Math.sin(a)*(r+.6),z+Math.cos(a)*(r+.6),a);}return g;}
 function partition(g,x,z,w,angle=0){const p=group(g,x,z,angle);box(p,0,1.85,0,w,3.5,.025,M.glass);for(let xx=-w/2;xx<=w/2;xx+=w/3)box(p,xx,1.85,0,.055,3.6,.07,M.steel);box(p,0,3.64,0,w,.06,.07,M.steel);box(p,0,.1,0,w,.06,.07,M.steel);return p;}
 function pendant(g,x,z,r=1,y=3.3){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.035,8,48),M.glow);ring.rotation.x=Math.PI/2;ring.position.set(x,y,z);g.add(ring);for(const dx of [-r*.7,r*.7])cyl(g,x+dx,y+.3,z,.012,.6,M.gold);}
 function mic(g,x,z){cyl(g,x,1.1,z,.12,.025,M.dark);cyl(g,x,1.35,z,.018,.5,M.steel);const head=cyl(g,x,1.65,z,.065,.22,M.dark);head.rotation.x=.5;}
 function label(g,text,x,y,z,w=4){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#292f37';ctx.fillRect(0,0,768,128);ctx.fillStyle='#e8d6b1';ctx.font='500 40px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,78);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const a=new THREE.Mesh(new THREE.PlaneGeometry(w,w/6),new THREE.MeshBasicMaterial({map:tex}));a.position.set(x,y,z);g.add(a);return a;}
 function batch(root,skip=new Set()) {root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert();const buckets=new Map();function visit(n){if(skip.has(n)||n.userData.assetSlot||n.userData.archivero)return;for(const child of [...n.children]){if(child.isMesh&&child.geometry===boxGeo&&!child.material.transparent){const key=child.material;const b=buckets.get(key)??[];b.push(child);buckets.set(key,b);}else visit(child);}}visit(root);for(const[m,list]of buckets){if(list.length<2)continue;const inst=new THREE.InstancedMesh(boxGeo,m,list.length);list.forEach((a,i)=>{inst.setMatrixAt(i,inv.clone().multiply(a.matrixWorld));a.removeFromParent();});inst.castShadow=true;inst.receiveShadow=true;root.add(inst);}}
 return {M,mat,box,cyl,sphere,group,plant,tree,chair,screen,lamp,desk,archivero,besideDesk,sofa,rug,coffeeTable,library,roundTable,partition,pendant,mic,label,batch};
}
