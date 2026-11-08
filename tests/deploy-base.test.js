import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';
test('default deployment base supports repository Pages subpaths',()=>{
 if(!process.env.DEPLOY_BASE)assert.equal(config.base,'./');
});
