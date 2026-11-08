import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {bots,floors} from './data.js';
import {createFurnishings} from './furnishings.js';
import {fitVolumes,fitOrthographic} from './camera-fit.js';
import {floorPose,viewVolumes,viewDirection,VIEW_MODES,findAvatarSpot,LIGHTING,visualStatus} from './view-layout.js';
import {createAvatarModels} from './avatar-models.js';

export function createOffice(container,onBot,onAssets=()=>{},onAgenda=()=>{},onFloor=()=>{}){
 const scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;container.appendChild(renderer.domElement);
 const pmrem=new THREE.PMREMGenerator(renderer);const roomEnvironment=new RoomEnvironment();scene.environment=pmrem.fromScene(roomEnvironment,.04).texture;scene.environmentIntensity=.25;roomEnvironment.dispose();pmrem.dispose();
 let camera=new THREE.PerspectiveCamera(35,1,.1,1200);camera.position.set(40,30,43);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,7,0);controls.enableDamping=true;controls.minDistance=12;controls.maxDistance=700;controls.maxPolarAngle=Math.PI*.48;
 const ambient=new THREE.HemisphereLight(0xd7e0e7,0x655746,.65);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffc78e,1.6);sun.position.set(-18,30,23);sun.castShadow=true;const shadowSize=matchMedia('(max-width:760px)').matches?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(sun.shadow.camera,{left:-34,right:34,top:35,bottom:-30,far:100});sun.shadow.normalBias=.035;scene.add(sun);const fill=new THREE.DirectionalLight(0xaecbe3,.4);fill.position.set(20,20,-12);scene.add(fill);
 const {M,mat,box,cyl,sphere,group,plant,tree,chair,screen,lamp,desk,sofa,rug,coffeeTable,library,roundTable,partition,pendant,mic,label,batch}=createFurnishings();
 const site=new THREE.Group();scene.add(site);box(site,0,-.6,2,38,.6,34,mat('base',0x6e776c));box(site,0,-.25,0,32,.18,22,M.stone);box(site,0,-.22,14,38,.12,8,mat('road',0x444b49,.3));
 // Paving, planted borders and architectural bollard lights.
 for(let x=-17;x<18;x+=2)for(let z=-10;z<11;z+=2){box(site,x,-.145,z,1.96,.025,1.96,mat('paver'+((x+z)%3),0xb7b6a9,.5));}
 for(const x of [-17,17])for(const z of [-10,-3,5,11]){box(site,x,-.02,z,2.25,.3,2.7,M.stone,true);if(z===-10||z===5)tree(site,x,z,1.1);else plant(site,x,z,1.35);cyl(site,x-.7,.3,z+1,.08,.75,M.steel);cyl(site,x-.7,.7,z+1,.09,.06,M.glow);}
 for(let x=-14;x<16;x+=4){box(site,x,-.15,14,.05,.02,5,M.ivory);}
 for(let i=0;i<4;i++){const car=group(site,-12+i*5,14);const paint=mat('car'+i,[0xa8b7b6,0x33433f,0xd8d1c1,0x576e76][i],.18,.65);const profile=new THREE.Shape();profile.moveTo(-1.75,.22);profile.lineTo(-1.73,.48);profile.quadraticCurveTo(-1.5,.65,-1.05,.65);profile.lineTo(-.65,.99);profile.quadraticCurveTo(.1,1.13,.65,1.02);profile.lineTo(1.15,.66);profile.quadraticCurveTo(1.65,.65,1.75,.44);profile.lineTo(1.7,.22);profile.closePath();const body=new THREE.Mesh(new THREE.ExtrudeGeometry(profile,{depth:1.64,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.05,bevelThickness:.05}),paint);body.geometry.translate(0,0,-.82);body.rotation.y=Math.PI/2;body.castShadow=true;car.add(body);box(car,0,.93,-.05,1.44,.12,1.1,M.dark,true);const windshield=box(car,0,.8,.88,1.4,.42,.035,M.screen);windshield.rotation.x=.75;const rear=box(car,0,.8,-.95,1.4,.35,.035,M.screen);rear.rotation.x=-.75;for(const x of [-.87,.87]){box(car,x,.8,-.05,.015,.25,.95,M.screen);box(car,x,.78,-.08,.025,.3,.045,M.steel);}for(const x of [-.88,.88])for(const z of [-1.12,1.12]){const tire=cyl(car,x,.24,z,.28,.16,M.dark);tire.rotation.z=Math.PI/2;const hub=cyl(car,x*1.015,.24,z,.16,.17,M.steel);hub.rotation.z=Math.PI/2;}for(const x of [-.6,.6])box(car,x,.45,1.72,.32,.08,.02,M.glow,true);}
 for(let i=0;i<8;i++)box(site,11+i*.4,-.15,18,.2,.02,2,M.ivory);box(site,8,.6,12,.55,1.4,.35,M.steel,true);box(site,8,.85,12.19,.35,.55,.02,M.screen);box(site,-11.5,.6,10.3,2,.9,.4,M.steel,true);label(site,'ATELIER',-11.5,.8,10.51,1.7);
 const floorGroups=[],facades=[],structures=[],interiorLights=[],botModels=[];const avatars=createAvatarModels({visualHeight:1.35,onLoaded:({stats})=>onAssets({...stats})});
 function botLabel(bot){const c=document.createElement('canvas');c.width=384;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#17283dec';ctx.beginPath();ctx.roundRect(0,0,384,96,22);ctx.fill();ctx.fillStyle='#fff4df';ctx.font='500 42px system-ui';ctx.textAlign='center';ctx.fillText(bot.name,192,62);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sprite.scale.set(1.8,.45,1);sprite.position.y=1.65;sprite.userData.bot=bot;return sprite;}
 // Dedicated groups stay outside instancing so screen picking retains its target.
 function agendaScreen(parent,id,x,y,z,width){
  const panel=new THREE.Group();panel.userData.agenda=id;panel.userData.assetSlot=true;parent.add(panel);
  screen(panel,x,y,z,width);label(panel,'ABRIR AGENDA',x,y+.55,z+.04,width);
 }
 function floorObstacles(g){
  g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert(),bounds=[];
  g.traverse(o=>{if(!o.isMesh||o.isSprite)return;
   const b=new THREE.Box3().setFromObject(o).applyMatrix4(inverse);
   // Exclude floor finishes, ceiling fittings and decorative flat shadows.
   if(b.max.y<=.32||b.min.y>=1.95)return;
   bounds.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
  });return bounds;
 }
 // Floor programs follow the approved building distribution. Coordinates are design positions, not real activity.
 const positions={ted:[-5,1.8],ceo:[-7,-3.2],luna:[1,3.5],emiliano:[5,-3.4],julian:[5,-3.3],ines:[3,3],libro:[-8,-3], 'tr-editor':[-4,3],mateo:[-5,-2.4],'tr-cm':[-8,4],vale:[3,4],director:[4,-4.45],apps:[-8,-3.4],luca:[-3,-3.4],tadeo:[-2,5],rulo:[5,-2.6]};
 for(let n=0;n<floors.length;n++){
  const g=new THREE.Group();g.userData.floorId=n;g.position.y=n*4.6;scene.add(g);floorGroups.push(g);
  for(const x of [-6,5]){const warm=new THREE.PointLight(0xffc17c,65,14,2);warm.position.set(x,3.7,-2);g.add(warm);interiorLights.push(warm);}
  box(g,0,0,0,26,.28,18,M.steel);box(g,-1.5,.19,0,22.5,.1,17.6,M.oak);box(g,11,.19,0,3.6,.1,17.6,M.stone);
  const structure=new THREE.Group();g.add(structure);structures.push(structure);
  // Exterior skeleton: slender charcoal uprights and full-height glass.
  for(const x of [-12.85,9.3,12.85])for(const z of [-8.8,8.8])box(structure,x,2.3,z,.14,4.5,.14,M.steel);
  for(const z of [-8.85,8.85]){box(structure,0,4.45,z,26,.23,.2,M.steel);box(structure,0,.45,z,26,.08,.07,M.gold);}
  for(const x of [-12.85,12.85])box(structure,x,4.45,0,.2,.23,18,M.steel);
  const facade=new THREE.Group();g.add(facade);facades.push(facade);
  if(n===0){box(g,-8,3.7,9.4,4.5,.15,1.4,M.steel);for(const x of [-9.7,-8,-6.3])box(facade,x,1.8,8.93,.055,3.2,.1,M.gold);box(facade,-8,3.4,8.93,3.4,.055,.1,M.gold);for(const x of [-8.15,-7.85])box(facade,x,1.55,9,.035,.6,.045,M.gold);}
  for(let x=-11.3;x<12.8;x+=3.2){box(facade,x,2.35,8.9,3.14,4.05,.025,M.glass);box(facade,x-1.6,2.35,8.9,.05,4.2,.07,M.steel);}
  for(const x of [-12.9,12.9])for(let z=-7.3;z<9;z+=3.6){box(facade,x,2.35,z,.025,4.05,3.54,M.glass);box(facade,x,2.35,z-1.8,.07,4.2,.05,M.steel);}
  // Rear material wall, warm oak ribs, floating wayfinding.
  box(g,-1.7,1.9,-8.75,22.2,3.4,.15,M.ivory);for(let i=0;i<23;i++)box(g,4.5+i*.2,1.9,-8.62,.075,3.5,.12,M.oak);
  label(g,`${String(n).padStart(2,'0')} / ${floors[n].name.toUpperCase()}`,-1,3.35,-8.64,5.2);
  // Exterior glass elevator, separate from the floor programs, and open side stair.
  for(const x of [13.4,15.8])for(const z of [1.2,3.8])box(g,x,2.2,z,.08,4.4,.08,M.steel);
  box(g,14.6,.3,2.5,2.5,.12,2.7,M.oak);box(g,14.6,2.3,3.8,2.4,4.3,.025,M.glass);box(g,15.8,2.3,2.5,.025,4.3,2.6,M.glass);box(g,14.6,4.35,2.5,2.4,.06,2.6,M.gold);box(g,13.15,.2,2.5,.8,.12,2.1,M.stone);label(g,String(n).padStart(2,'0'),14.6,3.7,3.85,.7);
  for(let s=0;s<17;s++){box(g,11.15,.39+s*.26,-7.5+s*.45,2.5,.12,.47,M.oak);box(g,12.46,1.07+s*.26,-7.5+s*.45,.04,1.4,.04,M.gold);box(g,11.15,.45+s*.26,-7.28+s*.45,2.35,.025,.03,M.glow);}const rail=box(g,12.46,3.15,-3.9,.055,.055,8.32,M.gold);rail.rotation.x=-.524;
  for(const [x,z]of[[-11.7,-7],[-11.7,7],[8,7],[8,-7]])plant(g,x,z,1.1);
  for(const [x,z]of[[-10.8,1.4],[6.8,1.6]]){box(g,x,.45,z,1.2,.65,1.2,M.stone,true);plant(g,x,z,.85);}
  box(g,-12.1,.65,-2,.8,.8,3.3,M.oak,true);for(let i=0;i<4;i++){box(g,-12.05,.65,-3.2+i*.8,.85,.025,.6,M.gold);}
  for(const z of [-7,0,7])for(const x of [-8,-2,4]){box(g,x,4.2,z,2.2,.045,.06,M.glow);}
  if(n===0){
   // Hospitality floor: reception, relaxed lounge, meeting table, round strategy pod.
   box(g,-8,1,4.6,5,.1,1.6,M.stone,true);box(g,-8,.55,4.6,4.8,.9,1.4,M.stone,true);box(g,-8,.17,5.31,4.6,.035,.025,M.glow);screen(g,-8,1.5,4.55,1.2);plant(g,-10.8,4.5,.65);
   rug(g,1,4.2,7.5,5.2);sofa(g,0,3.5).scale.set(1.25,1.1,1.15);sofa(g,4,5,-Math.PI/2).scale.set(1.15,1.1,1.1);coffeeTable(g,1,5.4);pendant(g,1,4.5,1.2,3.5);
   // Concept restoration: a screened meeting bay and central-right workstation.
   // These furnishings approximate the reference geometry, not its offline lighting/render.
   partition(g,-2,-5,7.2,Math.PI/2);box(g,-7,4.12,-8.2,10,.15,.55,M.steel);
   for(let i=0;i<14;i++)box(g,-3.4+i*.085,2.05,-8.46,.035,3.7,.12,M.oak);
   rug(g,-7,-4.5,8.8,5.6);desk(g,4,.1,0,true);plant(g,7.8,.1,.8);
   box(g,-7,1.05,-4.5,5.5,.16,2.2,M.oak,true);for(let i=0;i<4;i++){chair(g,-9+i*1.3,-6.15,Math.PI);chair(g,-9+i*1.3,-2.85);}pendant(g,-7,-4.5,1.6,3.5);screen(g,-7,2.2,-8.5,3.7);
   const pod=new THREE.Mesh(new THREE.CylinderGeometry(3.1,3.1,3.8,48,1,true,.4,Math.PI*1.7),M.glass);pod.position.set(4.8,2.2,-5);g.add(pod);for(let i=0;i<10;i++){const a=.4+i*Math.PI*1.7/9;box(g,4.8+Math.sin(a)*3.1,2.2,-5+Math.cos(a)*3.1,.045,3.8,.045,M.steel);}roundTable(g,4.8,-5,1.45,4);pendant(g,4.8,-5,1.35,3.4);box(g,-12,.9,0,.7,1.4,3,M.oak);plant(g,-11.8,.9,.75);
  }else if(n===1){
   // Research library: continuous shelves, shared reading bar and quiet consultation suite.
   library(g,-5.2,-8.4,13.8);box(g,-7,1,-4.4,7,.15,1.55,M.oak,true);for(let i=0;i<4;i++){chair(g,-9.5+i*1.7,-3.2);lamp(g,-9.5+i*1.7,-4.65,1.1);box(g,-9.4+i*1.7,1.13,-4.2,.7,.045,.45,M.ivory);}rug(g,-7,-4.4,9,4.4);
   partition(g,3.5,-2,9);partition(g,-1,-5.3,6.5,Math.PI/2);roundTable(g,4.5,-5.3,1.35,4);pendant(g,4.5,-5.3,1.2);label(g,'CONSULTA',4.5,2.8,-8.59,2.8);agendaScreen(g,'julian',4.5,1.9,-8.45,2.5);
   desk(g,-4,2.2,0);desk(g,3,2.2,0);sofa(g,-9,5.9);coffeeTable(g,-9,7.1);plant(g,7,-1,.9);
  }else if(n===3){
   // Editorial atelier: pin-up wall, shared creative table, image review and editing stations.
   box(g,-6,2.25,-8.56,10,1.7,.08,M.oak);for(let i=0;i<12;i++){const x=-10.4+(i%6)*1.75,y=1.85+Math.floor(i/6)*.8;box(g,x,y,-8.49,1.5,.65,.02,mat('art'+i,[0x829e9f,0xba9980,0x6c7b72,0xb3b6a0,0xc7b48c,0x8b899c][i%6]));box(g,x-.2,y-.1,-8.47,.8,.05,.01,M.ivory);}
   box(g,-6,1,-7,10,.14,1.3,M.oak);for(let i=0;i<5;i++){box(g,-10+i*2,.5,-7,1.7,.9,1.1,M.ivory,true);cyl(g,-10+i*2,1.2,-7,.16,.3,M.dark);}
   rug(g,-5,-4,8,5);box(g,-5,1,-4,6,.16,2.2,M.oak,true);for(let i=0;i<4;i++){chair(g,-7.1+i*1.4,-5.65,Math.PI);chair(g,-7.1+i*1.4,-2.35);}for(let i=0;i<6;i++){const paper=box(g,-7+i*.8,1.1,(i%2)*.7-4.35,.7,.02,.5,M.ivory);paper.rotation.y=i*.3;}pendant(g,-5,-4,1.5,3.5);
   desk(g,-8,3,0,true);desk(g,3,3,0,true);desk(g,4,-5.5,0,true);partition(g,4,-3.5,7);sofa(g,-2,6.6).scale.set(1.35,1.1,1.15);coffeeTable(g,-2,7.9);
  }else if(n===2){
   // Technology and media: instrument wall, multi-monitor workbenches, curved podcast booth.
   for(let i=0;i<4;i++){box(g,-10+i*1.65,1.65,-8.3,1.4,2.8,.7,M.dark,true);for(let r=0;r<8;r++){box(g,-10+i*1.65,.45+r*.29,-7.92,1.18,.2,.03,M.steel);for(let k=0;k<3;k++)box(g,-10.4+i*1.65+k*.13,.47+r*.29,-7.9,.035,.035,.01,M.screen);}}
   screen(g,-1.4,2.1,-8.5,4);desk(g,-8,-4.5,0,true);desk(g,-3,-4.5,0,true);desk(g,-2,4,0,true);
   // Concept restoration: an acoustic room with rounded front-left corner,
   // connected to straight glazed walls. The earlier isolated arc read as wire.
   const boothGlass=M.glass.clone();boothGlass.opacity=Math.min(.34,M.glass.opacity+.1);
   const booth=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,3.65,24,1,true,-Math.PI/2,Math.PI/2),boothGlass);
   booth.position.set(2.2,2.075,-2.7);g.add(booth);
   partition(g,1,-5.35,5.3,Math.PI/2);partition(g,4.25,-1.5,4.1);partition(g,8,-4.75,6.5,Math.PI/2);
   // Door at the front right, with a separate frame and handle.
   box(g,7.2,2.05,-1.5,1.55,3.6,.025,boothGlass);for(const x of [6.4,8])box(g,x,2.05,-1.5,.07,3.7,.08,M.steel);
   box(g,6.58,1.5,-1.43,.035,.45,.05,M.gold);
   const acoustic=mat('acoustic-felt',0x45403a,.98);
   box(g,4.5,2.05,-8.14,7,3.65,.2,acoustic);
   for(let i=0;i<32;i++)box(g,1.15+i*.215,2.05,-7.98,.075,3.65,.14,M.oak);
   // Broad graphite perimeter ties the volume together while leaving the cutaway open.
   for(const y of [.27,3.94]){
    box(g,4.5,y,-8.03,7.1,.13,.24,M.steel);box(g,8,y,-4.75,.24,.13,6.6,M.steel);
    box(g,1,y,-5.35,.24,.13,5.3,M.steel);box(g,5.1,y,-1.5,5.8,.13,.24,M.steel);
    const points=[];for(let i=0;i<=24;i++){const a=-Math.PI/2+i*Math.PI/48;points.push(new THREE.Vector3(2.2+Math.sin(a)*1.2,y,-2.7+Math.cos(a)*1.2));}
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.085,6,false),M.steel));
   }
   rug(g,4.6,-4.6,5.9,5.2);box(g,4.5,3.79,-7.8,6.5,.04,.055,M.glow);
   roundTable(g,4.6,-4.6,1.3,4);mic(g,4.2,-4.6);mic(g,5.3,-4.6);pendant(g,4.6,-4.6,1.5,3.9);const light=box(g,1.3,2.3,-3.2,.65,.5,.1,M.glow);light.rotation.y=.5;cyl(g,1.3,1.2,-3.2,.025,2.3,M.steel);box(g,1.3,.2,-3.2,1,.04,.7,M.steel);
   rug(g,5,4.6,6,4);sofa(g,5,3.8).scale.set(1.35,1.1,1.15);coffeeTable(g,5,5.4);plant(g,8,1,1.2);label(g,'MEDIA STUDIO',4.6,3.7,-8.04,3);
  }else{
   // Ted's penthouse: a dedicated studio, agenda wall and private lounge.
   rug(g,-5,-1,10,7);desk(g,-5,-1.5,0,true);
   agendaScreen(g,'ted',-5,2.25,-8.45,4.6);
   label(g,'ESTUDIO PRIVADO',-7,3.3,-8.55,3.6);
   for(let i=0;i<20;i++)box(g,-10.5+i*.2,1.9,-8.56,.075,3.5,.12,M.oak);
   library(g,3,-8.4,7);sofa(g,3.5,3.7).scale.set(1.25,1.1,1.15);
   sofa(g,6,5.3,-Math.PI/2);rug(g,3.5,4.8,7.5,5.8);coffeeTable(g,3.5,5.2);
   pendant(g,-5,-1.5,1.4,3.6);pendant(g,3.5,4.8,1.2,3.6);
   roundTable(g,-7,5,1.1,2);plant(g,-10.5,4.8,1.25);plant(g,7,0,1.3);
  }
  const obstacles=floorObstacles(g),occupied=[];
  for(const bot of bots.filter(b=>b.floor===n)){
   const spot=findAvatarSpot(positions[bot.id],obstacles,occupied);
   if(!spot){console.warn(`Sin posición segura para ${bot.id}`);continue;}
   occupied.push(spot);const[x,z]=spot,bg=group(g,x,z);bg.position.y=.3;bg.userData.bot=bot;
   const visual=new THREE.Group();bg.add(visual);sphere(visual,0,.45,0,.25,mat('loading',0x83929a));
   const name=botLabel(bot);bg.add(name);
   const indicator=sphere(bg,1.02,1.65,0,.085,new THREE.MeshBasicMaterial({color:0x8995a3}));indicator.userData.status='unknown';
   const selection=new THREE.Mesh(new THREE.RingGeometry(.7,.77,48),new THREE.MeshBasicMaterial({color:bot.color,side:THREE.DoubleSide}));selection.rotation.x=-Math.PI/2;selection.position.y=.015;selection.visible=false;bg.add(selection);
   avatars.attach(bot,visual);botModels.push({group:bg,base:.3,id:bot.id,floor:n,label:name,indicator,selection});
  }

 }
 const roof=new THREE.Group();roof.userData.floorId=floors.length-1;roof.position.y=floors.length*4.6;scene.add(roof);// Continuous graphite roof interrupted by three true glazed skylights, as in the approved concept.
 box(roof,0,0,-2.3,26.4,.22,13.8,M.steel);box(roof,0,.15,-2.3,25.8,.1,13.6,mat('roof',0x717874,.65));
 box(roof,0,0,8.3,26.4,.22,1.8,M.steel);
 for(const x of [-12.1,-4,4,12.1])box(roof,x,0,6,2.2,.22,3,M.steel);
 for(const x of [-8,0,8]){box(roof,x,.02,6,5.8,.035,2.8,M.glass);for(const z of [4.5,7.5])box(roof,x,.1,z,6.2,.12,.1,M.steel);for(const dx of [-3,0,3])box(roof,x+dx,.1,6,.08,.12,3,M.steel);}
 for(const x of [-12.8,12.8])box(roof,x,.45,0,.16,.6,18,M.steel);for(const z of [-8.8,8.8])box(roof,0,.45,z,26,.6,.16,M.steel);
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){box(roof,-9+i*2.5,.5,-5+j*2.8,2.25,.12,2.45,mat('solar',0x263e58,.25,.6));for(let k=0;k<5;k++)box(roof,-10+i*2.5+k*.49,.566,-5+j*2.8,.018,.01,2.4,M.ivory);}for(let i=0;i<3;i++){box(roof,7,.7,-5+i*3.5,2.2,1.1,2.4,mat('hvac',0x9eaaa4,.45,.4));cyl(roof,7,1.28,-5+i*3.5,.7,.1,M.steel);}
 batch(site);floorGroups.forEach(g=>batch(g,new Set([...facades,...structures])));facades.forEach(g=>batch(g));structures.forEach(g=>batch(g));batch(roof);
 let walls=true;let floor=-1,mode='exterior',selected=null,animateBots=false;const target=new THREE.Vector3(0,7,0),desired=camera.position.clone();let moving=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function fitCamera(){
  const orthographic=floor<0&&mode==='spread',aspect=container.clientWidth/container.clientHeight;
  if(orthographic!==Boolean(camera.isOrthographicCamera)){const previous=camera;camera=orthographic?new THREE.OrthographicCamera(-1,1,1,-1,.1,1200):new THREE.PerspectiveCamera(35,aspect,.1,1200);camera.position.copy(previous.position);controls.object=camera;controls.minZoom=.35;controls.maxZoom=8;}
  camera.aspect=aspect;
  const fit=orthographic?fitOrthographic(viewVolumes(mode,floor),aspect,container.clientHeight,viewDirection(mode,floor)):fitVolumes(viewVolumes(mode,floor),aspect,container.clientHeight,35,viewDirection(mode,floor));
  if(orthographic){camera.top=fit.halfHeight;camera.bottom=-fit.halfHeight;camera.left=-fit.halfHeight*aspect;camera.right=fit.halfHeight*aspect;camera.zoom=1;}
  camera.updateProjectionMatrix();target.copy(fit.center);desired.copy(fit.position);
  // A view change is atomic: stale OrbitControls damping must not corrupt a new floor fit.
  const damping=controls.enableDamping;controls.enableDamping=false;
  controls.target.copy(target);camera.position.copy(desired);camera.lookAt(target);controls.update();
  controls.enableDamping=damping;moving=false;
 }
 function setView(f=-1){floor=f;structures.forEach(g=>g.visible=f<0);facades.forEach(g=>g.visible=walls&&f<0);floorGroups.forEach((g,i)=>g.visible=f<0?(mode!=='spread'||i<4):i===f);roof.visible=f<0&&mode==='exterior';site.visible=f<0&&mode==='exterior';fitCamera();}
 function setMode(next){if(!VIEW_MODES.includes(next))throw new RangeError('Vista desconocida');mode=next;setView(-1);}
 function setNight(v){
  const p=LIGHTING[v?'night':'day'];scene.background=new THREE.Color(p.background);
  sun.color.set(v?0x9bb7ff:0xffc78e);sun.intensity=p.sun;ambient.intensity=p.ambient;
  ambient.color.set(v?0x7194c4:0xd7e0e7);fill.intensity=p.fill;scene.environmentIntensity=p.environment;
  renderer.toneMappingExposure=p.exposure;interiorLights.forEach(l=>l.intensity=p.interior);
 }
 function setStatuses(records=[]){
  const entries=Array.isArray(records)?records:(records.bots??[]);
  const colors={unknown:0x8995a3,working:0x62bf95,review:0xe6b759,idle:0x85b6da,error:0xdb7272};
  for(const b of botModels){const r=entries.find(r=>(r.botId??r.id)===b.id),status=visualStatus(r,{mode:Array.isArray(records)?undefined:records.mode});b.indicator.userData.status=status;b.indicator.material.color.set(colors[status]);}
 }
 setNight(false);
 function tick(){requestAnimationFrame(tick);if(document.hidden)return;const t=performance.now()/1000;floorGroups.forEach((g,i)=>{const p=floorPose(i,mode,floor>=0);for(const axis of ['x','y','z'])g.position[axis]=reduced?p[axis]:THREE.MathUtils.lerp(g.position[axis],p[axis],.08);});if(moving){camera.position.lerp(desired,reduced?1:.07);controls.target.lerp(target,reduced?1:.07);if(camera.position.distanceTo(desired)<.05)moving=false;}for(const b of botModels){b.group.position.y=b.base;b.selection.visible=selected===b.id;b.label.visible=floor>=0||mode!=='exterior'||selected===b.id;}avatars.update(t,animateBots?'idle':false,reduced);controls.update();renderer.render(scene,camera);}
 const resize=()=>{camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);fitCamera();};new ResizeObserver(resize).observe(container);resize();const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];moving=false;});renderer.domElement.addEventListener('pointerup',e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const roots=floorGroups.filter(g=>g.visible);if(roof.visible)roots.push(roof);const hits=ray.intersectObjects(roots,true);const first=hits.find(hit=>{let visible=true,node=hit.object;while(node){if(!node.visible){visible=false;break;}node=node.parent;}return visible&&(!hit.object.material?.transparent||hit.object.isSprite&&hit.object.userData.bot);});if(first){let node=first.object;while(node&&!node.userData.bot&&!node.userData.agenda&&!Number.isInteger(node.userData.floorId))node=node.parent;if(node?.userData.agenda)onAgenda(node.userData.agenda);else if(node?.userData.bot)onBot(node.userData.bot.id);else if(Number.isInteger(node?.userData.floorId))onFloor(node.userData.floorId);}});renderer.domElement.addEventListener('pointercancel',()=>down=null);controls.addEventListener('start',()=>moving=false);tick();
 return {setView,setMode,setExploded(v){setMode(v?'stacked':'exterior');},setWalls(v){walls=Boolean(v);facades.forEach(g=>g.visible=walls&&floor<0);},setNight,setStatuses,select(id){selected=id;},setDemo(v){animateBots=v;},rotate(d){moving=false;const o=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),d);camera.position.copy(controls.target).add(o);},zoom(s){moving=false;if(camera.isOrthographicCamera){camera.zoom=THREE.MathUtils.clamp(camera.zoom/s,.35,8);camera.updateProjectionMatrix();return;}const o=camera.position.clone().sub(controls.target);o.setLength(THREE.MathUtils.clamp(o.length()*s,12,700));camera.position.copy(controls.target).add(o);},reset(){setView(floor);},get renderer(){return renderer;}};
}
