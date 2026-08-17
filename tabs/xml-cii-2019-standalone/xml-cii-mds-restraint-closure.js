import {
  applyXmlRestraints,
  restraintEntriesFromSupportKind,
} from '../../converters/xml-cii2019-core/support-mapping.js';
import { migrateSupportMappingConfig } from '../../converters/xml-cii2019-core/support-mapping-config.js';
import { buildStandaloneDtxrResolutionLedger } from './xml-cii-trace-resolution-ledger.js';
import { decorateJsonTraceLedger } from './xml-cii-json-trace-fields.js';
import { applySupportPositionMatchPolicy } from './xml-cii-support-position-match-policy.js';

const CARRIER_TYPES = new Set(['ANCI', 'ATTA']);
const GOVERNED_KINDS = Object.freeze(['REST', 'GUIDE', 'LINESTOP']);
const EXPECTED_XML_TYPE = Object.freeze({ REST: '+Y', GUIDE: 'GUI', LINESTOP: 'LIM' });

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function childrenByName(parent, name) {
  return [...(parent?.childNodes || parent?.children || [])]
    .filter((node) => node?.nodeType === undefined || node.nodeType === 1)
    .filter((node) => localName(node) === name);
}

function firstChild(parent, name) {
  return childrenByName(parent, name)[0] || null;
}

function childText(parent, name) {
  return text(firstChild(parent, name)?.textContent);
}

function parserFailed(document) {
  return !!(document?.querySelector?.('parsererror') || document?.getElementsByTagName?.('parsererror')?.length);
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
  return {
    ...safeObject(member?.capturedFields),
    ...safeObject(member?.attributes),
    ...safeObject(member?.raw?.attributes),
  };
}

