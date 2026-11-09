import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTopic,
  subscribeUrl,
  atelierDeepLink,
  hoursWaiting,
  waitingAlertCandidates,
  mapSalud,
  avisosHealthLabel,
  sendThrowawayTest,
  createNtfySession,
  NTFY_LS_KEY,
  ATELIER_PUBLIC_BASE,
} from '../src/ntfy-session.js';

test('topic normalize rejects short or path-like values', () => {
  assert.throws(() => normalizeTopic('abc'), /largo/);
  assert.throws(() => normalizeTopic('foo/bar'), /espacios|barras/);
  assert.equal(normalizeTopic('  secreto-tema-largo-ok  '), 'secreto-tema-largo-ok');
});

test('subscribeUrl encodes topic and deep links point at Atelier', () => {
  assert.equal(subscribeUrl('mi-tema-secreto-xx'), 'https://ntfy.sh/mi-tema-secreto-xx');
  const link = atelierDeepLink({botId: 'ted', abrir: 'avisos'});
  assert.ok(link.startsWith(ATELIER_PUBLIC_BASE));
  assert.match(link, /bot=ted/);
  assert.match(link, /abrir=avisos/);
});

test('waitingAlertCandidates only after 24h review', () => {
  const now = Date.parse('2026-11-09T12:00:00-06:00');
  const bots = [
    {id: 'a', name: 'Ada', status: 'review', waitingSince: '2026-11-08T10:00:00-06:00'}, // 26h
    {id: 'b', name: 'Bea', status: 'review', waitingSince: '2026-11-09T01:00:00-06:00'}, // 11h
    {id: 'c', name: 'Ciro', status: 'working', waitingSince: '2026-11-01T00:00:00-06:00'},
  ];
  const c = waitingAlertCandidates(bots, now);
  assert.equal(c.length, 1);
  assert.equal(c[0].id, 'a');
  assert.ok(c[0].hours >= 24);
  assert.match(c[0].deepLink, /bot=a/);
});

test('mapSalud never includes topic; health labels stay public', () => {
  const s = mapSalud({avisos_config: true, avisos_ok: '2026-11-07T16:51:28-06:00', avisos_error: null, latido: 'x'});
  assert.equal(s.avisosConfig, true);
  assert.ok(!('tema' in s));
  const label = avisosHealthLabel(s, Date.parse('2026-11-09T12:00:00-06:00'));
  assert.equal(label.tone, 'ok');
});

test('session stores topic only in provided storage; history is local', () => {
  const store = new Map();
  const storage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  const s = createNtfySession({storage});
  s.saveTopic('tema-privado-de-prueba-xyz');
  assert.equal(store.get(NTFY_LS_KEY), 'tema-privado-de-prueba-xyz');
  assert.match(s.snapshot().topicMasked, /…/);
  assert.ok(!s.snapshot().topicMasked.includes('tema-privado-de-prueba-xyz'));
  assert.ok(s.snapshot().subscribeUrl.includes('ntfy.sh/'));
  const hist = s.rememberCandidates([{id: 'ted', title: 'Ted te espera desde hace 30 h', waitingSince: '2026-11-08T00:00:00Z', hours: 30, deepLink: 'https://x'}]);
  assert.equal(hist.length, 1);
  s.clearTopic();
  assert.equal(s.readTopic(), '');
});

test('sendThrowawayTest refuses real-looking topics and requires confirm', async () => {
  await assert.rejects(() => sendThrowawayTest({topic: 'prueba-atelier-x', confirmThrowaway: false}), /confirmThrowaway/);
  await assert.rejects(() => sendThrowawayTest({topic: 'mi-tema-real-secreto', confirmThrowaway: true}), /desechable|prueba-atelier/);
  let called = null;
  const st = await sendThrowawayTest({
    topic: 'prueba-atelier-local-qa',
    confirmThrowaway: true,
    fetcher: async (url, init) => { called = {url, init}; return {ok: true, status: 200}; },
  });
  assert.equal(st, 200);
  assert.match(called.url, /ntfy\.sh\/prueba-atelier-local-qa/);
  assert.equal(called.init.method, 'POST');
});

test('hoursWaiting null on bad dates', () => {
  assert.equal(hoursWaiting('nope'), null);
  assert.ok(hoursWaiting('2020-01-01T00:00:00Z') > 24);
});
