import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {avatarPhotoUrl} from '../src/avatar-photo.js';

const js = readFileSync(new URL('../src/command-center.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/command-center.css', import.meta.url), 'utf8');
const paleta = readFileSync(new URL('../src/paleta-d.css', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/nav-shell.js', import.meta.url), 'utf8');

test('F1q: el retrato va en línea a 20 px antes del responsable, no en una columna de 38 px', () => {
  assert.match(js, /import \{avatarPhotoUrl\} from '\.\/avatar-photo\.js'/);
  assert.match(js, /function cardAvatar\(/);
  assert.match(js, /img\.width=20;img\.height=20/);
  assert.doesNotMatch(js, /img\.width=38|cc-card-av|cc-card-body|cc-av-dot/);
  // El avatar se antepone al texto «Nombre · …» dentro del <small>, sin rehacer la tarjeta en flex.
  assert.match(js, /const meta=el\('small'\);meta\.append\(cardAvatar\(bot,task\.status\),document\.createTextNode\(/);
  assert.match(js, /Sin asistente asignado/);
  assert.equal(avatarPhotoUrl('ted'), './avatares/ted.webp');
  assert.equal(avatarPhotoUrl('tr-editor'), './avatares/tr-editor.webp');
});

test('F1q: anillo verde de 1.5 px si va en curso, inicial si falta el retrato, y no mueve el título', () => {
  assert.match(css, /\.cc-av\{display:inline-block;width:20px;height:18px/);
  assert.match(css, /width:20px;height:20px;margin-top:-10px/);
  assert.match(css, /box-shadow:inset 0 0 0 1\.5px #4bd7a2/);
  assert.match(css, /\.cc-av-ini/);
  assert.match(js, /cc-av-ini/);
  assert.match(js, /img\.addEventListener\('error'/);
  assert.doesNotMatch(css, /width:38px|cc-card-av|flex:0 0 38px/);
  // El padding móvil de 14 px se conserva
  assert.match(css, /\.cc-dialog \.cc-content\{padding:10px 14px 16px\}/);
});

test('F1q: la paleta D y f1o/f1n se conservan', () => {
  assert.match(nav, /import '\.\/paleta-d\.css'/);
  assert.match(paleta, /--d-peach:#f3b99f/);
  assert.doesNotMatch(css, /--d-peach|--d-oficina/);
  assert.doesNotMatch(js, /boceto-actividades|command-center-antes/);
});
