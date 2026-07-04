export const XML_CII_JSON_TRACE_SCOPE_SCHEMA = 'xml-cii-json-trace-scope/v1';

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const stripXml = (value) => clean(value).replace(/<[^>]+>/g, ' ');
const uniq = (items = []) => [...new Set(items.map(clean).filter(Boolean))];

export function normalizeTraceText(value) {
  return stripXml(value).replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&amp;/gi, '&').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toUpperCase();
}

export function normalizeBranchTraceKey(value) {
  const text = normalizeTraceText(value).replace(/^\s*=\s*/, '').replace(/\s+/g, '').replace(/['"]/g, '').replace(/^\/*/, '/');
  return text.replace(/\/B0*(\d+)$/i, '/B$1');
}

export function branchBaseTraceKey(value) {
  return normalizeBranchTraceKey(value).replace(/\/B\d+$/i, '');
}

export function branchContainsMatch(xmlBranchName, stagedBranchName) {
  const left = normalizeBranchTraceKey(xmlBranchName), right = normalizeBranchTraceKey(stagedBranchName);
  if (!left || !right) return null;
  if (left === right) return { matchType: 'BRANCH_EXACT', xmlBranchKey: left, stagedBranchKey: right };
  if (branchBaseTraceKey(left) && branchBaseTraceKey(left) === branchBaseTraceKey(right)) return { matchType: 'BRANCH_BASE', xmlBranchKey: left, stagedBranchKey: right };
  if (left.includes(right) || right.includes(left)) return { matchType: 'BRANCH_CONTAINS', xmlBranchKey: left, stagedBranchKey: right };
  return null;
}

export function splitDelimitedSupportTags(value) {
  return uniq(normalizeTraceText(value).split(/[=,;|\/\s]+/g).map((part) => part.replace(/^[:.-]+|[:.-]+$/g, ''))).filter((part) => /^PS[-A-Z0-9.]+$/i.test(part));
}

export function normalizeSupportTraceTag(value) {
  return normalizeTraceText(value).replace(/[^A-Z0-9.]+/g, '').replace(/\.0+$/g, '');
}

export function supportTagTraceVariants(value) {
  const tokens = splitDelimitedSupportTags(value);
  const variants = new Set();
  for (const token of tokens.length ? tokens : [value]) {
    const normalized = normalizeSupportTraceTag(token);
    if (!normalized) continue;
    variants.add(normalized);
    variants.add(normalized.replace(/\.\d+$/g, ''));
    variants.add(normalized.replace(/^PS/, 'PS-'));
    variants.add(normalized.replace(/^PS-/, 'PS'));
  }
  return [...variants].filter(Boolean);
}

function tagContent(xmlText, tagName) {
  const rows = [];
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  let match;
  while ((match = re.exec(String(xmlText || '')))) rows.push(clean(match[1]));
  return rows;
}

function nodeBlocks(xmlText) {
  const rows = [];
  const re = /<Node\b[^>]*>[\s\S]*?<\/Node>/gi;
  let match;
  while ((match = re.exec(String(xmlText || '')))) rows.push(match[0]);
  return rows;
}

function textFromBlock(block, tag) {
  return tagContent(block, tag)[0] || '';
}

export function extractXmlTraceKeysFromText(xmlText = '') {
  const branches = uniq([...tagContent(xmlText, 'Branchname'), ...tagContent(xmlText, 'LineNo')]);
  const nodes = [];
  for (const block of nodeBlocks(xmlText)) {
    const branchName = branches.find((branch) => String(xmlText).indexOf(branch) <= String(xmlText).indexOf(block)) || branches[0] || '';
    const dtxrPs = textFromBlock(block, 'DTXR_PS') || textFromBlock(block, 'DtxrPs');
    const dtxrPos = textFromBlock(block, 'DTXR_POS') || textFromBlock(block, 'DtxrPos');
    const supportSeed = [textFromBlock(block, 'NodeName'), textFromBlock(block, 'ComponentRefNo'), dtxrPs].join(' ');
    nodes.push(Object.freeze({ branchName, branchKey: normalizeBranchTraceKey(branchName), branchBaseKey: branchBaseTraceKey(branchName), nodeNumber: textFromBlock(block, 'NodeNumber'), componentRefNo: textFromBlock(block, 'ComponentRefNo'), dtxrPos, dtxrPs, supportTags: Object.freeze(supportTagTraceVariants(supportSeed)), componentType: textFromBlock(block, 'ComponentType') }));
  }
  return Object.freeze({ schema: XML_CII_JSON_TRACE_SCOPE_SCHEMA, branches: Object.freeze(branches), branchKeys: Object.freeze(uniq(branches.map(normalizeBranchTraceKey))), branchBaseKeys: Object.freeze(uniq(branches.map(branchBaseTraceKey))), nodes: Object.freeze(nodes), supportTags: Object.freeze(uniq(nodes.flatMap((node) => node.supportTags))), dtxrPosTexts: Object.freeze(uniq(nodes.map((node) => normalizeTraceText(node.dtxrPos)))), dtxrPsTexts: Object.freeze(uniq(nodes.map((node) => normalizeTraceText(node.dtxrPs)))) });
}

function traceBranch(row) {
  return row?.branchName || row?.owner || row?.sourceBranchName || '';
}

function traceValue(row) {
  return row?.finalValue || row?.sourceRawValue || row?.value || '';
}

function firstBranchMatch(row, keys) {
  for (const branch of keys.branches || []) {
    const hit = branchContainsMatch(branch, traceBranch(row));
    if (hit) return hit;
  }
  return null;
}

function firstPsMatch(row, keys) {
  const rowTags = supportTagTraceVariants(`${traceValue(row)} ${row?.sourceAttributeName || ''}`);
  const xmlTags = new Set(keys.supportTags || []);
  const hit = rowTags.find((tag) => xmlTags.has(tag));
  return hit ? { matchType: 'DTXR_PS_DELIMITED_TAG', matchedToken: hit } : null;
}

function firstDtxrTextMatch(row, keys, fieldName) {
  const value = normalizeTraceText(traceValue(row));
  const hay = fieldName === 'DTXR_PS' ? keys.dtxrPsTexts : keys.dtxrPosTexts;
  const hit = (hay || []).find((item) => item && value && (item.includes(value) || value.includes(item)));
  return hit ? { matchType: fieldName === 'DTXR_PS' ? 'DTXR_PS_CONTAINS' : 'DTXR_POS_CONTAINS', matchedText: hit } : null;
}

export function classifyTraceRowAgainstXmlKeys(row = {}, xmlTraceKeys = {}) {
  const branch = firstBranchMatch(row, xmlTraceKeys);
  const field = upper(row.field || row.sourceAttributeName || '');
  if (/DTXR.*PS|SUPPORT|CMPSTRESS|CMPSUP/.test(`${field} ${traceValue(row)}`)) return firstPsMatch(row, xmlTraceKeys) || firstDtxrTextMatch(row, xmlTraceKeys, 'DTXR_PS') || branch;
  if (/DTXR|DESC|DESCRIPTION|POSITION/.test(field)) return firstDtxrTextMatch(row, xmlTraceKeys, 'DTXR_POS') || branch;
  return branch;
}

export function filterStagedTraceRowsForXml(traceRows = [], xmlTraceKeys = {}, options = {}) {
  const includeUnmatched = options.includeUnmatched === true;
  const rows = [];
  let filteredOutRows = 0;
  for (const row of traceRows || []) {
    const match = classifyTraceRowAgainstXmlKeys(row, xmlTraceKeys);
    if (!match && !includeUnmatched) { filteredOutRows += 1; continue; }
    rows.push(Object.freeze({ ...row, xmlTraceScope: match?.matchType || 'UNMATCHED_FILTERED_OUT', matchedToken: match?.matchedToken || '', matchedText: match?.matchedText || '', xmlBranchKey: match?.xmlBranchKey || '', stagedBranchKey: match?.stagedBranchKey || '' }));
  }
  return Object.freeze({ schema: XML_CII_JSON_TRACE_SCOPE_SCHEMA, rows: Object.freeze(rows), summary: Object.freeze({ inputRows: traceRows.length || 0, scopedRows: rows.filter((row) => row.xmlTraceScope !== 'UNMATCHED_FILTERED_OUT').length, unmatchedRows: filteredOutRows + rows.filter((row) => row.xmlTraceScope === 'UNMATCHED_FILTERED_OUT').length, branchMatches: rows.filter((row) => /^BRANCH_/.test(row.xmlTraceScope)).length, dtxrPosMatches: rows.filter((row) => row.xmlTraceScope === 'DTXR_POS_CONTAINS').length, dtxrPsMatches: rows.filter((row) => /^DTXR_PS/.test(row.xmlTraceScope)).length }) });
}

export function buildXmlTypedJsonTraceRows({ xmlText = '', traceRows = [], options = {} } = {}) {
  const xmlTraceKeys = extractXmlTraceKeysFromText(xmlText);
  return Object.freeze({ xmlTraceKeys, ...filterStagedTraceRowsForXml(traceRows, xmlTraceKeys, options) });
}
