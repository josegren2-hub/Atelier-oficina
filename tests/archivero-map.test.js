import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {deriveMandoKey, decryptEncJson, bytesToB64} from '../src/crypto-mando.js';
import {foldersFor, archiveroEncUrl} from '../src/archivero-map.js';
import {showArchiveroList, showArchiveroLocked, closeArchiveroUi, openArchivero} from '../src/archivero-ui.js';

const subtle = webcrypto.subtle;

test('archiveroEncUrl stays under the app base', () => {
  assert.equal(archiveroEncUrl('/Atelier-oficina/prueba/'), '/Atelier-oficina/prueba/archivero.enc');
  assert.equal(archiveroEncUrl('/Atelier-oficina/prueba'), '/Atelier-oficina/prueba/archivero.enc');
});

test('foldersFor returns the bot list or empty', () => {
  const map = {bots: {ines: {nombre: 'Inés', folders: [{label: '04 Finanzas', path: 'Mi unidad / 04 Finanzas', url: 'https://example.invalid/a'}]}}};
  assert.equal(foldersFor(map, 'ines').length, 1);
  assert.deepEqual(foldersFor(map, 'ceo'), []);
});

test('published archivero.enc is an envelope with no plaintext Drive links', () => {
  const raw = readFileSync(new URL('../public/archivero.enc', import.meta.url), 'utf8');
  const enc = JSON.parse(raw);
  assert.equal(enc.v, 1);
  assert.equal(enc.kdf, 'PBKDF2-SHA256');
  assert.ok(enc.iter >= 100000);
  assert.equal(raw.includes('drive.google.com'), false);
  assert.equal(raw.includes('my-drive'), false);
  assert.equal(raw.includes('01 PJF'), false);
  assert.equal(raw.includes('Oficina digital'), false);
  assert.equal(raw.includes('10 Asistente IA'), false);
  assert.equal(raw.includes('Libro y novela'), false);
  assert.equal(raw.includes('07 Libro'), false);
});

test('list UI shows names and not a single-folder auto-open', () => {
  globalThis.document = {
    head: {append(n) { this.child = n; }},
    body: {append(n) { this.nodes = (this.nodes || []).concat(n); }, querySelector() { return null; }},
    querySelector() { return this.body; },
    getElementById() { return null; },
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        children: [],
        attrs: {},
        setAttribute(k, v) { this.attrs[k] = v; },
        addEventListener() {},
        querySelector() { return {addEventListener() {}}; },
        remove() {},
      };
      Object.defineProperty(el, 'innerHTML', {
        get() { return this._html || ''; },
        set(v) { this._html = v; },
      });
      Object.defineProperty(el, 'id', {writable: true, value: ''});
      return el;
    },
  };
  const opened = [];
  const orig = globalThis.window;
  globalThis.window = {open(url) { opened.push(url); return {}; }, location: {assign(url) { opened.push(url); }}};
  showArchiveroList('Julián', [
    {label: '01 PJF', path: 'Mi unidad / 01 PJF', url: 'https://example.invalid/pjf'},
    {label: '03 UACH', path: 'Mi unidad / 03 UACH', url: 'https://example.invalid/uach'},
  ]);
  const box = document.body.nodes.at(-1);
  assert.match(box.innerHTML, /01 PJF/);
  assert.match(box.innerHTML, /03 UACH/);
  assert.equal(opened.length, 0);
  showArchiveroList('Rulo', [{label: '08 Podcast', path: 'Mi unidad / 08 Podcast', url: 'https://example.invalid/pod'}]);
  assert.deepEqual(opened, ['https://example.invalid/pod']);
  closeArchiveroUi();
  globalThis.window = orig;
});

test('locked mando shows the warning and does not open Drive', async () => {
  const opened = [];
  globalThis.window = {open(url) { opened.push(url); return {}; }, location: {assign(url) { opened.push(url); }}};
  globalThis.document = {
    head: {append() {}},
    body: {append(n) { this.nodes = (this.nodes || []).concat(n); }, querySelector() { return null; }},
    querySelector() { return this.body; },
    getElementById() { return null; },
    createElement() {
      return {setAttribute() {}, addEventListener() {}, querySelector() { return {addEventListener() {}}; }, remove() {}, innerHTML: '', id: ''};
    },
  };
  const result = await openArchivero('julian', {unlocked: false, key: null});
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'locked');
  assert.equal(opened.length, 0);
});
