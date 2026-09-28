import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js', import.meta.url), 'utf8');

assert.match(source, /if \(blockedWeightKeys\.has\(text\(nr\.key\)\)\) continue/);
assert.match(source, /const staleMatch1Keys = new Set\(Object\.keys\(validated\.validation\.stale\)\)/);
assert.match(source, /\{ blockedWeightKeys: staleMatch1Keys \}/);

const skipIndex = source.indexOf('if (blockedWeightKeys.has(text(nr.key))) continue');
const autoIndex = source.indexOf('const auto = nr.weightMatch');
assert.ok(skipIndex >= 0 && autoIndex > skipIndex, 'a stale Match-1 key must be excluded before automatic candidate weight evaluation');

console.log('Issue #776 stale Match-1 cannot silently auto-rerank during standalone CII run.');
