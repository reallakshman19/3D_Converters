import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const VIBRATION_MASTER_SOURCE_INVENTORY_SCHEMA = 'VibrationMasterSourceInventory.v1';
export const VIBRATION_MASTER_EXPECTED_GIT_BLOB = '9d3eccc56429411e17c07a579bdebbd13cb0bdc5';
export const VIBRATION_MASTER_EXPECTED_SIZE_BYTES = 10348594;
export const VIBRATION_MASTER_SOURCE_COMMIT = 'fb549185b9b27edc2379734240320a85c5bef9f6';

const SOURCE_REPOSITORY = 'reallaksh19/Common';
const SOURCE_PATH = 'EI - AVIFF Guidelines 2nd Edition.pdf';

const target = (masterId, dataType, locator, printedPageHint, anchors, options = {}) => Object.freeze({
  masterId,
  dataType,
  locator,
  printedPageHint,
  anchors: Object.freeze(anchors),
  ...options,
  endAnchors: options.endAnchors ? Object.freeze(options.endAnchors) : undefined,
});

export const VIBRATION_MASTER_SOURCE_TARGETS = Object.freeze([
  target('EI_AVIFF.T3.SBC.GEOMETRY_SCORES.v1', 'RULE', 'T3 geometry assessment / Flowchart T3-3', '74-80',
    ['Flowchart\\s+T3-3', 'Geometry\\s+Assessment\\s+Methodology'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.LOCATION_SCORES.v1', 'RULE', 'T3 location assessment methodology', '78-80',
    ['Location\\s+Assessment\\s+Methodology', 'LOF\\s*LOC'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1', 'TABLE', 'Table T3-1 — fitting span factor', '80',
    ['Table\\s+T3-1', 'Fitting\\s+Span\\s+Factor'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1', 'TABLE', 'Table T3-2 — minimum allowable first span length', '80-81',
    ['Table\\s+T3-2', 'Minimum\\s+allowable\\s+first\\s+span'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1', 'TABLE', 'Table T3-3 — minimum span between two main lines', '81',
    ['Table\\s+T3-3', 'between\\s+two\\s+main\\s+lines'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.FIGURE_T3_1.v1', 'CURVE', 'Figure T3-1', '81',
    ['Figure\\s+T3-1', 'Maximum\\s+Span.*involving\\s+mass'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.FIGURE_T3_2.v1', 'CURVE', 'Figure T3-2', '82',
    ['Figure\\s+T3-2', 'Maximum\\s+span.*no\\s+additional\\s+mass'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.FIGURE_T3_3.v1', 'CURVE', 'Figure T3-3', '82-83',
    ['Figure\\s+T3-3', 'subsequent\\s+spans.*involving\\s+mass'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T3.SBC.FIGURE_T3_4.v1', 'CURVE', 'Figure T3-4', '83-84',
    ['Figure\\s+T3-4', 'subsequent\\s+spans.*no\\s+additional\\s+mass'], { mechanismId: 'smallBoreConnections' }),
  target('EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1', 'TABLE_OR_EQUATION', 'T2.8 valve transient closure characteristic / phi', null,
    ['T2\\.8', 'Valve\\s+Transients?', 'closure'], { mechanismId: 'valveTransients' }),
  target('EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1', 'TABLE', 'T2.9 valve pressure-recovery factor FL', null,
    ['T2\\.9', 'Cavitation.*Flashing', 'pressure[- ]recovery'], { mechanismId: 'cavitationFlashing' }),
  target('EI_AVIFF.T4.WALL_MODIFIER.v1', 'TABLE', 'Table T4-1 — wall thickness modifier FM', '87',
    ['Table\\s+T4-1', 'Wall\\s+thickness\\s+modifier'], { mechanismId: 'thermowells' }),
  target('EI_AVIFF.T4.GEOMETRY_TYPES.v1', 'RULE_SCHEMA', 'Figure T4-1 — thermowell geometry taxonomy', '85',
    ['Figure\\s+T4-1', 'Geometr(?:y|ies)\\s+of\\s+Thermowell'], { mechanismId: 'thermowells' }),
  target('EI_AVIFF.T2.4.RECIP_PD_DECISION_FLOW.v1', 'RULE', 'T2.4 / Flowchart T2-2', '55',
    ['T2\\.4', 'Reciprocating.*Positive\\s+Displacement', 'Flowchart\\s+T2-2'], { mechanismId: 'reciprocatingPd' }),
  target('EI_AVIFF.T2.5.ROTATING_STALL_DECISION_FLOW.v1', 'RULE', 'T2.5 / Flowchart T2-3', '56',
    ['T2\\.5', 'Rotating\\s+Stall', 'Flowchart\\s+T2-3'], { mechanismId: 'rotatingStall' }),
  target('EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1', 'TABLE_SECTION', 'Appendix B — Sample Parameters', '155-161',
    ['Appendix\\s+B', 'SAMPLE\\s+PARAMETERS', 'data\\s+contained\\s+within\\s+this\\s+Appendix'], {
      mechanismId: 'sharedAssumptions',
      applicability: 'OPTIONAL_ASSUMPTION_LIBRARY',
      endAnchors: ['Appendix\\s+C', 'SBC\\s+LOF\\s+ASSESSMENT\\s+GUIDANCE'],
    }),
  target('ADVANCED_DEADLEG.COMPLETE_METHOD.v1', 'METHOD_TABLE', 'Advanced deadleg resonant/non-resonant method', null, [],
    { mechanismId: 'deadlegPulsation', fixedState: 'BLOCKED_SOURCE' }),
  target('SUBSEA_AVIFF.E4.3.CORRUGATION.v1', 'METHOD_CURVE', 'Adopted Subsea AVIFF E4.3 method', null, [],
    { mechanismId: 'corrugation', fixedState: 'BLOCKED_SOURCE' }),
  target('SPECIALIST.SLUG_ASSESSMENT.v1', 'METHOD', 'Adopted specialist slug assessment', null, [],
    { mechanismId: 'slugFlow', fixedState: 'BLOCKED_SOURCE' }),
]);

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function gitBlobSha1Hex(bytesInput) {
  const bytes = Buffer.isBuffer(bytesInput) ? bytesInput : Buffer.from(bytesInput);
  return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`, 'utf8')).update(bytes).digest('hex');
}

function normalizeGitBlob(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^sha1:/u, '');
}

export function assertExpectedVibrationMasterSource(bytesInput, options = {}) {
  const bytes = Buffer.isBuffer(bytesInput) ? bytesInput : Buffer.from(bytesInput);
  const expectedBlob = normalizeGitBlob(options.expectedGitBlob ?? VIBRATION_MASTER_EXPECTED_GIT_BLOB);
  const expectedSize = options.expectedSizeBytes ?? VIBRATION_MASTER_EXPECTED_SIZE_BYTES;
  if (!/^[0-9a-f]{40}$/u.test(expectedBlob)) throw new TypeError('VIBRATION_MASTER_EXPECTED_GIT_BLOB_INVALID');
  const actualBlob = gitBlobSha1Hex(bytes);
  if (actualBlob !== expectedBlob) {
    throw new Error(`VIBRATION_MASTER_SOURCE_MISMATCH: expected ${expectedBlob}, received ${actualBlob}.`);
  }
  if (expectedSize !== null && bytes.length !== expectedSize) {
    throw new Error(`VIBRATION_MASTER_SOURCE_SIZE_MISMATCH: expected ${expectedSize}, received ${bytes.length}.`);
  }
  return { gitBlobSha1: actualBlob, sizeBytes: bytes.length };
}

function normalizeText(value) {
  return String(value ?? '').replace(/\r\n?/gu, '\n').replace(/\s+/gu, ' ').trim();
}

export function splitPdfTextPages(textInput) {
  const chunks = String(textInput ?? '').replace(/\r\n?/gu, '\n').split('\f');
  if (chunks.length && chunks.at(-1).trim() === '') chunks.pop();
  return chunks.map((text, index) => ({ pdfPageNumber: index + 1, text }));
}

function toolVersion(binary) {
  const result = spawnSync(binary, ['-v'], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') return null;
  return String(result.stderr || result.stdout || '').trim().split(/\r?\n/u)[0] || null;
}

export function extractVibrationMasterPdfText(pdfPath, options = {}) {
  const binary = options.binary || 'pdftotext';
  const result = spawnSync(binary, ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 48 * 1024 * 1024 });
  if (result.error?.code === 'ENOENT') throw new Error(`VIBRATION_MASTER_PDFTOTEXT_REQUIRED: ${binary}`);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`VIBRATION_MASTER_PDFTOTEXT_FAILED: ${String(result.stderr || '').trim() || `exit ${result.status}`}`);
  }
  return { binary, version: toolVersion(binary), pages: splitPdfTextPages(result.stdout) };
}

function pageMatchesAnchors(page, anchors) {
  const text = normalizeText(page.text);
  return anchors.map((source) => new RegExp(source, 'iu')).every((pattern) => pattern.test(text));
}

function matchingPages(pages, anchors) {
  return pages.filter((page) => pageMatchesAnchors(page, anchors));
}

function recoveryAction(sourceTarget, state) {
  if (state === 'BLOCKED_SOURCE') return 'CONTROLLED_SOURCE_REQUIRED';
  if (state !== 'SOURCE_PINNED') return 'SOURCE_RECONCILIATION_REQUIRED';
  if (sourceTarget.dataType === 'CURVE' || sourceTarget.dataType === 'METHOD_CURVE') return 'FIGURE_DIGITIZATION_REQUIRED';
  return 'EXTRACTION_RECONCILIATION_REQUIRED';
}

function hashPage(page) {
  return {
    pdfPage: page.pdfPageNumber,
    textSha256: `sha256:${sha256Hex(Buffer.from(page.text, 'utf8'))}`,
  };
}

function rangeResolution(pages, sourceTarget) {
  const starts = matchingPages(pages, sourceTarget.anchors);
  const ends = matchingPages(pages, sourceTarget.endAnchors);
  if (starts.length === 0 || ends.length === 0) return { state: 'SOURCE_NOT_LOCATED', starts, ends, pages: [] };
  if (starts.length !== 1 || ends.length !== 1) return { state: 'RECONCILIATION_REQUIRED', starts, ends, pages: [] };
  const startIndex = pages.indexOf(starts[0]);
  const endIndex = pages.indexOf(ends[0]);
  if (startIndex < 0 || endIndex <= startIndex) return { state: 'RECONCILIATION_REQUIRED', starts, ends, pages: [] };
  return { state: 'SOURCE_PINNED', starts, ends, pages: pages.slice(startIndex, endIndex) };
}

function rangeTargetRecord(pages, sourceTarget) {
  const resolution = rangeResolution(pages, sourceTarget);
  const pageHashes = resolution.pages.map(hashPage);
  return {
    ...sourceTarget,
    anchors: undefined,
    endAnchors: undefined,
    sourceState: resolution.state,
    matchCount: pageHashes.length,
    startMatchCount: resolution.starts.length,
    endMatchCount: resolution.ends.length,
    pdfPage: pageHashes[0]?.pdfPage ?? null,
    pdfPageEnd: pageHashes.at(-1)?.pdfPage ?? null,
    pdfPages: pageHashes.map((page) => page.pdfPage),
    pageTextSha256: pageHashes[0]?.textSha256 ?? null,
    pageTextSha256s: pageHashes.map((page) => page.textSha256),
    recoveryAction: recoveryAction(sourceTarget, resolution.state),
  };
}

function singlePageTargetRecord(pages, sourceTarget) {
  const matches = matchingPages(pages, sourceTarget.anchors);
  const sourceState = matches.length === 1 ? 'SOURCE_PINNED' : matches.length === 0 ? 'SOURCE_NOT_LOCATED' : 'RECONCILIATION_REQUIRED';
  const page = matches.length === 1 ? matches[0] : null;
  const pageHash = page ? hashPage(page) : null;
  return {
    ...sourceTarget,
    anchors: undefined,
    sourceState,
    matchCount: matches.length,
    pdfPage: pageHash?.pdfPage ?? null,
    pdfPageEnd: pageHash?.pdfPage ?? null,
    pdfPages: pageHash ? [pageHash.pdfPage] : [],
    pageTextSha256: pageHash?.textSha256 ?? null,
    pageTextSha256s: pageHash ? [pageHash.textSha256] : [],
    recoveryAction: recoveryAction(sourceTarget, sourceState),
  };
}

function targetRecord(pages, sourceTarget) {
  if (sourceTarget.fixedState) {
    return {
      ...sourceTarget,
      anchors: undefined,
      endAnchors: undefined,
      sourceState: sourceTarget.fixedState,
      matchCount: 0,
      pdfPage: null,
      pdfPageEnd: null,
      pdfPages: [],
      pageTextSha256: null,
      pageTextSha256s: [],
      recoveryAction: recoveryAction(sourceTarget, sourceTarget.fixedState),
    };
  }
  if (sourceTarget.endAnchors?.length) return rangeTargetRecord(pages, sourceTarget);
  return singlePageTargetRecord(pages, sourceTarget);
}

function buildSummary(records) {
  const t3 = records.filter((record) => record.masterId.startsWith('EI_AVIFF.T3.'));
  const textTargets = records.filter((record) => record.sourceState !== 'BLOCKED_SOURCE' && record.dataType !== 'CURVE' && record.dataType !== 'METHOD_CURVE');
  const figures = records.filter((record) => record.recoveryAction === 'FIGURE_DIGITIZATION_REQUIRED');
  const blocked = records.filter((record) => record.sourceState !== 'SOURCE_PINNED');
  return {
    exactControlledSourceBinary: true,
    t3TargetCount: t3.length,
    t3LocatedCount: t3.filter((record) => record.sourceState === 'SOURCE_PINNED').length,
    t3FullyLocated: t3.every((record) => record.sourceState === 'SOURCE_PINNED'),
    textSectionsUniquelyLocated: textTargets.every((record) => record.sourceState === 'SOURCE_PINNED'),
    figureDigitizationRequired: figures.map(({ masterId, pdfPage }) => ({ masterId, pdfPage })),
    blockedOrAmbiguousMasters: blocked.map(({ masterId, sourceState }) => ({ masterId, sourceState })),
  };
}

export function buildVibrationMasterSourceInventory(bytesInput, extraction, options = {}) {
  const bytes = Buffer.isBuffer(bytesInput) ? bytesInput : Buffer.from(bytesInput);
  const source = assertExpectedVibrationMasterSource(bytes, options);
  const targets = options.targets || VIBRATION_MASTER_SOURCE_TARGETS;
  const records = targets.map((sourceTarget) => targetRecord(extraction.pages, sourceTarget));
  return {
    schema: VIBRATION_MASTER_SOURCE_INVENTORY_SCHEMA,
    source: {
      repository: SOURCE_REPOSITORY,
      commit: VIBRATION_MASTER_SOURCE_COMMIT,
      path: options.fileName || SOURCE_PATH,
      gitBlobSha1: `sha1:${source.gitBlobSha1}`,
      sizeBytes: source.sizeBytes,
      sha256: `sha256:${sha256Hex(bytes)}`,
      edition: 'Second edition, January 2008',
    },
    extraction: {
      tool: extraction.binary,
      toolVersion: extraction.version,
      totalPdfPageCount: extraction.pages.length,
      layoutPreserved: true,
    },
    summary: buildSummary(records),
    targets: records,
    authority: { engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false },
  };
}

function parseArguments(argv) {
  const positional = [];
  const options = { out: null, binary: 'pdftotext' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') options.out = argv[++index] ?? null;
    else if (arg === '--pdftotext') options.binary = argv[++index] ?? null;
    else if (arg.startsWith('--')) throw new TypeError(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) {
    throw new TypeError('Usage: node scripts/inventory-vibration-master-sources.mjs <EI-AVIFF.pdf> [--out inventory.json] [--pdftotext path]');
  }
  return { input: positional[0], ...options };
}

export function runVibrationMasterSourceInventory(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const inputPath = resolve(args.input);
  const bytes = readFileSync(inputPath);
  assertExpectedVibrationMasterSource(bytes);
  const extraction = extractVibrationMasterPdfText(inputPath, { binary: args.binary });
  const inventory = buildVibrationMasterSourceInventory(bytes, extraction, { fileName: basename(inputPath) });
  const json = `${JSON.stringify(inventory, null, 2)}\n`;
  if (args.out) {
    const outputPath = resolve(args.out);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, json, 'utf8');
    return { inventory, outputPath };
  }
  process.stdout.write(json);
  return { inventory, outputPath: null };
}

const invokedAsScript = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) runVibrationMasterSourceInventory();
