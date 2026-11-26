import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  assignLanes, compactCluster, groupClusters, layoutDay, maxConcurrency,
  minutesOf, nowMinutes, ymdChihuahua, addDays, fmtHour,
} from '../src/agenda-calendario.js';

const src = readFileSync(new URL('../src/agenda-calendario.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/agenda-calendario.css', import.meta.url), 'utf8');
const cc = readFileSync(new URL('../src/command-center.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

function ev(start, dur, extra = {}) {
  return {start, dur, hora: fmtHour(start), fin: dur && extra.fin !== '' ? fmtHour(start + dur) : (extra.fin ?? fmtHour(start + dur)), titulo: extra.titulo || 'x', tipo: extra.tipo || 'cal', fecha: extra.fecha || '2026-11-26', ...extra};
}

test('F1s: dos eventos que se empalman van en carriles distintos y no comparten el mismo lane', () => {
  const a = ev(9 * 60, 60, {titulo: 'A'});
  const b = ev(9 * 60 + 30, 60, {titulo: 'B'});
  const laid = assignLanes([a, b]);
  assert.equal(laid.length, 2);
  assert.notEqual(laid[0].lane, laid[1].lane);
  assert.equal(laid[0].lanes, 2);
  assert.equal(laid[1].lanes, 2);
  const boxed = laid.map(e => ({l: e.lane, x0: e.lane / e.lanes, x1: (e.lane + 1) / e.lanes, t0: e.start, t1: e.start + e.dur}));
  // geometric overlap in both time and column would be a bug
  const overlap = boxed[0].t0 < boxed[1].t1 && boxed[1].t0 < boxed[0].t1 && boxed[0].x0 < boxed[1].x1 && boxed[1].x0 < boxed[0].x1;
  assert.equal(overlap, false);
});

test('F1s: eventos que no se tocan quedan en un solo carril', () => {
  const a = ev(9 * 60, 60);
  const b = ev(10 * 60, 30);
  assignLanes([a, b]);
  assert.equal(a.lane, 0);
  assert.equal(b.lane, 0);
  assert.equal(a.lanes, 1);
  assert.equal(b.lanes, 1);
});

test('F1s: con 3 o más a la vez se compacta a dos columnas y un +N', () => {
  const evs = [ev(14 * 60, 60, {titulo: 'uno'}), ev(14 * 60, 45, {titulo: 'dos'}), ev(14 * 60 + 15, 60, {titulo: 'tres'})];
  assignLanes(evs);
  assert.equal(maxConcurrency(evs), 3);
  const cluster = compactCluster({events: evs});
  assert.equal(cluster.compact, true);
  assert.equal(cluster.plus, 1);
  assert.equal(cluster.shown.length, 2);
  assert.equal(cluster.hidden.length, 1);
  assert.equal(cluster.hidden[0].hidden, true);
  assert.ok(cluster.shown.every(e => e.lanes === 2 && e.plusGutter === true && !e.hidden));
});

test('F1s: sin hora de fin se dibuja 1 hora (sinFin)', () => {
  const ymd = '2026-11-26';
  const items = [{fecha: ymd, hora: '16:00', fin: '', titulo: 'recordatorio', tipo: 'cal'}];
  const day = layoutDay(items, ymd);
  assert.equal(day.events.length, 1);
  assert.equal(day.events[0].dur, 60);
  assert.equal(day.events[0].sinFin, true);
  assert.equal(day.events[0].start, 16 * 60);
});

test('F1s: eventos de todo el día (sin hora) van a la franja, no al tablero', () => {
  const ymd = '2026-11-26';
  const items = [
    {fecha: ymd, todoElDia: true, titulo: 'aviso', tipo: 'cal'},
    {fecha: ymd, hora: '09:00', fin: '10:00', titulo: 'cita', tipo: 'cal'},
  ];
  const day = layoutDay(items, ymd);
  assert.equal(day.allDay.length, 1);
  assert.equal(day.allDay[0].titulo, 'aviso');
  assert.equal(day.events.length, 1);
  assert.equal(day.events[0].titulo, 'cita');
});

test('F1s: nowMinutes usa America/Chihuahua sobre una fecha fija', () => {
  // 2026-11-26 16:20 UTC = 09:20 in America/Chihuahua (UTC-7 in late November? or UTC-6)
  // Chihuahua is UTC-6 year-round (no DST since 2022). 16:20 UTC → 10:20 local.
  const d = new Date('2026-11-26T16:20:00Z');
  assert.equal(ymdChihuahua(d), '2026-11-26');
  assert.equal(nowMinutes(d), 10 * 60 + 20);
  assert.equal(fmtHour(nowMinutes(d)), '10:20');
  assert.equal(addDays('2026-11-26', 1), '2026-11-27');
  assert.equal(minutesOf('09:15'), 9 * 60 + 15);
  assert.equal(minutesOf(''), null);
});

test('F1s: el módulo publicado no trae el enganche del boceto ni datos de ejemplo', () => {
  for (const bad of ['exampleItems', 'bocetoConfig', 'exampleNowMin', 'installAgendaBoceto', '?boceto=', 'datos ficticios', 'Ejemplo: reunión', 'freezeView']) {
    assert.equal(src.includes(bad), false, bad);
    assert.equal(cc.includes(bad), false, 'cc:' + bad);
    assert.equal(main.includes(bad), false, 'main:' + bad);
  }
  assert.match(css, /--ag-rail:42px/);
  assert.match(css, /#bcd9ec/);
  assert.match(css, /overflow-x:hidden/);
  assert.match(main, /import '\.\/agenda-calendario\.css'/);
  assert.match(cc, /renderAgendaCalendario/);
  assert.match(cc, /cc-agenda-events/);
  assert.match(cc, /cc-agenda-tasks/);
});

test('F1s: la vista calendario solo se engancha con el mando desbloqueado; el camino bloqueado no la llama', () => {
  const locked = cc.slice(cc.indexOf('function renderAgenda()'), cc.indexOf('function renderMandoAgenda'));
  const mando = cc.slice(cc.indexOf('function renderMandoAgenda'));
  assert.match(locked, /if\(mando\)\{renderMandoAgenda/);
  assert.equal(locked.includes('renderAgendaCalendario'), false);
  assert.match(mando, /renderAgendaCalendario/);
  assert.match(mando, /buildPizarronModel\(\{mando\}\)/);
});

test('F1s: groupClusters junta solo los que se tocan', () => {
  const evs = [ev(9 * 60, 60), ev(9 * 60 + 30, 60), ev(12 * 60, 30)];
  const groups = groupClusters(evs);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].events.length, 2);
  assert.equal(groups[1].events.length, 1);
});
