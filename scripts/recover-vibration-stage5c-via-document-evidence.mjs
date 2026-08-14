import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  discoverDocumentEvidenceTables,
  extractDocumentEvidenceTables,
} from './vibration-stage5c-document-evidence-client.mjs';
import {
  CONTROLLED_EI_SOURCE,
  VIBRATION_STAGE5C_TABLE_TARGETS,
  assertControlledEiSource,
  validateStage5cSelectionDocument,
} from './vibration-stage5c-targets.mjs';

export const VIBRATION_STAGE5C_DISCOVERY_SCHEMA = 'VibrationStage5cEvidenceDiscovery.v1';
export const VIBRATION_STAGE5C_RECOVERY_SCHEMA = 'VibrationStage5cEvidenceRecovery.v1';
export const VIBRATION_STAGE5C_DECISION_SCHEMA = 'VibrationStage5cSourceTargetDecision.v1';

export const VIBRATION_STAGE5C_AUTHORITY = Object.freeze({
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
});

const DECISION_STATES = new Set(['accepted', 'review_required', 'blocked', 'not_found']);
const STATE_RANK = Object.freeze({ accepted: 0, not_found: 1, review_required: 2, blocked: 3 });

function controlledSourcePath(value) {
  const path = value ?? CONTROLLED_EI_SOURCE.apiSourcePath;
  if (path !== CONTROLLED_EI_SOURCE.apiSourcePath) {
    throw new Error('VIBRATION_STAGE5C_CONTROLLED_SOURCE_PATH_MISMATCH');
  }
  return path;
}

function sourceBinding(source) {
  assertControlledEiSource(source);
  return {
    expectedRepository: CONTROLLED_EI_SOURCE.repository,
    expectedCommit: CONTROLLED_EI_SOURCE.commit,
    expectedPath: CONTROLLED_EI_SOURCE.path,
    expectedGitBlobSha1: CONTROLLED_EI_SOURCE.gitBlobSha1,
    expectedSizeBytes: CONTROLLED_EI_SOURCE.sizeBytes,
    runtimeSourceSha256: source.sha256,
    runtimeLogicalPath: source.logicalPath,
    runtimeSizeBytes: source.sizeBytes,
    gitBlobRuntimeRecomputed: false,
    bindingStatement: 'GIT_OBJECT_VERIFIED_SEPARATELY_RUNTIME_BOUND_BY_PATH_SIZE_AND_SOURCE_SHA256',
  };
}

export async function discoverVibrationStage5cEvidence(options = {}) {
  const sourcePath = controlledSourcePath(options.sourcePath);
  const result = await discoverDocumentEvidenceTables({
    baseUrl: options.baseUrl,
    sourcePath,
    fetchImpl: options.fetchImpl,
  });
  const binding = sourceBinding(result.source);
  return {
    schema: VIBRATION_STAGE5C_DISCOVERY_SCHEMA,
    source: result.source,
    sourceBinding: binding,
    candidates: result.candidates,
    diagnostics: result.diagnostics,
    supportedTableTargets: VIBRATION_STAGE5C_TABLE_TARGETS,
    selectionAuthority: 'EXPLICIT_REVIEWER_PAGE_AND_LOCATOR_SELECTION_REQUIRED',
    masterValuesPublished: false,
    authority: VIBRATION_STAGE5C_AUTHORITY,
  };
}

function candidateId(table) {
  const id = table?.candidate?.candidateId;
  if (typeof id !== 'string' || !id) {
    throw new Error('VIBRATION_STAGE5C_TABLE_CANDIDATE_ID_REQUIRED');
  }
  return id;
}

function chooseCandidateEvidence(selection, tables) {
  if (selection.candidateIds.length === 0) {
    if (tables.length === 0) return { state: 'not_found', tables: [], codes: ['TABLE_CANDIDATE_NOT_FOUND'] };
    if (tables.length > 1) {
      return {
        state: 'review_required', tables,
        codes: ['MULTIPLE_TABLE_CANDIDATES_REQUIRE_EXPLICIT_SELECTION'],
      };
    }
    candidateId(tables[0]);
    return { state: 'accepted', tables, codes: [] };
  }
  const byId = new Map(tables.map((table) => [candidateId(table), table]));
  const missing = selection.candidateIds.filter((id) => !byId.has(id));
  const selected = selection.candidateIds.filter((id) => byId.has(id)).map((id) => byId.get(id));
  if (missing.length) {
    return {
      state: 'blocked', tables: selected,
      codes: ['TABLE_CANDIDATE_NOT_FOUND'], missingCandidateIds: missing,
    };
  }
  return { state: 'accepted', tables: selected, codes: [] };
}

function validateDecision(decision) {
  if (!decision || typeof decision !== 'object' || !DECISION_STATES.has(decision.state)) {
    return { state: 'blocked', code: 'EVIDENCE_DECISION_INVALID' };
  }
  if (decision.state === 'accepted' && !decision.selectedObservationHash) {
    return { state: 'blocked', code: 'EVIDENCE_DECISION_SELECTION_REQUIRED' };
  }
  const hasEffective = Object.hasOwn(decision, 'effectiveText')
    || Object.hasOwn(decision, 'effectiveNumericValue');
  if (decision.state !== 'accepted' && hasEffective) {
    return { state: 'blocked', code: 'EVIDENCE_DECISION_EFFECTIVE_VALUE_FORBIDDEN' };
  }
  return { state: decision.state, code: null };
}

