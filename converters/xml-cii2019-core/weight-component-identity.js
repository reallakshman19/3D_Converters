function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function positiveWeight(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function encode(value) {
  return encodeURIComponent(text(value));
}

function normalizeRef(value) {
  return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}

function fnv1a32(value) {
  const input = String(value ?? '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function xmlCiiWeightSourceId(options = {}) {
  const explicit = text(options.sourceId || options.config?.weightIdentity?.sourceId || options.config?.branchSelection?.sourceId);
  if (explicit) return explicit;
  const sourceText = String(options.sourceText ?? '');
  return sourceText ? `SRC-${fnv1a32(sourceText).toUpperCase()}` : 'SRC-UNRESOLVED';
}

function fallbackComponentToken(row = {}) {
  return [
    text(row.componentType).toUpperCase(),
    text(row.nodeName),
    text(row.nodeNumber),
    text(row.endpoint),
    text(row.position),
  ].filter(Boolean).join('|') || 'UNRESOLVED-COMPONENT';
}

export function buildXmlCiiPhysicalWeightIdentity(row = {}, options = {}) {
  const sourceId = xmlCiiWeightSourceId(options);
  const branchName = text(row.branchName) || 'UNRESOLVED-BRANCH';
  const componentRefNo = text(row.componentRefNo);
  const normalizedComponentRef = normalizeRef(componentRefNo);
  const componentToken = normalizedComponentRef ? `REF:${normalizedComponentRef}` : `FALLBACK:${fallbackComponentToken(row)}`;
  const branchOccurrenceId = `${sourceId}|BRANCH:${branchName}`;
  const physicalComponentGroupId = `${branchOccurrenceId}|${componentToken}`;
  const componentOccurrenceId = `${physicalComponentGroupId}|NODE:${text(row.nodeNumber) || '?'}|END:${text(row.endpoint) || '?'}|ORD:${text(row.nodeOrdinal) || text(row.nodeIndex) || '?'}`;
  const decisionKey = `WPC1::${encode(sourceId)}::${encode(branchName)}::${encode(componentToken)}`;
  return {
    schema: 'xml-cii-weight-component-identity/v1',
    sourceId,
    branchOccurrenceId,
    componentOccurrenceId,
    physicalComponentGroupId,
    componentRefNo,
    endpoint: text(row.endpoint),
    decisionKey,
  };
}

export function isXmlCiiPhysicalWeightDecisionKey(key) {
  return text(key).startsWith('WPC1::');
}

export function xmlCiiLegacyWeightDecisionKeys(row = {}) {
  const keys = [];
  const push = (value) => {
    const key = text(value);
    if (key && !isXmlCiiPhysicalWeightDecisionKey(key) && !keys.includes(key)) keys.push(key);
  };
  for (const key of Array.isArray(row.legacyKeys) ? row.legacyKeys : []) push(key);
  push(row.legacyKey);
  push(row.originalKey);
  push(row.key);
  if (text(row.branchName) && text(row.nodeNumber)) push(`${text(row.branchName)}::${text(row.nodeNumber)}`);
  return keys;
}

export function decorateXmlCiiWeightReviewRow(row = {}, options = {}) {
  const identity = buildXmlCiiPhysicalWeightIdentity(row, options);
  const legacyKeys = xmlCiiLegacyWeightDecisionKeys(row);
  return {
    ...row,
    originalKey: row.originalKey || row.key || '',
    legacyKey: row.legacyKey || legacyKeys[0] || '',
    legacyKeys,
    ...identity,
    key: identity.decisionKey,
  };
}

export function decorateXmlCiiWeightReviewRows(rows = [], options = {}) {
  return (Array.isArray(rows) ? rows : []).map((row) => decorateXmlCiiWeightReviewRow(row, options));
}

function rowOwnershipScore(candidate = {}) {
  let value = 0;
  if (String(candidate.endpoint).trim() === '2') value += 50;
  if (Number(candidate.nodeNumber) > 0) value += 20;
  if (Number(candidate.originalWeight) > 0) value += 10;
  if (candidate.componentType === 'RIGID') value += 5;
  return value;
}

export function dedupeXmlCiiPhysicalWeightRows(rows = []) {
  const byGroup = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = text(row.physicalComponentGroupId || row.key);
    if (!key) continue;
    const current = byGroup.get(key);
    if (!current) {
      byGroup.set(key, {
        ...row,
        legacyKeys: xmlCiiLegacyWeightDecisionKeys(row),
        componentOccurrenceIds: [text(row.componentOccurrenceId)].filter(Boolean),
      });
      continue;
    }
    const chosen = rowOwnershipScore(row) > rowOwnershipScore(current) ? row : current;
    const mergedLegacyKeys = [...new Set([
      ...xmlCiiLegacyWeightDecisionKeys(current),
      ...xmlCiiLegacyWeightDecisionKeys(row),
    ])];
    const componentOccurrenceIds = [...new Set([
      ...(Array.isArray(current.componentOccurrenceIds) ? current.componentOccurrenceIds : [current.componentOccurrenceId]),
      text(row.componentOccurrenceId),
    ].filter(Boolean))];
    byGroup.set(key, {
      ...chosen,
      legacyKeys: mergedLegacyKeys,
      legacyKey: chosen.legacyKey || mergedLegacyKeys[0] || '',
      componentOccurrenceIds,
    });
  }
  return [...byGroup.values()];
}

export function resolveXmlCiiWeightDecision(decisions, row = {}, options = {}) {
  const map = decisions && typeof decisions === 'object' && !Array.isArray(decisions) ? decisions : {};
  const decorated = row.physicalComponentGroupId ? row : decorateXmlCiiWeightReviewRow(row, options);
  const candidates = [decorated.decisionKey, ...xmlCiiLegacyWeightDecisionKeys(decorated)];
  for (const key of candidates) {
    const weight = positiveWeight(map[key]);
    if (weight === null) continue;
    return {
      weight,
      key,
      decisionKey: decorated.decisionKey,
      legacy: key !== decorated.decisionKey,
    };
  }
  return { weight: null, key: '', decisionKey: decorated.decisionKey, legacy: false };
}

export function migrateXmlCiiWeightDecisionMap(decisions, rows = [], options = {}) {
  const accepted = {};
  const migrations = [];
  const unmatched = [];
  const decoratedRows = dedupeXmlCiiPhysicalWeightRows(decorateXmlCiiWeightReviewRows(rows, options));
  const consumed = new Set();
  for (const row of decoratedRows) {
    const resolved = resolveXmlCiiWeightDecision(decisions, row, options);
    if (resolved.weight === null) continue;
    accepted[row.decisionKey] = resolved.weight;
    consumed.add(resolved.key);
    if (resolved.legacy) migrations.push({ fromKey: resolved.key, toKey: row.decisionKey, weight: resolved.weight });
  }
  const map = decisions && typeof decisions === 'object' && !Array.isArray(decisions) ? decisions : {};
  for (const [key, raw] of Object.entries(map)) {
    const weight = positiveWeight(raw);
    if (weight === null || consumed.has(key)) continue;
    if (isXmlCiiPhysicalWeightDecisionKey(key)) accepted[key] = weight;
    else unmatched.push({ key, weight, reason: 'legacy-key-not-resolved-to-physical-component' });
  }
  return { accepted, migrations, unmatched, rows: decoratedRows };
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
  const rigid = Number(record.rigid) === 2;
  const connection = text(record.connectionType);
  return !connection && (rigid || type === 'RIGID' || type.startsWith('FLAN') || type.startsWith('VALV') || type === 'VLV' || type.startsWith('INST'));
}

export function collectXmlCiiWeightIdentityRows(xmlText) {
  if (typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(String(xmlText ?? ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return [];
  const rows = [];
  [...document.getElementsByTagName('Branch')].forEach((branch, branchIndex) => {
    const branchName = childText(branch, 'Branchname');
    childrenByName(branch, 'Node').forEach((node, nodeIndex) => {
      const componentRefNo = childText(node, 'ComponentRefNo');
      const endpoint = childText(node, 'Endpoint');
      const position = childText(node, 'Position');
      const componentType = childText(node, 'ComponentType').toUpperCase();
      const nodeNumber = childText(node, 'NodeNumber');
      const fallbackId = [componentRefNo, endpoint, position, componentType].map(text).filter(Boolean).join('|');
      const legacyKey = Number(nodeNumber) > 0
        ? `${branchName}::${nodeNumber}`
        : `${branchName}::${fallbackId || nodeNumber}`;
      const row = {
        key: legacyKey,
        legacyKey,
        branchName,
        branchIndex,
        nodeIndex,
        nodeOrdinal: nodeIndex + 1,
        nodeNumber,
        nodeName: childText(node, 'NodeName'),
        endpoint,
        rigid: childText(node, 'Rigid'),
        componentType,
        componentRefNo,
        connectionType: childText(node, 'ConnectionType'),
        position,
      };
      if (reviewEligible(row)) rows.push(row);
    });
  });
  return rows;
}

export function materializeXmlCiiLegacyWeightCompatibility(config, xmlText, options = {}) {
  const source = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const out = { ...source, overrides: source.overrides && typeof source.overrides === 'object' ? { ...source.overrides } : {} };
  const effective = out.overrides.rigidWeight && typeof out.overrides.rigidWeight === 'object' && !Array.isArray(out.overrides.rigidWeight)
    ? { ...out.overrides.rigidWeight }
    : {};
  const rows = collectXmlCiiWeightIdentityRows(xmlText);
  const decorated = decorateXmlCiiWeightReviewRows(rows, { ...options, config: out, sourceText: xmlText });
  const legacy = {};
  const materialized = [];
  for (const row of dedupeXmlCiiPhysicalWeightRows(decorated)) {
    const resolved = resolveXmlCiiWeightDecision(effective, row, { ...options, config: out, sourceText: xmlText });
    if (resolved.weight === null) continue;
    for (const key of row.legacyKeys || []) {
      if (!key || isXmlCiiPhysicalWeightDecisionKey(key)) continue;
      legacy[key] = resolved.weight;
    }
    materialized.push({ decisionKey: row.decisionKey, legacyKey: row.legacyKey, weight: resolved.weight, sourceKey: resolved.key, legacyKeys: row.legacyKeys || [] });
  }
  out.overrides.rigidWeightPhysical = effective;
  out.overrides.rigidWeight = legacy;
  out.weightReviewLifecycle = {
    ...(out.weightReviewLifecycle && typeof out.weightReviewLifecycle === 'object' ? out.weightReviewLifecycle : {}),
    compatibilityMaterializationCount: materialized.length,
    compatibilityMaterialization: materialized,
  };
  return out;
}
