import assert from 'node:assert/strict';
import { branchBaseTraceKey, branchContainsMatch, buildXmlTypedJsonTraceRows, extractXmlTraceKeysFromText, filterStagedTraceRowsForXml, normalizeBranchTraceKey, normalizeSupportTraceTag, splitDelimitedSupportTags, supportTagTraceVariants } from '../converters/xml-cii2019-core/json-trace-scope.js';

const xml = `<PipeStressExport><Pipe><Branch><Branchname>/ASIM-1835-4&quot;-P8810212-31441C4-PP/B1</Branchname><Node><NodeNumber>1030</NodeNumber><NodeName>PS-XYZ.2 GUIDE</NodeName><ComponentRefNo>SUP-1030</ComponentRefNo><ComponentType>ATTA</ComponentType><DTXR_POS>GUIDE SUPPORT AT 1030</DTXR_POS><DTXR_PS>PSXYZ.1=PS-XYZ.2=PS-XYZ</DTXR_PS></Node></Branch></Pipe></PipeStressExport>`;
const keys = extractXmlTraceKeysFromText(xml);
assert.equal(normalizeBranchTraceKey('/ASIM-1835-4"-P8810212-31441C4-PP/B01'), '/ASIM-1835-4-P8810212-31441C4-PP/B1');
assert.equal(branchBaseTraceKey('/ASIM-1835-4"-P8810212-31441C4-PP/B1'), '/ASIM-1835-4-P8810212-31441C4-PP');
assert.equal(branchContainsMatch('/ASIM-1835-4"-P8810212-31441C4-PP/B1', '/ASIM-1835-4-P8810212-31441C4-PP').matchType, 'BRANCH_BASE');
assert.deepEqual(splitDelimitedSupportTags('PSXYZ.1=PS-XYZ.2=PS-XYZ'), ['PSXYZ.1', 'PS-XYZ.2', 'PS-XYZ']);
assert.equal(normalizeSupportTraceTag('PS-XYZ.2'), 'PSXYZ.2');
assert.ok(supportTagTraceVariants('PSXYZ.1=PS-XYZ.2=PS-XYZ').includes('PSXYZ'));
assert.ok(keys.branchKeys.includes('/ASIM-1835-4-P8810212-31441C4-PP/B1'));
assert.ok(keys.supportTags.includes('PSXYZ.2'));

const traceRows = [
  { sourcePath: '$[0].children[0].attributes.DTXR', sourceObjectType: 'ATTA', sourceAttributeName: 'DTXR_POS', branchName: '/ASIM-1835-4-P8810212-31441C4-PP', field: 'DTXR', finalValue: 'GUIDE SUPPORT AT 1030' },
  { sourcePath: '$[0].children[1].attributes.DTXR_PS', sourceObjectType: 'SUPPORT', sourceAttributeName: 'DTXR_PS', branchName: '/OTHER', field: 'DTXR_PS', finalValue: 'PSXYZ.1=PS-XYZ.2=PS-XYZ' },
  { sourcePath: '$[1].children[0].attributes.DTXR', sourceObjectType: 'PIPE', sourceAttributeName: 'DTXR', branchName: '/UNRELATED', field: 'DTXR', finalValue: 'UNRELATED' }
];
const scoped = filterStagedTraceRowsForXml(traceRows, keys);
assert.equal(scoped.rows.length, 2);
assert.equal(scoped.summary.inputRows, 3);
assert.equal(scoped.summary.unmatchedRows, 1);
assert.equal(scoped.rows[0].xmlTraceScope, 'DTXR_POS_CONTAINS');
assert.equal(scoped.rows[1].xmlTraceScope, 'DTXR_PS_DELIMITED_TAG');
assert.equal(scoped.rows[1].matchedToken, 'PSXYZ.1');
const built = buildXmlTypedJsonTraceRows({ xmlText: xml, traceRows });
assert.equal(built.rows.length, 2);
console.log('xml-cii-json-trace-scope: all assertions passed');
