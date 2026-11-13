import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {bots,floors} from './data.js';
import {createFurnishings} from './furnishings.js';
import {fitVolumes,fitOrthographic,applyBottomChromePad} from './camera-fit.js';
import {floorPose,viewVolumes,viewDirection,VIEW_MODES,findAvatarSpot,LIGHTING,visualStatus,stackedTargetYRange} from './view-layout.js';
import {createAvatarModels} from './avatar-models.js';
import {mountFloorLabels} from './floor-labels.js';
import {createMovement,segmentClear,planRoute,BODY_RADIUS,PERSONAL_SPACE} from './movement.js';
import {attachDeskProps} from './desk-props.js';

export function createOffice(container,onBot,onAssets=()=>{},onAgenda=()=>{},onFloor=()=>{}){
 const scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;container.appendChild(renderer.domElement);
 const pmrem=new THREE.PMREMGenerator(renderer);const roomEnvironment=new RoomEnvironment();scene.environment=pmrem.fromScene(roomEnvironment,.04).texture;scene.environmentIntensity=.25;roomEnvironment.dispose();pmrem.dispose();
 let camera=new THREE.PerspectiveCamera(35,1,.1,1200);camera.position.set(40,30,43);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,7,0);controls.enableDamping=true;controls.minDistance=12;controls.maxDistance=700;controls.maxPolarAngle=Math.PI*.48;
 const ambient=new THREE.HemisphereLight(0xd7e0e7,0x655746,.65);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffc78e,1.6);sun.position.set(-18,30,23);sun.castShadow=true;const shadowSize=matchMedia('(max-width:760px)').matches?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(sun.shadow.camera,{left:-34,right:34,top:35,bottom:-30,far:100});sun.shadow.normalBias=.035;scene.add(sun);const fill=new THREE.DirectionalLight(0xaecbe3,.4);fill.position.set(20,20,-12);scene.add(fill);
 const {M,mat,box,cyl,sphere,group,plant,tree,chair,screen,lamp,desk,sofa,rug,coffeeTable,library,roundTable,partition,pendant,mic,label,batch}=createFurnishings();
 const site=new THREE.Group();scene.add(site);box(site,0,-.6,2,38,.6,34,mat('base',0x5c6568));box(site,0,-.25,0,32,.18,22,mat('plaza',0xaeb4bc,.55));box(site,0,-.22,14,38,.12,8,mat('road',0x444b49,.3));
 // Paving, planted borders and architectural bollard lights.
 for(let x=-17;x<18;x+=2)for(let z=-10;z<11;z+=2){box(site,x,-.145,z,1.96,.025,1.96,mat('paver'+((x+z)%3),0xa6acb4,.5));}
 for(const x of [-17,17])for(const z of [-10,-3,5,11]){box(site,x,-.02,z,2.25,.3,2.7,M.stone,true);if(z===-10||z===5)tree(site,x,z,1.1);else plant(site,x,z,1.35);cyl(site,x-.7,.3,z+1,.08,.75,M.steel);cyl(site,x-.7,.7,z+1,.09,.06,M.glow);}
 for(let x=-14;x<16;x+=4){box(site,x,-.15,14,.05,.02,5,M.ivory);}
 for(let i=0;i<4;i++){const car=group(site,-12+i*5,14);const paint=mat('car'+i,[0xa8b7b6,0x33433f,0xd8d1c1,0x576e76][i],.18,.65);const profile=new THREE.Shape();profile.moveTo(-1.75,.22);profile.lineTo(-1.73,.48);profile.quadraticCurveTo(-1.5,.65,-1.05,.65);profile.lineTo(-.65,.99);profile.quadraticCurveTo(.1,1.13,.65,1.02);profile.lineTo(1.15,.66);profile.quadraticCurveTo(1.65,.65,1.75,.44);profile.lineTo(1.7,.22);profile.closePath();const body=new THREE.Mesh(new THREE.ExtrudeGeometry(profile,{depth:1.64,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.05,bevelThickness:.05}),paint);body.geometry.translate(0,0,-.82);body.rotation.y=Math.PI/2;body.castShadow=true;car.add(body);box(car,0,.93,-.05,1.44,.12,1.1,M.dark,true);const windshield=box(car,0,.8,.88,1.4,.42,.035,M.screen);windshield.rotation.x=.75;const rear=box(car,0,.8,-.95,1.4,.35,.035,M.screen);rear.rotation.x=-.75;for(const x of [-.87,.87]){box(car,x,.8,-.05,.015,.25,.95,M.screen);box(car,x,.78,-.08,.025,.3,.045,M.steel);}for(const x of [-.88,.88])for(const z of [-1.12,1.12]){const tire=cyl(car,x,.24,z,.28,.16,M.dark);tire.rotation.z=Math.PI/2;const hub=cyl(car,x*1.015,.24,z,.16,.17,M.steel);hub.rotation.z=Math.PI/2;}for(const x of [-.6,.6])box(car,x,.45,1.72,.32,.08,.02,M.glow,true);}
 for(let i=0;i<8;i++)box(site,11+i*.4,-.15,18,.2,.02,2,M.ivory);box(site,8,.6,12,.55,1.4,.35,M.steel,true);box(site,8,.85,12.19,.35,.55,.02,M.screen);
 // San Junípero Tower: bollards + LARGE beige stone monolith (phone-readable).
 const ledWarm=new THREE.MeshStandardMaterial({color:0xffe6b0,emissive:0xff8a18,emissiveIntensity:5.5,roughness:.32});
 // Transparent so picking rays pass (opaque panels broke avatar tests).
 // Down-facing soffit wash only (FrontSide). Hidden in isolated/stacked/2x2 and omitted on the top floor so it never draws over a floor plan or through roof skylights.
const ceilWarm=new THREE.MeshBasicMaterial({color:0xffc878,transparent:true,opacity:.88,depthWrite:false,toneMapped:false,side:THREE.FrontSide,depthTest:true});
const ceilingWashes=[];
function soffitWash(g,x,y,z,w,d){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),ceilWarm);
 mesh.rotation.x=Math.PI/2; // normal points down: visible from below/through facade glass, culled from above
 mesh.position.set(x,y,z);mesh.scale.set(w,d,1);mesh.userData.ceilingWash=true;mesh.renderOrder=1;g.add(mesh);return mesh;
}
function syncCeilingWash(){
 const show=floor<0&&mode==='exterior';
 ceilingWashes.forEach(n=>{n.visible=show;});
}
 for(let x=-13;x<=13;x+=2.4){cyl(site,x,.28,10.7,.07,.58,M.dark);cyl(site,x,.6,10.7,.11,.09,ledWarm);sphere(site,x,.72,10.7,.08,ledWarm);}
 // Monolith: ~half-bay wide, nearly GF tall, RIGHT of entrance (-8), facing parking.
 const monolith=group(site,-2.4,10.35);
 const monoStone=mat('mono-beige',0xe8dfd2,.42);
 box(monolith,0,2.2,0,4.4,4.4,1.0,monoStone,true);
 for(const y of [.95,2.0,3.05])box(monolith,0,y,.51,4.3,.04,.03,mat('mono-grout',0xcfc6ba,.7));
 for(const x of [-1.1,1.1])box(monolith,x,2.2,.51,.04,4.25,.03,mat('mono-grout2',0xcfc6ba,.7));
 // Warm uplights (3) — strong V-glow on stone
 for(const x of [-1.35,0,1.35]){box(monolith,x,.06,.62,.7,.1,.4,ledWarm);cyl(monolith,x,.2,.62,.14,.14,ledWarm);sphere(monolith,x,.32,.62,.12,ledWarm);}
 // Dark letters ON stone (transparent canvas — NOT a dark plaque)
 (function(){const c=document.createElement('canvas');c.width=1024;c.height=1280;const ctx=c.getContext('2d');
  ctx.clearRect(0,0,1024,1280);
  ctx.fillStyle='#1a1c20';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='800 280px Georgia,serif';ctx.fillText('SJ',512,300);
  ctx.fillRect(300,470,424,8);
  ctx.font='800 86px Inter,system-ui,sans-serif';ctx.fillText('SAN JUNÍPERO',512,600);
  ctx.font='700 64px Inter,system-ui,sans-serif';ctx.fillText('TOWER',512,710);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(3.6,4.0),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false,depthWrite:false}));
  plate.position.set(0,2.25,.52);monolith.add(plate);})();
 // Planters in front (REF)
 box(monolith,-1.4,.32,1.05,1.3,.64,1.0,M.dark,true);plant(monolith,-1.4,1.05,1.15);
 box(monolith,1.5,.28,1.0,1.0,.55,.85,M.dark,true);plant(monolith,1.5,1.0,.9);
