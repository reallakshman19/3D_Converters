const SPLIT_WEIGHT_COMPONENT_TYPES = new Set(['FLAN', 'RIGID']);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function childrenByName(parent, name) {
  return [...(parent?.childNodes || [])].filter((node) => node.nodeType === 1 && localName(node) === name);
}

function firstChild(parent, name) {
  return childrenByName(parent, name)[0] || null;
}

function childText(parent, name) {
  return text(firstChild(parent, name)?.textContent);
}

function setChildText(document, parent, name, value) {
  let child = firstChild(parent, name);
  if (!child) {
    child = parent?.namespaceURI ? document.createElementNS(parent.namespaceURI, name) : document.createElement(name);
    parent.appendChild(child);
  }
  const before = text(child.textContent);
  const after = text(value);
  child.textContent = after;
  return before !== after;
}

function numeric(value) {
  const cleaned = text(value).replace(/,/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function normalizeRef(value) {
  return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}

function branchNameForNode(node) {
  let current = node?.parentNode || null;
  while (current) {
    if (current.nodeType === 1 && localName(current) === 'Branch') return childText(current, 'Branchname');
    current = current.parentNode || null;
  }
  return '';
}

function nodeRecord(node, sourceIndex = 0) {
  return {
    node,
    sourceIndex,
    branchName: branchNameForNode(node),
    nodeNumber: childText(node, 'NodeNumber'),
    endpoint: childText(node, 'Endpoint'),
    rigid: childText(node, 'Rigid'),
    componentType: childText(node, 'ComponentType').toUpperCase(),
    componentRefNo: childText(node, 'ComponentRefNo'),
    ref: normalizeRef(childText(node, 'ComponentRefNo')),
    position: childText(node, 'Position'),
    weight: numeric(childText(node, 'Weight')),
  };
}

function isSplitRigidWeightGroup(group) {
  if (!Array.isArray(group) || group.length < 2) return false;
  if (!group[0]?.ref) return false;
  const types = group.map((item) => item.componentType).filter(Boolean);
  if (!types.length) return false;
  if (!types.some((type) => SPLIT_WEIGHT_COMPONENT_TYPES.has(type))) return false;
  return types.every((type) => SPLIT_WEIGHT_COMPONENT_TYPES.has(type));
}

function positiveRows(group) {
  return group.filter((item) => Number.isFinite(Number(item.weight)) && Number(item.weight) > 0);
}

function uniquePositiveWeights(group) {
  const values = [];
  for (const item of positiveRows(group)) {
    const weight = Number(item.weight);
    if (!values.some((existing) => Math.abs(existing - weight) <= 1e-9)) values.push(weight);
  }
  return values;
}

function physicalComponentKey(item) {
  return `${item.branchName}::${item.ref}`;
}

function ownershipScore(item) {
  let score = 0;
  if (Number(item.rigid) === 2) score += 100;
  if (String(item.endpoint).trim() === '2') score += 50;
  if (item.componentType === 'RIGID') score += 20;
  if (Number(item.nodeNumber) > 0) score += 5;
  return score;
}

function deterministicOwner(group) {
  return [...group].sort((left, right) => {
    const score = ownershipScore(right) - ownershipScore(left);
    if (score) return score;
    return Number(right.sourceIndex || 0) - Number(left.sourceIndex || 0);
  })[0] || null;
}

export function buildXmlCiiSplitRigidWeightConservation(group) {
  const rows = Array.isArray(group) ? group : [];
  const positives = positiveRows(rows);
  const weights = uniquePositiveWeights(rows);
  const childMassSumKg = positives.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (!isSplitRigidWeightGroup(rows)) return { status: 'not-applicable', weights, positives, owner: null, selectedPhysicalMassKg: null, childMassSumKg, corrections: [] };
  if (!positives.length) return { status: 'unresolved-zero-mass', weights, positives, owner: deterministicOwner(rows), selectedPhysicalMassKg: null, childMassSumKg: 0, corrections: [] };
  if (weights.length > 1) return { status: 'review-required-different-positive-masses', weights, positives, owner: null, selectedPhysicalMassKg: null, childMassSumKg, corrections: [] };

  const selectedPhysicalMassKg = weights[0];
  if (positives.length === 1) {
    return { status: 'conserved-single-owner', weights, positives, owner: positives[0], selectedPhysicalMassKg, childMassSumKg, corrections: [] };
  }

  // Multiple siblings carrying the same full mass are a legacy propagation
  // signature. Preserve that mass exactly once on the deterministic CII owner
  // and zero only the duplicate copies. No new allocation basis is invented.
  const owner = deterministicOwner(positives);
  const corrections = positives
    .filter((item) => item !== owner)
    .map((item) => ({ item, fromWeightKg: Number(item.weight), toWeightKg: 0 }));
  return {
    status: 'legacy-duplicate-copies-collapsed',
    weights,
    positives,
    owner,
    selectedPhysicalMassKg,
    childMassSumKg,
    correctedChildMassSumKg: selectedPhysicalMassKg,
    corrections,
  };
}

export function applyXmlCiiSplitRigidWeightPropagation(xmlText, options = {}) {
  const empty = {
    xmlText,
    appliedCount: 0,
    appliedRows: [],
    diagnostics: [],
    conservation: [],
    stats: {
      splitRigidWeightPropagationGroups: 0,
      splitRigidWeightPropagated: 0,
      splitRigidWeightDuplicateCopiesCollapsed: 0,
      splitRigidWeightConservedGroups: 0,
      splitRigidWeightReviewRequired: 0,
      splitRigidWeightPropagationSkipped: 0,
    },
  };
  if (!text(xmlText) || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return empty;

  let document = null;
  try {
    document = new DOMParser().parseFromString(text(xmlText), 'application/xml');
    if (document.getElementsByTagName('parsererror').length) return empty;
  } catch {
    return empty;
  }

  const groups = new Map();
  [...document.getElementsByTagName('Node')].forEach((node, sourceIndex) => {
    const record = nodeRecord(node, sourceIndex);
    if (!record.ref) return;
    const key = physicalComponentKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const appliedRows = [];
  const diagnostics = [];
  const conservation = [];
  let candidateGroups = 0;
  let duplicateCopiesCollapsed = 0;
  let conservedGroups = 0;
  let reviewRequired = 0;
  let skipped = 0;

  for (const group of groups.values()) {
    if (!isSplitRigidWeightGroup(group)) continue;
    candidateGroups += 1;
    const ledger = buildXmlCiiSplitRigidWeightConservation(group);
    const componentRefNo = group[0]?.componentRefNo || '';
    const branchName = group[0]?.branchName || '';
    const record = {
      physicalComponentGroupId: physicalComponentKey(group[0]),
      branchName,
      componentRefNo,
      status: ledger.status,
      selectedPhysicalMassKg: ledger.selectedPhysicalMassKg,
      childMassSumKg: ledger.childMassSumKg,
      correctedChildMassSumKg: ledger.correctedChildMassSumKg ?? ledger.childMassSumKg,
      ownerNodeNumber: ledger.owner?.nodeNumber || '',
      ownerEndpoint: ledger.owner?.endpoint || '',
      positiveChildCount: ledger.positives.length,
      positiveWeightsKg: ledger.weights,
    };
    conservation.push(record);

    if (ledger.status === 'conserved-single-owner') {
      conservedGroups += 1;
      diagnostics.push({ type: 'split-rigid-weight-conservation-preserved', ...record, message: `Physical component ${componentRefNo} retains ${ledger.selectedPhysicalMassKg} kg on one child; zero siblings remain zero.` });
      continue;
    }
    if (ledger.status === 'legacy-duplicate-copies-collapsed') {
      conservedGroups += 1;
      duplicateCopiesCollapsed += ledger.corrections.length;
      for (const correction of ledger.corrections) {
        if (!setChildText(document, correction.item.node, 'Weight', '0')) continue;
        const row = {
          type: 'split-rigid-weight-duplicate-copy-removed',
          branchName: correction.item.branchName,
          nodeNumber: correction.item.nodeNumber,
          endpoint: correction.item.endpoint,
          rigid: correction.item.rigid,
          componentType: correction.item.componentType,
          componentRefNo: correction.item.componentRefNo,
          position: correction.item.position,
          previousWeightKg: correction.fromWeightKg,
          weightKg: 0,
          ownerNodeNumber: ledger.owner?.nodeNumber || '',
          physicalComponentMassKg: ledger.selectedPhysicalMassKg,
          method: 'same-component-ref-conservation-collapse',
          message: `Removed duplicate ${correction.fromWeightKg} kg copy from split child; physical component mass ${ledger.selectedPhysicalMassKg} kg remains once on owner node ${ledger.owner?.nodeNumber || ''}.`,
        };
        appliedRows.push(row);
        diagnostics.push(row);
      }
      continue;
    }
    if (ledger.status === 'review-required-different-positive-masses') {
      reviewRequired += 1;
      diagnostics.push({ type: 'split-rigid-weight-review-required', ...record, reason: 'different-positive-sibling-masses', message: `Split physical component ${componentRefNo} has different positive child masses (${ledger.weights.join(', ')} kg); no allocation was guessed.` });
      continue;
    }
    skipped += 1;
  }

  const stats = {
    splitRigidWeightPropagationGroups: candidateGroups,
    splitRigidWeightPropagated: 0,
    splitRigidWeightDuplicateCopiesCollapsed: duplicateCopiesCollapsed,
    splitRigidWeightConservedGroups: conservedGroups,
    splitRigidWeightReviewRequired: reviewRequired,
    splitRigidWeightPropagationSkipped: skipped,
  };

  diagnostics.push({
    type: 'split-rigid-weight-conservation-summary',
    groups: candidateGroups,
    conservedGroups,
    duplicateCopiesCollapsed,
    reviewRequired,
    skipped,
    message: `Split rigid/flange conservation completed: ${conservedGroups} group(s) conserved, ${duplicateCopiesCollapsed} duplicate child mass copy/copies removed, ${reviewRequired} group(s) require review. Full physical mass is never copied to zero siblings.`,
  });

  return {
    xmlText: appliedRows.length ? new XMLSerializer().serializeToString(document) : xmlText,
    appliedCount: appliedRows.length,
    appliedRows,
    diagnostics,
    conservation,
    stats,
  };
}
