export const RELEASE='0.22.8';
/* s11: la copia de /prueba/ se construye con VITE_PRUEBA_VERSION (p. ej. 0.22.4s11-prueba); en la raíz no existe y todo queda igual. */
export const BUILD_VERSION=(typeof import.meta!=='undefined'&&import.meta.env?.VITE_PRUEBA_VERSION)||RELEASE;
export const VERSION_RE=/^\d+\.\d+\.\d+(?:s\d+[a-z]?)?(?:-prueba)?$/;
export async function checkRelease(fetcher=fetch){
 const response=await fetcher(`${import.meta.env?.BASE_URL??'./'}release.json?check=${Date.now()}`,{cache:'no-store',credentials:'omit'});
 if(!response.ok)throw new Error('No se pudo comprobar la versión');
 const value=await response.json();
 if(typeof value.version!=='string'||!VERSION_RE.test(value.version))throw new Error('Versión no válida');
 return {current:BUILD_VERSION,available:value.version,update:value.version!==BUILD_VERSION};
}
export function mountReleaseNotice(){
 const button=document.querySelector('#check-version'),result=document.querySelector('#version-result');if(!button||!result)return;
 button.addEventListener('click',async()=>{
  button.disabled=true;result.textContent='Comprobando…';
  try{const status=await checkRelease();result.textContent=status.update?`Versión ${status.available} disponible. `:(BUILD_VERSION.endsWith('-prueba')?`Estás en la versión de prueba ${BUILD_VERSION.replace(/-prueba$/,'')}.`:`Estás en la versión ${RELEASE}.`);
   if(status.update){const reload=document.createElement('button');reload.textContent='Abrir versión actual';reload.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('v',status.available);location.assign(url.href);});result.append(reload);}
  }catch{result.textContent='No se pudo comprobar. Conservas la vista actual.';}finally{button.disabled=false;}
 });
}
