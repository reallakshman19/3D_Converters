import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { Worker as ThreadWorker } from 'node:worker_threads';
import { buildBranchFittingPortEvidence } from '../../tabs/model-converters/converters/fbx/fitting-kernels/branch-fitting/evidence.js';
import { buildElbowPortEvidence } from '../../tabs/model-converters/converters/fbx/fitting-kernels/elbow/evidence.js';
import { buildInlineAssemblyPortEvidence } from '../../tabs/model-converters/converters/fbx/fitting-kernels/inline-assembly/evidence.js';
import { buildReducerPortEvidence } from '../../tabs/model-converters/converters/fbx/fitting-kernels/reducer/evidence.js';
import { buildTeePortEvidence } from '../../tabs/model-converters/converters/fbx/fitting-kernels/tee/evidence.js';
import { parseFbxGeometryBundleInWorker } from '../../tabs/model-converters/converters/fbx/geometry-transport.js';
import { buildSelectedZoneComponentCrosswalk } from '../../tabs/model-converters/converters/fbx/parity/component-crosswalk.js';
import { parseFbxInWorker } from '../../tabs/model-converters/converters/fbx/parser-client.js';
import { analyseFbxZoneGeometry } from '../../tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js';
import { listFbxZoneScopeSummaries } from '../../tabs/model-converters/converters/fbx/zone-geometry/zone-scope.js';
import { inventoryFbx2ManagedStage } from './fbx2-small-benchmark/managed-inventory.mjs';
import {
  validateFbx2SmallBenchmarkPopulation,
  validateFbx2SmallBenchmarkSources,
} from './fbx2-small-benchmark/profile.mjs';
import {
  benchmarkCanonicalJson,
  benchmarkSha256,
  buildFbx2SmallBenchmarkReport,
} from './fbx2-small-benchmark/report.mjs';
import { reconcileFbx2SmallBenchmark } from './fbx2-small-benchmark/reconcile.mjs';
import { inventoryFbx2SelectedSource } from './fbx2-small-benchmark/source-inventory.mjs';

class NodeWorkerAdapter {
  constructor(url, options) {
    this.worker = new ThreadWorker(url, options);
    this._onmessage = null; this._onerror = null; this._onmessageerror = null;
    this.worker.on('message', (data) => this._onmessage?.({ data }));
    this.worker.on('error', (error) => this._onerror?.({ message: error.message, error }));
    this.worker.on('messageerror', (error) => this._onmessageerror?.({ error }));
  }
  set onmessage(value) { this._onmessage = value; }
  get onmessage() { return this._onmessage; }
  set onerror(value) { this._onerror = value; }
  get onerror() { return this._onerror; }
  set onmessageerror(value) { this._onmessageerror = value; }
  get onmessageerror() { return this._onmessageerror; }
  postMessage(value, transfer) { this.worker.postMessage(value, transfer); }
  terminate() { return this.worker.terminate(); }
}

globalThis.Worker = NodeWorkerAdapter;

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || fallback) : fallback;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function selectZone(zones, requestedLabel) {
  const exact = zones.find((item) => item.label === requestedLabel);
  if (exact) return exact;
  const folded = requestedLabel.toUpperCase();
  const matches = zones.filter((item) => item.label.toUpperCase().includes(folded));
  assert.equal(matches.length, 1,
    `Expected one selected zone matching ${requestedLabel}, found ${matches.length}.`);
  return matches[0];
}

function familyArtifacts(componentCrosswalk, solidFittingPortEvidence) {
  const input = { componentCrosswalk, solidFittingPortEvidence };
  return Promise.all([
    buildElbowPortEvidence(input),
    buildTeePortEvidence(input),
    buildReducerPortEvidence(input),
    buildBranchFittingPortEvidence(input),
    buildInlineAssemblyPortEvidence(input),
  ]).then(([elbowEvidence, teeEvidence, reducerEvidence,
    branchFittingEvidence, inlineAssemblyEvidence]) => ({
    elbowEvidence,
    teeEvidence,
    reducerEvidence,
    branchFittingEvidence,
    inlineAssemblyEvidence,
  }));
}

