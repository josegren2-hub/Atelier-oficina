import test from 'node:test';
import assert from 'node:assert/strict';
import {mountHistoryBack} from '../src/history-back.js';

test('history back closes layers in order without leaving', () => {
  const calls = [];
  let detail=true, piz=false, equipo=true, zoom=true, cmd=false, mando=false;
  const states = [];
  const hist = {
    stack: [{atelierBack:'inicio'}, {atelierBack:'base'}],
    replaceState(s){this.stack[0]=s;},
    pushState(s){this.stack.push(s);},
    get state(){return this.stack.at(-1);},
  };
  globalThis.history = hist;
  globalThis.addEventListener = (type, fn) => { if(type==='popstate') globalThis.__pop = fn; };
  globalThis.removeEventListener = () => {};
  globalThis.matchMedia = () => ({matches: true});

  const hb = mountHistoryBack({
    isDetailOpen:()=>detail, closeDetail:()=>{detail=false;calls.push('detail');},
    isPizarronOpen:()=>piz, closePizarron:()=>{piz=false;calls.push('piz');},
    isEquipoOpen:()=>equipo, foldEquipo:()=>{equipo=false;calls.push('equipo');},
    isZoomedOrFloor:()=>zoom, resetView:()=>{zoom=false;calls.push('zoom');},
    isCommandOpen:()=>cmd, closeCommand:()=>{cmd=false;calls.push('cmd');},
    isMandoOpen:()=>mando, closeMando:()=>{mando=false;calls.push('mando');},
  });

  // simulate back presses
  globalThis.__pop();
  assert.deepEqual(calls, ['detail']);
  globalThis.__pop();
  assert.deepEqual(calls, ['detail','equipo']); // mobile folds equipo before zoom
  globalThis.__pop();
  assert.deepEqual(calls, ['detail','equipo','zoom']);
  globalThis.__pop(); // nothing left — still pushes base
  assert.ok(hist.stack.length >= 2);
  hb.destroy();
});
