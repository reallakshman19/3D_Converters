export const AIV_CANVAS_PROJECTION_SCHEMA = 'AivCanvasProjection.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function text(value) {
  return String(value ?? '').trim();
}

function tableRecords(table) {
  if (!Array.isArray(table?.header) || !Array.isArray(table?.rows)) return [];
  return table.rows.map((row, rowIndex) => ({
    rowIndex,
    values: Object.fromEntries(table.header.map((column, columnIndex) => [column, text(row?.[columnIndex])])),
  }));
}

function workingTables(input) {
  return input.assumptionResolution?.tables ?? input.tables ?? {};
}

function topologyElements(topology) {
  return Array.isArray(topology?.elements) ? topology.elements : [];
}

function topologyById(topology) {
  return new Map(topologyElements(topology).map((item) => [text(item.canonicalId), item]));
}

function assumptionsByRow(resolution) {
  const map = new Map();
  for (const item of resolution?.assumptions ?? []) {
    const tableKind = text(item.tableKind);
    const rowIndex = Number(item.rowIndex);
    if (!tableKind || !Number.isInteger(rowIndex) || rowIndex < 0) continue;
    const key = `${tableKind}:${rowIndex}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      tableKind,
      rowIndex,
      column: text(item.column),
      assumedValue: text(item.assumedValue),
      profilePath: text(item.profilePath),
      reason: text(item.reason),
    });
  }
  for (const assumptions of map.values()) assumptions.sort((a, b) => a.column.localeCompare(b.column));
  return map;
}

function rowAssumptions(context, tableKind, rowIndex) {
  return context.assumptions.get(`${tableKind}:${rowIndex}`) ?? [];
}

function domainResult(screeningResult) {
  return screeningResult?.outputs ?? screeningResult?.evidence?.domainResult ?? screeningResult ?? {};
}

function readinessRows(envelope) {
  return Array.isArray(envelope?.readiness?.rows) ? envelope.readiness.rows : [];
}

function readinessFor(rows, predicate) {
  const statuses = rows.filter(predicate).map((row) => text(row.status)).filter(Boolean);
  if (!statuses.length) return null;
  if (statuses.includes('NOT_READY')) return 'NOT_READY';
  if (statuses.includes('METHOD_GAP')) return 'METHOD_GAP';
  if (statuses.every((status) => status === 'NOT_APPLICABLE')) return 'NOT_APPLICABLE';
  return statuses.includes('READY_FOR_QUALIFICATION') ? 'READY_FOR_QUALIFICATION' : statuses[0];
}

function sourceIcon(type) {
  return ({
    RELIEF_VALVE: 'RELIEF_VALVE',
    CONTROL_VALVE: 'CONTROL_VALVE',
    RESTRICTION_ORIFICE: 'RESTRICTION_ORIFICE',
    PRESSURE_REDUCING_BRANCH_CONNECTION: 'PRESSURE_REDUCING_DEVICE',
  })[text(type)] ?? 'UNKNOWN_SOURCE';
}

function assessmentIcon(type) {
  return ({
    WELDOLET: 'WELDOLET',
    WELDED_TEE: 'WELDED_TEE',
    WELDED_SUPPORT: 'WELDED_SUPPORT',
    OTHER_WELDED_DISCONTINUITY: 'OTHER_WELDED_DISCONTINUITY',
  })[text(type)] ?? 'UNKNOWN_ASSESSMENT';
}

function sourceResultMap(result) {
  return new Map((result.sourceResults ?? []).map((item) => [`${text(item.sourceCanonicalId)}\u0000${text(item.caseId)}`, item]));
}

function assessmentResultsMap(result) {
  const map = new Map();
  for (const item of result.assessmentResults ?? []) {
    const id = text(item.assessmentCanonicalId);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(item);
  }
  return map;
}

function contributionMap(result) {
  const map = new Map();
  for (const assessment of result.assessmentResults ?? []) {
    for (const item of assessment.sourceContributionsAtPoint ?? []) {
      const key = `${text(item.sourceCanonicalId)}\u0000${text(item.assessmentCanonicalId)}\u0000${text(item.caseId)}`;
      map.set(key, item);
    }
  }
  return map;
}

function assessmentSummary(results) {
  const cases = results.map((item) => ({
    caseId: text(item.caseId),
    status: text(item.status) || null,
    combinedPointPwlDb: item.combinedPointPwlDb ?? null,
    contributingSourceCanonicalIds: [...(item.contributingSourceCanonicalIds ?? [])],
    t26Intermediates: item.t26Intermediates ? { ...item.t26Intermediates } : null,
    lof: item.lof ?? null,
    resultScope: text(item.resultScope) || 'ASSESSMENT',
    authority: item.authority ? { ...item.authority } : null,
  })).sort((a, b) => a.caseId.localeCompare(b.caseId));
  if (!cases.length) return null;
  return cases.length === 1 ? cases[0] : { caseCount: cases.length, cases };
}

function sourceNodes(records, context) {
  return records.flatMap(({ rowIndex, values }) => {
    const canonicalId = text(values['Source Canonical ID']);
    const caseId = text(values['Operating Case']);
    if (!canonicalId || !caseId) return [];
    const topo = context.topology.get(canonicalId) ?? {};
    const result = context.sourceResults.get(`${canonicalId}\u0000${caseId}`) ?? null;
    const assumptions = rowAssumptions(context, 'sources', rowIndex);
    return [{
      nodeKey: `SOURCE:${canonicalId}:${caseId}`,
      canonicalId,
      caseId,
      nodeKind: 'SOURCE',
      iconType: sourceIcon(values['Source Device Type']),
      tag: text(topo.tag) || canonicalId,
      line: text(topo.line) || null,
      readinessStatus: readinessFor(context.readiness, (row) => text(row.sourceCanonicalId) === canonicalId && text(row.caseId) === caseId),
      assumptionCount: assumptions.length,
      assumptions,
      screeningStatus: result ? text(result.status) || 'AVAILABLE' : null,
      resultSummary: result ? {
        status: text(result.status) || null,
        resultScope: text(result.resultScope) || 'SOURCE',
        rawSourcePwlDb: result.rawSourcePwlDb ?? null,
        sonicFlowFactorDb: result.sonicFlowFactorDb ?? null,
        trimReductionDb: result.trimReductionDb ?? null,
        effectiveSourcePwlDb: result.effectiveSourcePwlDb ?? null,
        authority: result.authority ? { ...result.authority } : null,
        trace: result.trace ? { ...result.trace } : null,
      } : null,
      tableRowIndex: rowIndex,
    }];
  });
}

function assessmentNodes(records, context) {
  return records.flatMap(({ rowIndex, values }) => {
    const canonicalId = text(values['Assessment Canonical ID']);
    if (!canonicalId) return [];
    const topo = context.topology.get(canonicalId) ?? {};
    const results = context.assessmentResults.get(canonicalId) ?? [];
    const assumptions = rowAssumptions(context, 'assessments', rowIndex);
    return [{
      nodeKey: `ASSESSMENT:${canonicalId}`,
      canonicalId,
      caseId: null,
      nodeKind: 'ASSESSMENT',
      iconType: assessmentIcon(values['Assessment Type']),
      tag: text(topo.tag) || canonicalId,
      line: text(topo.line) || null,
      readinessStatus: readinessFor(context.readiness, (row) => text(row.assessmentCanonicalId) === canonicalId),
      assumptionCount: assumptions.length,
      assumptions,
      screeningStatus: results.length ? 'AVAILABLE' : null,
      resultSummary: assessmentSummary(results),
      tableRowIndex: rowIndex,
    }];
  });
}

function pathKind(element) {
  const type = text(element?.type).toUpperCase();
  if (/VESSEL|TANK|BOUNDARY|TERMINATION/u.test(type)) return 'BOUNDARY';
  if (/PIPE|BRANCH|JUNCTION|CONNECTION|NODE|OFF.?PAGE/u.test(type)) return 'PATH';
  return null;
}

function pathNodes(topology, excludedIds) {
  return topologyElements(topology).flatMap((element) => {
    const canonicalId = text(element.canonicalId);
    const nodeKind = pathKind(element);
    if (!canonicalId || !nodeKind || excludedIds.has(canonicalId)) return [];
    return [{
      nodeKey: `${nodeKind}:${canonicalId}`,
      canonicalId,
      caseId: null,
      nodeKind,
      iconType: nodeKind === 'BOUNDARY' ? 'BOUNDARY' : 'PIPE_PATH',
      tag: text(element.tag) || canonicalId,
      line: text(element.line) || null,
      readinessStatus: null,
      assumptionCount: 0,
      assumptions: [],
      screeningStatus: null,
      resultSummary: null,
      tableRowIndex: null,
    }];
  });
}

function relationshipRows(records, context) {
  return records.flatMap(({ rowIndex, values }) => {
    const sourceCanonicalId = text(values['Source Canonical ID']);
    const assessmentCanonicalId = text(values['Assessment Canonical ID']);
    const caseId = text(values['Operating Case']);
    if (!sourceCanonicalId || !assessmentCanonicalId || !caseId) return [];
    const key = `${sourceCanonicalId}\u0000${assessmentCanonicalId}\u0000${caseId}`;
    const selectionKey = `REL:${sourceCanonicalId}:${assessmentCanonicalId}:${caseId}`;
    const ready = context.readiness.find((row) => text(row.sourceCanonicalId) === sourceCanonicalId
      && text(row.assessmentCanonicalId) === assessmentCanonicalId && text(row.caseId) === caseId);
    const assumptions = rowAssumptions(context, 'relationships', rowIndex);
    return [{
      rowKey: text(ready?.rowKey) || selectionKey,
      selectionKey,
      sourceCanonicalId,
      assessmentCanonicalId,
      caseId,
      applicabilityDisposition: text(values['Applicability Disposition']) || 'UNRESOLVED',
      physicalDistance: text(values['Physical Distance']) || null,
      physicalDistanceUnit: text(values['Physical Distance Unit']) || null,
      distanceSource: text(values['Distance Source']) || null,
      distanceSourceRevision: text(values['Distance Source Revision']) || null,
      simultaneousSourceGroup: text(values['Simultaneous Source Group']) || null,
      assumptionCount: assumptions.length,
      assumptions,
      screeningContribution: context.contributions.get(key) ?? null,
      readinessStatus: text(ready?.status) || null,
      tableRowIndex: rowIndex,
    }];
  });
}

function sortNodes(a, b) {
  return a.nodeKind.localeCompare(b.nodeKind) || String(a.caseId ?? '').localeCompare(String(b.caseId ?? ''))
    || a.canonicalId.localeCompare(b.canonicalId) || a.nodeKey.localeCompare(b.nodeKey);
}

function sortRelationships(a, b) {
  return a.caseId.localeCompare(b.caseId) || a.sourceCanonicalId.localeCompare(b.sourceCanonicalId)
    || a.assessmentCanonicalId.localeCompare(b.assessmentCanonicalId);
}

export function buildAivCanvasProjection(input = {}) {
  const tables = workingTables(input);
  const result = domainResult(input.screeningResult);
  const context = {
    topology: topologyById(input.topology),
    readiness: readinessRows(input.readinessEnvelope),
    assumptions: assumptionsByRow(input.assumptionResolution),
    sourceResults: sourceResultMap(result),
    assessmentResults: assessmentResultsMap(result),
    contributions: contributionMap(result),
  };
  const sources = sourceNodes(tableRecords(tables.sources), context);
  const assessments = assessmentNodes(tableRecords(tables.assessments), context);
  const excluded = new Set([...sources, ...assessments].map((node) => node.canonicalId));
  const nodes = [...sources, ...pathNodes(input.topology, excluded), ...assessments].sort(sortNodes);
  const relationships = relationshipRows(tableRecords(tables.relationships), context).sort(sortRelationships);
  return deepFreeze({
    schema: AIV_CANVAS_PROJECTION_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    presentationOnly: true,
    nodes,
    relationships,
    lineCaseSummaries: deepFreeze((result.lineCaseSummaries ?? []).map((item) => ({ ...item }))),
  });
}