function packageSummary(zonePackageInputs, zonePackageError) {
  const root = zonePackageInputs?.qualificationRoot;
  if (!root) {
    return Object.freeze({
      status: 'BLOCKED',
      artifactId: null,
      rootDigest: null,
      checks: [],
      blockedChecks: ['ZONE_PACKAGE_INPUTS_UNAVAILABLE'],
      error: zonePackageError?.message || null,
    });
  }
  return Object.freeze({
    status: root.status,
    artifactId: root.artifactId,
    rootDigest: root.rootDigest,
    checks: Object.freeze(root.checks.map((item) => Object.freeze({
      code: item.code,
      status: item.status,
    }))),
    blockedChecks: Object.freeze(root.summary.blockedChecks),
    error: null,
  });
}

function runIdentities(sourceGraph, geometryBundle, analysis, familyEvidence, crosswalk) {
  const packageInputs = analysis.zonePackageInputs;
  return Object.freeze({
    sourceGraphDigest: benchmarkSha256(sourceGraph),
    geometryBundleDigest: geometryBundle.bundleDigest ?? benchmarkSha256(geometryBundle),
    zoneGeometryArtifactId: analysis.zoneGeometryEvidence.artifactId,
    autoPipeDigest: benchmarkSha256(analysis.autoPipe),
    componentCrosswalkArtifactId: crosswalk.artifactId,
    elbowArtifactId: familyEvidence.elbowEvidence.artifactId,
    teeArtifactId: familyEvidence.teeEvidence.artifactId,
    reducerArtifactId: familyEvidence.reducerEvidence.artifactId,
    branchFittingArtifactId: familyEvidence.branchFittingEvidence.artifactId,
    inlineAssemblyArtifactId: familyEvidence.inlineAssemblyEvidence.artifactId,
    supportEvidenceDigest: packageInputs?.supportEvidence?.evidenceDigest ?? null,
    supportHostEvidenceDigest: packageInputs?.supportHostAssociationEvidence?.evidenceDigest ?? null,
    supportAssemblyEvidenceDigest: packageInputs?.supportAssemblyEvidence?.evidenceDigest ?? null,
    qualificationRootDigest: packageInputs?.qualificationRoot?.rootDigest ?? null,
  });
}

async function parseBenchmarkSource(fbxBytes, zoneLabel) {
  const sourceGraph = await parseFbxInWorker(new Uint8Array(fbxBytes), { timeoutMs: 300000 });
  const geometryBundle = await parseFbxGeometryBundleInWorker(
    new Uint8Array(fbxBytes), { timeoutMs: 300000 });
  const targetZone = selectZone(listFbxZoneScopeSummaries(sourceGraph), zoneLabel);
  validateFbx2SmallBenchmarkPopulation({ sourceGraph, selectedZone: targetZone });
  const analysis = await analyseFbxZoneGeometry({
    sourceGraph, geometryBundle, zoneId: targetZone.zoneId, includeZonePackageInputs: true,
  });
  return { sourceGraph, geometryBundle, targetZone, analysis };
}

async function buildReferenceEvidence(sourceGraph, analysis, managedStage) {
  const componentCrosswalk = await buildSelectedZoneComponentCrosswalk({
    sourceGraph,
    zoneGeometryEvidence: analysis.zoneGeometryEvidence,
    stagedBranches: managedStage,
  });
  const familyEvidence = await familyArtifacts(
    componentCrosswalk, analysis.closedSolidPipeEvidence);
  return { componentCrosswalk, familyEvidence };
}

function buildBenchmarkInventories(sourceGraph, analysis, managedStage, evidence) {
  const packageInputs = analysis.zonePackageInputs;
  const managedInventory = inventoryFbx2ManagedStage(managedStage);
  const sourceInventory = inventoryFbx2SelectedSource({
    sourceGraph,
    zoneGeometryEvidence: analysis.zoneGeometryEvidence,
    autoPipe: analysis.autoPipe,
    solidFittingPortEvidence: analysis.closedSolidPipeEvidence,
    supportEvidence: packageInputs?.supportEvidence,
  });
  const reconciliation = reconcileFbx2SmallBenchmark({
    managedInventory,
    componentCrosswalk: evidence.componentCrosswalk,
    sourceInventory,
    autoPipe: analysis.autoPipe,
    familyEvidence: evidence.familyEvidence,
    supportEvidence: packageInputs?.supportEvidence,
    supportHostEvidence: packageInputs?.supportHostAssociationEvidence,
  });
  return { managedInventory, sourceInventory, reconciliation };
}

