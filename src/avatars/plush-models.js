/** Reconstructed from the recoverable 0.13.1 source. New review candidate, not an exact recovered archive. Local geometry only. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PLUSH_TEMPLATES = Object.freeze([
 {shape:'triangle',color:'#ffca32',accessory:'bow-glasses'},
 {shape:'flower',color:'#19b9f0',accessory:'beret',wink:true},
 {shape:'capsule',color:'#f9d9b2',accessory:'headphones'},
 {shape:'heart',color:'#f342aa',accessory:'heart-glasses'},
 {shape:'star',color:'#ff827a',accessory:'none'},
 {shape:'cube',color:'#bc81ed',accessory:'glasses'},
 {shape:'drop',color:'#37be83',accessory:'headphones'},
 {shape:'diamond',color:'#ffb18c',accessory:'beret'},
 {shape:'flower',color:'#2779e7',accessory:'none',lobes:4},
 {shape:'sphere',color:'#ffe4b8',accessory:'bow'},
 {shape:'triangle',color:'#c965dd',accessory:'glasses',trim:'#6ce7df'},
 {shape:'capsule',color:'#63cdf5',accessory:'scarf'},
 {shape:'hexagon',color:'#ffad27',accessory:'glasses'},
 {shape:'star',color:'#9ce3bd',accessory:'headphones'},
 {shape:'flower',color:'#ff9fc7',accessory:'none',sleeping:true},
 {shape:'heart',color:'#f44861',accessory:'beret'},
].map((entry,i)=>Object.freeze({...entry,template:i+1})));

function fabric(color) {
 const material=new THREE.MeshPhysicalMaterial({color,roughness:.96,metalness:0,sheen:.45,sheenColor:'#fff4e6',sheenRoughness:1});
 material.name='Local procedural plush fabric';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vPlushLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vPlushLocal=position;');
  shader.fragmentShader='varying vec3 vPlushLocal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float grain=fract(sin(dot(floor(vPlushLocal*180.0),vec3(12.9898,78.233,43.631)))*43758.5453);
   float detail=1.-smoothstep(.002,.012,length(fwidth(vPlushLocal)));
   float weave=sin(vPlushLocal.x*360.+vPlushLocal.y*210.)*sin(vPlushLocal.y*330.-vPlushLocal.z*170.);
   diffuseColor.rgb*=1.+((grain-.5)*.055+weave*.009)*detail;
   roughnessFactor=clamp(roughnessFactor+.025*(grain-.5)*detail,.88,1.);`);
 };
 material.customProgramCacheKey=()=> 'reconstructed-plush-antialias-cloth-v1';
 return material;
}
function outline(kind,lobes=5) {
 const shape=new THREE.Shape();
 if(kind==='heart') {
  shape.moveTo(0,-.48);shape.bezierCurveTo(-.18,-.32,-.53,-.06,-.5,.24);shape.bezierCurveTo(-.47,.53,-.15,.56,0,.32);shape.bezierCurveTo(.15,.56,.47,.53,.5,.24);shape.bezierCurveTo(.53,-.06,.18,-.32,0,-.48);
 } else if(kind==='drop') {
  shape.moveTo(0,.52);shape.bezierCurveTo(-.25,.53,-.34,.21,-.45,-.08);shape.bezierCurveTo(-.62,-.48,-.23,-.5,0,-.5);shape.bezierCurveTo(.23,-.5,.62,-.48,.45,-.08);shape.bezierCurveTo(.34,.21,.25,.53,0,.52);
 } else {
  let points=[];
  if(kind==='flower')for(let i=0;i<120;i++){const a=Math.PI/2+i*Math.PI*2/120,r=.44+.08*Math.cos(lobes*(a-Math.PI/2-(lobes===4?Math.PI/4:0)));points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));}
  else {const n=kind==='triangle'?3:kind==='diamond'?4:kind==='hexagon'?6:10;for(let i=0;i<n;i++){const a=Math.PI/2+(kind==='hexagon'?Math.PI/6:0)+i*Math.PI*2/n;const r=kind==='star'?(i%2?.29:.53):.51;points.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));}}
  // Quadratic corners leave broad recognizable silhouettes without hard tips.
  const f=kind==='flower'?.48:kind==='star'?.26:.21;
  for(let i=0;i<points.length;i++){const prev=points[(i+points.length-1)%points.length],p=points[i],next=points[(i+1)%points.length];const a=p.clone().lerp(prev,f),b=p.clone().lerp(next,f);if(!i)shape.moveTo(a.x,a.y);else shape.lineTo(a.x,a.y);shape.quadraticCurveTo(p.x,p.y,b.x,b.y);}shape.closePath();
 }
 return shape;
}

/** Closed radial pillow. The historical object name is retained for seat and
 * picking contracts. Curved star corners retain dense samples instead of being
 * reduced to long chords. There is no flat cap or raised extrusion rim. */
