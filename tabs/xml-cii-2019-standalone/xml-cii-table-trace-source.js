/**
 * Resolver result builder for CSV/XLS alternatives to staged JSON trace data.
 * Inputs: XML text plus mapped table rows. Outputs: the same matched/rejected
 * fact shape used by the JSON resolver; fallback is diagnostics-only when the
 * user has not mapped the required trace keys.
 */
import {
  REQUIRED_TRACE_TABLE_FIELD_NAMES,
  autoMapTraceTableFields,
  headersFromTraceRows,
  mapTraceTableRows,
  parseTraceTableText,
} from './xml-cii-table-trace-table.js';
import {
  buildTraceTableRowIndex,
  matchTraceTableNode,
  traceTableMatchSummary,
} from './xml-cii-table-trace-match.js';

export {
  TRACE_TABLE_FIELDS,
  autoMapTraceTableFields,
  headersFromTraceRows,
  parseTraceTableText,
  rowsToTraceTableText,
} from './xml-cii-table-trace-table.js';

function text(value) { return String(value ?? '').trim(); }
function normText(value) { return text(value).replace(/\s+/g, ' ').toUpperCase(); }

function childText(block, tag) {
  const match = String(block || '').match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? text(match[1].replace(/<[^>]+>/g, '')) : '';
}

function branchPositions(sourceText) {
  const out = [];
  const pattern = /<(Branchname|LineNo|LineKey|BranchName)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = pattern.exec(sourceText))) out.push({ name: text(match[2]), index: match.index });
  return out;
}

function activeBranch(charIndex, branches) {
  let current = '';
  let best = -1;
  for (const branch of branches) {
    if (branch.index <= charIndex && branch.index > best) {
      current = branch.name;
      best = branch.index;
    }
  }
  return current || branches[0]?.name || '';
}

function parsePoint(value) {
  const numbers = text(value).match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return numbers.length >= 3 ? { x: numbers[0], y: numbers[1], z: numbers[2] } : null;
}

function pointLabel(point, raw) {
  if (!point) return text(raw);
  const fmt = (value) => String(Math.round(value * 100) / 100);
  return `E=${fmt(point.x)} N=${fmt(point.y)} EL=${fmt(point.z)}`;
}

function extractXmlTraceNodes(sourceText) {
  const branches = branchPositions(sourceText);
  const nodes = [];
  const pattern = /<Node\b[\s\S]*?<\/Node>/gi;
  let match;
  while ((match = pattern.exec(sourceText))) {
    const block = match[0];
    const position = childText(block, 'Position');
    const posPoint = parsePoint(position);
    const nodeNumber = childText(block, 'NodeNumber');
    const nodeName = childText(block, 'NodeName');
    const componentRefNo = childText(block, 'ComponentRefNo');
    nodes.push({
      xmlIndex: nodes.length + 1,
      tagName: childText(block, 'ComponentType') || 'Node',
      componentType: childText(block, 'ComponentType'),
      nodeNumber,
      nodeName,
      componentRefNo,
      nodeKeys: [nodeNumber || '-1'],
      psKey: nodeName || componentRefNo,
      posKey: pointLabel(posPoint, position),
      posPoint,
      branchName: activeBranch(match.index, branches),
    });
  }
  return nodes;
}

function candidatePreview(candidates) {
  return (Array.isArray(candidates) ? candidates : []).slice(0, 10).map((row) => ({
    rowIndex: row._rowIndex,
    componentRefNo: row.componentRefNo,
    nodeName: row.nodeName,
    position: row.position,
    componentType: row.componentType,
    dtxrPos: row.dtxrPos,
  }));
}

function resolvedFact(node, row, decision) {
  const rows = decision.rows || [];
  return {
    ...node,
    matchedBy: [decision.method],
    matchStatus: decision.status,
    candidateCount: decision.candidates?.length || rows.length,
    hitCount: rows.length,
    xmlHits: [node.xmlIndex],
    path: `table[${row._rowIndex}]`,
    stagedBranchKey: row.branchName,
    stagedBore: row.bore,
    dtxrPosValue: row.dtxrPos,
    dtxrPsValue: row.dtxrPs || row.supportReference || row.nodeName,
    cmpSupGap: row.cmpSupGap,
    sourcePosition: row.position,
    sourceComponentType: row.componentType,
    componentSpec: row.componentSpec,
    site: row.site,
    raw: row.raw,
  };
}

