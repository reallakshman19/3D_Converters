import assert from 'node:assert/strict';
import { branchBaseTraceKey, branchContainsMatch, buildXmlTypedJsonTraceRows, extractXmlTraceKeysFromText, filterStagedTraceRowsForXml, normalizeBranchTraceKey, normalizeSupportTraceTag, normalizeTraceScopeOptions, splitDelimitedSupportTags, supportTagTraceVariants } from '../converters/xml-cii2019-core/json-trace-scope.js';
import { buildJsonTraceTree, traceTreeBucketKey } from '../converters/xml-cii2019-core/json-trace-tree.js';

const xml = `<PipeStressExport><Pipe><Branch><Branchname>/ASIM-1835-4&quot;-P8810212-31441C4-PP/B1</Branchname><Node><NodeNumber>1030</NodeNumber><NodeName>PS-XYZ.2 GUIDE</NodeName><ComponentRefNo>SUP-1030</ComponentRefNo><ComponentType>ATTA</ComponentType><DTXR_POS>GUIDE SUPPORT AT 1030</DTXR_POS><DTXR_PS>PS-XYZ.1=PS-XYZ.2=PS-XYZ</DTXR_PS></Node></Branch></Pipe></PipeStressExport>`;
const keys = extractXmlTraceKeysFromText(xml);
assert.equal(normalizeBranchTraceKey('/ASIM-1835-4"-P8810212-31441C4-PP/B01'), '/ASIM-1835-4-P8810212-31441C4-PP/B1');
assert.equal(branchBaseTraceKey('/ASIM-1835-4"-P8810212-31441C4-PP/B1'), '/ASIM-1835-4-P8810212-31441C4-PP');
assert.equal(branchContainsMatch('/ASIM-1835-4"-P8810212-31441C4-PP/B1', '/ASIM-1835-4-P8810212-31441C4-PP').matchType, 'BRANCH_BASE');
assert.deepEqual(splitDelimitedSupportTags('PS-XYZ.1=PS-XYZ.2=PS-XYZ'), ['PS-XYZ.1', 'PS-XYZ.2', 'PS-XYZ']);
assert.equal(normalizeSupportTraceTag('PS-XYZ.2'), 'PSXYZ.2');
assert.ok(supportTagTraceVariants('PS-XYZ.1=PS-XYZ.2=PS-XYZ').includes('PS-XYZ.1'));
assert.ok(keys.branchKeys.includes('/ASIM-1835-4-P8810212-31441C4-PP/B1'));
assert.ok(keys.supportTags.includes('PS-XYZ.2'));
assert.equal(normalizeTraceScopeOptions({ includeDtxrPs: false }).includeDtxrPs, false);

const traceRows = [
  { sourcePath: '$[0].children[0].attributes.DTXR', sourceObjectType: 'ATTA', sourceAttributeName: 'DTXR_POS', branchName: '/ASIM-1835-4-P8810212-31441C4-PP', field: 'DTXR', finalValue: 'GUIDE SUPPORT AT 1030' },
  { sourcePath: '$[0].children[1].attributes.DTXR_PS', sourceObjectType: 'SUPPORT', sourceAttributeName: 'DTXR_PS', branchName: '/OTHER', field: 'DTXR_PS', finalValue: 'PS-XYZ.1=PS-XYZ.2=PS-XYZ' },
  { sourcePath: '$[1].children[0].attributes.DTXR', sourceObjectType: 'PIPE', sourceAttributeName: 'DTXR', branchName: '/UNRELATED', field: 'DTXR', finalValue: 'UNRELATED' }
];
const scoped = filterStagedTraceRowsForXml(traceRows, keys);
assert.equal(scoped.rows.length, 2);
assert.equal(scoped.summary.inputRows, 3);
assert.equal(scoped.summary.unmatchedRows, 1);
assert.equal(scoped.rows[0].xmlTraceScope, 'DTXR_POS_CONTAINS');
assert.equal(scoped.rows[1].xmlTraceScope, 'DTXR_PS_DELIMITED_TAG');
assert.equal(scoped.rows[1].matchedToken, 'PS-XYZ.1');
assert.equal(filterStagedTraceRowsForXml(traceRows, keys, { includeDtxrPos: false }).rows.some((row) => row.xmlTraceScope === 'DTXR_POS_CONTAINS'), false);
assert.equal(filterStagedTraceRowsForXml(traceRows, keys, { includeDtxrPs: false }).rows.some((row) => /^DTXR_PS/.test(row.xmlTraceScope)), false);
assert.equal(filterStagedTraceRowsForXml(traceRows, keys, { includeBranch: false, includeDtxrPos: false, includeDtxrPs: false }).rows.length, 0);

const branchDtxrRows = [
  { sourcePath: '$[311].children[0].attributes.DTXR', sourceObjectType: 'ELBO', sourceAttributeName: 'DTXR', branchName: '/ASIM-1835-4-P8810212-31441C4-PP/B1', field: 'DTXR', finalValue: 'ELBOW 90 DEG LR BW Sch 80' },
  { sourcePath: '$[311].children[4].attributes.DTXR', sourceObjectType: 'SUPPORT', sourceAttributeName: 'DTXR', branchName: '/ASIM-1835-4-P8810212-31441C4-PP/B1', field: 'DTXR', finalValue: 'Pipe Rest XRT01' },
  { sourcePath: '$[311].children[4].attributes.DTXR_PS', sourceObjectType: 'SUPPORT', sourceAttributeName: 'DTXR_PS', branchName: '/ASIM-1835-4-P8810212-31441C4-PP/B1', field: 'DTXR_PS', finalValue: 'PS-XYZ.1' }
];
const scopedDtxr = filterStagedTraceRowsForXml(branchDtxrRows, keys);
assert.deepEqual(scopedDtxr.rows.map((row) => row.xmlTraceScope), ['DTXR_POS_SOURCE_ROW', 'DTXR_POS_SOURCE_ROW', 'DTXR_PS_DELIMITED_TAG']);
assert.deepEqual(scopedDtxr.rows.map((row) => row.dtxrPriority), [1, 1, 2]);
assert.equal(scopedDtxr.rows[2].matchedToken, 'PS-XYZ.1');
assert.equal(scopedDtxr.summary.branchMatches, 0);
assert.equal(scopedDtxr.summary.dtxrPosMatches, 2);
assert.equal(scopedDtxr.summary.dtxrPsMatches, 1);
assert.equal(traceTreeBucketKey(scopedDtxr.rows[0]), 'DTXR-POS');
assert.equal(traceTreeBucketKey(scopedDtxr.rows[2]), 'DTXR-PS');
const tree = buildJsonTraceTree(scopedDtxr.rows);
assert.equal(tree.branches.length, 1);
assert.deepEqual(tree.branches[0].buckets.map((bucket) => bucket.label), ['DTXR-POS', 'DTXR-PS']);

const built = buildXmlTypedJsonTraceRows({ xmlText: xml, traceRows, options: { includeDelimitedPs: false } });
assert.equal(built.rows.some((row) => row.xmlTraceScope === 'DTXR_PS_DELIMITED_TAG'), false);
console.log('xml-cii-json-trace-scope: all assertions passed');
