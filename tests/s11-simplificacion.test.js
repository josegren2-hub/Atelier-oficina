import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPizarronModel, haceText} from '../src/pizarron.js';
import {plainAvisosState} from '../src/avisos-panel.js';
import {VERSION_RE, checkRelease} from '../src/release-notice.js';
const rd = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const cc = rd('src/command-center.js'), main = rd('src/main.js'), html = rd('index.html'), av = rd('src/avisos-panel.js'), res = rd('src/resumen-panel.js'), css = rd('src/style.css');

test('s11 A: una sola hoja «Avisos al celular» sin textos técnicos ni prueba desechable', () => {
  assert.match(av, /<h2 id="avisos-dialog-title">Avisos al celular<\/h2>/);
  for (const w of ['estado.json', 'oficina anterior', 'loop', 'Umbral', 'data-test-throwaway']) assert.ok(!av.includes(w), w);
  assert.match(av, /<details class="avisos-block avisos-hist"/);
  assert.doesNotMatch(html, /notifications-open|pending-open/);
  assert.match(html, /<button id="avisos-open" type="button">Avisos al celular<\/button>/);
  assert.equal(plainAvisosState({avisosConfig: true, avisosOk: '2026-11-07T10:00:00Z', avisosError: '2026-11-08T10:00:00Z'}).text, 'El último aviso no llegó. La caja lo vuelve a intentar sola.');
  assert.equal(plainAvisosState({avisosConfig: true, avisosOk: '2026-11-07T10:00:00Z'}).tone, 'ok');
});

test('s11 B: Centro de mando con solo Actividades y Agendas', () => {
  const nav = cc.match(/<nav class="cc-nav"[^]*?<\/nav>/)[0];
  assert.deepEqual([...nav.matchAll(/data-section="(\w+)"/g)].map(m => m[1]), ['tasks', 'agenda']);
  assert.match(cc, /section=next==='agenda'\?'agenda':'tasks'/);
  assert.match(cc, /Actualizado \$\{updatedText\(model\.lastSignal\)\} · solo consulta/);
  assert.match(cc, /summary\(\[\['En curso',model\.counts\.in_progress\],\['Urgentes',model\.counts\.urgent\]\]\)/);
  assert.match(cc, /\$\{label\} · \$\{n\}/); // recuento por estado en los filtros
});

test('s11 C: «Te esperan» en el Pizarrón (también bloqueado), numerito y Resumen de una línea', () => {
  const m = buildPizarronModel({mando: null, waiting: [{id: 'luna', name: 'Luna', waitingSince: '2026-11-23T06:00:00Z', pendiente: 'secreto'}]});
  assert.equal(m.unlocked, false);
  assert.equal(m.esp.length, 1);
  assert.equal(m.esp[0].pendiente, ''); // sin Mando no se muestra el pendiente
  const u = buildPizarronModel({mando: {}, waiting: [{id: 'luna', name: 'Luna', pendiente: 'Revisar'}]});
  assert.equal(u.esp[0].pendiente, 'Revisar');
  assert.equal(haceText(new Date(Date.now() - 40 * 60000).toISOString()), 'hace 40 min');
  assert.equal(haceText(new Date(Date.now() - 3 * 3600e3).toISOString()), 'hace 3 h');
  assert.match(main, /\['pizarron-open','Pizarrón','cal'\],\['avisos-open','Avisos al celular','cel'\],\['command-open','Centro de mando','cc'\],\['refresh-office','Actualizar','ref'\]/);
  assert.match(main, /postpone\(b\.id,b\.waitingSince,'3h'\)/);
  assert.match(html, /id="dock-paneles"[^]*?class="sj-badge wait-badge dock-badge" hidden/);
  assert.doesNotMatch(res, /Atorado/);
  assert.match(res, /data-goto-pizarron/);
  assert.match(main, /abrir==='esperan'\|\|abrir==='waiting'\)sheets\.open\('pizarron'\)/);
});

test('s11 D: áreas de toque de 44 px solo en teléfono, con borde invisible', () => {
  const d = css.slice(css.indexOf('/* D · áreas de toque'));
  assert.match(d, /@media \(max-width:760px\)/);
  assert.match(d, /#mas-open::after/);
  assert.match(d, /height:max\(100%,44px\)/);
  assert.match(d, /background:transparent/);
});

test('s11: «Comprobar versión» reconoce la versión de prueba', async () => {
  assert.ok(VERSION_RE.test('0.22.4'));
  assert.ok(VERSION_RE.test('0.22.4s11-prueba'));
  assert.ok(VERSION_RE.test('0.22.4s9n-prueba'));
  assert.ok(!VERSION_RE.test('hola'));
  const r = await checkRelease(async () => ({ok: true, json: async () => ({version: '0.22.4s11-prueba'})}));
  assert.equal(r.available, '0.22.4s11-prueba');
});
