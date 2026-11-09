import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEquipoHtml} from '../src/equipo-panel.js';
import {bots, floors} from '../src/data.js';
import {avatarPhotoUrl} from '../src/avatar-photo.js';

test('avatar photos use public local avatares paths', () => {
  assert.equal(avatarPhotoUrl('ted'), './avatares/ted.webp');
  assert.equal(avatarPhotoUrl('tr-editor'), './avatares/tr-editor.webp');
});

test('Equipo HTML groups by area/floor with photo and status', () => {
  const list = bots.map(b => ({...b, status: b.id === 'ted' ? 'working' : b.id === 'luna' ? 'review' : 'idle'}));
  const html = renderEquipoHtml({bots: list, selected: 'ted', folded: false});
  assert.match(html, /MISSION CONTROL/);
  assert.match(html, /mc-bot on" data-id="ted"/);
  assert.match(html, /avatares\/ted\.webp/);
  assert.match(html, /sd trabajando/);
  assert.match(html, /sd te/);
  assert.equal((html.match(/class="mc-bot/g) || []).length, 16);
  assert.ok(floors.every(f => list.some(b => b.floor === f.id) ? html.includes(f.name) : true));
});

test('folded Equipo only shows toggle', () => {
  const html = renderEquipoHtml({bots, selected: null, folded: true});
  assert.match(html, /☰ Equipo/);
  assert.doesNotMatch(html, /MISSION CONTROL/);
});