function stuffedSilhouette(shape,kind){
 let count=128;const latitudes=12,depth=.34;
 let path=shape.extractPoints(kind==='star'?24:12).shape;
 if(path[0].distanceToSquared(path.at(-1))<1e-12)path.pop();
 if(THREE.ShapeUtils.isClockWise(path))path.reverse();
 const lengths=[0];for(let i=0;i<path.length;i++)lengths.push(lengths.at(-1)+path[i].distanceTo(path[(i+1)%path.length]));
 const boundary=[];let segment=0;
 for(let i=0;i<count;i++){
  const distance=i/count*lengths.at(-1);while(lengths[segment+1]<distance)segment++;
  boundary.push(path[segment].clone().lerp(path[(segment+1)%path.length],(distance-lengths[segment])/(lengths[segment+1]-lengths[segment])));
 }
 if(kind==='star'){
  const curved=[];
  for(let i=0;i<path.length;i++){
   const point=path[i],next=path[(i+1)%path.length],steps=Math.max(1,Math.ceil(point.distanceTo(next)/.028));
   for(let j=0;j<steps;j++)curved.push(point.clone().lerp(next,j/steps));
  }
  boundary.splice(0,boundary.length,...curved);count=boundary.length;
 }
 const padded=boundary.map((point,i)=>{
  // A normal allowance crosses the heart's tight concave cleft. A radial
  // allowance preserves its single-valued outline and outward-facing normals.
  if(kind==='heart')return point.clone().addScaledVector(point.clone().normalize(),.085);
  const previous=boundary[(i+count-1)%count],next=boundary[(i+1)%count];
  const incoming=point.clone().sub(previous).normalize(),outgoing=next.clone().sub(point).normalize();
  const n1=new THREE.Vector2(incoming.y,-incoming.x),n2=new THREE.Vector2(outgoing.y,-outgoing.x),normal=n1.clone().add(n2).normalize();
  return point.clone().addScaledVector(normal,.085/Math.max(.7,normal.dot(n2)));
 });
 const positions=[],indices=[],meanRadius=padded.reduce((sum,point)=>sum+point.length(),0)/count;
 for(const point of padded)positions.push(point.x,point.y,0);
 for(const side of[1,-1]){
  let previous=0;
  for(let j=1;j<latitudes;j++){
   const angle=j/latitudes*Math.PI/2,radius=Math.cos(angle),z=side*depth*Math.sin(angle),current=positions.length/3;
   // Blend interior sections toward a circle to avoid grooves reaching the pole.
   for(const point of padded){const length=point.length(),sectionRadius=radius*(meanRadius+(length-meanRadius)*radius*radius);positions.push(point.x/length*sectionRadius,point.y/length*sectionRadius,z);}
   for(let i=0;i<count;i++){
    const next=(i+1)%count,a=previous+i,b=previous+next,c=current+i,d=current+next;
    if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
   }
   previous=current;
  }
  const pole=positions.length/3;positions.push(0,0,side*depth);
  for(let i=0;i<count;i++){const a=previous+i,b=previous+(i+1)%count;if(side>0)indices.push(a,b,pole);else indices.push(a,pole,b);}
 }
 const geometry=new THREE.BufferGeometry();geometry.name='Reconstructed smooth stuffed silhouette';
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={surface:'closed-domed-pillow',boundarySamples:count,latitudesPerSide:latitudes,halfDepth:depth};return geometry;
}

/** Piecewise-linear height on the same front triangles used by the renderer.
 * Restricting queries to their angular sector avoids a complete raycast for
 * every glasses vertex. Independent QA still uses Three raycasts. */
function frontSurfaceSampler(geometry){
 const p=geometry.attributes.position,{boundarySamples:count,latitudesPerSide:levels}=geometry.userData;
 function triangleHeight(x,y,a,b,c){
  const ax=p.getX(a),ay=p.getY(a),bx=p.getX(b),by=p.getY(b),cx=p.getX(c),cy=p.getY(c);
  const denominator=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(denominator)<1e-14)return null;
  const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denominator,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denominator,w=1-u-v;
  return u>=-1e-7&&v>=-1e-7&&w>=-1e-7?u*p.getZ(a)+v*p.getZ(b)+w*p.getZ(c):null;
 }
 return (x,y)=>{
  for(let i=0;i<count;i++){
   const next=(i+1)%count;
   if(p.getX(i)*y-p.getY(i)*x < -1e-9 || x*p.getY(next)-y*p.getX(next) < -1e-9)continue;
   for(let level=0;level<levels-1;level++){
    const a=level*count+i,b=level*count+next,c=(level+1)*count+i,d=(level+1)*count+next;
    const z=triangleHeight(x,y,a,b,c)??triangleHeight(x,y,b,d,c);if(z!==null)return z;
   }
   return triangleHeight(x,y,(levels-1)*count+i,(levels-1)*count+next,levels*count);
  }
  return null;
 };
}

