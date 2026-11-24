import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mapOficinaEstado} from '../src/adapter.js';
import {mapSalud} from '../src/ntfy-session.js';
import {canalAvisosLabel, usaTelegramEnTelefono, plainAvisosState} from '../src/avisos-panel.js';
import {VERSION_RE} from '../src/release-notice.js';
import {bots} from '../src/data.js';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src');
const known = bots.map(b => b.id);

test('VERSION_RE reconoce 0.22.7s14-prueba', () => {
  assert.equal(VERSION_RE.test('0.22.7s14-prueba'), true);
  assert.equal(VERSION_RE.test('0.22.7s14'), true);
  assert.equal(VERSION_RE.test('0.22.7'), true);
});

test('mapOficinaEstado pasa canal Telegram y descarta secretos', () => {
  const payload = {
    actualizado: '2026-11-23T18:00:00-06:00',
    bots: known.map(id => ({id, estado: 'pausa', frase: ''})),
    salud: {
      latido: '2026-11-23T18:00:00-06:00',
      mando: '2026-11-23T18:00:00-06:00',
      avisos_ok: '2026-11-23T18:00:00-06:00',
      avisos_error: null,
      avisos_config: true,
      avisos_canal: 'telegram',
      avisos_telegram: true,
      tema: 'NO-DEBE-PASAR',
      chat_id: '1098765432',
      token: '123456:AA-NO',
      avisos_motivo: 'ok',
    },
  };
  const mapped = mapOficinaEstado(payload, known);
  assert.equal(mapped.salud.avisos_canal, 'telegram');
  assert.equal(mapped.salud.avisos_telegram, true);
  assert.equal(mapped.salud.tema, undefined);
  assert.equal(mapped.salud.chat_id, undefined);
  assert.equal(mapped.salud.token, undefined);
  const s = mapSalud(mapped.salud);
  assert.equal(s.avisosCanal, 'telegram');
  assert.equal(s.avisosTelegram, true);
  assert.equal(canalAvisosLabel(s), 'Canal: Telegram · Conectado');
  assert.equal(usaTelegramEnTelefono(s), true);
  assert.equal(plainAvisosState(s).text, 'Los avisos están llegando bien.');
});

test('mapSalud ignora un canal que no sea telegram o ntfy', () => {
  const s = mapSalud({avisos_config: true, avisos_canal: 'https://evil.example', avisos_telegram: 'sí'});
  assert.equal(s.avisosCanal, null);
  assert.equal(s.avisosTelegram, null);
  assert.equal(canalAvisosLabel(s), null);
  assert.equal(usaTelegramEnTelefono(s), false);
});

test('el motivo no pasa si menciona token o chat_id', () => {
  const mapped = mapOficinaEstado({
    actualizado: '2026-11-23T18:00:00-06:00',
    bots: known.map(id => ({id, estado: 'pausa', frase: ''})),
    salud: {latido: '2026-11-23T18:00:00-06:00', avisos_config: true, avisos_motivo: 'falló el token abc'},
  }, known);
  assert.equal(mapped.salud.avisos_motivo, null);
});

test('la hoja de avisos trae el distintivo y el botón del boceto, sin pedir el tema si Telegram está conectado', () => {
  const src = readFileSync(join(srcRoot, 'avisos-panel.js'), 'utf8');
  assert.match(src, /Canal: Telegram · Conectado/);
  assert.match(src, /Cambiar o desconectar/);
  assert.match(src, /Telegram está vinculado a este teléfono/);
  assert.match(src, /data-telegram-phone/);
  assert.match(src, /usaTelegramEnTelefono\(salud\)/);
  const css = readFileSync(join(srcRoot, 'style.css'), 'utf8');
  assert.match(css, /\.avisos-canal\{/);
  assert.match(css, /#1d3a2a/);
  assert.match(css, /#c7efd4/);
});
