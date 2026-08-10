const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'converters/xml-cii2019-core/weight-component-identity.js');
let source = fs.readFileSync(file, 'utf8')
  .replace(/^import\s+[\s\S]*?;\s*$/gm, '')
  .replace(/\bexport\s+(?=function|const|let|class)/g, '');
source += '\n;globalThis.__api = { decorateXmlCiiWeightReviewRows, dedupeXmlCiiPhysicalWeightRows, migrateXmlCiiWeightDecisionMap };';
const context = vm.createContext({ console, encodeURIComponent });
new vm.Script(source, { filename: file }).runInContext(context);
const api = context.__api;

const rows = api.decorateXmlCiiWeightReviewRows([
  { key: '/B1::478', branchName: '/B1', nodeNumber: '478', nodeOrdinal: 10, endpoint: '1', componentType: 'FLAN', componentRefNo: '=134234934/TEST', position: '1 2 3' },
  { key: '/B1::480', branchName: '/B1', nodeNumber: '480', nodeOrdinal: 11, endpoint: '2', componentType: 'RIGID', componentRefNo: '=134234934/TEST', position: '4 5 6' },
], { sourceId: 'SRC-A' });

const deduped = api.dedupeXmlCiiPhysicalWeightRows(rows);
assert.strictEqual(deduped.length, 1);
assert(deduped[0].legacyKeys.includes('/B1::478'));
assert(deduped[0].legacyKeys.includes('/B1::480'));
assert.strictEqual(deduped[0].componentOccurrenceIds.length, 2);

let migrated = api.migrateXmlCiiWeightDecisionMap({ '/B1::478': 120.734 }, rows, { sourceId: 'SRC-A' });
assert.strictEqual(Object.values(migrated.accepted)[0], 120.734, 'Endpoint-1 legacy mass must migrate to the physical component.');
assert.strictEqual(migrated.migrations[0].fromKey, '/B1::478');

migrated = api.migrateXmlCiiWeightDecisionMap({ '/B1::480': 15 }, rows, { sourceId: 'SRC-A' });
assert.strictEqual(Object.values(migrated.accepted)[0], 15, 'Endpoint-2 legacy mass must migrate to the same physical component.');
assert.strictEqual(migrated.migrations[0].fromKey, '/B1::480');

console.log('XML CII X003 split-sibling migration regression passed.');
