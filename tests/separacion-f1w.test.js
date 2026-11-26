import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
const tick = src.slice(src.indexOf('function tick(){'), src.indexOf('const resize=()=>'));

test('F1w: el modo ligero solo existe en celular, en Separación amplia o Plantas y sin piso abierto', () => {
  assert.match(src, /const lite=\(\)=>phone&&floor<0&&\(mode==='stacked'\|\|mode==='spread'\)/);
  assert.match(src, /const phone=typeof matchMedia==='function'&&matchMedia\('\(max-width:760px\)'\)\.matches/);
});

test('F1w: en modo ligero el bucle va a 30 fps como mucho y se salta el repintado si nada cambió', () => {
  assert.match(tick, /if\(liteNow&&nowMsTick-liteLast<30\)return;/);
  assert.match(tick, /if\(!active&&!liteDirty&&sig===liteSig&&nowMsTick-liteBeat<700\)return;/);
  // sin caminatas ni avatares animados en ese modo: el bloque ligero sale antes de movement.update y del bucle de avatares
  const liteBlock = tick.slice(tick.indexOf('if(liteNow&&!busy){'), tick.indexOf('floorLabels?.update(projectFloorLabels(),labelPins());\n  if(busy){'));
  assert.doesNotMatch(liteBlock, /movement\.update|avatars\.update\(t,animateBots/);
  assert.match(liteBlock, /paintNow\(\)/);
  assert.match(liteBlock, /return;\n\s*\}\n\s*if\(!liteNow\)liteWasOn=false;/);
});

test('F1w: lo que cambia la escena marca el repintado (vista, tamaño, luz, estados, selección; los vidrios van en la firma)', () => {
  for (const re of [
    /function setView\(f=-1,\{animate=true\}=\{\}\)\{floor=f;liteDirty=true;/,
    /const resize=\(\)=>\{liteDirty=true;/,
    /function applyLighting\(p=\{\}\)\{liteDirty=true;/,
    /select\(id\)\{selected=id;liteDirty=true;\}/,
    /function setStatuses\([^)]*\)\s*\{liteDirty=true;/,
  ]) assert.match(src, re);
});

test('F1w: los vidrios (walls) y la selección entran en la firma de cámara', () => {
  assert.match(tick, /selected\|\|'',floor,mode,walls\]/);
});

test('F1w: fuera del modo ligero (escritorio y Edificio cerrado) el bucle de render no cambia', () => {
  // la rama normal sigue ahí, con movement.update y el bucle de avatares
  assert.match(tick, /movement\.update\(step,\{reducedMotion:reduced,paused:/);
  assert.match(tick, /avatars\.update\(t,animateBots\?'idle':false,phoneFar\)/);
  assert.match(tick, /if\(!liteNow\)liteWasOn=false;/);
  // pixelRatio de escritorio y de Edificio cerrado en celular intactos
  assert.match(src, /const cap=phone\?\(\(viewMode==='stacked'\|\|viewMode==='spread'\)\?1\.0:1\.5\):1\.6;/);
});