function rejectedFact(node, decision) {
  return {
    ...node,
    matchedBy: [],
    matchStatus: decision?.status || 'no-match',
    rejectedMatchMethod: decision?.method || 'none',
    candidateCount: decision?.candidates?.length || 0,
    rejectedCandidates: candidatePreview(decision?.candidates),
    hitCount: 0,
    xmlHits: [],
    dtxrPosValue: '',
    dtxrPsValue: '',
    cmpSupGap: '',
  };
}

function missingRequired(fieldMap) {
  return REQUIRED_TRACE_TABLE_FIELD_NAMES.filter((fieldName) => !text(fieldMap?.[fieldName]));
}

export function buildTraceTableResolverResult(input) {
  const safeInput = input || {};
  const traceConfig = safeInput.traceConfig || {};
  const rawRows = Array.isArray(safeInput.rawRows) ? safeInput.rawRows : parseTraceTableText(safeInput.tableText);
  const headers = headersFromTraceRows(rawRows);
  const fieldMap = safeInput.fieldMap && Object.keys(safeInput.fieldMap).length ? safeInput.fieldMap : autoMapTraceTableFields(headers, rawRows, traceConfig);
  const mappedRows = mapTraceTableRows(rawRows, fieldMap).filter((row) => row.componentRefKey || row.nodeNameKey || row.position || row.componentType);
  const nodes = extractXmlTraceNodes(safeInput.sourceText || '');
  const rowIndex = buildTraceTableRowIndex(mappedRows);
  const matchSummary = traceTableMatchSummary(headers, rowIndex, traceConfig);
  const resolvedFacts = [];
  for (const node of nodes) {
    const decision = matchTraceTableNode(node, rowIndex, traceConfig);
    if (!decision.rows.length) resolvedFacts.push(rejectedFact(node, decision));
    else decision.rows.forEach((row) => resolvedFacts.push(resolvedFact(node, row, decision)));
  }
  const matchedFacts = resolvedFacts.filter((fact) => fact.hitCount > 0);
  const rejectedFacts = resolvedFacts.filter((fact) => fact.hitCount <= 0);
  const missing = missingRequired(fieldMap);
  const diagnostics = [
    { type: 'resolver-table-trace-source-kind', sourceKind: 'table' },
    { type: 'resolver-table-trace-profile', ...matchSummary },
    { type: 'resolver-table-trace-rows', rows: rawRows.length, mappedRows: mappedRows.length },
    { type: 'resolver-table-trace-matched-facts', rows: matchedFacts.length },
    { type: 'resolver-table-trace-rejected-facts', rows: rejectedFacts.length },
  ];
  if (missing.length) diagnostics.unshift({ type: 'resolver-table-trace-required-map-missing', fields: missing, level: 'warning' });
  return {
    sourceKind: 'table',
    nodes,
    rawRows,
    fieldMap,
    mappedRows,
    traceConfig: matchSummary,
    indexStats: {
      xmlNodeCount: nodes.length,
      nodeKeyCount: nodes.filter((node) => node.nodeNumber).length,
      psKeyCount: nodes.filter((node) => node.psKey).length,
      posKeyCount: nodes.filter((node) => node.posKey).length,
    },
    resolvedFacts,
    matchedFacts,
    rejectedFacts,
    diagnostics,
    traceRows: matchedFacts.map((fact) => ({ Branch: fact.stagedBranchKey || fact.branchName, Bore: fact.stagedBore, POS: fact.posKey, DTXR_POS: fact.dtxrPosValue })),
  };
}

function factValues(fact) {
  return [fact?.dtxrPosValue, fact?.dtxrPsValue].map(normText).filter(Boolean);
}

export function compareTraceResultsByComponentRef(jsonResult, tableResult) {
  const jsonByIndex = new Map();
  for (const fact of jsonResult?.matchedFacts || []) {
    if (!jsonByIndex.has(fact.xmlIndex)) jsonByIndex.set(fact.xmlIndex, []);
    jsonByIndex.get(fact.xmlIndex).push(fact);
  }
  const compared = [];
  for (const tableFact of tableResult?.matchedFacts || []) {
    const expected = normText(tableFact.dtxrPosValue);
    if (!expected) continue;
    const jsonValues = (jsonByIndex.get(tableFact.xmlIndex) || []).flatMap(factValues);
    const matched = jsonValues.some((value) => value === expected || value.includes(expected) || expected.includes(value));
    compared.push({ xmlIndex: tableFact.xmlIndex, nodeNumber: tableFact.nodeNumber, componentRefNo: tableFact.componentRefNo, expected: tableFact.dtxrPosValue, matched, jsonValues });
  }
  const matched = compared.filter((row) => row.matched).length;
  const percent = compared.length ? (matched / compared.length) * 100 : 0;
  return { compared: compared.length, matched, mismatched: compared.length - matched, percent, rows: compared };
}
