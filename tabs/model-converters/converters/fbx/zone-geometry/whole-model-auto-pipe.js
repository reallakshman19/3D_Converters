// Runs the existing per-zone auto-pipe classification across every preview
// zone and merges admitted StagedJSON with deterministic zone namespacing.
import { analyseFbxZoneGeometry } from './analyse-zone.js';
import { listFbxSourceGraphPreviewZones } from '../../../fbx-source-graph-preview.js';
import { UNOWNED_ZONE_ID } from './zone-scope.js';
import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';

const DEFAULT_CONCURRENCY = 4;
const MAX_ZONE_COUNT = 20000;

function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

function validatedZoneIds(sourceGraph, zoneIds) {
  const raw = Array.isArray(zoneIds)
    ? zoneIds
    : listFbxSourceGraphPreviewZones(sourceGraph).map((zone) => zone.zoneId);
  const ids = raw.filter((zoneId) => zoneId !== UNOWNED_ZONE_ID).map((zoneId) => String(zoneId || '').trim());
  if (ids.some((zoneId) => !zoneId)) throw new Error('BLOCKED_WHOLE_MODEL_AUTO_PIPE empty zone identity.');
  if (ids.length > MAX_ZONE_COUNT) throw new Error(`BLOCKED_WHOLE_MODEL_AUTO_PIPE zone count exceeds ${MAX_ZONE_COUNT}.`);
  if (new Set(ids).size !== ids.length) throw new Error('BLOCKED_WHOLE_MODEL_AUTO_PIPE duplicate zone identity.');
  return ids.sort(compareText);
}

function validatedBranches(value) {
  if (!Array.isArray(value)) throw new Error('STAGEDJSON_PASS payload must be an array.');
  for (const [index, branch] of value.entries()) {
    if (!branch || typeof branch !== 'object' || Array.isArray(branch) || branch.type !== 'BRANCH') {
      throw new Error(`STAGEDJSON_PASS branch ${index} is malformed.`);
    }
  }
  return value;
}

async function analyseOneZone(analyse, sourceGraph, geometryBundle, zoneId) {
  try {
    const result = await analyse({ sourceGraph, geometryBundle, zoneId });
    const status = result?.autoPipe?.status || 'UNKNOWN';
    const branches = status === 'STAGEDJSON_PASS'
      ? validatedBranches(JSON.parse(result.autoPipe.stagedJsonText))
      : [];
    return { zoneId, status, branches, admittedPipes: result?.counts?.admittedPipes || 0, error: null };
  } catch (error) {
    return { zoneId, status: 'ERROR', branches: [], admittedPipes: 0, error: error?.message || String(error) };
  }
}

async function mapBounded(values, concurrency, worker) {
  const limit = Math.max(1, Math.min(Number.isSafeInteger(concurrency) ? concurrency : DEFAULT_CONCURRENCY, values.length || 1));
  const results = new Array(values.length);
  let cursor = 0;
  async function runWorker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, runWorker));
  return results;
}

function rewriteCrefs(value, references) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => rewriteCrefs(item, references));
    return;
  }
  if (typeof value.CREF === 'string' && references.has(value.CREF)) value.CREF = references.get(value.CREF);
  Object.values(value).forEach((item) => rewriteCrefs(item, references));
}

async function namespaceZoneBranches(zone) {
  const namespace = (await sha256Hex(canonicalJson({ zoneId: zone.zoneId }))).slice(0, 12);
  const references = new Map();
  const branches = zone.branches.map((input, index) => {
    const branch = structuredClone(input);
    const oldId = String(branch.id || branch.attributes?.REF || '');
    const oldName = String(branch.name || '');
    const suffix = String(index + 1).padStart(4, '0');
    const id = `FBX-ZONE-${namespace}-BRANCH-${suffix}`;
    const name = `FBX Zone ${namespace} Branch ${index + 1}`;
    if (oldId) references.set(oldId, id);
    if (oldName) references.set(oldName, name);
    branch.id = id;
    branch.name = name;
    branch.attributes = {
      ...(branch.attributes || {}), REF: id, sourceZoneId: zone.zoneId,
      sourceBranchId: oldId || null, sourceBranchName: oldName || null,
    };
    return branch;
  });
  branches.forEach((branch) => rewriteCrefs(branch, references));
  return branches;
}

