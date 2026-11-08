import * as THREE from 'three';
/** Fit the occupied volumes rather than a large empty enclosing cuboid. */
export function fitVolumes(volumes,aspect,height,fov=35,viewDirection=[1,.72,1]){
 const points=[];for(const[min,max]of volumes)for(const x of[min[0],max[0]])for(const y of[min[1],max[1]])for(const z of[min[2],max[2]])points.push(new THREE.Vector3(x,y,z));
 const box=new THREE.Box3().setFromPoints(points),center=box.getCenter(new THREE.Vector3());const direction=new THREE.Vector3(...viewDirection).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
 const usableV=Math.max(.7,(height-30)/height),tanV=Math.tan(THREE.MathUtils.degToRad(fov/2))*usableV,tanH=Math.tan(THREE.MathUtils.degToRad(fov/2))*aspect*.94;let distance=0;
 // Center the projected silhouette, not merely its world-space bounding box.
 // Perspective foreshortening otherwise leaves a large empty upper band.
 for(let pass=0;pass<8;pass++){
  distance=0;
  for(const point of points){const p=point.clone().sub(center),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/tanH,depth+Math.abs(p.dot(up))/tanV);}
  distance*=1.02;
  if(pass===7)break;
  let left=Infinity,rightEdge=-Infinity,bottom=Infinity,top=-Infinity;
  for(const point of points){const p=point.clone().sub(center),depth=distance-p.dot(direction),x=p.dot(right)/depth,y=p.dot(up)/depth;left=Math.min(left,x);rightEdge=Math.max(rightEdge,x);bottom=Math.min(bottom,y);top=Math.max(top,y);}
  center.addScaledVector(right,(left+rightEdge)*distance*.5).addScaledVector(up,(bottom+top)*distance*.5);
 }
 return {center,position:center.clone().addScaledVector(direction,distance)};
}
export function fitBounds(min,max,aspect,height,fov=35){return fitVolumes([[min,max]],aspect,height,fov);}
/** Equal-scale architectural overview, no perspective size differences. */
export function fitOrthographic(volumes,aspect,height,direction=[0,1.8,1]){
 const points=[];for(const[min,max]of volumes)for(const x of[min[0],max[0]])for(const y of[min[1],max[1]])for(const z of[min[2],max[2]])points.push(new THREE.Vector3(x,y,z));
 const center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());const forward=new THREE.Vector3(...direction).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward).normalize(),up=new THREE.Vector3().crossVectors(forward,right).normalize();
 let halfHeight=0;for(const point of points){const p=point.clone().sub(center);halfHeight=Math.max(halfHeight,Math.abs(p.dot(up))/Math.max(.7,(height-30)/height),Math.abs(p.dot(right))/(aspect*.94));}
 return {center,position:center.clone().addScaledVector(forward,150),halfHeight:halfHeight*1.02};
}
