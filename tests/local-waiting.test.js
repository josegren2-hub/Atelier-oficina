import test from 'node:test';
import assert from 'node:assert/strict';
import {postpone, isPostponed, filterWaiting, postponeKey} from '../src/local-waiting.js';

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('postpone 3h hides bot until expiry', () => {
  const s = mem();
  const now = Date.parse('2026-11-09T12:00:00-06:00');
  const bot = {id: 'ted', status: 'review', waitingSince: '2026-11-09T10:00:00-06:00'};
  postpone(bot.id, bot.waitingSince, '3h', s, now);
  assert.equal(isPostponed(bot, s, now + 1000), true);
  assert.equal(isPostponed(bot, s, now + 4 * 3600e3), false);
  assert.equal(filterWaiting([bot], s, now + 1000).length, 0);
});

test('postpone manana sets next 8am', () => {
  const s = mem();
  const now = Date.parse('2026-11-09T22:00:00');
  const bot = {id: 'luna', status: 'review', waitingSince: '2026-11-09T08:00:00'};
  const until = postpone(bot.id, bot.waitingSince, 'manana', s, now);
  const d = new Date(until);
  assert.equal(d.getHours(), 8);
  assert.equal(d.getDate(), new Date(now).getDate() + 1);
});

test('postpone key includes waitingSince', () => {
  assert.equal(postponeKey('ted', 'x'), 'ted|x');
});
