export const XML_CII_JSON_TRACE_TREE_SCHEMA = 'xml-cii-json-trace-tree/v2';

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const jsonValue = (value) => (value && typeof value === 'object' ? JSON.stringify(value) : clean(value));
const uniq = (items = []) => [...new Set(items.map(clean).filter(Boolean))];

function parseMaybeObject(value) {
  if (value && typeof value === 'object') return value;
  try { const parsed = JSON.parse(clean(value)); return parsed && typeof parsed === 'object' ? parsed : null; } catch { return null; }
}

function componentPath(value) {
  const raw = clean(value), idx = raw.indexOf('.attributes');
  return idx >= 0 ? raw.slice(0, idx) : raw;
}

function pickAxis(source, names) {
  const keys = Object.keys(source || {});
  const hit = keys.find((key) => names.includes(upper(key)));
  return hit ? source[hit] : '';
}

function axisText(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return clean(value);
  return String(Math.round(num * 1000) / 1000);
}

function positionFromValue(value) {
  const source = parseMaybeObject(value);
  if (!source) return null;
  const e = axisText(pickAxis(source, ['E', 'EAST', 'EASTING', 'X']));
  const n = axisText(pickAxis(source, ['N', 'NORTH', 'NORTHING', 'Y']));
  const el = axisText(pickAxis(source, ['EL', 'ELEV', 'ELEVATION', 'Z']));
  if (!e && !n && !el) return null;
  const label = `E=${e || '?'} N=${n || '?'} EL=${el || '?'}`;
  return Object.freeze({ key: label.replace(/\s+/g, ''), label });
}

function isPositionRow(row = {}) {
  const text = upper(`${row.field || ''} ${row.sourceAttributeName || ''} ${row.sourcePath || ''}`);
  return /(^|[^A-Z])(POS|APOS|LPOS|BPOS|HPOS|TPOS|SPOS|EPOS|POSITION)([^A-Z]|$)/.test(text);
}

function buildPositionIndex(traceRows = []) {
  const map = new Map();
  for (const row of traceRows || []) {
    if (!isPositionRow(row)) continue;
    const path = componentPath(row.sourcePath || row.jsonPath);
    const pos = positionFromValue(row.finalValue || row.sourceRawValue || row.value);
    if (path && pos && !map.has(path)) map.set(path, pos);
  }
  return map;
}

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

export function traceTreeGroupKey(row = {}, positionMap = new Map()) {
  const bucket = traceTreeBucketKey(row);
  if (bucket === 'DTXR-POS') {
    const path = componentPath(row.sourcePath || row.jsonPath);
    const pos = positionMap.get(path);
    if (pos) return Object.freeze({ key: pos.key, label: pos.label });
    return Object.freeze({ key: `NODE-${clean(row.nodeNumber) || 'UNKNOWN'}`, label: `POS unresolved; node ${clean(row.nodeNumber) || '?'}` });
  }
  if (bucket === 'DTXR-PS') {
    const token = clean(row.matchedToken || row.matchedText);
    return Object.freeze({ key: token || `NODE-${clean(row.nodeNumber) || 'UNKNOWN'}`, label: token ? `PS=${token}` : `PS unresolved; node ${clean(row.nodeNumber) || '?'}` });
  }
  return Object.freeze({ key: bucket, label: bucket });
}

export function createTraceTreeLeaf(row = {}, index = 0, positionMap = new Map()) {
  const path = componentPath(row.sourcePath || row.jsonPath), pos = positionMap.get(path);
  return Object.freeze({
    jsonNodeNo: clean(row.jsonNodeNo || row._jsonNodeNo || index + 1),
    matchType: clean(row.xmlTraceScope),
    nodeNumber: clean(row.nodeNumber),
    objectType: clean(row.sourceObjectType || row.objectType),
    field: clean(row.field || row.sourceAttributeName),
    value: jsonValue(row.finalValue || row.sourceRawValue || row.value),
    sourcePath: clean(row.sourcePath || row.jsonPath),
    positionLabel: pos?.label || '',
  });
}

function emptyGroup(label) { return { label, count: 0, rows: [] }; }
function emptyBucket(label) { return { label, count: 0, groups: new Map() }; }

function orderedGroups(groupMap, rowLimit, groupLimit) {
  const groups = [...groupMap.values()].slice(0, groupLimit);
  return Object.freeze(groups.map((group) => Object.freeze({ label: group.label, count: group.count, truncated: Math.max(0, group.rows.length - rowLimit), rows: Object.freeze(group.rows.slice(0, rowLimit)) })));
}

function orderedBuckets(bucketMap, rowLimit, groupLimit) {
  return ['DTXR-POS', 'DTXR-PS', 'Branch', 'Other'].map((label) => {
    const bucket = bucketMap.get(label) || emptyBucket(label);
    const groups = orderedGroups(bucket.groups, rowLimit, groupLimit);
    const samples = uniq(groups.flatMap((group) => group.rows.slice(0, 3).map((row) => `#${row.jsonNodeNo} ${row.objectType} node ${row.nodeNumber} — ${row.field}: ${row.value}`))).slice(0, 3);
    return Object.freeze({ label, count: bucket.count, groupCount: bucket.groups.size, groups, samples: Object.freeze(samples) });
  }).filter((bucket) => bucket.count > 0);
}

export function buildJsonTraceTree(traceRows = [], options = {}) {
  const rowLimit = Number.isFinite(options.rowLimit) ? Math.max(1, options.rowLimit) : 40;
  const groupLimit = Number.isFinite(options.groupLimit) ? Math.max(1, options.groupLimit) : 120;
  const positionMap = buildPositionIndex(traceRows);
  const branchMap = new Map();
  for (const [index, row] of (traceRows || []).entries()) {
    const branchName = traceTreeBranchKey(row), bucketKey = traceTreeBucketKey(row), group = traceTreeGroupKey(row, positionMap);
    if (!branchMap.has(branchName)) branchMap.set(branchName, { branchName, count: 0, buckets: new Map() });
    const branch = branchMap.get(branchName);
    if (!branch.buckets.has(bucketKey)) branch.buckets.set(bucketKey, emptyBucket(bucketKey));
    const bucket = branch.buckets.get(bucketKey);
    if (!bucket.groups.has(group.key)) bucket.groups.set(group.key, emptyGroup(group.label));
    const groupNode = bucket.groups.get(group.key);
    branch.count += 1; bucket.count += 1; groupNode.count += 1; groupNode.rows.push(createTraceTreeLeaf(row, index, positionMap));
  }
  const branches = [...branchMap.values()].map((branch) => Object.freeze({ branchName: branch.branchName, count: branch.count, buckets: Object.freeze(orderedBuckets(branch.buckets, rowLimit, groupLimit)) }));
  return Object.freeze({ schema: XML_CII_JSON_TRACE_TREE_SCHEMA, totalRows: traceRows.length || 0, branches: Object.freeze(branches) });
}
