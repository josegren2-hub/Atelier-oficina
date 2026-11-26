import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estadoModoDios, estadoDia} from '../src/tira-estado.js';
import {CHROME_SELECTORS} from '../src/selection-labels.js';

const css = readFileSync(new URL('../src/nav-shell.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../src/nav-shell.js', import.meta.url), 'utf8');
const floorLabels = readFileSync(new URL('../src/floor-labels.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const f1i = css.slice(css.indexOf('/* ===== f1i'));
const mediaStart = f1i.indexOf('@media (max-width:760px) and (orientation:portrait){');
const fuera = f1i.slice(0, mediaStart);
const dentro = f1i.slice(mediaStart);

test('F1i: Modo dios es el mando cifrado y refleja .unlocked', () => {
  const cerrado = estadoModoDios({classList: {contains: () => false}, textContent: 'Mando bloqueado'});
  assert.equal(cerrado.abierto, false);
  assert.equal(cerrado.estado, 'cerrado');
  assert.equal(cerrado.icono, 'candado');
  const abierto = estadoModoDios({classList: {contains: c => c === 'unlocked'}, textContent: 'Mando desbloqueado · cifrado local'});
  assert.equal(abierto.abierto, true);
  assert.equal(abierto.estado, 'abierto');
  assert.equal(abierto.icono, 'candadoAbierto');
  assert.match(abierto.aria, /abierto/);
  assert.equal(estadoModoDios(null).abierto, false);
});

test('F1i: «desbloqueado» contiene «bloqueado» y no debe quedar como cerrado', () => {
  const el = {classList: {contains: () => false}, textContent: 'Mando desbloqueado · cifrado local'};
  assert.equal(estadoModoDios(el).abierto, true);
});

test('F1i: Día cicla con la etiqueta real de #dock-noche', () => {
  assert.deepEqual([estadoDia('', undefined).lab, estadoDia('', undefined).noche], ['Auto', false]);
  assert.equal(estadoDia('Noche', undefined).icono, 'noche');
  assert.equal(estadoDia('Día', 'day').icono, 'dia');
  assert.equal(estadoDia('Auto', 'night').icono, 'noche');
  assert.match(estadoDia('Día').aria, /Auto, Noche y Día/);
});

test('F1i: la píldora tiene Menú, Modo dios y Día y reutiliza los controles existentes', () => {
  assert.match(js, /class="ns-tab ns-tab-menu"[^>]*aria-label="Menú"/);
  assert.match(js, /ns-tab-dios/);
  assert.match(js, /ns-tab-luz/);
  assert.match(js, /click\('mando-unlock'\)/);
  assert.match(js, /click\('dock-noche'\)/);
  assert.match(js, /alternarMenu\(tabMenu\)/);
  assert.doesNotMatch(js, /ns-tab-vistas|data-tab="vistas"/, 'Vistas no vive en la píldora (Rob t504u)');
  assert.match(js, /classList\.toggle\('unlocked'/);
});

test('F1i: medidas del boceto 79 (73 px arriba, 38 px vistas, píldora 230×54)', () => {
  assert.match(dentro, /--f1i-top:73px/);
  assert.match(dentro, /height:36px!important;min-height:36px!important/);
  assert.match(dentro, /height:37px!important/);
  assert.match(dentro, /\.ns-tabbar\{[^}]*width:min\(230px,60%\);height:54px/);
  assert.match(dentro, /bottom:calc\(12px \+ var\(--f1i-safe\)\)/);
  assert.match(dentro, /--f1i-safe:env\(safe-area-inset-bottom,0px\)/);
  assert.match(dentro, /vista-toolbar\.vista-toolbar\{[^}]*bottom:calc\(74px \+ var\(--f1i-safe\)\)!important;height:38px/);
  assert.match(dentro, /border-radius:999px/);
});

test('F1i: sin «VISTA GENERAL» ni racha/«…» en la tira de arriba', () => {
  assert.match(dentro, /\.scene-title > span[^{]*\{display:none!important\}/);
  assert.match(dentro, /\.chrome-primary\{display:none!important\}/);
  assert.match(dentro, /\.brand small\{display:none!important\}/);
});

test('F1i: solo móvil vertical; fuera del @media la tira está oculta', () => {
  assert.ok(mediaStart > 0);
  assert.equal(fuera.replace(/\/\*[\s\S]*?\*\//g, '').trim(), '.ns-tabbar,.ns-cams-toggle{display:none}', 'fuera del @media solo se oculta');
  assert.match(fuera, /\.ns-tabbar,\.ns-cams-toggle\{display:none\}/);
  assert.doesNotMatch(dentro, /@media\s*\(min-width/);
  assert.doesNotMatch(dentro, /orientation:landscape/);
});

test('F1i: la cámara va detrás de un botón y las 4 vistas quedan siempre visibles', () => {
  assert.match(js, /ns-cams-toggle/);
  assert.match(js, /vt\.classList\.toggle\('cams-open'/);
  assert.match(dentro, /\.controls[^{]*\{display:none!important;order:3\}/);
  assert.match(dentro, /cams-open \.controls[^{]*\{display:flex!important/);
  assert.match(dentro, /@media \(max-width:374px\)/);
});

test('F1i: los pines evitan la píldora', () => {
  assert.ok(CHROME_SELECTORS.includes('.ns-tabbar'));
  assert.ok(CHROME_SELECTORS.includes('#vista-toolbar'));
  assert.match(floorLabels, /BOTTOM_CHROME = \[[^\]]*'\.ns-tabbar'/);
  assert.match(main, /\.ns-luz,\.ns-tabbar/);
});

test('F1i: en inmersivo la píldora y las vistas se ocultan', () => {
  assert.match(dentro, /body\.ns-inmersivo \.ns-tabbar/);
});