function identityReport(branches) {
  const identities = new Map(), duplicates = new Set();
  const branchReferences = new Set(), unresolvedCrefs = new Set();
  function record(value, label) {
    const text = String(value || '');
    if (!text) { duplicates.add(`<missing:${label}>`); return; }
    if (identities.has(text)) duplicates.add(text); else identities.set(text, label);
  }
  function scan(node, label) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((item, index) => scan(item, `${label}[${index}]`)); return; }
    if (node.type === 'BRANCH') {
      const id = String(node.id || ''), ref = String(node.attributes?.REF || '');
      if (id && ref && id !== ref) duplicates.add(`MISMATCH:${id}:${ref}`);
      record(id || ref, `${label}.identity`);
      if (id) branchReferences.add(id); if (ref) branchReferences.add(ref);
      if (typeof node.name === 'string' && node.name) branchReferences.add(node.name);
    } else if (typeof node.id === 'string' || typeof node.attributes?.REF === 'string') {
      const id = String(node.id || ''), ref = String(node.attributes?.REF || '');
      if (id && ref && id !== ref) duplicates.add(`MISMATCH:${id}:${ref}`);
      record(id || ref, `${label}.identity`);
    }
    Object.values(node).forEach((item) => scan(item, label));
  }
  branches.forEach((branch, index) => scan(branch, `branch[${index}]`));
  function scanCrefs(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(scanCrefs); return; }
    if (typeof node.CREF === 'string' && !branchReferences.has(node.CREF)) unresolvedCrefs.add(node.CREF);
    Object.values(node).forEach(scanCrefs);
  }
  branches.forEach(scanCrefs);
  return { duplicateIdentifiers: [...duplicates].sort(compareText), unresolvedCrefs: [...unresolvedCrefs].sort(compareText) };
}

async function mergeBranches(zoneResults) {
  const merged = [];
  for (const zone of zoneResults) {
    if (zone.status === 'STAGEDJSON_PASS') merged.push(...await namespaceZoneBranches(zone));
  }
  return { merged, ...identityReport(merged) };
}

export async function runFbxWholeModelAutoPipe({
  sourceGraph, geometryBundle, zoneIds, analyse = analyseFbxZoneGeometry,
  concurrency = DEFAULT_CONCURRENCY,
} = {}) {
  let ids;
  try { ids = validatedZoneIds(sourceGraph, zoneIds); }
  catch (error) {
    return { conversionStatus: 'BLOCKED_WHOLE_MODEL_AUTO_PIPE', stagedJsonText: null,
      zoneReports: [], duplicateIdentifiers: [], unresolvedCrefs: [],
      blockingReasons: [error?.message || String(error)],
      counts: { totalZones: 0, passedZones: 0, blockedZones: 0, errorZones: 0, branches: 0 } };
  }
  const zoneResults = await mapBounded(ids, concurrency, (zoneId) => analyseOneZone(analyse, sourceGraph, geometryBundle, zoneId));
  const { merged, duplicateIdentifiers, unresolvedCrefs } = await mergeBranches(zoneResults);
  const passedZones = zoneResults.filter((zone) => zone.status === 'STAGEDJSON_PASS').length;
  const errorZones = zoneResults.filter((zone) => zone.status === 'ERROR').length;
  const blockedZones = ids.length - passedZones - errorZones;
  const identityBlocked = duplicateIdentifiers.length > 0 || unresolvedCrefs.length > 0;
  const conversionStatus = !merged.length || identityBlocked
    ? 'BLOCKED_WHOLE_MODEL_AUTO_PIPE'
    : passedZones === ids.length ? 'STAGEDJSON_PASS' : 'STAGEDJSON_PARTIAL_PASS';
  const blockingReasons = [
    ...(duplicateIdentifiers.length ? [`DUPLICATE_IDENTIFIERS:${duplicateIdentifiers.join(',')}`] : []),
    ...(unresolvedCrefs.length ? [`UNRESOLVED_CREFS:${unresolvedCrefs.join(',')}`] : []),
  ];
  return { conversionStatus,
    stagedJsonText: conversionStatus === 'BLOCKED_WHOLE_MODEL_AUTO_PIPE' ? null : canonicalJson(merged),
    zoneReports: zoneResults.map(({ zoneId, status, admittedPipes, error }) => ({ zoneId, status, admittedPipes, error })),
    duplicateIdentifiers, unresolvedCrefs, blockingReasons,
    counts: { totalZones: ids.length, passedZones, blockedZones, errorZones, branches: merged.length } };
}