const movement=createMovement();
 const floorGroups=[],facades=[],structures=[],interiorLights=[],botModels=[];const avatars=createAvatarModels({visualHeight:1.35,onLoaded:({stats})=>onAssets({...stats})});
 function botLabel(bot){const c=document.createElement('canvas');c.width=384;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#17283dec';ctx.beginPath();ctx.roundRect(0,0,384,96,22);ctx.fill();ctx.fillStyle='#fff4df';ctx.font='500 42px system-ui';ctx.textAlign='center';ctx.fillText(bot.name,192,62);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sprite.scale.set(1.8,.45,1);sprite.position.y=1.65;sprite.userData.bot=bot;return sprite;}
 // Dedicated groups stay outside instancing so screen picking retains its target.
 function agendaScreen(parent,id,x,y,z,width){
  const panel=new THREE.Group();panel.userData.agenda=id;panel.userData.assetSlot=true;parent.add(panel);
  screen(panel,x,y,z,width);label(panel,id==='julian'?'PIZARRÓN DE JULIÁN':'ABRIR AGENDA',x,y+.55,z+.04,width);
 }
 function floorObstacles(g){
  g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert(),bounds=[];
  g.traverse(o=>{if(!o.isMesh||o.isSprite)return;
   const b=new THREE.Box3().setFromObject(o).applyMatrix4(inverse);
   // Exclude floor finishes, ceiling fittings and decorative flat shadows.
   if(b.max.y<=.32||b.min.y>=1.95)return;
   let ancestor=o,seat=null;while(ancestor&&ancestor!==g){if(ancestor.userData.motionSeat){seat=ancestor.userData.motionSeat;break;}ancestor=ancestor.parent;}
   bounds.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,seat});
  });return bounds;
 }
 // Floor programs follow the approved building distribution. Coordinates are design positions, not real activity.
 const positions={ted:[-5,1.8],ceo:[-7,-3.2],luna:[1,3.5],emiliano:[5,-3.4],julian:[5,-3.3],ines:[3,3],libro:[-8,-3], 'tr-editor':[-4,3],mateo:[-5,-2.4],'tr-cm':[-8,4],vale:[5.5,5.4],director:[-6,-4],apps:[-8,-3.4],luca:[-3,-3.4],tadeo:[-2,5],rulo:[4.6,-4.6]};
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
  // Entrance canopy belongs to exterior structure, not the isolated interior.
  if(n===0){
   // LARGE recessed glass entrance + thick dark canopy facing parking (REF).
   const canopyGlass=M.glass.clone();canopyGlass.color.set(0x0e1319);canopyGlass.opacity=.5;canopyGlass.transparent=true;canopyGlass.depthWrite=false;
   const doorGlass=M.glass.clone();doorGlass.color.set(0xffe8c8);doorGlass.opacity=.22;doorGlass.transparent=true;
   const lobbyGlow=new THREE.MeshStandardMaterial({color:0xffd9a0,emissive:0xff9a30,emissiveIntensity:3.6,roughness:.55,transparent:true,opacity:.9,depthWrite:false});
   // Thick projecting canopy (~8.4 wide × ~3.6 deep)
   box(structure,-8,3.95,10.8,8.6,.36,3.8,M.dark);
   box(structure,-8,3.78,10.8,8.1,.08,3.5,canopyGlass);
   // Warm downlights under canopy
   for(const x of [-11.2,-9.6,-8,-6.4,-4.8])box(structure,x,3.62,10.4,.65,.1,.65,ledWarm);
   for(const x of [-11.0,-4.95])box(structure,x,1.95,9.55,.16,3.9,.16,M.steel);
   // Recessed warm lobby behind doors
   box(structure,-8,1.95,8.45,7.2,3.8,.7,mat('lobby-dark',0x151a22,.5));
   box(structure,-8,3.55,8.35,6.8,.12,.35,lobbyGlow);
   box(structure,-8,2.0,8.2,6.5,3.2,.08,lobbyGlow);
   // Four tall glass door leaves + handles
   for(const x of [-10.55,-9.0,-7.0,-5.45]){box(facade,x,1.9,8.9,.1,3.7,.12,M.steel);box(facade,x,1.9,8.98,1.35,3.5,.04,doorGlass);box(facade,x+.45,1.7,9.02,.06,1.1,.05,M.dark);}
   box(facade,-8,3.8,8.92,7.0,.1,.12,M.steel);
   box(facade,-8,.12,8.95,7.0,.14,.4,M.stone);
   // Extra lobby point light (registered for dusk intensity)
   const lobbyPt=new THREE.PointLight(0xffb060,95,16,2);lobbyPt.position.set(-8,3.2,7.6);structure.add(lobbyPt);interiorLights.push(lobbyPt);
  }
  // Warm interior wash on the inside of the front glass — vertical plane, FrontSide toward the street (no slab/roof rectangles).
  const windowGlow=new THREE.MeshBasicMaterial({color:0xffc070,transparent:true,opacity:.35,depthWrite:false,toneMapped:false,side:THREE.FrontSide,depthTest:true});
  for(let x=-11.3;x<12.8;x+=3.2){
   if(!(n===0&&x>-11.6&&x<-4.4)){
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(3.0,3.6),windowGlow);
    pane.position.set(x,2.5,8.72);pane.userData.windowGlow=true;pane.renderOrder=1;facade.add(pane);
   }
  }
  // Front glass: skip entrance bay on GF so doors read clearly
  for(let x=-11.3;x<12.8;x+=3.2){
   if(n===0&&x>-11.6&&x<-4.4){box(facade,x-1.6,2.35,8.9,.05,4.2,.07,M.steel);continue;}
   box(facade,x,2.35,8.9,3.14,4.05,.025,M.glass);box(facade,x-1.6,2.35,8.9,.05,4.2,.07,M.steel);
  }
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
  // Warm recessed ceiling wash (downward planes). Skip the top floor — skylights would leak orange rectangles onto the roof.
  if(n<floors.length-1){
   const wash=new THREE.Group();wash.userData.ceilingWash=true;g.add(wash);ceilingWashes.push(wash);
   for(const z of [-6.0,-1.5,2.5,6.0])for(const x of [-8.5,-3.2,2.0,7.0])soffitWash(wash,x,4.05,z,4.6,2.2);
   for(const z of [-7,0,7])soffitWash(wash,0,4.12,z,23,.14);
  }
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
  }else if(n===2){
   // Proyectos: instrument wall, four workbenches and a shared meeting table (podcast booth moved to Medios).
   for(let i=0;i<4;i++){box(g,-10+i*1.65,1.65,-8.3,1.4,2.8,.7,M.dark,true);for(let r=0;r<8;r++){box(g,-10+i*1.65,.45+r*.29,-7.92,1.18,.2,.03,M.steel);for(let k=0;k<3;k++)box(g,-10.4+i*1.65+k*.13,.47+r*.29,-7.9,.035,.035,.01,M.screen);}}
   screen(g,-1.4,2.1,-8.5,4);desk(g,-8,-4.5,0,true);desk(g,-3,-4.5,0,true);desk(g,-8,4,0,true);desk(g,-3,4,0,true);
   rug(g,5,-4.4,6.4,5.2);roundTable(g,5,-4.4,1.35,4);pendant(g,5,-4.4,1.4,3.5);
   rug(g,5,4.6,6,4);sofa(g,5,3.8).scale.set(1.35,1.1,1.15);coffeeTable(g,5,5.4);plant(g,8,1,1.2);
  }else if(n===3){
   // Medios y Producción: podcast booth (moved from Proyectos), video set, social desk, edit suite.
   const boothGlass=M.glass.clone();boothGlass.opacity=Math.min(.34,M.glass.opacity+.1);
   const booth=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,3.65,24,1,true,-Math.PI/2,Math.PI/2),boothGlass);
   booth.position.set(2.2,2.075,-2.7);g.add(booth);
   partition(g,1,-5.35,5.3,Math.PI/2);partition(g,4.25,-1.5,4.1);partition(g,8,-4.75,6.5,Math.PI/2);
   box(g,7.2,2.05,-1.5,1.55,3.6,.025,boothGlass);for(const x of [6.4,8])box(g,x,2.05,-1.5,.07,3.7,.08,M.steel);
   box(g,6.58,1.5,-1.43,.035,.45,.05,M.gold);
   const acoustic=mat('acoustic-felt',0x45403a,.98);
   box(g,4.5,2.05,-8.14,7,3.65,.2,acoustic);
   for(let i=0;i<32;i++)box(g,1.15+i*.215,2.05,-7.98,.075,3.65,.14,M.oak);
   for(const y of [.27,3.94]){
    box(g,4.5,y,-8.03,7.1,.13,.24,M.steel);box(g,8,y,-4.75,.24,.13,6.6,M.steel);
    box(g,1,y,-5.35,.24,.13,5.3,M.steel);box(g,5.1,y,-1.5,5.8,.13,.24,M.steel);
    const points=[];for(let i=0;i<=24;i++){const a=-Math.PI/2+i*Math.PI/48;points.push(new THREE.Vector3(2.2+Math.sin(a)*1.2,y,-2.7+Math.cos(a)*1.2));}
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.085,6,false),M.steel));
   }
   rug(g,4.6,-4.6,5.9,5.2);box(g,4.5,3.79,-7.8,6.5,.04,.055,M.glow);
   roundTable(g,4.6,-4.6,1.3,4);mic(g,4.2,-4.6);mic(g,5.3,-4.6);pendant(g,4.6,-4.6,1.5,3.9);const light=box(g,1.3,2.3,-3.2,.65,.5,.1,M.glow);light.rotation.y=.5;cyl(g,1.3,1.2,-3.2,.025,2.3,M.steel);box(g,1.3,.2,-3.2,1,.04,.7,M.steel);
   label(g,'CABINA',4.6,3.7,-8.04,2.2);
   // Video set — reused primitives only (backdrop, two soft lights, camera, chair).
   box(g,-6.2,2.05,-8.35,8.2,3.7,.08,mat('cyc',0x2a3140,.85));
   rug(g,-6.2,-4.6,7.2,5.4);
   for(const [lx,lz] of [[-9.4,-2.8],[-3.2,-2.4]]){
    cyl(g,lx,1.15,lz,.025,2.3,M.steel);box(g,lx,.08,lz,.55,.04,.55,M.steel);
    const soft=box(g,lx,2.45,lz,.7,.55,.08,M.glow);soft.rotation.y=.35;
   }
   const cam=group(g,-5.2,-1.6);box(cam,0,1.15,0,.38,.22,.28,M.dark,true);cyl(cam,.22,1.15,0,.09,.16,M.steel);cyl(cam,0,.55,0,.02,1.1,M.steel);for(const a of [0,2.1,4.2]){const leg=box(cam,Math.sin(a)*.28,.08,Math.cos(a)*.28,.04,.04,.55,M.steel);leg.rotation.y=a;}
   chair(g,-7.2,-4.2,Math.PI*.15);label(g,'SET',-6.2,3.5,-8.26,1.6);
   // Escritorio de redes and sala de edición (existing double desks).
   desk(g,-8.2,5.8,0,true);desk(g,-2.2,5.8,0,true);plant(g,-10.4,7.2,.8);
  }else if(n===4){
   // Editorial atelier: pin-up wall, shared creative table, image review and editing stations.
   box(g,-6,2.25,-8.56,10,1.7,.08,M.oak);for(let i=0;i<12;i++){const x=-10.4+(i%6)*1.75,y=1.85+Math.floor(i/6)*.8;box(g,x,y,-8.49,1.5,.65,.02,mat('art'+i,[0x829e9f,0xba9980,0x6c7b72,0xb3b6a0,0xc7b48c,0x8b899c][i%6]));box(g,x-.2,y-.1,-8.47,.8,.05,.01,M.ivory);}
   box(g,-6,1,-7,10,.14,1.3,M.oak);for(let i=0;i<5;i++){box(g,-10+i*2,.5,-7,1.7,.9,1.1,M.ivory,true);cyl(g,-10+i*2,1.2,-7,.16,.3,M.dark);}
   rug(g,-5,-4,8,5);box(g,-5,1,-4,6,.16,2.2,M.oak,true);for(let i=0;i<4;i++){chair(g,-7.1+i*1.4,-5.65,Math.PI);chair(g,-7.1+i*1.4,-2.35);}for(let i=0;i<6;i++){const paper=box(g,-7+i*.8,1.1,(i%2)*.7-4.35,.7,.02,.5,M.ivory);paper.rotation.y=i*.3;}pendant(g,-5,-4,1.5,3.5);
   desk(g,-8,3,0,true);desk(g,3,3,0,true);desk(g,4,-5.5,0,true);partition(g,4,-3.5,7);sofa(g,-2,6.6).scale.set(1.35,1.1,1.15);coffeeTable(g,-2,7.9);
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
  // Pull office chairs clear of table edges for these wide plush avatars. Only
  // the assigned chair allows intentional seated contact; every other mesh blocks.
  const seats=[];g.updateMatrixWorld(true);
  g.traverse(o=>{if(!o.isGroup||!o.children.some(c=>c.isMesh&&Math.abs(c.position.y-.75)<.001&&Math.abs(c.scale.x-.7)<.001))return;
   const round=n===0&&o.position.x>0&&o.position.z<0||n===1&&o.position.x>0&&o.position.z<0||n===2&&o.position.x>0&&o.position.z<0||n===3&&o.position.x>0&&o.position.z<0||n===5&&o.position.z>0;const pull=round?.35:.65;o.position.x+=Math.sin(o.rotation.y)*pull;o.position.z+=Math.cos(o.rotation.y)*pull;
   o.userData.motionSeat=`${n}-seat-${seats.length}`;seats.push({node:o,id:o.userData.motionSeat});
  });g.updateMatrixWorld(true);
  for(const s of seats){const p=g.worldToLocal(s.node.getWorldPosition(new THREE.Vector3()));s.position=[p.x,p.z];s.angle=s.node.rotation.y;const cushion=s.node.children.find(c=>c.isMesh&&Math.abs(c.position.y-.75)<.001&&Math.abs(c.scale.x-.7)<.001);s.height=new THREE.Box3().setFromObject(cushion).applyMatrix4(g.matrixWorld.clone().invert()).max.y;delete s.node;}
  // Lounge / café / waiting zones per floor (sofa + coffee areas from layout).
  const loungeByFloor={0:[1.2,4.8],1:[-9,6.4],2:[5.2,4.9],3:[5,4.2],4:[-2,7.2],5:[3.8,5.0]};
  const meetingByFloor={0:[-7,-4.5],1:[4.5,-5.3],2:[5,-4.4],3:[4.6,-4.6],4:[-5,-4],5:[-7,5]};
  const obstacles=floorObstacles(g),occupied=[],assigned=[];
  for(const bot of bots.filter(b=>b.floor===n)){
   // A station and its nearby staging point are selected together so enclosed
   // rooms do not strand a character on the wrong side of a wall.
   let spot=null,assignedSeat=null;
   const candidates=seats.filter(s=>segmentClear(s.position,s.position,obstacles,BODY_RADIUS,s.id)).sort((a,b)=>Math.hypot(a.position[0]-positions[bot.id][0],a.position[1]-positions[bot.id][1])-Math.hypot(b.position[0]-positions[bot.id][0],b.position[1]-positions[bot.id][1]));
   for(const seat of candidates){
    if(assigned.some(s=>Math.hypot(s.position[0]-seat.position[0],s.position[1]-seat.position[1])<PERSONAL_SPACE))continue;
    for(let radius=1.5;radius<=3.6&&!spot;radius+=.3)for(let angle=0;angle<Math.PI*2&&!spot;angle+=Math.PI/12){
     const candidate=[seat.position[0]+Math.sin(angle)*radius,seat.position[1]+Math.cos(angle)*radius];
     if(!segmentClear(candidate,candidate,obstacles)||occupied.some(p=>Math.hypot(candidate[0]-p[0],candidate[1]-p[1])<PERSONAL_SPACE)||assigned.some(s=>Math.hypot(candidate[0]-s.position[0],candidate[1]-s.position[1])<PERSONAL_SPACE)||occupied.some(p=>Math.hypot(seat.position[0]-p[0],seat.position[1]-p[1])<PERSONAL_SPACE))continue;
     if(planRoute(candidate,seat.position,obstacles,seat.id)){spot=candidate;assignedSeat=seat.id;assigned.push(seat);}
    }
    if(spot)break;
   }
   if(!spot)spot=findAvatarSpot(positions[bot.id],obstacles,occupied);
   if(!spot){console.warn(`Sin posición segura para ${bot.id}`);continue;}
   occupied.push(spot);const[x,z]=spot,bg=group(g,x,z);bg.position.y=.3;bg.userData.bot=bot;
   const visual=new THREE.Group();bg.add(visual);sphere(visual,0,.45,0,.25,mat('loading',0x83929a));
   const name=botLabel(bot);bg.add(name);
   const indicator=sphere(bg,1.02,1.65,0,.085,new THREE.MeshBasicMaterial({color:0x8995a3}));indicator.userData.status='unknown';
   const selection=new THREE.Mesh(new THREE.RingGeometry(.7,.77,48),new THREE.MeshBasicMaterial({color:bot.color,side:THREE.DoubleSide}));selection.rotation.x=-Math.PI/2;selection.position.y=.015;selection.visible=false;bg.add(selection);
   movement.add({id:bot.id,floor:n,position:spot,obstacles,seats,assignedSeat,lounge:loungeByFloor[n]||null,meeting:meetingByFloor[n]||null});
   avatars.attach(bot,visual);botModels.push({group:bg,visual,base:.3,id:bot.id,floor:n,label:name,indicator,selection});
  }

 }
 const roof=new THREE.Group();roof.userData.floorId=floors.length-1;roof.position.y=floors.length*4.6;scene.add(roof);// Continuous graphite roof interrupted by three true glazed skylights, as in the approved concept.
 box(roof,0,0,-2.3,26.4,.22,13.8,M.steel);box(roof,0,.15,-2.3,25.8,.1,13.6,mat('roof',0x717874,.65));
 box(roof,0,0,8.3,26.4,.22,1.8,M.steel);
 for(const x of [-12.1,-4,4,12.1])box(roof,x,0,6,2.2,.22,3,M.steel);
 for(const x of [-8,0,8]){box(roof,x,.02,6,5.8,.035,2.8,M.glass);for(const z of [4.5,7.5])box(roof,x,.1,z,6.2,.12,.1,M.steel);for(const dx of [-3,0,3])box(roof,x+dx,.1,6,.08,.12,3,M.steel);}
 for(const x of [-12.8,12.8])box(roof,x,.25,0,.16,.35,17.2,M.steel);for(const z of [-8.8])box(roof,0,.25,z,25.5,.35,.16,M.steel); // rear only — front parapet is the crown
 // Minimal rooftop gear, low + rearward so parapet hides it from street/front.
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){box(roof,-7+i*2.2,.18,-6.2+j*2.0,1.8,.06,1.7,mat('solar',0x263e58,.25,.6));}
 box(roof,6.5,.22,-6.0,1.5,.4,1.6,mat('hvac',0x9eaaa4,.45,.4));cyl(roof,6.5,.48,-6.0,.35,.05,M.steel);
 // Integrated parapet crown — same outer footprint as facade glass (z=8.9 / x=±12.9).
 // Sits ON the roof slab as the building's own parapet; no floating overhang box.
 const fasciaMat=mat('fascia-black',0x050607,.4,.14);
 const parapetH=1.95; // taller so rooftop gear reads as behind parapet
 // Front: outer face EXACTLY at glass plane z=8.9; depth inward only (~0.36)
 box(roof,0,parapetH/2,8.9-0.18,25.8,parapetH,.36,fasciaMat);
 // Coping flush with outer face (very slight top lip, not overhanging mass)
 box(roof,0,parapetH+.06,8.9-0.22,25.9,.12,.44,fasciaMat);
 // Dark slab edge under parapet — reads as top-floor plate meeting crown
 box(roof,0,.06,8.72,25.8,.12,.55,fasciaMat);
 // Side parapets flush with side glass planes x=±12.9
 box(roof,-12.9+0.18,parapetH/2,0,.36,parapetH,17.6,fasciaMat);
 box(roof,12.9-0.18,parapetH/2,0,.36,parapetH,17.6,fasciaMat);
 box(roof,-12.9+0.22,parapetH+.06,0,.44,.12,17.7,fasciaMat);
 box(roof,12.9-0.22,parapetH+.06,0,.44,.12,17.7,fasciaMat);
 // Vertical mullions continue from facade UP into parapet (column continuity)
 for(let x=-11.3;x<12.8;x+=3.2)box(roof,x-1.6,parapetH/2,8.9-.04,.07,parapetH+.08,.1,M.steel);
 // Strong golden LED under crown (REF halo) — MeshBasic so it reads on phone
 const ledCrown=new THREE.MeshBasicMaterial({color:0xffb040,toneMapped:false});
 box(roof,0,.05,8.9+.04,25.6,.2,.2,ledCrown);
 box(roof,0,.14,8.9-.06,25.2,.08,.1,ledCrown);
 box(roof,-12.9-.05,.05,0,.2,.2,17.2,ledCrown);
 box(roof,12.9+.05,.05,0,.2,.2,17.2,ledCrown);
 // D9 (Rob 13/11, R07): roof crown letters removed; black fascia and gold LED stay. Kept behind a flag for rollback.
 const CROWN_LETTERS=false;
 if(CROWN_LETTERS)(function(){
  const W=4096,H=1024;
  const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#ffffff';ctx.textBaseline='middle';ctx.textAlign='left';
  // Soft halo once, then crisp fill (avoid phone bloom mush)
  const paint=(fn)=>{ctx.shadowColor='rgba(255,255,255,.55)';ctx.shadowBlur=18;fn();ctx.shadowBlur=0;fn();};
  paint(()=>{ctx.font='900 700px Georgia,"Times New Roman",serif';ctx.fillText('SJ',50,H*0.5);});
  ctx.fillRect(880,60,20,H-120);
  paint(()=>{ctx.font='900 360px Inter,system-ui,Arial,sans-serif';ctx.fillText('SAN JUNÍPERO',960,H*0.34);});
  ctx.font='800 250px Inter,system-ui,Arial,sans-serif';
  const label='TOWER';
  const metrics=ctx.measureText?.(label);
  const tw=(metrics&&Number.isFinite(metrics.width))?metrics.width:820;
  const tx=960, ty=H*0.72, lineW=280, gap=48;
  ctx.fillRect(tx,ty-12,lineW,18);
  paint(()=>{ctx.fillText(label,tx+lineW+gap,ty);});
  ctx.fillRect(tx+lineW+gap+tw+gap,ty-12,lineW,18);
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=renderer.capabilities?.getMaxAnisotropy?.()||16;
  tex.generateMipmaps=true;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.magFilter=THREE.LinearFilter;
  tex.needsUpdate=true;
  const sign=new THREE.Mesh(
    new THREE.PlaneGeometry(24.8,parapetH*0.96),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false,depthWrite:false,color:0xffffff})
  );
  sign.position.set(0,parapetH/2+.02,8.9+.06);roof.add(sign);
 })();
