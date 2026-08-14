import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTROLLED_EI_SOURCE,
  VIBRATION_STAGE5C_NON_TABLE_TARGETS,
  VIBRATION_STAGE5C_TABLE_TARGETS,
} from './vibration-stage5c-targets.mjs';

export const VIBRATION_MASTER_SOURCE_INVENTORY_SCHEMA = 'VibrationMasterSourceInventory.v1';
export const SBC_SOURCE_INVENTORY_SCOPE = 'EI_AVIFF.T3.SBC';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(SCRIPT_PATH));
const DEFAULT_OUTPUT = resolve(ROOT, 'ValidationRecords/VibrationMasters/source-inventory-v1.json');
const SBC_PREFIX = 'EI_AVIFF.T3.SBC.';

const VERIFIED_GIT_OBJECT = Object.freeze({
  status: 'PASS',
  observation: 'SOURCE_INSPECTION',
  oracle: 'AUTHORITATIVE_REFERENCE',
  commitTreeSha: '531f2d08efbd07d20b38a943d8c0e09618499e01',
  observedGitBlobSha1: 'sha1:9d3eccc56429411e17c07a579bdebbd13cb0bdc5',
  observedSizeBytes: 10_348_594,
  statement: 'Pinned Common commit tree contains the exact controlled EI PDF path, blob and byte size.',
});

const AUTHORITY = Object.freeze({
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  masterValuesPublished: false,
});

function unresolvedLocator() {
  return {
    status: 'REVIEW_REQUIRED',
    printedPage: null,
    pdfPage: null,
    locator: null,
  };
}

function pendingExecution(path, reason) {
  return {
    recoveryPath: path,
    status: 'NOT_RUN',
    reason,
  };
}

function sourceBinding() {
  return {
    repository: CONTROLLED_EI_SOURCE.repository,
    commit: CONTROLLED_EI_SOURCE.commit,
    path: CONTROLLED_EI_SOURCE.path,
    gitBlobSha1: CONTROLLED_EI_SOURCE.gitBlobSha1,
    sizeBytes: CONTROLLED_EI_SOURCE.sizeBytes,
    gitObjectVerification: VERIFIED_GIT_OBJECT,
  };
}

function tableTargets() {
  return VIBRATION_STAGE5C_TABLE_TARGETS
    .filter(({ masterId }) => masterId.startsWith(SBC_PREFIX))
    .map((target) => ({
      masterId: target.masterId,
      mechanismId: target.mechanismId,
      dataType: 'TABLE',
      sourceKind: target.sourceKind,
      sourceState: 'SOURCE_PINNED',
      sourceLocator: unresolvedLocator(),
      execution: pendingExecution(
        'DOCUMENT_EVIDENCE_V2',
        'Explicit reviewer pages, locator and candidate selection are required before /v2/tables/extract.',
      ),
      reconciliation: { status: 'NOT_RUN' },
      publicationState: 'BLOCKED',
      authority: AUTHORITY,
    }));
}

function ruleTargets() {
  return VIBRATION_STAGE5C_NON_TABLE_TARGETS
    .filter(({ masterId }) => masterId.startsWith(SBC_PREFIX))
    .map((target) => ({
      masterId: target.masterId,
      mechanismId: target.mechanismId,
      dataType: 'RULE',
      sourceKind: 'NON_TABLE_RULE',
      sourceState: 'SOURCE_PINNED',
      sourceLocator: unresolvedLocator(),
      execution: pendingExecution(
        'NON_TABLE_RULE_RECONCILIATION',
        'Geometry/location score rules are outside the DocumentEvidence table extraction path.',
      ),
      reconciliation: { status: 'NOT_RUN' },
      publicationState: 'BLOCKED',
      authority: AUTHORITY,
    }));
}

function curveTargets() {
  return [1, 2, 3, 4].map((number) => ({
    masterId: `EI_AVIFF.T3.SBC.FIGURE_T3_${number}.v1`,
    mechanismId: 'smallBoreConnections',
    dataType: 'CURVE',
    sourceKind: 'FIGURE',
    sourceState: 'SOURCE_PINNED',
    sourceLocator: unresolvedLocator(),
    execution: pendingExecution(
      'CURVE_DIGITIZATION_INDEPENDENT_REVIEW',
      'Figure recovery requires deterministic rendering, independent digitization passes and reconciliation.',
    ),
    reconciliation: { status: 'NOT_RUN' },
    publicationState: 'BLOCKED',
    authority: AUTHORITY,
  }));
}

function counts(targets) {
  const byType = Object.fromEntries(['TABLE', 'RULE', 'CURVE'].map((type) => [
    type,
    targets.filter((target) => target.dataType === type).length,
  ]));
  return { total: targets.length, byType };
}

export function buildSbcVibrationMasterSourceInventory() {
  const targets = [...tableTargets(), ...ruleTargets(), ...curveTargets()];
  return {
    schema: VIBRATION_MASTER_SOURCE_INVENTORY_SCHEMA,
    issue: 450,
    scope: SBC_SOURCE_INVENTORY_SCOPE,
    source: sourceBinding(),
    documentEvidence: {
      discoveryEndpoint: '/v2/tables/discover',
      extractionEndpoint: '/v2/tables/extract',
      selectionPolicy: 'EXPLICIT_REVIEWER_PAGE_LOCATOR_CANDIDATE_SELECTION',
      noPageDefaults: true,
    },
    counts: counts(targets),
    targets,
    programState: {
      sourceIdentity: 'PASS',
      documentEvidenceExecution: 'NOT_RUN',
      sourceLocatorReconciliation: 'REVIEW_REQUIRED',
      masterPublication: 'BLOCKED',
    },
    authority: AUTHORITY,
  };
}

export function serializeSbcVibrationMasterSourceInventory() {
  return `${JSON.stringify(buildSbcVibrationMasterSourceInventory(), null, 2)}\n`;
}

export async function writeSbcVibrationMasterSourceInventory(outputPath = DEFAULT_OUTPUT) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serializeSbcVibrationMasterSourceInventory(), 'utf8');
  return outputPath;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === resolve(SCRIPT_PATH)) {
  const output = await writeSbcVibrationMasterSourceInventory(process.argv[2] || DEFAULT_OUTPUT);
  console.log(`[vibration-master-source-inventory] wrote ${output}`);
}
