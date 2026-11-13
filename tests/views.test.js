import {floors} from '../src/data.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {floorPose,viewVolumes,viewDirection,STACK_PITCH} from '../src/view-layout.js';import {fitVolumes,fitOrthographic} from '../src/camera-fit.js';
test('separación vertical mayor y reversible sin desplazamientos acumulados',()=>{assert.ok(STACK_PITCH===16);for(let n=0;n<floors.length;n++){assert.equal(floorPose(n,'stacked').y,n*STACK_PITCH);assert.deepEqual(floorPose(n,'exterior'),{x:0,y:n*4.6,z:0});}});
test('seis plantas en retícula 3×2 sin solapamiento',()=>{const poses=[0,1,2,3,4,5].map(n=>floorPose(n,'spread'));assert.equal(new Set(poses.map(p=>p.x)).size,2);assert.equal(new Set(poses.map(p=>p.z)).size,3);assert.ok(poses[1].x-poses[0].x>29);assert.ok(poses[2].z-poses[0].z>18);assert.ok(poses[4].z-poses[2].z>18);assert.ok(poses.every(p=>p.y===0));assert.ok(poses[0].z<poses[2].z&&poses[2].z<poses[4].z);});
for(const mode of ['exterior','stacked','spread'])for(const[w,h]of[[1020,440],[390,340],[375,325]])test(`encuadre ${mode} ${w}x${h}`,()=>{const volumes=viewVolumes(mode),fit=fitVolumes(volumes,w/h,h,35,viewDirection(mode));const c=new THREE.PerspectiveCamera(35,w/h,.1,1200);c.position.copy(fit.position);c.lookAt(fit.center);c.updateMatrixWorld();for(const[min,max]of volumes)for(const x of[min[0],max[0]])for(const y of[min[1],max[1]])for(const z of[min[2],max[2]]){const p=new THREE.Vector3(x,y,z).project(c);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);}});

for(const[w,h]of[[1020,440],[390,340],[375,325]])test(`cuadrícula ortográfica completa ${w}x${h}`,()=>{const volumes=viewVolumes('spread'),fit=fitOrthographic(volumes,w/h,h),v=fit.halfHeight;const c=new THREE.OrthographicCamera(-v*w/h,v*w/h,v,-v,.1,1200);c.position.copy(fit.position);c.lookAt(fit.center);c.updateMatrixWorld();const bounds=volumes.map(([min,max])=>{const points=[];for(const x of[min[0],max[0]])for(const y of[min[1],max[1]])for(const z of[min[2],max[2]]){const p=new THREE.Vector3(x,y,z).project(c);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1);points.push(p);}return {bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))};});assert.ok(bounds[0].bottom>bounds[2].top,'rows 0-1 must not overlap on screen');assert.ok(bounds[2].bottom>bounds[4].top,'rows 1-2 must not overlap on screen');assert.equal(bounds.length,6);});

test('3×2 overview includes every floor and keeps isolated penthouse access',()=>{
 assert.equal(floors.length,6);assert.equal(viewVolumes('spread').length,6);
 assert.equal(viewVolumes('stacked').length,1);assert.equal(viewVolumes('spread',5).length,1);
 assert.equal(viewVolumes('spread',5)[0][0][1],5*4.6);
 assert.deepEqual(floorPose(5,'spread',true),{x:0,y:5*4.6,z:0});
});

for(const [w,h]of [[786,320],[1020,440],[390,340]])test(`compact overview fills the limiting axis ${w}x${h}`,()=>{
 const volumes=viewVolumes('spread'),fit=fitOrthographic(volumes,w/h,h),v=fit.halfHeight,c=new THREE.OrthographicCamera(-v*w/h,v*w/h,v,-v,.1,1200);
 c.position.copy(fit.position);c.lookAt(fit.center);c.updateMatrixWorld();const points=[];
 for(const[min,max]of volumes)for(const x of[min[0],max[0]])for(const y of[min[1],max[1]])for(const z of[min[2],max[2]])points.push(new THREE.Vector3(x,y,z).project(c));
 const span=axis=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
 assert.ok(Math.max(span('x'),span('y'))>1.85,'over 92.5% occupancy on the limiting axis');
 assert.ok(points.every(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1),'every floor corner remains visible');
});
