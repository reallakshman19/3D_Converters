import { collectXmlCiiWeightMatchRows } from './weight-match-model.js';
import {
  decorateXmlCiiWeightReviewRows,
  dedupeXmlCiiPhysicalWeightRows,
  xmlCiiLegacyWeightDecisionKeys,
} from './weight-component-identity.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function numberOrNull(value) {
  const clean = text(value).replace(/,/g, '');
  if (!clean) return null;
  const numeric = Number(clean);
  return Number.isFinite(numeric) ? numeric : null;
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function childrenByName(parent, name) {
  return [...(parent?.childNodes || [])].filter((node) => node?.nodeType === 1 && localName(node) === name);
}

function firstChild(parent, name) {
  return childrenByName(parent, name)[0] || null;
}

function childText(parent, name) {
  return text(firstChild(parent, name)?.textContent);
}

function reviewEligible(record) {
  const type = text(record.componentType).toUpperCase();
  if (text(record.connectionType)) return false;
  return Number(record.rigid) === 2
    || type === 'RIGID'
    || type.startsWith('FLAN')
    || type.startsWith('VALV')
    || type === 'VLV'
    || type.startsWith('INST');
}

function sourceIdentityRows(xmlText) {
  if (typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(String(xmlText ?? ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return [];
  const rows = [];
  [...document.getElementsByTagName('Branch')].forEach((branch, branchIndex) => {
    const branchName = childText(branch, 'Branchname');
    const nodes = childrenByName(branch, 'Node');
    nodes.forEach((node, nodeIndex) => {
      const componentRefNo = childText(node, 'ComponentRefNo');
      const endpoint = childText(node, 'Endpoint');
      const position = childText(node, 'Position');
      const componentType = childText(node, 'ComponentType').toUpperCase();
      const nodeNumber = childText(node, 'NodeNumber');
      const fallbackId = [componentRefNo, endpoint, position, componentType].map(text).filter(Boolean).join('|');
      const legacyKey = Number(nodeNumber) > 0
        ? `${branchName}::${nodeNumber}`
        : `${branchName}::${fallbackId || nodeNumber}`;
      const record = {
        key: legacyKey,
        legacyKey,
        branchName,
        branchIndex,
        nodeIndex,
        nodeOrdinal: nodeIndex + 1,
        nodeNumber,
        nodeNumberDisplay: nodeNumber,
        nodeName: childText(node, 'NodeName'),
        endpoint,
        rigid: childText(node, 'Rigid'),
        componentType,
        componentRefNo,
        connectionType: childText(node, 'ConnectionType'),
        position,
        boreMm: numberOrNull(childText(node, 'BoreMm')),
        outsideDiameter: numberOrNull(childText(node, 'OutsideDiameter')),
        rating: childText(node, 'Rating'),
        lengthMm: numberOrNull(childText(node, 'ElementLengthMm')),
        elementLengthSource: childText(node, 'ElementLengthMm') ? 'ElementLengthMm' : 'not-available-at-identity-scan',
        originalWeight: numberOrNull(childText(node, 'Weight')),
        weight: numberOrNull(childText(node, 'Weight')),
        weightSource: numberOrNull(childText(node, 'Weight')) > 0 ? 'xml-weight' : 'unresolved',
        mapped: numberOrNull(childText(node, 'Weight')) > 0,
        status: numberOrNull(childText(node, 'Weight')) > 0 ? 'mapped' : 'unresolved',
        dtxr: childText(node, 'DTXR_POS'),
        candidates: [],
        rejectedCandidates: [],
      };
      if (reviewEligible(record)) rows.push(record);
    });
  });
  return rows;
}

function mergeRow(base, rich) {
  if (!rich) return base;
  const legacyKeys = [...new Set([
    ...xmlCiiLegacyWeightDecisionKeys(base),
    ...xmlCiiLegacyWeightDecisionKeys(rich),
  ])];
  return {
    ...base,
    ...rich,
    legacyKeys,
    legacyKey: rich.legacyKey || base.legacyKey || legacyKeys[0] || '',
    componentOccurrenceIds: [...new Set([
      ...(Array.isArray(base.componentOccurrenceIds) ? base.componentOccurrenceIds : [base.componentOccurrenceId]),
      ...(Array.isArray(rich.componentOccurrenceIds) ? rich.componentOccurrenceIds : [rich.componentOccurrenceId]),
    ].filter(Boolean))],
  };
}

export function collectXmlCiiFinalWeightReviewRows(xmlText, stagedJsonText, config, options = {}) {
  const identityOptions = { ...options, sourceText: String(xmlText ?? ''), config };
  const allRows = dedupeXmlCiiPhysicalWeightRows(
    decorateXmlCiiWeightReviewRows(sourceIdentityRows(xmlText), identityOptions),
  );
  const richRows = dedupeXmlCiiPhysicalWeightRows(
    decorateXmlCiiWeightReviewRows(
      collectXmlCiiWeightMatchRows(xmlText, stagedJsonText, config),
      identityOptions,
    ),
  );
  const richByGroup = new Map(richRows.map((row) => [row.physicalComponentGroupId, row]));
  const merged = allRows.map((row) => mergeRow(row, richByGroup.get(row.physicalComponentGroupId)));
  const covered = new Set(merged.map((row) => row.physicalComponentGroupId));
  for (const row of richRows) if (!covered.has(row.physicalComponentGroupId)) merged.push(row);
  return dedupeXmlCiiPhysicalWeightRows(merged);
}
