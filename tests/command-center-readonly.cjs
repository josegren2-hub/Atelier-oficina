/* Run against Vite dev: TEST_URL=http://127.0.0.1:4187 node tests/command-center-readonly.cjs */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=process.env.CC_QA_DIR||'/tmp/atelier-command-center-qa';
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];const writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.url());});
  await page.route('**/__cc_readonly_qa.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/command-center.css"></head><body><button id="trigger" style="margin:20px">Abrir consulta</button></body></html>'}));
  await page.goto(new URL('/__cc_readonly_qa.html',process.env.TEST_URL||'http://127.0.0.1:4187').href);
  await page.evaluate(async()=>{
    const {mountCommandCenter}=await import('/src/command-center.js');
    const {disconnectedSnapshot,demoSnapshot}=await import('/src/data.js');
    window.fixtures={disconnectedSnapshot,demoSnapshot};
    window.snapshot=disconnectedSnapshot();window.failRead=false;window.chosen=[];
    window.cc=mountCommandCenter({getSnapshot:()=>{if(window.failRead)throw Error('Unavailable');return window.snapshot;},onChoose:id=>window.chosen.push(id)});
    document.querySelector('#trigger').addEventListener('click',()=>window.cc.open());
  });
  const dialog=page.locator('.cc-dialog');
  const clickSection=async id=>page.locator(`[data-section="${id}"]`).click();
  async function checkDark(){
    const colors=await dialog.locator('.cc-source,.cc-card,.cc-empty,.cc-stat,.cc-summary>div,button').evaluateAll(nodes=>nodes.map(node=>({background:getComputedStyle(node).backgroundColor,text:getComputedStyle(node).color})));
    for(const {background} of colors){const components=background.match(/[\d.]+/g).map(Number);if(components[3]===0)continue;assert.ok(Math.max(...components.slice(0,3))<110,`No glaring surface: ${background}`);}
    const overflow=await dialog.evaluate(node=>({page:document.documentElement.scrollWidth>innerWidth,dialog:node.scrollWidth>node.clientWidth,content:node.querySelector('.cc-content').scrollWidth>node.querySelector('.cc-content').clientWidth}));
    assert.deepEqual(overflow,{page:false,dialog:false,content:false});
  }
  await page.locator('#trigger').click();
  for(const section of ['tasks','notifications','stats','agenda']){
    await clickSection(section);assert.equal(await dialog.locator('input,select,textarea,form,[contenteditable]').count(),0);
    assert.match(await page.locator('.cc-source').innerText(),/Fuente no conectada/);
    assert.equal(await dialog.locator('.cc-card').count(),0);
    await checkDark();
  }
  assert.equal(await dialog.locator('.cc-agenda-events .cc-empty').count(),1);
  assert.equal(await dialog.locator('.cc-agenda-tasks .cc-empty').count(),1);
  assert.deepEqual(await dialog.locator('.cc-summary dd').allTextContents(),['—','—']);
  await page.screenshot({path:path.join(output,'disconnected-agenda-desktop.png')});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement.id==='trigger');
  assert.equal(await dialog.isVisible(),false);
  await page.evaluate(()=>{window.snapshot=window.fixtures.demoSnapshot();window.before=JSON.stringify(window.snapshot);window.cc.open('tasks');});
  assert.match(await page.locator('.cc-source').innerText(),/DEMO · SIMULACIÓN/);
  assert.equal(await dialog.locator('.cc-card').count(),6);
  assert.equal(await dialog.locator('.cc-filter-panel').getAttribute('open'),null);
  assert.equal(await dialog.getByRole('searchbox').isVisible(),false);
  assert.equal(await dialog.locator('.cc-summary').evaluate(node=>!!(node.compareDocumentPosition(document.querySelector('.cc-filter-panel'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
  assert.equal(await dialog.locator('.cc-results .cc-card').first().isVisible(),true);
  await page.screenshot({path:path.join(output,'demo-tasks-desktop.png')});
  await dialog.locator('.cc-filter-panel summary').click();
  await dialog.getByRole('searchbox').fill('autorizacion');
  assert.equal(await dialog.locator('.cc-card').count(),1);
  await dialog.getByLabel('Filtrar por asistente').selectOption('julian');
  await dialog.locator('[data-filter="completed"]').click();assert.equal(await dialog.locator('.cc-card').count(),0);
  assert.match(await dialog.locator('.cc-empty').innerText(),/Sin coincidencias/);
  await dialog.getByRole('button',{name:'Limpiar filtros'}).click();assert.equal(await dialog.locator('.cc-card').count(),6);
  await dialog.locator('[data-filter="urgent"]').click();assert.equal(await dialog.locator('.cc-card').count(),1);
  assert.equal(await dialog.locator('[data-filter="urgent"]').getAttribute('aria-pressed'),'true');
  assert.equal(await dialog.locator('[data-filter="urgent"]').evaluate(node=>node===document.activeElement),true);
  await clickSection('notifications');assert.equal(await dialog.locator('.cc-card').count(),2);assert.equal(await dialog.locator('input,select').count(),0);await checkDark();
  await page.screenshot({path:path.join(output,'demo-notifications-desktop.png')});
  await clickSection('tasks');assert.equal(await dialog.locator('.cc-card').count(),1);assert.notEqual(await dialog.locator('.cc-filter-panel').getAttribute('open'),null);
  await clickSection('stats');assert.equal(await dialog.locator('.cc-stat').count(),6);await checkDark();
  await page.screenshot({path:path.join(output,'demo-stats-desktop.png')});
  await dialog.getByRole('button',{name:'Ver actividades de este recuento'}).click();
  assert.equal(await dialog.locator('.cc-card').count(),6);assert.equal(await dialog.locator('.cc-filter-panel').getAttribute('open'),null);
  await page.evaluate(()=>window.cc.openAgenda('ted'));
  assert.match(await dialog.locator('.cc-section-heading').innerText(),/Agenda y pendientes de Ted/);
  assert.equal(await dialog.locator('.cc-agenda-events .cc-card').count(),2);assert.equal(await dialog.locator('.cc-agenda-tasks .cc-card').count(),1);
  assert.match(await dialog.locator('.cc-agenda-tasks').innerText(),/Preparar un borrador de ejemplo/);
  await dialog.locator('[data-agenda="julian"]').click();
  assert.match(await dialog.locator('.cc-agenda-tasks').innerText(),/pendiente de autorización/);
  assert.doesNotMatch(await dialog.locator('.cc-agenda-tasks').innerText(),/Preparar un borrador de ejemplo/);
  assert.equal(await dialog.locator('[data-agenda="julian"]').evaluate(node=>node===document.activeElement),true);
  assert.equal(await dialog.locator('input,select,textarea,form').count(),0);await checkDark();
  await page.screenshot({path:path.join(output,'demo-agenda-desktop.png')});
  assert.equal(await page.evaluate(()=>JSON.stringify(window.snapshot)===window.before),true);
  // Closed tasks and other assistants must not leak into a quick agenda summary.
  await page.evaluate(()=>{window.snapshot.tasks.push({id:'complete-ted',title:'Completed task',status:'completed',botId:'ted'});window.cc.openAgenda('ted');});
  assert.equal(await dialog.locator('.cc-agenda-tasks .cc-card').count(),1);
  assert.doesNotMatch(await dialog.locator('.cc-agenda-tasks').innerText(),/Completed task|Julián/);
  for(const width of [390,768]){
    await page.setViewportSize({width,height:844});
    for(const section of ['tasks','notifications','stats','agenda']){
      await clickSection(section);await checkDark();
      await page.screenshot({path:path.join(output,`demo-${section}-${width}.png`)});
    }
    await clickSection('tasks');await dialog.locator('.cc-filter-panel summary').click();
    await dialog.getByRole('searchbox').fill('ejemplo');await checkDark();
    await dialog.locator('.cc-filter-panel summary').click();
  }
  await page.setViewportSize({width:1440,height:960});
  await page.evaluate(()=>{window.failRead=true;window.cc.refresh();});
  assert.match(await page.locator('.cc-source').innerText(),/No se pudo leer/);assert.equal(await dialog.locator('.cc-card').count(),0);
  assert.equal(await dialog.locator('input,select').count(),0);
  await page.evaluate(()=>{window.failRead=false;window.snapshot=window.fixtures.disconnectedSnapshot();window.cc.open('agenda');});
  assert.deepEqual(await dialog.locator('.cc-summary dd').allTextContents(),['—','—']);
  await page.evaluate(()=>{window.snapshot=window.fixtures.demoSnapshot();window.cc.open('tasks');});
  await dialog.getByRole('button',{name:'Ver a Ted',exact:true}).click();
  assert.equal(await dialog.isVisible(),false);assert.deepEqual(await page.evaluate(()=>window.chosen),['ted']);
  // Repeated opens remain one modal and explicit close restores the invoking control.
  await page.locator('#trigger').click();await page.evaluate(()=>{window.cc.open();window.cc.open();});
  assert.equal(await page.locator('.cc-dialog').count(),1);
  await dialog.getByRole('button',{name:'Cerrar centro de mando'}).click();await page.waitForFunction(()=>document.activeElement.id==='trigger');
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:true,errors,writes,viewports:[1440,768,390],at:new Date().toISOString()},null,2));
  await browser.close();console.log(`PASS: read-only command center, interactions, dark surfaces, focus, source states and mobile layout. Screenshots: ${output}`);
})().catch(error=>{console.error(error);process.exit(1);});