export function createPlushModel(config) {
 const root=new THREE.Group();root.name=`Plush ${config.modelId??''} · template ${String(config.template).padStart(2,'0')}`;
 const spec={...PLUSH_TEMPLATES[config.template-1],...config};
 if(!PLUSH_TEMPLATES[spec.template-1])throw new RangeError('Unknown plush template');
 root.userData.plushProvenance={source:'approved-template-16',implementation:'local-procedural-3d',template:spec.template,shape:spec.shape,color:spec.color,accessory:spec.accessory,modelId:spec.modelId};
 const cloth=fabric(spec.color),dark=new THREE.MeshStandardMaterial({color:'#25222b',roughness:.75}),trim=fabric(spec.trim??'#302738'),cream=fabric('#fff0d8'),skin=fabric('#ffdbbf'),cheek=fabric('#f6a39c');
 const sphere=new THREE.SphereGeometry(1,32,24),eyes=[],arms=[],feet=[];
 function mesh(name,geometry,material,parent=root){const obj=new THREE.Mesh(geometry,material);obj.name=name;obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
 function ball(name,pos,size,mat=cloth,parent=root){const obj=mesh(name,sphere,mat,parent);obj.position.set(...pos);obj.scale.set(...size);return obj;}
 function tube(name,points,radius,mat=dark,parent=root){return mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,8,false),mat,parent);}
 let torso;
 if(spec.shape==='sphere')torso=ball('Round stuffed body',[0,0,0],[.5,.51,.33]);
 else if(spec.shape==='cube'||spec.shape==='capsule')torso=mesh('Rounded stuffed body',new RoundedBoxGeometry(spec.shape==='cube'?.92:.77,1,.56,8,spec.shape==='cube'?.18:.31),cloth);
 else torso=mesh('Soft extruded silhouette',stuffedSilhouette(outline(spec.shape,spec.lobes),spec.shape),cloth);
 const capsule=spec.shape==='capsule',faceZ=spec.shape==='sphere'?.335:capsule?.345:.262;
 const domed=torso.geometry.userData.surface==='closed-domed-pillow',sampleFront=domed?frontSurfaceSampler(torso.geometry):null;
 function frontAt(x,y){return sampleFront?.(x,y)??faceZ;}
 // Conform every tube vertex. Control-point projection alone can put a sloped
 // cross-section inside the cheek even when its centre is in front of it.
 function conformFrontTube(obj,backGap=.006){
  if(!domed)return obj;
  const geometry=obj.geometry,p=geometry.attributes.position,{path,tubularSegments,radialSegments}=geometry.parameters;
  for(let i=0;i<=tubularSegments;i++){
   const start=i*(radialSegments+1),centre=path.getPointAt(i/tubularSegments),offsets=[];
   for(let j=0;j<=radialSegments;j++)offsets.push(p.getZ(start+j)-centre.z);
   const lift=backGap-Math.min(...offsets);
   for(let j=0;j<=radialSegments;j++){const at=start+j;p.setZ(at,frontAt(p.getX(at),p.getY(at))+lift+offsets[j]);}
  }
  geometry.computeVertexNormals();return obj;
 }

 if(capsule)ball('Inset face',[0,.12,.257],[.292,.22,.095],skin);
 // Short articulated limbs supplement the approved silhouette, never move the host.
 torso.updateMatrixWorld(true);
 const torsoBounds=new THREE.Box3().setFromObject(torso),floorY=torsoBounds.min.y;
 for(const side of[-1,1]){
  const foot=new THREE.Group();foot.name=side<0?'Left plush foot pivot':'Right plush foot pivot';
  foot.position.set(side*.15,floorY+.055,.045);foot.userData.rest=foot.position.toArray();root.add(foot);
  ball('Tiny foot',[0,-.055,.045],[.10,.065,.135],cloth,foot);feet.push(foot);
  const arm=new THREE.Group();arm.name=side<0?'Left plush arm pivot':'Right plush arm pivot';
  arm.position.set(side*(capsule?.385:.37),floorY+.31,.10);arm.userData.rest=arm.position.toArray();root.add(arm);
  ball('Tiny plush hand',[0,-.07,.025],[.078,.125,.095],cloth,arm);arms.push(arm);
 }

 // Recess highlights behind opaque heart sunglasses rather than letting them
 // protrude through the triangulated curved cap. The eyes and rig remain.
 const faceY=capsule?.12:.035;
 for(const s of[-1,1]){
  if(spec.sleeping||(spec.wink&&s<0)){tube('Closed embroidered eye',[[s*.145-.054,faceY+.025,frontAt(s*.145-.054,faceY+.025)+(domed?.005:0)],[s*.145,faceY-.005,frontAt(s*.145,faceY-.005)+(domed?.009:.004)],[s*.145+.054,faceY+.025,frontAt(s*.145+.054,faceY+.025)+(domed?.005:0)]],.012);}
  else{const eye=ball('Small glossy eye',[s*.145,faceY+.035,frontAt(s*.145,faceY+.035)+(domed?.006:0)],[.027,.042,.022],dark);eyes.push(eye);ball('Eye glint',[s*.145-.006,faceY+.05,frontAt(s*.145,faceY+.035)+(domed?.025:.019)-(spec.accessory==='heart-glasses'?.006:0)],[.006,.009,.004],cream);}
  if(capsule||spec.shape==='sphere')ball('Blush',[s*.225,faceY-.058,faceZ-.008],[.045,.024,.009],cheek);
 }
 tube(spec.serious?'Calm embroidered mouth':'Embroidered smile',[[-.045,faceY-.065,frontAt(-.045,faceY-.065)+.006],[0,faceY-(spec.serious?.068:.09),frontAt(0,faceY-(spec.serious?.068:.09))+.014],[.045,faceY-.065,frontAt(.045,faceY-.065)+.006]],.009);
 const glassesZ=frontAt(0,faceY+.035);
 if(spec.accessory.includes('glasses')){
  for(const side of[-1,1]){
   if(spec.accessory==='heart-glasses'){
    const geometry=new THREE.ExtrudeGeometry(outline('heart'),{depth:.018,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:3,curveSegments:16});
    if(domed){const p=geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+(frontAt(side*.19+p.getX(i)*.29,faceY+.04+p.getY(i)*.29)-glassesZ)/.6);geometry.computeVertexNormals();}
    const lens=mesh('Heart sunglasses',geometry,dark);lens.position.set(side*.19,faceY+.04,glassesZ+(domed?.022:.045));lens.scale.set(.29,.29,.6);
   }else{
    const geometry=new THREE.TorusGeometry(.116,.014,10,48);
    if(domed){const p=geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+frontAt(side*.16+p.getX(i),faceY+.035+p.getY(i))-glassesZ);geometry.computeVertexNormals();}
    const ring=mesh('Round glasses',geometry,trim);ring.position.set(side*.16,faceY+.035,glassesZ+(domed?.022:.04));
   }
  }
  conformFrontTube(tube('Glasses bridge',[[-.045,faceY+.04,domed?frontAt(-.045,faceY+.04)+.024:glassesZ+.045],[0,faceY+.05,domed?frontAt(0,faceY+.05)+.028:glassesZ+.055],[.045,faceY+.04,domed?frontAt(.045,faceY+.04)+.024:glassesZ+.045]],.012,trim));
  for(const side of[-1,1]){
   const end=domed&&spec.shape==='triangle'?.325:.34;
   conformFrontTube(tube('Glasses arm',[[side*.28,faceY+.04,domed?frontAt(side*.28,faceY+.04)+.022:glassesZ+.035],[side*end,faceY+.035,frontAt(side*end,faceY+.035)+(domed?.018:.01)]],.012,trim));
  }
 }
 if(spec.accessory.includes('bow')){for(const s of[-1,1]){const wing=ball('Soft bow wing',[s*.105,-.24,faceZ+.008],[.115,.075,.048],trim);wing.rotation.z=s*.22;}ball('Bow knot',[0,-.24,faceZ+.055],[.04,.045,.035],trim);}
 if(spec.accessory==='headphones'){
  const pts=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI;pts.push([-.48*Math.cos(t),.05+.52*Math.sin(t),-.01]);}tube('Padded headphone band',pts,.034,trim);
  for(const s of[-1,1]){ball('Headphone cushion',[s*.46,.055,0],[.082,.155,.17],cream);ball('Headphone shell',[s*.515,.055,0],[.055,.13,.145],trim);}
 }
 if(spec.accessory==='beret'){
  const cap=new THREE.Group();cap.position.set(-.035,.465,0);cap.rotation.z=.25;root.add(cap);ball('Velvet beret',[0,.035,0],[.47,.125,.32],trim,cap);ball('Beret crown',[-.04,.12,0],[.36,.085,.26],trim,cap);ball('Beret stalk',[-.1,.205,0],[.025,.045,.024],trim,cap);
 }
 if(spec.accessory==='scarf'){
  const scarf=fabric('#bd85dc');const collar=mesh('Soft scarf collar',new RoundedBoxGeometry(.86,.15,.64,6,.06),scarf);collar.position.y=-.13;
  const tail=mesh('Scarf tail',new RoundedBoxGeometry(.16,.3,.07,5,.025),scarf);tail.position.set(.24,-.32,.34);tail.rotation.z=.12;
  for(let i=0;i<4;i++)ball('Scarf fringe',[.19+i*.036,-.48,.34],[.016,.045,.025],scarf);
 }
 if(spec.serious){const tie=mesh('Julian formal tie',new THREE.ExtrudeGeometry(outline('diamond'),{depth:.02,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:3}),trim);tie.position.set(0,-.265,frontAt(0,-.15)+.035);tie.scale.set(.105,.22,1);ball('Tie knot',[0,-.15,frontAt(0,-.15)+.055],[.04,.035,.025],trim);}
 if(spec.hero){
  const gold=new THREE.MeshPhysicalMaterial({color:'#d9ac47',metalness:.5,roughness:.4,emissive:'#8a5511',emissiveIntensity:.12});
  for(const side of[-1,1]){const rim=mesh('Ted gold headphone trim',new THREE.TorusGeometry(.133,.009,8,40),gold);rim.rotation.y=Math.PI/2;rim.position.set(side*.55,.055,0);}
  const halo=mesh('Ted decorative halo · not activity',new THREE.TorusGeometry(.48,.008,8,64),gold);halo.rotation.x=Math.PI/2;halo.position.y=-.557;halo.scale.y=.7;
 }
 root.userData.plushRig={eyes,arms,feet};return root;
}

