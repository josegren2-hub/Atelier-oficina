import test from 'node:test';
import assert from 'node:assert/strict';
import {rachaText} from '../src/resumen-panel.js';
import {staleMessages} from '../src/stale-banner.js';
import {readFileSync} from 'node:fs';

test('rachaText formats public racha', () => {
  assert.match(rachaText(null), /sin datos/);
  assert.match(rachaText({dias: 1, hoy_cero: true}), /1 día.*cero/);
  assert.match(rachaText({dias: 3, hoy_cero: false}), /3 días/);
});

test('stale banner after 45 min without latido', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  const msgs = staleMessages({
    mode: 'live',
    lastSignal: new Date(now - 50 * 60e3).toISOString(),
    salud: {latido: new Date(now - 50 * 60e3).toISOString()},
  }, now);
  assert.ok(msgs.some(m => /sin actualizar/i.test(m)));
});

test('PWA sw never caches live data files', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /estado\.json/);
  assert.match(sw, /mando\.enc/);
  assert.match(sw, /tareas\.enc/);
  assert.match(sw, /no-store/);
  assert.match(sw, /atelier-v0\.22\.0/);
});

test('manifest has lista and resumen shortcuts', () => {
  const m = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  const urls = m.shortcuts.map(s => s.url).join(' ');
  assert.match(urls, /abrir=lista/);
  assert.match(urls, /abrir=resumen/);
});

test('stale banner for mando after 26 h', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  const msgs = staleMessages({
    mode: 'live',
    lastSignal: new Date(now - 10 * 60e3).toISOString(),
    salud: {
      latido: new Date(now - 10 * 60e3).toISOString(),
      mando: new Date(now - 30 * 3600e3).toISOString(),
    },
  }, now);
  assert.ok(msgs.some(m => /Mando cifrado/i.test(m)));
  const fresh = staleMessages({
    mode: 'live',
    lastSignal: new Date(now - 10 * 60e3).toISOString(),
    salud: { latido: new Date(now - 10 * 60e3).toISOString(), mando: new Date(now - 10 * 3600e3).toISOString() },
  }, now);
  assert.ok(!fresh.some(m => /Mando cifrado/i.test(m)));
});

test('stale banner mounts between header and main, not prepended over logo', () => {
  const src = readFileSync(new URL('../src/stale-banner.js', import.meta.url), 'utf8');
  assert.match(src, /insertBefore\(el,\s*main\)/);
  assert.doesNotMatch(src, /\.prepend\(/);
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /#app:has\(> \.atelier-stale:not\(\[hidden\]\)\)/);
});
