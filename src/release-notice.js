export const RELEASE='0.12.1';
export async function checkRelease(fetcher=fetch){
 const response=await fetcher(`${import.meta.env?.BASE_URL??'./'}release.json?check=${Date.now()}`,{cache:'no-store',credentials:'omit'});
 if(!response.ok)throw new Error('No se pudo comprobar la versión');
 const value=await response.json();
 if(typeof value.version!=='string'||!/^\d+\.\d+\.\d+$/.test(value.version))throw new Error('Versión no válida');
 return {current:RELEASE,available:value.version,update:value.version!==RELEASE};
}
export function mountReleaseNotice(){
 const button=document.querySelector('#check-version'),result=document.querySelector('#version-result');if(!button||!result)return;
 button.addEventListener('click',async()=>{
  button.disabled=true;result.textContent='Comprobando…';
  try{const status=await checkRelease();result.textContent=status.update?`Versión ${status.available} disponible. `:`Estás en la versión ${RELEASE}.`;
   if(status.update){const reload=document.createElement('button');reload.textContent='Abrir versión actual';reload.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('v',status.available);location.assign(url.href);});result.append(reload);}
  }catch{result.textContent='No se pudo comprobar. Conservas la vista actual.';}finally{button.disabled=false;}
 });
}