export function animatePlushModel(root,{time=0,clip=null,seated=false,phase=0,reducedMotion=false,expression='neutro'}={}) {
 const active=!!clip&&!reducedMotion;
 const t=active?(Number.isFinite(time)?time:0)+(Number.isFinite(phase)?phase:0):0;
 const walking=clip==='walk'&&!seated,working=clip==='work',reading=clip==='read',resting=clip==='rest';
 const expr=expression||'neutro';
 // Pose stays legible with reduced motion; only time-dependent movement is removed.
 root.position.set(0,0,0);
 root.rotation.set(working?.045:reading?.025:resting?-.035:(expr==='sorprendido'?.02:0),0,active?Math.sin(t*(walking?6:1.7))*(walking?.022:.012):0);
 // Keep scale footprint identical to 0.18; expression only via eyes/arms.
 root.scale.set(1,active?1+Math.sin(t*2)*.004:1,1);
 const rig=root.userData.plushRig;
 const eyeY=expr==='sorprendido'?.055:expr==='feliz'?.038:expr==='cansado'?.02:expr==='concentrado'?.034:.042;
 const blink=active&&t%5.2<.11;
 for(const eye of (rig?.eyes??[]))eye.scale.y=blink?.006:eyeY;
 (rig?.feet??[]).forEach((foot,i)=>{
  foot.position.fromArray(foot.userData.rest);foot.rotation.set(0,0,0);
  if(seated){foot.position.y+=.065;foot.position.z+=.20;foot.rotation.x=-.85;}
  else if(walking&&active){foot.rotation.x=Math.sin(t*6+i*Math.PI)*.48;foot.position.y+=Math.max(0,Math.sin(t*6+i*Math.PI))*.028;}
 });
 (rig?.arms??[]).forEach((arm,i)=>{
  const side=i?1:-1;arm.position.fromArray(arm.userData.rest);arm.rotation.set(0,0,0);
  if(working||reading){arm.position.x=side*(reading?.19:.24);arm.position.z=.30;arm.position.y+=.10;arm.rotation.x=reading?-1.05:-1.25;arm.rotation.z=side*(reading?.32:.08);if(active&&working)arm.rotation.x+=Math.sin(t*6+i*Math.PI)*.10;}
  else if(clip==='wave'&&i===0){if(root.userData.plushProvenance?.shape==='triangle')arm.position.x+=.02;arm.position.z=.19;arm.rotation.z=-2.15+(active?Math.sin(t*4)*.18:0);}
  else if(walking&&active){arm.rotation.x=-Math.sin(t*6+i*Math.PI)*.32;}
  else if(resting){arm.rotation.z=-side*.20;arm.rotation.x=-.12;}
 });
}
