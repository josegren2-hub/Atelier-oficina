import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {horaAviso, horaSinPuntoFinal, avisosHealthLabel} from '../src/ntfy-session.js';
import {plainAvisosState} from '../src/avisos-panel.js';
import {rectsOverlap, pinBox, pinBlockedByChrome, CHROME_SELECTORS} from '../src/selection-labels.js';
import {VERSION_RE} from '../src/release-notice.js';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('s13: view menu, dock, header and floors stack above the pin canvas', () => {
  assert.match(css, /\.capa-sel\{[^}]*z-index:18/);
  assert.match(css, /\.capa-sel-draw\{[^}]*z-index:19/);
  assert.match(css, /#canvas-container #vista-toolbar\.vista-toolbar\{[^}]*z-index:30/);
  assert.match(css, /#dock\.dock\{[^}]*z-index:50/);
  assert.match(css, /#app>header\.chrome-top,#app>header\{[^}]*z-index:40/);
  assert.match(css, /#floors,\.navigation\{[^}]*z-index:30/);
  assert.match(css, /s13 \(Rob t410u\)/);
  const pin = 19;
  assert.ok(30 > pin && 50 > pin && 40 > pin);
});

test('s13: sheets and dialogs stay above pins', () => {
  assert.match(css, /z-index:40/);
  assert.match(css, /\.ficha-flotante\{[^}]*z-index:45/);
  assert.match(css, /\.pizarron-dialog\{[^}]*z-index:60/);
});

test('s13: a pin under the view menu is blocked; one in the open floor is not', () => {
  const menu = {x: 40, y: 700, w: 310, h: 90};
  const under = pinBox({x: 120, y: 760});
  const open = pinBox({x: 200, y: 400});
  assert.equal(rectsOverlap(under, menu), true);
  assert.equal(pinBlockedByChrome(under, [menu]), true);
  assert.equal(pinBlockedByChrome(open, [menu]), false);
  assert.ok(CHROME_SELECTORS.includes('#vista-toolbar'));
  assert.ok(CHROME_SELECTORS.includes('#dock'));
  assert.ok(CHROME_SELECTORS.includes('#floors'));
});

test('s13: retry copy has a single period after p.m.', () => {
  const hora = horaAviso('2026-11-23T23:21:31-06:00');
  assert.equal(hora, '11:21 p.m.');
  assert.equal(horaSinPuntoFinal(hora), '11:21 p.m');
  const st = plainAvisosState({
    avisosConfig: true,
    avisosOk: '2026-11-07T16:51:28-06:00',
    avisosError: '2026-11-15T20:46:20-06:00',
    avisosMotivo: 'cupo diario de esta red agotado',
    avisosReintenta: '2026-11-23T23:21:31-06:00',
  }, Date.parse('2026-11-23T12:00:00-06:00'));
  assert.equal(st.text, 'El cupo diario de avisos de esta red se acabó. Se reintenta a las 11:21 p.m.');
  assert.doesNotMatch(st.text, /p\.m\.\./);
  const alt = avisosHealthLabel({
    avisosConfig: true,
    avisosOk: '2026-11-07T16:51:28-06:00',
    avisosError: '2026-11-15T20:46:20-06:00',
    avisosMotivo: 'cupo diario de esta red agotado',
    avisosReintenta: '2026-11-23T23:21:31-06:00',
  }, Date.parse('2026-11-23T12:00:00-06:00'));
  assert.doesNotMatch(alt.text, /p\.m\.\./);
  assert.match(alt.text, /11:21 p\.m\.$/);
});

test('s13: Comprobar versión recognizes 0.22.6s13-prueba', () => {
  assert.equal(VERSION_RE.test('0.22.6s13-prueba'), true);
  assert.equal(VERSION_RE.test('0.22.6s13'), true);
});
