import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('embedded avatar gallery uses dark surfaces and light names',()=>{
 const page=readFileSync(new URL('../avatars.html',import.meta.url),'utf8');
 const source=readFileSync(new URL('../src/avatar-gallery.js',import.meta.url),'utf8');
 assert.match(page,/color-scheme:dark/);
 assert.doesNotMatch(page,/#f4f0e7|#fffaf2/);
 assert.match(source,/setClearColor\('#16212c'\)/);
 assert.match(source,/fillStyle='#e6edf3'/);
});
