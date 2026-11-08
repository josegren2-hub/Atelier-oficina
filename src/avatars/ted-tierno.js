// Visual-only Ted prototype. No state, navigation, network or persistence.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export function crearTedTierno(){
 const body=new THREE.Group();body.name='Ted · salvia con audífonos';
 const soft=(color)=>new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0});
 const sage=new THREE.MeshPhysicalMaterial({color:0x91ad69,roughness:.96,metalness:0,sheen:.55,sheenColor:0xc6d7ab,sheenRoughness:1}),dark=soft(0x453837),pad=soft(0x756878),pink=soft(0xf39494),mouthMat=soft(0x6a302b),tongueMat=soft(0xf39678);
 const white=new THREE.MeshBasicMaterial({color:0xfff8ed});
 // Fine fabric grain, evaluated locally in shader; no image downloads.
 sage.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vTedPlush;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vTedPlush=position;');shader.fragmentShader='varying vec3 vTedPlush;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 float plushGrain=fract(sin(dot(floor(vTedPlush*750.0),vec3(12.9898,78.233,43.631)))*43758.5453);
 diffuseColor.rgb*=.90+.10*plushGrain;`);};
 sage.customProgramCacheKey=()=> 'ted-plush-grain-v2';
 const sphere=new THREE.SphereGeometry(1,24,16);
 function ball(name,mat,pos,size,parent=body){const o=new THREE.Mesh(sphere,mat);o.name=name;o.position.set(...pos);o.scale.set(...size);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const torso=new THREE.Mesh(new RoundedBoxGeometry(.37,.33,.23,5,.075),sage);torso.name='Cuerpo suave';torso.position.y=.29;torso.castShadow=true;torso.receiveShadow=true;body.add(torso);
 const eyes=[],glints=[];
 for(const x of[-.062,.062]){eyes.push(ball('Ojo',dark,[x,.318,.121],[.021,.029,.012]));glints.push(ball('Brillo',white,[x-.006,.329,.132],[.006,.008,.003]));ball('Mejilla',pink,[x*1.37,.274,.12],[.023,.013,.006]);}
 const mouthShape=new THREE.Shape();mouthShape.moveTo(-1,.65);mouthShape.quadraticCurveTo(0,.38,1,.65);mouthShape.bezierCurveTo(.95,-.55,.6,-1,0,-1);mouthShape.bezierCurveTo(-.6,-1,-.95,-.55,-1,.65);
 const smile=new THREE.Mesh(new THREE.ShapeGeometry(mouthShape,24),mouthMat);smile.name='Sonrisa';smile.position.set(0,.266,.135);smile.scale.set(.029,.028,1);body.add(smile);const tongue=ball('Lengüita',tongueMat,[0,.249,.137],[.018,.009,.003]);
 const arms=[],feet=[];
 for(const side of[-1,1]){
  const arm=new THREE.Group();arm.name=side<0?'Brazo izquierdo':'Brazo derecho';arm.position.set(side*.183,.27,0);body.add(arm);ball('Manita',sage,[side*.026,-.038,.004],[.038,.069,.043],arm);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.075,.108,0);body.add(leg);ball('Pie',sage,[0,-.048,.015],[.043,.066,.051],leg);feet.push(leg);
  ball('Almohadilla audífono',pad,[side*.202,.318,0],[.035,.065,.068]);ball('Exterior audífono',dark,[side*.226,.318,0],[.016,.047,.052]);
 }
 const arc=[];for(let k=0;k<=48;k++){let t=k/48*Math.PI;arc.push(new THREE.Vector3(-.212*Math.cos(t),.326+.174*Math.sin(t),0));}
 const band=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc),48,.011,8,false),dark);band.name='Diadema';band.castShadow=true;body.add(band);
 const micCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.225,.29,.035),new THREE.Vector3(-.205,.24,.095),new THREE.Vector3(-.135,.221,.146),new THREE.Vector3(-.071,.226,.151)]);
 const mic=new THREE.Mesh(new THREE.TubeGeometry(micCurve,20,.0045,6,false),pad);mic.name='Micrófono';body.add(mic);ball('Punta micrófono',dark,[-.064,.226,.151],[.019,.011,.011]);
 body.userData.tedTierno={eyes,glints,smile,tongue,arms,feet};return body;
}
export function animarTedTierno(body,{time=0,walking=0,seated=false,working=false,happy=false,blink=false,wave=false}={}){
 const v=body.userData.tedTierno;if(!v)return;
 body.scale.set(1,1,1);body.rotation.x=working?.055:walking*.06;body.rotation.z=Math.sin(time*2.1)*.014*(1-walking);body.position.y=Math.abs(Math.sin(time*8))*walking*.013;
 v.eyes.forEach((o,i)=>{o.scale.y=blink?.003:working?.022:.029;o.rotation.z=happy?(i?-.12:.12):0;v.glints[i].visible=!blink;});
 v.smile.scale.y=happy?.034:working?.016:.028;v.tongue.visible=!working;
 v.arms.forEach((arm,i)=>{const side=i?1:-1;arm.rotation.x=working?-.8+Math.sin(time*9+i)*.09:Math.sin(time*8+i*Math.PI)*walking*.45;arm.rotation.z=side*(happy?-.75:.10);});
 if(wave||happy){v.arms[0].rotation.z=-2.35+Math.sin(time*8)*.20;v.arms[0].rotation.x=.1;}
 v.feet.forEach((leg,i)=>{leg.position.set((i?1:-1)*.075,seated?.215:.108,seated?.095:0);leg.rotation.x=seated?-.85:Math.sin(time*8+i*Math.PI)*walking*.42;});
}

// Visual seat fit: P5 seat y=.50, backrest z=1.875..1.95, home z=1.70.
// Keep route/home/root intact; only the child visual frame changes.
export function colocarTedTierno(frame,root,seated=false){
 frame.scale.setScalar(seated?.84:1);frame.rotation.x=0;
 frame.rotation.y=seated?Math.PI-root.rotation.y:0;
 const shift=seated?.035/1.5:0;
 frame.position.set(Math.sin(root.rotation.y)*shift,seated?.193:.085,-Math.cos(root.rotation.y)*shift);
}