async function executeRun(fbxBytes, managedStage, zoneLabel) {
  const parsed = await parseBenchmarkSource(fbxBytes, zoneLabel);
  const evidence = await buildReferenceEvidence(
    parsed.sourceGraph, parsed.analysis, managedStage);
  const inventories = buildBenchmarkInventories(
    parsed.sourceGraph, parsed.analysis, managedStage, evidence);
  return Object.freeze({
    targetZone: parsed.targetZone,
    ...inventories,
    packageSummary: packageSummary(
      parsed.analysis.zonePackageInputs, parsed.analysis.zonePackageError),
    identities: runIdentities(parsed.sourceGraph, parsed.geometryBundle,
      parsed.analysis, evidence.familyEvidence, evidence.componentCrosswalk),
  });
}

function sourceIdentity(fbxPath, fbxBytes, archivePath, archiveBytes) {
  return Object.freeze({
    file: fbxPath,
    byteLength: fbxBytes.length,
    sha256: sha256(fbxBytes),
    archive: archivePath || null,
    archiveByteLength: archiveBytes?.length ?? null,
    archiveSha256: archiveBytes ? sha256(archiveBytes) : null,
  });
}

function managedIdentity(managedPath, managedBytes, archivePath, archiveBytes) {
  return Object.freeze({
    file: managedPath,
    byteLength: managedBytes.length,
    sha256: sha256(managedBytes),
    archive: archivePath || null,
    archiveByteLength: archiveBytes?.length ?? null,
    archiveSha256: archiveBytes ? sha256(archiveBytes) : null,
  });
}

function benchmarkArguments() {
  return {
    fbxPath: argument('--fbx'),
    managedPath: argument('--managed'),
    sourceArchivePath: argument('--input-zip'),
    managedArchivePath: argument('--output-zip'),
    zoneLabel: argument('--zone', '/GLRD-1000-CU-PI-P'),
    outputPath: argument('--output', 'artifacts/fbx2-small-benchmark.json'),
  };
}

async function loadBenchmarkInputs(args) {
  assert.ok(args.fbxPath && args.managedPath, '--fbx and --managed are required.');
  assert.ok(args.sourceArchivePath && args.managedArchivePath,
    '--input-zip and --output-zip are required for governed source binding.');
  const values = await Promise.all([
    readFile(args.fbxPath), readFile(args.managedPath),
    readFile(args.sourceArchivePath), readFile(args.managedArchivePath),
  ]);
  const [fbxBytes, managedBytes, sourceArchiveBytes, managedArchiveBytes] = values;
  const source = sourceIdentity(
    args.fbxPath, fbxBytes, args.sourceArchivePath, sourceArchiveBytes);
  const managed = managedIdentity(
    args.managedPath, managedBytes, args.managedArchivePath, managedArchiveBytes);
  validateFbx2SmallBenchmarkSources({
    sourceArchive: { byteLength: source.archiveByteLength, sha256: source.archiveSha256 },
    sourceFbx: { byteLength: source.byteLength, sha256: source.sha256 },
    managedArchive: { byteLength: managed.archiveByteLength, sha256: managed.archiveSha256 },
    managedJson: { byteLength: managed.byteLength, sha256: managed.sha256 },
  });
  return { fbxBytes, managedStage: JSON.parse(managedBytes.toString('utf8')), source, managed };
}

async function runBenchmark(args, input) {
  const runs = [
    await executeRun(input.fbxBytes, input.managedStage, args.zoneLabel),
    await executeRun(input.fbxBytes, input.managedStage, args.zoneLabel),
  ];
  assert.equal(runs[0].targetZone.zoneId, runs[1].targetZone.zoneId);
  return buildFbx2SmallBenchmarkReport({
    source: input.source,
    managedStage: input.managed,
    selectedZone: runs[0].targetZone,
    runs,
  });
}

async function main() {
  const args = benchmarkArguments();
  const input = await loadBenchmarkInputs(args);
  const report = await runBenchmark(args, input);
  await writeFile(args.outputPath, benchmarkCanonicalJson(report), 'utf8');
  console.log(JSON.stringify({
    status: report.status,
    coverage: report.coverage,
    parity: report.parity,
    comparison: report.comparison,
    outputPath: args.outputPath,
  }, null, 2));
}

await main();
