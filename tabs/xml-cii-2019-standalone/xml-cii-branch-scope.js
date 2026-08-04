const BRANCH_SUFFIX = /\/B\d+$/i;

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalize(value) {
  return text(value).toUpperCase();
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function elementChildren(parent) {
  return [...(parent?.childNodes || parent?.children || [])]
    .filter((node) => node?.nodeType === undefined || node.nodeType === 1);
}

function childText(parent, name) {
  const child = elementChildren(parent).find((node) => localName(node).toUpperCase() === name.toUpperCase());
  return text(child?.textContent);
}

export function xmlCiiBranchGroupName(branchName) {
  return text(branchName).replace(BRANCH_SUFFIX, '');
}

export function xmlCiiSourceDigest(value) {
  const source = String(value ?? '');
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}-${source.length}`;
}

function branchRecordsFromDom(source) {
  if (typeof DOMParser === 'undefined') return [];
  try {
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector?.('parsererror') || document.getElementsByTagName?.('parsererror')?.length) return [];
    return [...document.getElementsByTagName('Branch')]
      .map((branch, index) => ({ branchName: childText(branch, 'Branchname'), index }))
      .filter((row) => row.branchName);
  } catch {
    return [];
  }
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function branchRecordsFromText(source) {
  const rows = [];
  const pattern = /<\s*(?:[A-Za-z_][\w.-]*:)?Branch\b[^>]*>[\s\S]*?<\s*\/\s*(?:[A-Za-z_][\w.-]*:)?Branch\s*>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const name = match[0].match(/<\s*(?:[A-Za-z_][\w.-]*:)?Branchname\b[^>]*>([\s\S]*?)<\s*\/\s*(?:[A-Za-z_][\w.-]*:)?Branchname\s*>/i)?.[1] || '';
    const branchName = decodeXml(name).trim();
    if (branchName) rows.push({ branchName, index: rows.length });
  }
  return rows;
}

export function extractXmlCiiBranchRecords(sourceText) {
  const source = String(sourceText ?? '');
  const records = branchRecordsFromDom(source);
  return records.length ? records : branchRecordsFromText(source);
}

export function buildXmlCiiBranchGroups(branchNames = []) {
  const groups = new Map();
  for (const branchName of branchNames.map(text).filter(Boolean)) {
    const groupName = xmlCiiBranchGroupName(branchName);
    if (!groups.has(groupName)) groups.set(groupName, { groupName, branchNames: [] });
    groups.get(groupName).branchNames.push(branchName);
  }
  return [...groups.values()];
}

function orderedSelection(sourceBranches, selectedBranchNames) {
  const selected = new Set((Array.isArray(selectedBranchNames) ? selectedBranchNames : []).map(normalize));
  return sourceBranches.filter((name) => selected.has(normalize(name)));
}

function selectedRoots(branchNames) {
  return new Set(branchNames.map((name) => normalize(xmlCiiBranchGroupName(name))).filter(Boolean));
}

function branchCompatible(branchName, roots) {
  const normalized = normalize(branchName);
  const root = normalize(xmlCiiBranchGroupName(branchName));
  return roots.has(normalized) || roots.has(root);
}

function filterXmlWithDom(source, selectedSet) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return '';
  try {
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector?.('parsererror') || document.getElementsByTagName?.('parsererror')?.length) return '';
    for (const branch of [...document.getElementsByTagName('Branch')]) {
      if (!selectedSet.has(normalize(childText(branch, 'Branchname')))) branch.parentNode?.removeChild?.(branch);
    }
    return new XMLSerializer().serializeToString(document);
  } catch {
    return '';
  }
}

function filterXmlWithText(source, selectedSet) {
  const pattern = /<\s*(?:[A-Za-z_][\w.-]*:)?Branch\b[^>]*>[\s\S]*?<\s*\/\s*(?:[A-Za-z_][\w.-]*:)?Branch\s*>/gi;
  return source.replace(pattern, (block) => {
    const name = block.match(/<\s*(?:[A-Za-z_][\w.-]*:)?Branchname\b[^>]*>([\s\S]*?)<\s*\/\s*(?:[A-Za-z_][\w.-]*:)?Branchname\s*>/i)?.[1] || '';
    return selectedSet.has(normalize(decodeXml(name))) ? block : '';
  });
}

function filterStagedValue(value, roots) {
  if (Array.isArray(value)) return value.map((item) => filterStagedValue(item, roots)).filter((item) => item !== null);
  if (!value || typeof value !== 'object') return value;
  const type = normalize(value.type || value.TYPE || value.kind || value.KIND);
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const branchName = text(value.name || value.NAME || attrs.BRANCH || attrs.BRANCHNAME || attrs.LINE_ID);
  if (type === 'BRANCH' && branchName && !branchCompatible(branchName, roots)) return null;
  const out = { ...value };
  for (const key of ['children', 'items', 'branches']) {
    if (Array.isArray(value[key])) out[key] = filterStagedValue(value[key], roots);
  }
  return out;
}

export function filterXmlCiiStagedJsonByBranches(stagedJsonText, selectedBranchNames) {
  const source = text(stagedJsonText);
  if (!source) return '';
  try {
    const parsed = JSON.parse(source);
    return JSON.stringify(filterStagedValue(parsed, selectedRoots(selectedBranchNames)));
  } catch {
    return source;
  }
}

export function normalizeXmlCiiBranchSelection(sourceText, selection = {}) {
  const sourceBranches = extractXmlCiiBranchRecords(sourceText).map((row) => row.branchName);
  const sourceDigest = xmlCiiSourceDigest(sourceText);
  const sameSource = text(selection.sourceDigest) === sourceDigest;
  const selectedBranchNames = sameSource && Array.isArray(selection.selectedBranchNames)
    ? orderedSelection(sourceBranches, selection.selectedBranchNames)
    : [...sourceBranches];
  return {
    sourceDigest,
    selectedBranchNames,
    search: sameSource ? text(selection.search) : '',
    initialized: true,
  };
}

export function buildSelectedBranchScope({ sourceText = '', stagedJsonText = '', selectedBranchNames, sourceKind = 'xml' } = {}) {
  const source = String(sourceText ?? '');
  const sourceBranches = extractXmlCiiBranchRecords(source).map((row) => row.branchName);
  const applicable = sourceKind !== 'inputxml' && sourceBranches.length > 0;
  const selected = Array.isArray(selectedBranchNames)
    ? orderedSelection(sourceBranches, selectedBranchNames)
    : [...sourceBranches];
  const excluded = sourceBranches.filter((name) => !new Set(selected.map(normalize)).has(normalize(name)));
  const allSelected = selected.length === sourceBranches.length;
  const blocked = applicable && selected.length === 0;
  const selectedSet = new Set(selected.map(normalize));
  const filteredSourceText = !applicable || allSelected
    ? source
    : (blocked ? '' : (filterXmlWithDom(source, selectedSet) || filterXmlWithText(source, selectedSet)));
  const filteredStagedJsonText = !applicable || allSelected
    ? String(stagedJsonText ?? '')
    : (blocked ? '' : filterXmlCiiStagedJsonByBranches(stagedJsonText, selected));
  const groups = buildXmlCiiBranchGroups(sourceBranches);
  const selectedGroups = buildXmlCiiBranchGroups(selected);
  const mode = !applicable ? 'not-applicable' : (blocked ? 'empty-selection' : (allSelected ? 'all' : 'explicit-selection'));
  const manifest = {
    mode,
    sourceBranchCount: sourceBranches.length,
    selectedBranchCount: selected.length,
    excludedBranchCount: excluded.length,
    selectedGroupCount: selectedGroups.length,
    selectedBranches: selected,
    excludedBranches: excluded,
    sourceDigest: xmlCiiSourceDigest(source),
    selectionDigest: xmlCiiSourceDigest(selected.join('\n')),
  };
  return {
    ok: !blocked,
    blocked,
    applicable,
    mode,
    sourceBranches,
    selectedBranchNames: selected,
    excludedBranchNames: excluded,
    groups,
    selectedGroups,
    filteredSourceText,
    filteredStagedJsonText,
    manifest,
    diagnostics: [{
      type: 'branch-selection-scope',
      level: blocked ? 'error' : 'info',
      message: blocked
        ? 'No branches are selected for processing.'
        : `${selected.length} of ${sourceBranches.length} source branches selected for processing.`,
      ...manifest,
    }],
  };
}

export function xmlCiiBranchScopeFromState(state = {}) {
  const selection = normalizeXmlCiiBranchSelection(state.sourceText || '', state.branchSelection || {});
  return buildSelectedBranchScope({
    sourceText: state.sourceText || '',
    stagedJsonText: state.stagedJsonText || '',
    selectedBranchNames: selection.selectedBranchNames,
    sourceKind: state.sourceKind || 'auto',
  });
}