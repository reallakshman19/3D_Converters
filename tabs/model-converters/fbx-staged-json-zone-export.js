// Filter an authorized FBX StagedJSON result by an explicit preview zone.
// Only complete branches are admitted; cross-zone mapped branches fail closed.
import { buildFbxSourceGraphZoneExport } from './fbx-source-graph-zone-export.js';

function fail(message) {
  throw new Error(`BLOCKED_ZONE_STAGEDJSON ${message}`);
}

function requireBranches(value) {
  if (!Array.isArray(value)) fail('StagedJSON root must be an array.');
  return value;
}

function selectedOccurrenceIds(graph, zoneId) {
  const subset = buildFbxSourceGraphZoneExport(graph, zoneId);
  return new Set(subset.occurrences.map((item) => item.sourceOccurrenceId));
}

function childOccurrenceId(child) {
  return String(child?.attributes?.sourceOccurrenceId || '');
}

function selectedBranches(branches, occurrenceIds) {
  const selected = [];
  for (const branch of branches) {
    if (branch?.type !== 'BRANCH' || !Array.isArray(branch.children)) {
      fail('Every StagedJSON record must be a BRANCH with children.');
    }
    const membership = branch.children.map((child) => occurrenceIds.has(childOccurrenceId(child)));
    const count = membership.filter(Boolean).length;
    if (!count) continue;
    if (count !== branch.children.length) {
      fail(`branch ${branch.id || branch.name || '<unnamed>'} crosses the selected zone boundary.`);
    }
    selected.push(structuredClone(branch));
  }
  if (!selected.length) fail('The selected zone has no authorized mapped StagedJSON branches.');
  return selected;
}

function selectedIdentitySets(branches) {
  const mappingEntryIds = new Set(), componentRefs = new Set(), branchRefs = new Set();
  for (const branch of branches) {
    branchRefs.add(String(branch.id || ''));
    branchRefs.add(String(branch.name || ''));
    branchRefs.add(String(branch.attributes?.REF || ''));
    for (const child of branch.children) {
      mappingEntryIds.add(String(child.attributes?.mappingEntryId || ''));
      componentRefs.add(String(child.id || ''));
      componentRefs.add(String(child.name || ''));
      componentRefs.add(String(child.attributes?.REF || ''));
      componentRefs.add(String(child.attributes?.logicalComponentId || ''));
    }
  }
  mappingEntryIds.delete('');
  componentRefs.delete('');
  branchRefs.delete('');
  return { mappingEntryIds, componentRefs, branchRefs };
}

function endpointEntryId(value) {
  const text = String(value || '');
  const split = text.lastIndexOf(':');
  return split < 0 ? text : text.slice(0, split);
}

function internalLink(link, mappingEntryIds) {
  return Array.isArray(link) && link.length === 2
    && link.every((endpoint) => mappingEntryIds.has(endpointEntryId(endpoint)));
}

function sanitizePort(port, mappingEntryIds) {
  if (!port || typeof port !== 'object') return;
  if (Array.isArray(port.connections)) {
    port.connections = port.connections.filter((item) => (
      mappingEntryIds.has(String(item?.mappingEntryId || ''))
    ));
  }
}

function sanitizeChild(child, identities) {
  const attributes = child.attributes;
  if (!attributes || typeof attributes !== 'object') return;
  if (attributes.CREF && !identities.branchRefs.has(String(attributes.CREF))) delete attributes.CREF;
  if (Array.isArray(attributes.explicitConnectivity)) {
    attributes.explicitConnectivity = attributes.explicitConnectivity.filter((link) => (
      internalLink(link, identities.mappingEntryIds)
    ));
  }
  for (const port of Object.values(attributes.ports || {})) {
    sanitizePort(port, identities.mappingEntryIds);
  }
}

function sanitizeBranch(branch, identities) {
  const attributes = branch.attributes;
  if (attributes && typeof attributes === 'object') {
    for (const key of ['HREF', 'TREF']) {
      if (attributes[key] && !identities.componentRefs.has(String(attributes[key]))) delete attributes[key];
    }
  }
  branch.children.forEach((child) => sanitizeChild(child, identities));
  return branch;
}

export function buildFbxStagedJsonZoneExport(graph, stagedJson, zoneId) {
  const occurrenceIds = selectedOccurrenceIds(graph, zoneId);
  const branches = selectedBranches(requireBranches(stagedJson), occurrenceIds);
  const identities = selectedIdentitySets(branches);
  return branches.map((branch) => sanitizeBranch(branch, identities));
}
