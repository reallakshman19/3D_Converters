export const XML_CII_JSON_TRACE_TREE_SCHEMA = 'xml-cii-json-trace-tree/v1';

const clean = (value) => String(value ?? '').trim();
const jsonValue = (value) => (value && typeof value === 'object' ? JSON.stringify(value) : clean(value));

export function traceTreeBucketKey(row = {}) {
  const scope = clean(row.xmlTraceScope);
  if (/^DTXR_POS/.test(scope)) return 'DTXR-POS';
  if (/^DTXR_PS/.test(scope)) return 'DTXR-PS';
  if (/^BRANCH_/.test(scope)) return 'Branch';
  return scope || 'Other';
}

export function traceTreeBranchKey(row = {}) {
  return clean(row.branchName || row.stagedBranchKey || row.xmlBranchKey || 'Unassigned branch');
}

export function createTraceTreeLeaf(row = {}, index = 0) {
  return Object.freeze({
    jsonNodeNo: clean(row.jsonNodeNo || row._jsonNodeNo || index + 1),
    matchType: clean(row.xmlTraceScope),
    nodeNumber: clean(row.nodeNumber),
    objectType: clean(row.sourceObjectType || row.objectType),
    field: clean(row.field || row.sourceAttributeName),
    value: jsonValue(row.finalValue || row.sourceRawValue || row.value),
    sourcePath: clean(row.sourcePath || row.jsonPath),
  });
}

function emptyBucket(label) {
  return { label, count: 0, rows: [] };
}

function orderedBuckets(bucketMap, rowLimit) {
  return ['DTXR-POS', 'DTXR-PS', 'Branch', 'Other'].map((label) => {
    const bucket = bucketMap.get(label) || emptyBucket(label);
    return Object.freeze({ label, count: bucket.count, truncated: Math.max(0, bucket.rows.length - rowLimit), rows: Object.freeze(bucket.rows.slice(0, rowLimit)) });
  }).filter((bucket) => bucket.count > 0);
}

export function buildJsonTraceTree(traceRows = [], options = {}) {
  const rowLimit = Number.isFinite(options.rowLimit) ? Math.max(1, options.rowLimit) : 40;
  const branchMap = new Map();
  for (const [index, row] of (traceRows || []).entries()) {
    const branchName = traceTreeBranchKey(row);
    const bucketKey = traceTreeBucketKey(row);
    if (!branchMap.has(branchName)) branchMap.set(branchName, { branchName, count: 0, buckets: new Map() });
    const branch = branchMap.get(branchName);
    if (!branch.buckets.has(bucketKey)) branch.buckets.set(bucketKey, emptyBucket(bucketKey));
    const bucket = branch.buckets.get(bucketKey);
    branch.count += 1; bucket.count += 1; bucket.rows.push(createTraceTreeLeaf(row, index));
  }
  const branches = [...branchMap.values()].map((branch) => Object.freeze({ branchName: branch.branchName, count: branch.count, buckets: Object.freeze(orderedBuckets(branch.buckets, rowLimit)) }));
  return Object.freeze({ schema: XML_CII_JSON_TRACE_TREE_SCHEMA, totalRows: traceRows.length || 0, branches: Object.freeze(branches) });
}