function parseGapMm(value) {
  const match = text(value).match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function sameGap(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-9;
}

function supportKindFromMember(member) {
  const captured = safeObject(member?.capturedFields);
  const attrs = memberAttributes(member);
  const cmpSupType = text(attrs.CMPSUPTYPE).toUpperCase();
  if (/^(?:LS[-_]|LINE\s*STOP|LIMIT\s*STOP|AXIAL\s*STOP)/.test(cmpSupType)) return 'LINESTOP';
  if (/^(?:PG[-_]|G[-_]|GUIDE)/.test(cmpSupType)) return 'GUIDE';
  if (/^(?:REST|BP[-_]|PIPE[- ]?REST)/.test(cmpSupType)) return 'REST';

  const code = text(captured.MDSSUPPTYPE || attrs.MDSSUPPTYPE).toUpperCase();
  if (code.startsWith('ST')) return 'LINESTOP';
  if (code.startsWith('GT')) return 'GUIDE';
  if (code === 'PIPE-REST' || code.startsWith('AT')) return 'REST';

  const evidence = [
    captured.DTXR,
    captured.SPRE,
    captured.SPREF,
    member?.labeled,
    member?.description,
    member?.dtxr,
    member?.raw?.type,
  ].map(text).join(' ').toUpperCase();
  if (/\b(?:LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b/.test(evidence)) return 'LINESTOP';
  if (/\b(?:GUIDE|LATERAL\s+GUIDE)\b/.test(evidence)) return 'GUIDE';
  if (/\b(?:PIPE[- ]?REST|REST|SHOE|WEAR\s*PAD|BEARING\s*PLATE)\b/.test(evidence)) return 'REST';
  return '';
}

function evidenceByKind(record) {
  const candidatesByKind = new Map();
  for (const member of Array.isArray(record?.positionMembers) ? record.positionMembers : []) {
    const kind = supportKindFromMember(member);
    if (!kind) continue;
    const attrs = memberAttributes(member);
    const gapText = text(attrs.CMPSUPGAP);
    const gapMm = parseGapMm(gapText);
    if (!candidatesByKind.has(kind)) candidatesByKind.set(kind, []);
    candidatesByKind.get(kind).push({ member, attrs, gapText, gapMm });
  }

  const result = new Map();
  for (const [kind, candidates] of candidatesByKind) {
    const explicit = candidates.filter((candidate) => candidate.gapText && Number.isFinite(candidate.gapMm));
    const uniqueGapValues = [];
    for (const candidate of explicit) {
      if (!uniqueGapValues.some((value) => sameGap(value, candidate.gapMm))) uniqueGapValues.push(candidate.gapMm);
    }
    const gapConflict = uniqueGapValues.length > 1;
    const selected = uniqueGapValues.length === 1
      ? (explicit.find((candidate) => sameGap(candidate.gapMm, uniqueGapValues[0])) || candidates[0])
      : candidates[0];
    result.set(kind, {
      kind,
      attrs: selected?.attrs || {},
      gapText: uniqueGapValues.length === 1 ? selected?.gapText || '' : '',
      gapMm: uniqueGapValues.length === 1 ? uniqueGapValues[0] : null,
      gapConflict,
      gapValuesMm: uniqueGapValues,
      candidates,
    });
  }

  for (const kind of Array.isArray(record?.derivedSupportTypes) ? record.derivedSupportTypes : []) {
    const normalized = text(kind).toUpperCase().replace(/\s+/g, '');
    if (GOVERNED_KINDS.includes(normalized) && !result.has(normalized)) {
      result.set(normalized, {
        kind: normalized,
        attrs: {},
        gapText: '',
        gapMm: null,
        gapConflict: false,
        gapValuesMm: [],
        candidates: [],
      });
    }
  }
  return result;
}

function existingRestraintsByType(node) {
  const result = new Map();
  for (const restraint of childrenByName(node, 'Restraint')) {
    const type = normalizeXmlType(childText(restraint, 'Type'));
    if (!type) continue;
    if (!result.has(type)) result.set(type, []);
    result.get(type).push(restraint);
  }
  return result;
}

function setChildText(document, parent, name, value) {
  let child = firstChild(parent, name);
  if (!child) {
    child = parent?.namespaceURI && typeof document.createElementNS === 'function'
      ? document.createElementNS(parent.namespaceURI, name)
      : document.createElement(name);
    parent.appendChild(child);
  }
  child.textContent = String(value);
  return child;
}

function createTemporaryNode(document, node) {
  return node?.namespaceURI && typeof document.createElementNS === 'function'
    ? document.createElementNS(node.namespaceURI, 'Node')
    : document.createElement('Node');
}

function appendGeneratedEntries(document, node, entries, config) {
  if (!entries.length) return 0;
  const temporary = createTemporaryNode(document, node);
  applyXmlRestraints(document, temporary, entries, config);
  const generated = [...childrenByName(temporary, 'Restraint')];
  for (const restraint of generated) node.appendChild(restraint);
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

function gapDiagnostic(node, record, kind, details = {}) {
  return {
    type: details.type || 'mds-position-gap-reconciled',
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    componentType: childText(node, 'ComponentType'),
    effectiveSource: record?.effectiveSource || '',
    matchType: record?.matchType || '',
    supportKind: kind,
    restraintType: EXPECTED_XML_TYPE[kind] || '',
    ...details,
  };
}

export function closeGovernedMdsPositionRestraintsXml(xmlText, stagedJsonText, config = {}) {
  const source = String(xmlText ?? '');
  const stats = {
    mdsPositionNodesChanged: 0,
    mdsRestRestraintsAdded: 0,
    mdsGuideRestraintsAdded: 0,
    mdsLineStopRestraintsAdded: 0,
    mdsGuideGapsReconciled: 0,
    mdsLineStopGapsReconciled: 0,
    mdsGapEvidenceConflicts: 0,
    mdsExistingGapConflictsPreserved: 0,
    mdsDuplicateRestraintGapConflicts: 0,
  };
  const diagnostics = [];
  const supportMapping = migrateSupportMappingConfig(config);
  if (supportMapping.useJsonForRestraints === false) {
    return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'json-restraints-disabled' }] };
  }
  if (!source.trim() || !text(stagedJsonText)) return { xmlText: source, changed: false, stats, diagnostics };
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'DOM unavailable' }] };
  }

  const positionMatch = applySupportPositionMatchPolicy(config);
  diagnostics.push({ type: 'mds-support-position-match-policy', ...positionMatch.policy });
  if (!positionMatch.policy.valid) {
    return {
      xmlText: source,
      changed: false,
      stats,
      diagnostics: [
        ...diagnostics,
        {
          type: 'mds-position-restraint-closure-skipped',
          reason: positionMatch.policy.reason || 'unsupported support position match policy',
        },
      ],
      supportPositionMatch: positionMatch.policy,
    };
  }

  const rawLedger = buildStandaloneDtxrResolutionLedger(source, stagedJsonText, positionMatch.config);
  const traceConfig = {
    captureFields: ['DTXR', 'SPRE', 'SPREF', 'MDSSUPPTYPE', 'NAME', 'CMPSUPGAP'],
  };
  const ledger = decorateJsonTraceLedger(rawLedger, traceConfig);
  const byIndex = new Map((ledger.records || []).map((record) => [Number(record.xmlIndex), record]));
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (parserFailed(document)) {
    return { xmlText: source, changed: false, stats, diagnostics: [...diagnostics, { type: 'mds-position-restraint-closure-skipped', reason: 'XML parse failed' }], supportPositionMatch: positionMatch.policy };
  }

  let xmlIndex = 0;
  for (const branch of [...document.getElementsByTagName('Branch')]) {
    for (const node of childrenByName(branch, 'Node')) {
      xmlIndex += 1;
      const componentType = childText(node, 'ComponentType').toUpperCase();
      if (!CARRIER_TYPES.has(componentType)) continue;
      const record = byIndex.get(xmlIndex);
      if (!record || !String(record.status || '').startsWith('RESOLVED_')) continue;
      const evidence = evidenceByKind(record);
      if (!evidence.size) continue;

      const byType = existingRestraintsByType(node);
      const present = new Set(byType.keys());
      const kinds = [];
      const entries = [];
      let nodeChanged = false;

      for (const kind of GOVERNED_KINDS) {
        const kindEvidence = evidence.get(kind);
        if (!kindEvidence) continue;
        const expectedType = EXPECTED_XML_TYPE[kind];

        if (kindEvidence.gapConflict) {
          stats.mdsGapEvidenceConflicts += 1;
          diagnostics.push(gapDiagnostic(node, record, kind, {
            type: 'mds-position-gap-evidence-conflict',
            sourceGapValuesMm: kindEvidence.gapValuesMm,
            message: 'Conflicting CMPSUPGAP values exist for the same support kind at the matched DTXR_POS position; no gap value was selected.',
          }));
          continue;
        }

        const existingForType = byType.get(expectedType) || [];
        if (existingForType.length > 0) {
          if ((kind === 'GUIDE' || kind === 'LINESTOP') && Number.isFinite(kindEvidence.gapMm)) {
            if (existingForType.length !== 1) {
              stats.mdsDuplicateRestraintGapConflicts += 1;
              diagnostics.push(gapDiagnostic(node, record, kind, {
                type: 'mds-position-gap-duplicate-restraint-conflict',
                sourceGapMm: kindEvidence.gapMm,
                existingCount: existingForType.length,
                message: 'Multiple existing restraints of the governed type prevent deterministic gap reconciliation.',
              }));
              continue;
            }

            const restraint = existingForType[0];
            const existingGapText = childText(restraint, 'Gap');
            const existingGapMm = parseGapMm(existingGapText);
            if (existingGapMm === null || sameGap(existingGapMm, 0)) {
              setChildText(document, restraint, 'Gap', String(kindEvidence.gapMm));
              if (kindEvidence.gapText) setChildText(document, restraint, 'CMPSUPGAP', kindEvidence.gapText);
              nodeChanged = true;
              if (kind === 'GUIDE') stats.mdsGuideGapsReconciled += 1;
              if (kind === 'LINESTOP') stats.mdsLineStopGapsReconciled += 1;
              diagnostics.push(gapDiagnostic(node, record, kind, {
                previousGap: existingGapText,
                sourceGapText: kindEvidence.gapText,
                sourceGapMm: kindEvidence.gapMm,
                finalGapMm: kindEvidence.gapMm,
                message: 'Existing zero/missing governed restraint gap was reconciled from the unique same-kind DTXR_POS CMPSUPGAP evidence.',
              }));
            } else if (!sameGap(existingGapMm, kindEvidence.gapMm)) {
              stats.mdsExistingGapConflictsPreserved += 1;
              diagnostics.push(gapDiagnostic(node, record, kind, {
                type: 'mds-position-existing-gap-conflict-preserved',
                existingGapMm,
                sourceGapMm: kindEvidence.gapMm,
                sourceGapText: kindEvidence.gapText,
                message: 'Existing non-zero restraint gap conflicts with DTXR_POS evidence and was preserved pending explicit precedence authority.',
              }));
            }
          }
          continue;
        }

        const generated = restraintEntriesFromSupportKind(kind, kindEvidence.attrs, node, config)
          .filter((entry) => !present.has(normalizeXmlType(entry?.type || entry)));
        if (!generated.length) continue;
        kinds.push(kind);
        entries.push(...generated);
        for (const entry of generated) present.add(normalizeXmlType(entry?.type || entry));
      }

      const appended = appendGeneratedEntries(document, node, entries, config);
      if (appended) {
        nodeChanged = true;
        if (kinds.includes('REST')) stats.mdsRestRestraintsAdded += 1;
        if (kinds.includes('GUIDE')) stats.mdsGuideRestraintsAdded += 1;
        if (kinds.includes('LINESTOP')) stats.mdsLineStopRestraintsAdded += 1;
        diagnostics.push(nodeDiagnostic(node, record, kinds, entries));
      }
      if (nodeChanged) stats.mdsPositionNodesChanged += 1;
    }
  }

  const changed = stats.mdsPositionNodesChanged > 0;
  return {
    xmlText: changed ? new XMLSerializer().serializeToString(document) : source,
    changed,
    stats,
    diagnostics,
    ledger: ledger.records || [],
    supportPositionMatch: positionMatch.policy,
  };
}