batch(site);floorGroups.forEach(g=>batch(g,new Set([...facades,...structures])));facades.forEach(g=>batch(g));structures.forEach(g=>batch(g));batch(roof);
 let walls=true;let floor=-1,mode='exterior',selected=null,animateBots=false;const target=new THREE.Vector3(0,7,0),desired=camera.position.clone();let moving=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const VIEW_ANIM_MS=1050;
 function easeInOutCubic(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
 let camTween=null,floorTween=null,lightTween=null;
 function startCamTween(toPos,toTarget,dur=VIEW_ANIM_MS){
  if(reduced){camera.position.copy(toPos);controls.target.copy(toTarget);camera.lookAt(toTarget);controls.update();camTween=null;moving=false;return;}
  camTween={t0:performance.now(),dur,fromPos:camera.position.clone(),toPos:toPos.clone(),fromTarget:controls.target.clone(),toTarget:toTarget.clone()};
  moving=true;
 }
 function startFloorTween(){
  const to=floorGroups.map((_,i)=>floorPose(i,mode,floor>=0));
  if(reduced){floorGroups.forEach((g,i)=>{g.position.set(to[i].x,to[i].y,to[i].z);});floorTween=null;return;}
  floorTween={t0:performance.now(),dur:VIEW_ANIM_MS,from:floorGroups.map(g=>({x:g.position.x,y:g.position.y,z:g.position.z})),to};
 }
 function hexOf(c){return '#'+c.getHexString();}
 function lerpHex(a,b,t){const pa=parseInt(String(a).replace('#',''),16),pb=parseInt(String(b).replace('#',''),16);const ar=(pa>>16)&255,ag=(pa>>8)&255,ab=pa&255,br=(pb>>16)&255,bg=(pb>>8)&255,bb=pb&255;const r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);return '#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);}
 function captureLight(){return {background:hexOf(scene.background||new THREE.Color(0xb8c4d2)),sunColor:hexOf(sun.color),ambientSky:hexOf(ambient.color),sun:sun.intensity,ambient:ambient.intensity,fill:fill.intensity,environment:scene.environmentIntensity??.25,exposure:renderer.toneMappingExposure,interior:interiorLights[0]?.intensity??28,isNight:document.documentElement?.dataset?.theme==='night'};}
 function fitCamera({animate=false}={}){
  const orthographic=floor<0&&mode==='spread',aspect=container.clientWidth/container.clientHeight;
  if(orthographic!==Boolean(camera.isOrthographicCamera)){const previous=camera;camera=orthographic?new THREE.OrthographicCamera(-1,1,1,-1,.1,1200):new THREE.PerspectiveCamera(35,aspect,.1,1200);camera.position.copy(previous.position);controls.object=camera;controls.minZoom=.35;controls.maxZoom=8;}
  camera.aspect=aspect;
  const fit=orthographic?fitOrthographic(viewVolumes(mode,floor),aspect,container.clientHeight,viewDirection(mode,floor)):fitVolumes(viewVolumes(mode,floor),aspect,container.clientHeight,35,viewDirection(mode,floor));
  if(orthographic&&mode==='spread'&&floor<0){
    let frac=0;
    try{
      const bar=container.querySelector?.('#vista-toolbar')||container.parentElement?.querySelector?.('#vista-toolbar');
      const h=container.clientHeight||0;
      if(bar&&h){
        const box=bar.getBoundingClientRect?.();
        const chrome=(box&&box.height?box.height:(bar.offsetHeight||0))+12;
        frac=Math.min(.28,Math.max(.24,chrome/h));
      }
    }catch{}
    if(frac>0)applyBottomChromePad(fit,viewDirection(mode,floor),frac);
  }
  if(orthographic){camera.top=fit.halfHeight;camera.bottom=-fit.halfHeight;camera.left=-fit.halfHeight*aspect;camera.right=fit.halfHeight*aspect;camera.zoom=1;}
  camera.updateProjectionMatrix();target.copy(fit.center);desired.copy(fit.position);
  if(!animate||reduced){
   const damping=controls.enableDamping;controls.enableDamping=false;
   controls.target.copy(target);camera.position.copy(desired);camera.lookAt(target);controls.update();
   controls.enableDamping=damping;camTween=null;moving=false;
  }else{
   startCamTween(desired,target,VIEW_ANIM_MS);
  }
 }
 function isStackOverview(){return mode==='stacked'&&floor<0;}
function syncStackControls(){const stacked=isStackOverview();controls.enableRotate=!stacked;controls.enablePan=!stacked;controls.enableZoom=true;controls.screenSpacePanning=true;controls.touches=floor>=0?{ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE}:{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};}

 let floorLabels=null;
 let painting=false;
 function paintNow(){
  // s9e: also move floor labels here. flushView used to update 3D+pins but
  // leave labels stale when rAF is paused during a touch.
  if(painting)return;
  painting=true;
  try{
   floorLabels?.update(projectFloorLabels());
   renderer.render(scene,camera);
   globalThis.__atelierAfterRender?.();
  }finally{painting=false;}
 }
 function flushView(){
  // Paint pins in the same turn as a camera/view change so they never sit one frame behind (t369u / t375u).
  controls.update();
  paintNow();
 }

function setView(f=-1,{animate=true}={}){floor=f;structures.forEach(g=>g.visible=f<0);facades.forEach(g=>g.visible=walls&&f<0);floorGroups.forEach((g,i)=>g.visible=f<0||i===f);{const st=f<0&&mode==='stacked',sp=f<0&&mode==='spread',sc=sun.shadow.camera,dy=st?34:0;sun.position.set(-18,30+dy,23);sun.target.position.set(0,dy,0);sun.target.updateMatrixWorld();Object.assign(sc,st?{left:-60,right:60,top:62,bottom:-56,far:170}:sp?{left:-50,right:50,top:52,bottom:-48,far:140}:{left:-34,right:34,top:35,bottom:-30,far:100});sc.updateProjectionMatrix();}roof.visible=f<0&&mode==='exterior';site.visible=f<0&&mode==='exterior';syncCeilingWash();stackVy=0;syncStackControls();startFloorTween();fitCamera({animate});if(animate!==false)flushView();}
 function setMode(next){if(!VIEW_MODES.includes(next))throw new RangeError('Vista desconocida');mode=next;setView(-1,{animate:true});}
 function setNight(v){
  // Noche = deep night; off = dusk/blue-hour (fachada REF), not bright noon.
  applyLighting(v
   ?{...LIGHTING.night,sunColor:'#9bb7ff',ambientSky:'#7194c4',isNight:true}
   :{...LIGHTING.dusk,background:0xb8c4d2,sunColor:'#ff9a6a',ambientSky:'#8fa3b8',sun:.22,ambient:.42,fill:.35,environment:.1,exposure:1.05,interior:110,isNight:false});
 }
 function applyLighting(p={}){
  const bg=p.background;
  scene.background=new THREE.Color(typeof bg==='string'?bg:bg??LIGHTING.day.background);
  if(p.sunColor)sun.color.set(p.sunColor); else sun.color.set(p.isNight?0x9bb7ff:0xffc78e);
  sun.intensity=p.sun??LIGHTING.day.sun;
  ambient.intensity=p.ambient??LIGHTING.day.ambient;
  if(p.ambientSky)ambient.color.set(p.ambientSky); else ambient.color.set(p.isNight?0x7194c4:0xd7e0e7);
  fill.intensity=p.fill??LIGHTING.day.fill;
  scene.environmentIntensity=p.environment??(p.isNight?LIGHTING.night.environment:LIGHTING.day.environment);
  renderer.toneMappingExposure=p.exposure??LIGHTING.day.exposure;
  let ii=p.interior??(p.isNight?LIGHTING.night.interior:LIGHTING.day.interior);
  if(ii<5)ii*=65; // legacy daylight multipliers → absolute PointLight intensity
  interiorLights.forEach(l=>l.intensity=ii);
  try{if(globalThis.document?.documentElement)document.documentElement.dataset.theme=p.isNight?'night':'day';}catch{}
 }
 function setLighting(p){
  const dest=p||LIGHTING.day;
  if(reduced){applyLighting(dest);lightTween=null;return;}
  const from=captureLight();
  applyLighting(dest); // snap values into dest fields, then we tween from 'from'
  const to=captureLight();
  to.isNight=!!dest.isNight;
  // restore from, then animate to
  applyLighting(from);
  lightTween={t0:performance.now(),dur:900,from,to};
 }

 function setStatuses(records=[]){
  const entries=Array.isArray(records)?records:(records.bots??[]);
  const mode=Array.isArray(records)?undefined:records.mode;
  if(mode==='demo'){animateBots=true;if(!movement.isDemo)movement.setDemo(true);movement.setLive(false);movement.setStatuses(entries);}
  else if(mode==='live'){animateBots=true;if(!movement.isLive)movement.setLive(true);movement.setStatuses(entries);}
  else{animateBots=false;movement.setLive(false);movement.setDemo(false);movement.setUnknown();}
  const colors={unknown:0x4b5563,working:0x4bd7a2,review:0xffcb65,idle:0x9aa3ad,error:0xf17c81}; // C47: one color per state everywhere
  for(const b of botModels){const r=entries.find(r=>(r.botId??r.id)===b.id),status=visualStatus(r,{mode});b.indicator.userData.status=status;b.indicator.material.color.set(colors[status]);}
 }
 const deskProps=attachDeskProps(botModels);
 // Default = dusk/blue-hour to match fachada REF (cool sky, warm interiors). Noche = deeper night.
 applyLighting({...LIGHTING.dusk,background:0xb8c4d2,sunColor:'#ff9a6a',ambientSky:'#8fa3b8',sun:.22,ambient:.42,fill:.35,environment:.1,exposure:1.05,interior:110,isNight:false});

 let lastFrame=performance.now()/1000,fpsFrames=0,fpsLast=performance.now(),fpsValue=0;
 let stackVy=0,stackDrag=null,stackTouches=0,lastInputAt=-1e9,lastUiRender=-1e9;
 if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
  const markInput=e=>{const t=e&&e.target;if(t===renderer.domElement)return;lastInputAt=performance.now();};
  document.addEventListener('pointerdown',markInput,{capture:true,passive:true});
  document.addEventListener('pointerup',markInput,{capture:true,passive:true});
  document.addEventListener('touchend',markInput,{capture:true,passive:true});
 }
 function uiBusy(){
  if(typeof document==='undefined')return false;
  if(lastInputAt>0&&performance.now()-lastInputAt<220)return true;
  const b=document.body;
  if(b&&(b.classList.contains('equipo-abierto')||b.classList.contains('sheet-open')))return true;
  try{return !!document.querySelector('dialog[open],#mas-panel.open,#paneles-sheet.open,.proy-sheet.open');}catch{return false;}
 }
 let userDragging=false;
 function panelOpenNow(){if(typeof document==='undefined')return false;const b=document.body;if(b&&(b.classList.contains('equipo-abierto')||b.classList.contains('sheet-open')))return true;try{return !!document.querySelector('dialog[open],#mas-panel.open,#paneles-sheet.open,.proy-sheet.open');}catch{return false;}}
 function stackWorldFromDy(dy){
  const h=renderer.domElement.clientHeight||1;
  const dist=camera.position.distanceTo(controls.target);
  const visH=camera.isOrthographicCamera?(Math.abs(camera.top-camera.bottom)/Math.max(camera.zoom,.001)):2*Math.tan((camera.fov*Math.PI/180)/2)*dist;
  return (dy/h)*visH;
 }
 function applyStackDeltaY(dWorld,flush=false){
  if(!isStackOverview())return 0;
  const {min,max}=stackedTargetYRange();
  const next=Math.min(max,Math.max(min,controls.target.y+dWorld));
  const d=next-controls.target.y;
  camera.position.y+=d;
  controls.target.y=next;
  if(flush)flushView();
  return d;
 }
 function stepStackInertia(dt){
  if(!isStackOverview()||stackDrag||Math.abs(stackVy)<0.02){if(Math.abs(stackVy)<0.02)stackVy=0;return;}
  applyStackDeltaY(stackVy*dt);
  stackVy*=Math.pow(0.045,Math.min(Math.max(dt,0),0.05)*20);
  const {min,max}=stackedTargetYRange();
  if(controls.target.y<=min+1e-3||controls.target.y>=max-1e-3)stackVy=0;
 }
 function projectFloorLabels(){
  const show=(mode==='stacked'||mode==='spread')&&floor<0;
  const canvas=renderer.domElement;
  if(!show||typeof canvas.getBoundingClientRect!=='function'||typeof container.getBoundingClientRect!=='function'){
    return floors.map(()=>({visible:false}));
  }
  const rect=canvas.getBoundingClientRect();
  const crect=container.getBoundingClientRect();
  const tmp=new THREE.Vector3();
  return floors.map((_,i)=>{
   const g=floorGroups[i];
   if(!show||!g||!g.visible)return {visible:false};
   // C34: anchor to the floor's front slab edge so the name never slides over desks.
   if(mode==='spread')tmp.set(4,0,8.9); else tmp.set(3,0,8.9);
   g.localToWorld(tmp);
   tmp.project(camera);
   if(!Number.isFinite(tmp.x)||tmp.z>1||tmp.z<-1)return {visible:false};
   const x=(tmp.x*0.5+0.5)*rect.width+(rect.left-crect.left);
   const y=(-tmp.y*0.5+0.5)*rect.height+(rect.top-crect.top);
   if(y<-48||y>rect.height+48||x<-80||x>rect.width+120)return {visible:false,x,y};
   return {visible:true,x,y};
  });
 }
 function tick(){
  requestAnimationFrame(tick);
  const nowMsTick=performance.now();
  const t=nowMsTick/1000,dt=t-lastFrame;lastFrame=t;
  if(document.hidden)return;
  // C7 kept: throttle while a panel is open or right after a UI tap — except during a running view transition (C45) or while the finger is moving the 3D behind a non-modal sheet (Rob t300).
 const busy=uiBusy()&&!userDragging&&!stackDrag&&!((camTween||floorTween||moving)&&!panelOpenNow());
  const step=Math.min(Math.max(0,dt),0.05);
  stepStackInertia(step);
  if(floorTween){const u=Math.min(1,(nowMsTick-floorTween.t0)/floorTween.dur),k=reduced?1:easeInOutCubic(u);floorGroups.forEach((g,i)=>{const a=floorTween.from[i],b=floorTween.to[i];g.position.set(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k,a.z+(b.z-a.z)*k);});if(u>=1)floorTween=null;}
  else{floorGroups.forEach((g,i)=>{const p=floorPose(i,mode,floor>=0);g.position.set(p.x,p.y,p.z);});}
  if(camTween){const u=Math.min(1,(nowMsTick-camTween.t0)/camTween.dur),k=reduced?1:easeInOutCubic(u);camera.position.lerpVectors(camTween.fromPos,camTween.toPos,k);controls.target.lerpVectors(camTween.fromTarget,camTween.toTarget,k);camera.lookAt(controls.target);if(u>=1){camTween=null;moving=false;}}
  else if(moving){camera.position.lerp(desired,reduced?1:.12);controls.target.lerp(target,reduced?1:.12);if(camera.position.distanceTo(desired)<.05)moving=false;}
  if(lightTween){const u=Math.min(1,(nowMsTick-lightTween.t0)/lightTween.dur),k=reduced?1:easeInOutCubic(u);const a=lightTween.from,b=lightTween.to;applyLighting({background:lerpHex(a.background,b.background,k),sunColor:lerpHex(a.sunColor,b.sunColor,k),ambientSky:lerpHex(a.ambientSky,b.ambientSky,k),sun:a.sun+(b.sun-a.sun)*k,ambient:a.ambient+(b.ambient-a.ambient)*k,fill:a.fill+(b.fill-a.fill)*k,environment:a.environment+(b.environment-a.environment)*k,exposure:a.exposure+(b.exposure-a.exposure)*k,interior:a.interior+(b.interior-a.interior)*k,isNight:k>.5?b.isNight:a.isNight});if(u>=1)lightTween=null;}
  floorLabels?.update(projectFloorLabels());
  if(busy){
   if(nowMsTick-lastUiRender>120){
    lastUiRender=nowMsTick;
    controls.update();
    paintNow();
    fpsFrames++;
   }
   const nowMs=performance.now();if(nowMs-fpsLast>1000){fpsValue=fpsFrames*1000/(nowMs-fpsLast);fpsFrames=0;fpsLast=nowMs;}
   return;
  }
  // D17/D21/D25 (Rob t354u): avatars hold their spot while the view/level is changing; walking resumes after the transition.
  movement.update(step,{reducedMotion:reduced,paused:!!floorTween&&!globalThis.__atelierTestNoPause});
  const overBudget=performance.now()-nowMsTick>8;
  if(overBudget){for(const b of botModels){const action=movement.getActivity(b.id);if(action){b.group.position.x=action.position[0];b.group.position.z=action.position[1];b.group.rotation.y=action.angle;}}controls.update();paintNow();fpsFrames++;const nowMs=performance.now();if(nowMs-fpsLast>1000){fpsValue=fpsFrames*1000/(nowMs-fpsLast);fpsFrames=0;fpsLast=nowMs;}return;}
  for(const b of botModels){const action=movement.getActivity(b.id);if(action){b.group.position.x=action.position[0];b.group.position.z=action.position[1];b.group.rotation.y=action.angle;avatars.setActivity?.(b.id,{clip:action.clip,seated:action.seated,expression:action.expression,phase:action.moving?1:0});const support=avatars.getSeatSupport?.(b.id),seatOffset=action.seated&&support?Math.max(0,action.seatHeight-b.base-support.bottomY):0;b.visual.position.y=THREE.MathUtils.lerp(b.visual.position.y,seatOffset,reduced?1:Math.min(1,Math.max(0,Number.isFinite(dt)?dt:0)*7));}b.group.position.y=b.base;b.label.position.y=1.75+b.visual.position.y+(b.id==='ted'?.2:0);b.indicator.position.y=b.label.position.y;b.selection.visible=selected===b.id;b.label.visible=floor>=0||mode!=='exterior'||selected===b.id;}
  const phoneFar=reduced||(!animateBots)||(container.clientWidth<760&&floor<0&&mode==='exterior'&&camera.position.distanceTo(controls.target)>40);deskProps.setVisible(!phoneFar);avatars.update(t,animateBots?'idle':false,phoneFar);controls.update();paintNow();fpsFrames++;const nowMs=performance.now();if(nowMs-fpsLast>1000){fpsValue=fpsFrames*1000/(nowMs-fpsLast);fpsFrames=0;fpsLast=nowMs;}
 }

 const resize=()=>{camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);fitCamera({animate:false});};new ResizeObserver(resize).observe(container);resize();const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];moving=false;camTween=null;stackTouches+=1;if(isStackOverview()&&e.isPrimary&&stackTouches===1){stackDrag={id:e.pointerId,y:e.clientY,t:performance.now(),vy:0};stackVy=0;try{e.target.setPointerCapture?.(e.pointerId);}catch{}}});
 renderer.domElement.addEventListener('pointermove',e=>{if(!stackDrag||e.pointerId!==stackDrag.id||!isStackOverview())return;if(stackTouches>1){stackDrag=null;stackVy=0;return;}const dy=e.clientY-stackDrag.y;const now=performance.now();const dt=Math.max(0.008,(now-stackDrag.t)/1000);const world=stackWorldFromDy(dy);applyStackDeltaY(world);stackDrag.vy=world/dt;stackDrag.y=e.clientY;stackDrag.t=now;e.preventDefault();},{passive:false});
