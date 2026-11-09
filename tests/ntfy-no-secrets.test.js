import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src');
function walk(dir, acc=[]) {
  for (const name of readdirSync(dir, {withFileTypes: true})) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else if (/\.(js|css|html|json|md)$/.test(name.name)) acc.push(p);
  }
  return acc;
}

test('src never embeds a hard-coded ntfy topic or .ntfy-tema contents', () => {
  const files = walk(srcRoot);
  assert.ok(files.length > 10);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(/\.ntfy-tema/.test(text), false, file);
    // literal ntfy.sh/<long-topic> without template
    const hits = text.match(/ntfy\.sh\/[A-Za-z0-9_-]{12,}/g) || [];
    assert.equal(hits.length, 0, `${file}: ${hits}`);
  }
});