function cellDecisionState(tables) {
  const decisions = tables.flatMap((table) => (
    Array.isArray(table?.cellDecisions) ? table.cellDecisions : []
  ));
  if (!decisions.length) {
    return { state: 'review_required', codes: ['TABLE_CELL_DECISIONS_REQUIRED'] };
  }
  let state = 'accepted';
  const codes = new Set();
  for (const decision of decisions) {
    const checked = validateDecision(decision);
    if (STATE_RANK[checked.state] > STATE_RANK[state]) state = checked.state;
    if (checked.code) codes.add(checked.code);
    for (const code of decision?.diagnosticCodes || []) codes.add(code);
  }
  return { state, codes: [...codes].sort() };
}

function blockingExtractionDiagnostics(diagnostics) {
  const blocked = (diagnostics || []).filter((item) => item?.blocksTrustedUse === true);
  return blocked.map((item) => item.code || 'EXTRACTION_DIAGNOSTIC_BLOCKED_TRUSTED_USE');
}

function combineState(...states) {
  return states.reduce((current, state) => (
    STATE_RANK[state] > STATE_RANK[current] ? state : current
  ), 'accepted');
}

function buildSourceTargetDecision(selection, extraction) {
  const choice = chooseCandidateEvidence(selection, extraction.tables);
  const cells = choice.tables.length
    ? cellDecisionState(choice.tables)
    : { state: choice.state, codes: [] };
  const blockingCodes = blockingExtractionDiagnostics(extraction.diagnostics);
  const evidenceDecision = combineState(
    choice.state,
    cells.state,
    blockingCodes.length ? 'blocked' : 'accepted',
  );
  const diagnosticCodes = [...new Set([
    ...choice.codes,
    ...cells.codes,
    ...blockingCodes,
  ])].sort();
  const publicationState = evidenceDecision === 'accepted' ? 'CANDIDATE' : 'BLOCKED';
  return {
    schema: VIBRATION_STAGE5C_DECISION_SCHEMA,
    selectionId: selection.selectionId,
    masterId: selection.masterId,
    mechanismId: selection.mechanismId,
    sourceKind: selection.sourceKind,
    source: extraction.source,
    sourceBinding: sourceBinding(extraction.source),
    pages: selection.pages,
    sourceLocator: selection.sourceLocator,
    selectedCandidateIds: choice.tables.map(candidateId),
    ...(choice.missingCandidateIds ? { missingCandidateIds: choice.missingCandidateIds } : {}),
    evidenceDecision,
    publicationState,
    diagnosticCodes,
    extractionDiagnostics: extraction.diagnostics,
    candidateEvidence: choice.tables,
    masterValuesPublished: false,
    authority: VIBRATION_STAGE5C_AUTHORITY,
  };
}

function assertEffectiveOptions(extraction, selection) {
  if (extraction?.options?.ocr !== selection.ocr || extraction?.options?.ocrLanguage !== 'eng') {
    throw new Error('VIBRATION_STAGE5C_EXTRACTION_OPTIONS_MISMATCH');
  }
}

export async function recoverVibrationStage5cEvidence(options = {}) {
  const sourcePath = controlledSourcePath(options.sourcePath);
  const document = validateStage5cSelectionDocument(options.selectionDocument);
  const decisions = [];
  for (const selection of document.selections) {
    const extraction = await extractDocumentEvidenceTables({
      baseUrl: options.baseUrl,
      sourcePath,
      sourceHash: document.sourceHash,
      pages: selection.pages,
      ocr: selection.ocr,
      ocrLanguage: 'eng',
      fetchImpl: options.fetchImpl,
    });
    assertControlledEiSource(extraction.source);
    assertEffectiveOptions(extraction, selection);
    decisions.push(buildSourceTargetDecision(selection, extraction));
  }
  return {
    schema: VIBRATION_STAGE5C_RECOVERY_SCHEMA,
    sourceHash: document.sourceHash,
    decisions,
    authority: VIBRATION_STAGE5C_AUTHORITY,
    masterValuesPublished: false,
  };
}

function loadJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function writeJson(path, value) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArguments(argv) {
  const args = { command: argv[0], baseUrl: undefined, sourcePath: undefined, selectionPath: null, out: null };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--api') args.baseUrl = argv[++index] ?? null;
    else if (arg === '--source-path') args.sourcePath = argv[++index] ?? null;
    else if (arg === '--selection') args.selectionPath = argv[++index] ?? null;
    else if (arg === '--out') args.out = argv[++index] ?? null;
    else throw new TypeError(`Unknown option: ${arg}`);
  }
  if (!['discover', 'extract'].includes(args.command) || !args.out) {
    throw new TypeError('Usage: node scripts/recover-vibration-stage5c-via-document-evidence.mjs <discover|extract> --out <json> [--api URL] [--source-path controlled-path] [--selection json]');
  }
  if (args.command === 'extract' && !args.selectionPath) {
    throw new TypeError('VIBRATION_STAGE5C_SELECTION_FILE_REQUIRED');
  }
  return args;
}

export async function runVibrationStage5cRecovery(argv = process.argv.slice(2), runtime = {}) {
  const args = parseArguments(argv);
  const common = { baseUrl: args.baseUrl, sourcePath: args.sourcePath, fetchImpl: runtime.fetchImpl };
  const result = args.command === 'discover'
    ? await discoverVibrationStage5cEvidence(common)
    : await recoverVibrationStage5cEvidence({
        ...common,
        selectionDocument: loadJson(args.selectionPath),
      });
  writeJson(args.out, result);
  return result;
}

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invoked) await runVibrationStage5cRecovery();