renderer.domElement.addEventListener('pointerup',e=>{stackTouches=Math.max(0,stackTouches-1);if(stackDrag&&e.pointerId===stackDrag.id){stackVy=stackDrag.vy||0;stackDrag=null;}const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;if(performance.now()-(globalThis.__atelierSwallowPickAt||-1e9)<700)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const roots=floorGroups.filter(g=>g.visible);if(roof.visible)roots.push(roof);const hits=ray.intersectObjects(roots,true);const first=hits.find(hit=>{let visible=true,node=hit.object;while(node){if(!node.visible){visible=false;break;}node=node.parent;}return visible&&(!hit.object.material?.transparent||hit.object.isSprite&&hit.object.userData.bot);});if(first){const targetOf=object=>{let node=object;while(node&&!node.userData.bot&&!node.userData.agenda&&!Number.isInteger(node.userData.floorId))node=node.parent;return node;};let node=targetOf(first.object);
 // Small avatars need the same 12 px aiming tolerance for mouse, pen and touch.
 // Each sample still stops at its first opaque surface; exact bots/agendas win.
 if(Number.isInteger(node?.userData.floorId)){
  const pickRadii=container.clientWidth<760?[6,12,18,24]:[6,12];for(const radius of pickRadii){if(node?.userData.bot)break;for(let i=0;i<8;i++){const a=i*Math.PI/4;pointer.set((e.clientX-rect.left+Math.cos(a)*radius)/rect.width*2-1,-(e.clientY-rect.top+Math.sin(a)*radius)/rect.height*2+1);ray.setFromCamera(pointer,camera);const nearby=ray.intersectObjects(roots,true).find(hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return !hit.object.material?.transparent||hit.object.isSprite&&hit.object.userData.bot;});const candidate=nearby&&targetOf(nearby.object);if(candidate?.userData.bot){const botFloor=candidate.userData.bot.floor;if(!Number.isInteger(node?.userData.floorId)||botFloor===node.userData.floorId){node=candidate;break;}}}}
 }
 if(node?.userData.agenda)onAgenda(node.userData.agenda);else if(node?.userData.bot)onBot(node.userData.bot.id);else if(Number.isInteger(node?.userData.floorId))onFloor(node.userData.floorId);}});renderer.domElement.addEventListener('pointercancel',e=>{down=null;stackTouches=Math.max(0,stackTouches-1);if(stackDrag&&e.pointerId===stackDrag.id){stackVy=stackDrag.vy||0;stackDrag=null;}});
 renderer.domElement.addEventListener('wheel',e=>{if(!isStackOverview())return;e.preventDefault();const world=stackWorldFromDy(e.deltaY);applyStackDeltaY(world,true);stackVy=0;},{passive:false});
 controls.addEventListener('start',()=>{moving=false;camTween=null;userDragging=true;});controls.addEventListener('end',()=>{userDragging=false;});
 // s9f: do not preventDefault/paint on every touch or OrbitControls change — that made
 // pan and pinch feel sticky (Rob t377u). Pins are painted in the existing rAF tick.

 floorLabels=mountFloorLabels(container);
 tick();
 function focusBot(id,{openFloor=true}={}){
  const bot=botModels.find(b=>b.id===id);if(!bot)return false;
  selected=id;
  if(openFloor&&floor!==bot.floor)setView(bot.floor,{animate:true});
  const world=new THREE.Vector3();bot.group.getWorldPosition(world);world.y+=1.2;
  const dist=camera.isOrthographicCamera?null:THREE.MathUtils.clamp(camera.position.distanceTo(controls.target)*0.55,8,28);
  target.copy(world);
  if(camera.isOrthographicCamera){desired.copy(world).add(new THREE.Vector3(0,18,22));}
  else{
   const dir=camera.position.clone().sub(controls.target);if(dir.lengthSq()<1e-6)dir.set(0,12,18);dir.setLength(dist??16);
   desired.copy(world).add(dir);
  }
  startCamTween(desired,target,VIEW_ANIM_MS);return true;
 }
 function projectBots(){
  // s9d / Oficina-bots: map NDC into the WebGL canvas box, in coordinates relative
  // to #canvas-container (where #capa-sel is position:absolute). Using document
  // coords on a position:fixed overlay in #viewport slipped during finger pan/zoom.
  const canvas=renderer.domElement;
  const rect=canvas.getBoundingClientRect();
  const crect=container.getBoundingClientRect();
  const w=rect.width,h=rect.height;if(w<=0||h<=0)return [];
  const out=[];const v=new THREE.Vector3();
  const far=camera.position.distanceTo(controls.target)>34&&floor<0&&mode==='exterior'; // C21: bubbles stay visible in separated views
  document.body.classList.toggle('v17lejos',far);
  for(const b of botModels){
   let vis=b.group.visible;for(let p=b.group.parent;p&&vis;p=p.parent)if(p.visible===false)vis=false;if(!vis){out.push({id:b.id,hidden:true});continue;}
   // When a floor filter is active, hide other floors' labels
   if(floor>=0&&b.floor!==floor){out.push({id:b.id,hidden:true});continue;}
   b.group.getWorldPosition(v);v.y+=1.55+b.visual.position.y;v.project(camera);
   if(v.z>1){out.push({id:b.id,hidden:true});continue;}
   const x=(v.x*.5+.5)*w+(rect.left-crect.left),y=(-v.y*.5+.5)*h+(rect.top-crect.top);
   if(y<40||y>h-20){out.push({id:b.id,hidden:true});continue;}
   out.push({id:b.id,x,y,small:floor<0&&mode!=='stacked'&&camera.position.distanceTo(controls.target)>28,hidden:false});
  }
  return out;
 }
 function getViewState(){return {floor,mode,selected};}
 function debugBots(){const v=new THREE.Vector3();return botModels.map(b=>{b.group.getWorldPosition(v);return {id:b.id,x:+v.x.toFixed(3),y:+v.y.toFixed(3),z:+v.z.toFixed(3)};});}
 return {setView,setMode,setExploded(v){setMode(v?'stacked':'exterior');},setWalls(v){walls=Boolean(v);facades.forEach(g=>g.visible=walls&&floor<0);},setNight,setLighting,setStatuses,select(id){selected=id;},focusBot,projectBots,getViewState,debugBots,setDemo(v){movement.setDemo(v);animateBots=Boolean(v)||movement.isLive;},getActivity(id){return movement.getActivity(id);},getMovementStats(){return movement.getStats();},getFps(){return fpsValue;},rotate(d){moving=false;const o=camera.position.clone().sub(controls.target);const before=o.clone();o.applyAxisAngle(new THREE.Vector3(0,1,0),d);if(isStackOverview()){/* C43: back off so the rotated floors fit the phone width (footprint 29×18) */const f=desired.clone().sub(target);const k=v=>{const a=Math.atan2(v.x,v.z)-Math.atan2(f.x,f.z);return Math.max(1,(Math.abs(14.5*Math.cos(a))+Math.abs(9*Math.sin(a)))/14.5);};o.setLength(o.length()/k(before)*k(o));}camera.position.copy(controls.target).add(o);flushView();},zoom(s){moving=false;if(camera.isOrthographicCamera){camera.zoom=THREE.MathUtils.clamp(camera.zoom/s,.35,8);camera.updateProjectionMatrix();flushView();return;}const o=camera.position.clone().sub(controls.target);o.setLength(THREE.MathUtils.clamp(o.length()*s,12,700));camera.position.copy(controls.target).add(o);flushView();},reset(){setView(floor);},get renderer(){return renderer;}};
}
