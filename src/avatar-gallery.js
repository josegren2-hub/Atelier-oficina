if(new URLSearchParams(location.search).has('embedded')){document.documentElement.classList.add('embedded');document.querySelectorAll('a').forEach(a=>a.hidden=true);}
import * as THREE from 'three';
import {createAvatarModels} from './avatar-models.js';
import {bots} from './data.js';
const canvas=document.querySelector('#gallery'),status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#16212c');renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,4,-4,.1,100);camera.position.set(0,0,15);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0xfffcf5,0x879d8a,2.5));const key=new THREE.DirectionalLight(0xffedd6,3.2);key.position.set(-4,8,10);scene.add(key);const fill=new THREE.DirectionalLight(0xddeaff,1.3);fill.position.set(5,2,5);scene.add(fill);
const models=createAvatarModels({onLoaded:({stats})=>{status.textContent=`${stats.loaded}/16 modelos cargados${stats.failed?` · ${stats.failed} errores`:''} · Sin conexión a datos reales`;}}),hosts=[];
function label(text){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='600 42px system-ui';ctx.textAlign='center';ctx.fillStyle='#e6edf3';ctx.fillText(text,256,62);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sprite.scale.set(1.5,.281,1);sprite.position.y=-.27;return sprite;}
for(const bot of bots){const host=new THREE.Group(),visual=new THREE.Group();host.userData.bot=bot;host.add(visual,label(bot.name));scene.add(host);hosts.push(host);models.attach(bot,visual);}
// Match canvas pixels to the grid's world-space aspect, not a fixed tall canvas.
export function calculateGalleryLayout(width,count=16){
 const columns=width<600?2:4,rows=Math.ceil(count/columns);
 const worldWidth=columns*1.65,worldHeight=rows*1.65;
 return {width,height:width*worldHeight/worldWidth,columns,rows,worldWidth,worldHeight};
}
function resize(){
 const {width,height,columns,rows,worldWidth,worldHeight}=calculateGalleryLayout(canvas.clientWidth,hosts.length);
 canvas.style.height=`${height}px`;renderer.setSize(width,height,false);
 camera.left=-worldWidth/2;camera.right=worldWidth/2;camera.top=worldHeight/2;camera.bottom=-worldHeight/2;camera.updateProjectionMatrix();
 // Center the full avatar + name envelope (Ted1.035 high, label bottom-.4105).
 hosts.forEach((host,i)=>host.position.set((i%columns-(columns-1)/2)*1.65,((rows-1)/2-Math.floor(i/columns))*1.65-.31,0));
}
let pose=false;document.querySelectorAll('[data-pose]').forEach(button=>button.addEventListener('click',()=>{pose=button.dataset.pose||false;document.querySelectorAll('[data-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
const media=matchMedia('(prefers-reduced-motion: reduce)');window.addEventListener('resize',resize);resize();renderer.setAnimationLoop(ms=>{models.update(ms/1000,pose,media.matches);renderer.render(scene,camera);});
window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);models.dispose();renderer.dispose();},{once:true});
