import { PLAIN_DOCUMENT, childText, childrenByName, createElement, elementsByName, parsePlainXml, serializePlainXml } from '../PlainDom.js';

const CARRIER_TYPES = new Set(['ANCI', 'ATTA']);
const GOVERNED_KINDS = Object.freeze(['REST', 'GUIDE', 'LINESTOP']);
const EXPECTED_XML_TYPE = Object.freeze({ REST: '+Y', GUIDE: 'GUI', LINESTOP: 'LIM' });

// today/v045/converters/xml-cii2019-core/support-kind-precedence.js:224-227 (f8622395).
const SUPPORT_KIND_EVIDENCE_FIELDS = Object.freeze([
  'DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'SPRE', 'SKEY', 'NAME', 'CMPSUPTYPE', 'MDSSUPPTYPE',
  'SUPPORT_KIND', 'SUPPORT_TYPE', 'SUPPORT_MAPPER_KIND', 'NODETYPE', 'NODEGAP', 'CMPSUPGAP',
]);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizeXmlType(value) {
  const type = text(value).toUpperCase();
  if (type === 'Y' || type === '+Y' || type === 'REST') return '+Y';
  if (type === 'GUIDE' || type === 'GUI' || type === 'X') return 'GUI';
  if (type === 'LINESTOP' || type === 'LIMIT' || type === 'LIM' || type === 'Z') return 'LIM';
  return type;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function memberAttributes(member) {
  return safeObject(member?.raw?.attributes || member?.attributes || member?.capturedFields);
}

export function supportKindFromMember(member, config = {}, onDecision, core) {
  const captured = safeObject(member?.capturedFields);
  const attrs = memberAttributes(member);
  // Owner rule (RCA-04): NODETYPE first, then the Step 7 support table.
  const decided = core.governedSupportKind(Object.keys(attrs).length ? attrs : captured, config, undefined, onDecision);
  if (decided.kind) return decided.kind;
  const code = text(captured.MDSSUPPTYPE || attrs.MDSSUPPTYPE).toUpperCase();
  if (code.startsWith('GT')) return observedFallback('GUIDE', 'MDSSUPPTYPE-GT', code, onDecision);
  if (code.startsWith('ST')) return observedFallback('LINESTOP', 'MDSSUPPTYPE-ST', code, onDecision);
  if (code === 'PIPE-REST' || code.startsWith('AT')) return observedFallback('REST', 'MDSSUPPTYPE-REST', code, onDecision);
  const evidence = [
    captured.DTXR,
    captured.SPRE,
    captured.SPREF,
    member?.labeled,
    member?.description,
    member?.dtxr,
    member?.raw?.type,
  ].map(text).join(' ').toUpperCase();
  if (/\b(?:PIPE[- ]?REST|REST|SHOE|WEAR\s*PAD|BEARING\s*PLATE)\b/.test(evidence)) return observedFallback('REST', 'closure-rest-text', evidence, onDecision);
  return '';
}

function observedFallback(kind, id, value, onDecision) {
  onDecision?.({ kind, source: 'mds-closure-fallback', rule: { id, value } });
  return kind;
}

function evidenceByKind(record, config, core) {
  const result = new Map();
  for (const member of Array.isArray(record?.positionMembers) ? record.positionMembers : []) {
    // Today's call supplies an observer even when the audit journal is absent.
    const kind = supportKindFromMember(member, config, () => {}, core);
    if (kind && !result.has(kind)) {
      result.set(kind, memberAttributes(member));
    }
  }
  // Aggregated derived kinds are generated labels: they only stand in when no
  // source member resolved a kind, and never add a second kind (RCA-04).
  if (result.size) return result;
  for (const kind of Array.isArray(record?.derivedSupportTypes) ? record.derivedSupportTypes : []) {
    const normalized = text(kind).toUpperCase().replace(/\s+/g, '');
    if (GOVERNED_KINDS.includes(normalized) && !result.has(normalized)) result.set(normalized, {});
  }
  return result;
}

function existingTypes(node) {
  return new Set(childrenByName(node, 'Restraint')
    .map((restraint) => normalizeXmlType(childText(restraint, 'Type')))
    .filter(Boolean));
}

function appendGeneratedEntries(node, entries, config, core) {
  if (!entries.length) return 0;
  const temporary = createElement('Node');
  core.applyXmlRestraints(PLAIN_DOCUMENT, temporary, entries, config);
  const generated = [...childrenByName(temporary, 'Restraint')];
  for (const restraint of generated) node.kids.push(restraint);
  return generated.length;
}

function nodeDiagnostic(node, record, kinds, entries) {
  return {
    type: 'mds-position-restraints-materialized',
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    componentType: childText(node, 'ComponentType'),
    effectiveSource: record?.effectiveSource || '',
    matchType: record?.matchType || '',
    supportKinds: kinds,
    restraintTypes: entries.map((entry) => normalizeXmlType(entry?.type || entry)),
    message: 'Missing governed restraints were appended from the matched DTXR_POS position-group MDSSUPPTYPE evidence.',
  };
}

function missingEntries(node, evidence, config, core) {
  const present = existingTypes(node);
  const kinds = [];
  const entries = [];
  for (const kind of GOVERNED_KINDS) {
    if (!evidence.has(kind)) continue;
    const expectedType = EXPECTED_XML_TYPE[kind];
    if (present.has(expectedType)) continue;
    const generated = core.restraintEntriesFromSupportKind(kind, evidence.get(kind), node, config)
      .filter((entry) => !present.has(normalizeXmlType(entry?.type || entry)));
    if (!generated.length) continue;
    kinds.push(kind);
    entries.push(...generated);
    for (const entry of generated) present.add(normalizeXmlType(entry?.type || entry));
  }
  return { kinds, entries };
}

function closeNode(node, xmlIndex, byIndex, config, core, stats, diagnostics) {
  const componentType = childText(node, 'ComponentType').toUpperCase();
  if (!CARRIER_TYPES.has(componentType)) return;
  const record = byIndex.get(xmlIndex);
  if (!record || !String(record.status || '').startsWith('RESOLVED_')) return;
  const evidence = evidenceByKind(record, config, core);
  if (!evidence.size) return;

  const { kinds, entries } = missingEntries(node, evidence, config, core);
  if (!entries.length) return;
  const appended = appendGeneratedEntries(node, entries, config, core);
  if (!appended) return;
  stats.mdsPositionNodesChanged += 1;
  if (kinds.includes('REST')) stats.mdsRestRestraintsAdded += 1;
  if (kinds.includes('GUIDE')) stats.mdsGuideRestraintsAdded += 1;
  if (kinds.includes('LINESTOP')) stats.mdsLineStopRestraintsAdded += 1;
  diagnostics.push(nodeDiagnostic(node, record, kinds, entries));
}

function parseFailure(source, stats) {
  return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'XML parse failed' }] };
}

