import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOURCE_CONTRACT} from '../src/source-contract.js';
import {plainAvisosState} from '../src/avisos-panel.js';
import {horaAviso} from '../src/ntfy-session.js';

test('s12: the live status label is San Junipero Corp, not Oficina-bots', () => {
  assert.equal(SOURCE_CONTRACT.sourceLabel, 'San Junipero Corp');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /En vivo · \$\{snapshot\.source\}/);
  const src = readFileSync(new URL('../src/source-contract.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /sourceLabel: 'Oficina-bots/);
});

test('s12: Avisos explains a shared-network quota without leaking a topic', () => {
  const hora = horaAviso('2026-11-23T23:21:31-06:00');
  const st = plainAvisosState({
    avisosConfig: true,
    avisosOk: '2026-11-07T16:51:28-06:00',
    avisosError: '2026-11-15T20:46:20-06:00',
    avisosMotivo: 'cupo diario de esta red agotado',
    avisosReintenta: '2026-11-23T23:21:31-06:00',
  }, Date.parse('2026-11-23T12:00:00-06:00'));
  assert.equal(st.tone, 'warn');
  assert.equal(st.text, `El cupo diario de avisos de esta red se acabó. Se reintenta a las ${hora}.`);
  assert.doesNotMatch(st.text, /tema|ntfy\.sh|42908/i);
});

test('s12: Avisos keeps the generic text when there is no retry time', () => {
  const st = plainAvisosState({
    avisosConfig: true,
    avisosOk: '2026-11-07T10:00:00Z',
    avisosError: '2026-11-08T10:00:00Z',
  });
  assert.equal(st.text, 'El último aviso no llegó. La caja lo vuelve a intentar sola.');
});
