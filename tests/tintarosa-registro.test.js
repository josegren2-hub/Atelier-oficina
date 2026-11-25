import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {historialDesdeApi, estadoConVivo, chipsHtml, fechaCorta, esc, hoyIso} from '../src/tintarosa-registro.js';

describe('registro Tinta Rosa (s22)', () => {
  it('historial solo acepta links de tintarosa.mx y decodifica títulos', () => {
    const h = historialDesdeApi([
      {slug: 'a', link: 'https://tintarosa.mx/a/', date: '2026-11-23T13:30:53', title: {rendered: 'Hace 35 a&#241;os &amp; m&aacute;s'}},
      {slug: 'b', link: 'https://evil.example/b/', date: '2026-11-23T13:30:53', title: {rendered: 'x'}},
    ]);
    assert.equal(h.length, 1);
    assert.equal(h[0].cuando, 'lun 23 nov · 13:30');
    assert.ok(h[0].titulo.startsWith('Hace 35 años & m'));
  });
  it('la web pasa a «salió» si el slug ya está en vivo', () => {
    const fila = {slug: 's', estado: {web: {e: 'programado'}, fb: {e: 'programado'}}};
    const e = estadoConVivo(fila, [{slug: 's', fecha: '2026-11-25T13:02:00', link: 'https://tintarosa.mx/s/'}]);
    assert.deepEqual(e.web, {e: 'salio', hora: '13:02', link: 'https://tintarosa.mx/s/'});
    assert.equal(e.fb.e, 'programado');
  });
  it('muestra las cinco redes por separado y escapa HTML', () => {
    const html = chipsHtml({web: {e: 'salio', hora: '13:36'}, x: {e: 'sin-confirmar'}});
    for (const r of ['Web · salió 13:36', 'FB · no va', 'IG · no va', 'X · sin confirmar', 'Bluesky · no va']) assert.ok(html.includes(r), r);
    assert.equal(esc('<b>'), '&lt;b&gt;');
  });
  it('fecha corta y hoy en Chihuahua', () => {
    assert.equal(fechaCorta('bad'), '');
    assert.equal(hoyIso(new Date('2026-11-25T05:00:00Z')), '2026-11-24');
  });
});