export function closeGovernedMdsPositionRestraintsXml(xmlText, stagedJsonText, config = {}, core) {
  const source = String(xmlText ?? '');
  const stats = {
    mdsPositionNodesChanged: 0,
    mdsRestRestraintsAdded: 0,
    mdsGuideRestraintsAdded: 0,
    mdsLineStopRestraintsAdded: 0,
  };
  const diagnostics = [];
  const supportMapping = core.migrateSupportMappingConfig(config);
  if (supportMapping.useJsonForRestraints === false) {
    return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'json-restraints-disabled' }] };
  }
  if (!source.trim() || !text(stagedJsonText)) return { xmlText: source, changed: false, stats, diagnostics };

  const rawLedger = core.buildStandaloneDtxrResolutionLedger(source, stagedJsonText, config);
  const traceConfig = {
    ...config,
    captureFields: [...new Set(['DTXR', 'SPRE', 'SPREF', 'MDSSUPPTYPE', 'NAME', 'CMPSUPGAP', ...SUPPORT_KIND_EVIDENCE_FIELDS])],
  };
  const ledger = core.decorateJsonTraceLedger(rawLedger, traceConfig);
  const byIndex = new Map((ledger.records || []).map((record) => [Number(record.xmlIndex), record]));
  let root;
  try {
    ({ root } = parsePlainXml(source));
  } catch {
    return parseFailure(source, stats);
  }
  if (root.__el === 'parsererror' || elementsByName(root, 'parsererror').length) {
    return parseFailure(source, stats);
  }

  let xmlIndex = 0;
  const branches = [...(root.__el === 'Branch' ? [root] : []), ...elementsByName(root, 'Branch')];
  for (const branch of branches) {
    for (const node of childrenByName(branch, 'Node')) {
      xmlIndex += 1;
      closeNode(node, xmlIndex, byIndex, config, core, stats, diagnostics);
    }
  }

  const changed = stats.mdsPositionNodesChanged > 0;
  return {
    xmlText: changed ? serializePlainXml({ root }) : source,
    changed,
    stats,
    diagnostics,
    ledger: ledger.records || [],
  };
}
