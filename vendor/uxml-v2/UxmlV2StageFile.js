/**
 * Stage files, end-to-end plan E2c step 4 (Owner 19 Nov 2026: "add Icon to download enrichedUXML at each stage";
 * 20 Nov: "Yes, build it"). `<model>.<stage>.uxml.json` holds the source read as a UXML document, the chain of recorded
 * changes up to that stage (each delta names its stage and rule), the stage's name and the hashes of the inputs and
 * settings used. 3D_Converters writes them (steps 1, 3, 4 and 6); the review page opens and compares them.
 *
 * Stages (snapshots: what step 10 would make from the file with today's settings, leaving out what later steps add):
 *   S0 source read; S1 after the gasket drop; S2 after the staged JSON (no Preview edits, no weight choices);
 *   S3 after 4 Preview (no weight choices); S4 after Weight Match (everything: the document step 10 sends the engine).
 *
 * readStageFile rebuilds the chain with the kernel's hash checks, so a file edited by hand or cut short is refused,
 * and refuses a stage file whose left-out settings are not empty (an S2 holding a weight choice). PR 304 review B1:
 * it also checks that the chain has exactly the sub-steps its stage names (S0 none, S1 the gasket drop, S2-S4 every
 * supports sub-step), that every input is named, and the file's seal (a hash over its stage, inputs and result), so an
 * accidental or partial edit of those is refused too. The file is not signed: someone who rewrites a file and its
 * seal on purpose is not caught; a stage file is a debugging aid, not a proof.
 * `producer.routeOn` (PR 438 review B4): false when step 10's UXML route was off in that browser, so the Run sends
 * today's route XML, not this document; the review page says so.
 * inputsDiffer / runRecordDiffers name the inputs two files (or a file and a step 10 Run record) do not share.
 */
import {applyDelta, assertValid, canonicalJson, sha256Hex, UxmlRefusal} from './UxmlV2Kernel.js';

export const STAGE_FILE_FORMAT = 'uxml-stage-file/v1';

export const STAGES = Object.freeze({
  S0: Object.freeze({step: 1, name: 'source read', leftOut: []}),
  S1: Object.freeze({step: 1, name: 'after the gasket drop', leftOut: []}),
  S2: Object.freeze({step: 3, name: 'after the staged JSON', leftOut: ['previewEdits', 'weightChoices']}),
  S3: Object.freeze({step: 4, name: 'after 4 Preview', leftOut: ['weightChoices']}),
  S4: Object.freeze({step: 6, name: 'after Weight Match', leftOut: []}),
});
const ORDER = Object.keys(STAGES);

/** The sub-steps each stage's chain holds, in order (supports: SupportsAsChanges.js SUPPORTS_STEPS). */
export const SUPPORTS_SUB_STEPS = Object.freeze(['branch-pass', '01-parent-enrichment', '02-dtxr-enrichment', '02b-process-parity',
  '03-atta-default', '04-mds-closure']);
export const INPUT_KEYS = Object.freeze(['sourceXml', 'stagedJson', 'config', 'previewEdits', 'weightChoices', 'runConfig']);

/** True when a chain's stage ids are the ones the stage must hold (optional: transfer-note locks, joins, "|" names). */
export function chainFitsStage(stage, stages) {
  if (stage === 'S0') return stages.length === 0;
  if (stage === 'S1') return stages.length === 1 && stages[0] === 'gasket-drop';
  const rest = [...stages];
  if (rest.shift() !== 'gasket-drop') return false;
  if (rest[0] === 'transfer-note') rest.shift();
  while (rest[0] === 'supports:join') rest.shift();
  if (rest.at(-1) === 'supports:names') rest.pop();
  return rest.length === SUPPORTS_SUB_STEPS.length && rest.every((id, i) => id === 'supports:' + SUPPORTS_SUB_STEPS[i]);
}

/** The seal: a hash over what the file says about itself (not its documents, which the kernel checks). */
export const stageFileSeal = file => sha256Hex(canonicalJson({format: file.format, stage: file.stage, model: file.model,
  createdAt: file.createdAt, producer: file.producer ?? null, inputs: file.inputs ?? {}, refusal: file.refusal ?? null,
  base: file.base?.revision?.id ?? null, result: file.result ?? null}));

/** Hash of a settings object (canonical JSON); an empty or missing one hashes as {}. */
export const settingsSha256 = value => sha256Hex(canonicalJson(value ?? {}));
export const EMPTY_SETTINGS_SHA256 = settingsSha256({});

/** Plain words for the refusals of this module (the review page shows them). */
export const STAGE_FILE_MESSAGES = Object.freeze({
  UXML_STAGE_FILE_FORMAT: 'This is not a UXML stage file (uxml-stage-file/v1).',
  UXML_STAGE_UNKNOWN: 'This stage file names a stage this page does not know.',
  UXML_STAGE_FILE_NOT_A_READ: 'The stage file does not start from the source read.',
  UXML_STAGE_FILE_RESULT_MISMATCH: 'The stage file\'s changes do not end at the revision it claims: it is cut short or was changed.',
  UXML_STAGE_SETTINGS_NOT_LEFT_OUT: 'This stage file holds settings its stage must leave out (for example a weight choice before Weight Match).',
  UXML_STAGE_FILE_SEAL_MISMATCH: "The stage file's stage, inputs or result were changed after it was made.",
  UXML_STAGE_FILE_INPUT_MISSING: 'The stage file does not name all of its inputs.',
  UXML_STAGE_FILE_STEPS_MISMATCH: "The stage file's recorded steps are not the ones its stage holds (a step is missing, extra, or out of order).",
  // The kernel's refusals while the chain is rebuilt: the file was changed after it was made.
  UXML_HASH_MISMATCH: 'The stage file was changed after it was made: a document in it no longer matches its own hash.',
  UXML_DELTA_BEFORE_MISMATCH: 'The stage file was changed after it was made: a recorded change no longer fits the document.',
  UXML_DELTA_BASE_MISMATCH: 'The stage file was changed after it was made: its recorded changes are out of order.',
  UXML_DELTA_RESULT_MISMATCH: 'The stage file was changed after it was made: a recorded change does not give the revision it names.',
  UXML_UID_UNKNOWN: 'The stage file was changed after it was made: a recorded change names an item that is not there.',
});

/** A stage file (plain object; JSON.stringify it to save). `inputs` are sha256 hex strings (see the header). */
export function makeStageFile({stage, model, createdAt, producer = null, inputs = {}, base = null, deltas = [], refusal = null}) {
  if (!STAGES[stage]) throw new UxmlRefusal('UXML_STAGE_UNKNOWN', {stage});
  const file = {format: STAGE_FILE_FORMAT, stage, stageName: STAGES[stage].name, step: STAGES[stage].step, model: String(model || ''),
    createdAt, producer, inputs: {...inputs}, refusal, base: refusal ? null : base, deltas: refusal ? [] : deltas,
    result: refusal ? null : (deltas.length ? deltas.at(-1).result : base?.revision?.id ?? null)};
  file.seal = stageFileSeal(file);
  return file;
}

/**
 * Open a stage file (parsed JSON): {stage, stageName, model, createdAt, producer, inputs, refusal, revisions}, where
 * revisions = [{doc, delta, diagnostics, refusals}] as the review session holds them (revisions[0] is the read).
 * Refuses (UxmlRefusal) a wrong format, an unknown stage, a chain that does not rebuild, or settings not left out.
 */
export function readStageFile(file) {
  if (file?.format !== STAGE_FILE_FORMAT) throw new UxmlRefusal('UXML_STAGE_FILE_FORMAT', {found: file?.format ?? null});
  const meta = STAGES[file.stage];
  if (!meta) throw new UxmlRefusal('UXML_STAGE_UNKNOWN', {stage: file.stage});
  if (file.seal !== stageFileSeal(file)) throw new UxmlRefusal('UXML_STAGE_FILE_SEAL_MISMATCH');
  for (const key of INPUT_KEYS) if (!(key in (file.inputs || {}))) throw new UxmlRefusal('UXML_STAGE_FILE_INPUT_MISSING', {key});
  for (const key of meta.leftOut) {
    if (file.inputs?.[key] !== EMPTY_SETTINGS_SHA256) throw new UxmlRefusal('UXML_STAGE_SETTINGS_NOT_LEFT_OUT', {stage: file.stage, key});
  }
  const out = {stage: file.stage, stageName: meta.name, model: file.model, createdAt: file.createdAt, producer: file.producer,
    inputs: file.inputs || {}, refusal: file.refusal || null, revisions: []};
  if (out.refusal) return out;
  const base = file.base;
  if (base?.revision?.stage !== 'read-psi116' || (base.revision.parents || []).length) throw new UxmlRefusal('UXML_STAGE_FILE_NOT_A_READ');
  assertValid(base);
  if (!file.inputs.sourceXml || base.revision.inputs?.[0]?.sha256 !== file.inputs.sourceXml) {
    throw new UxmlRefusal('UXML_STAGE_FILE_NOT_A_READ', {message: 'the source read is not of the source file the stage file names'});
  }
  if (!chainFitsStage(file.stage, (file.deltas || []).map(d => d?.stage))) throw new UxmlRefusal('UXML_STAGE_FILE_STEPS_MISMATCH');
  out.revisions.push({doc: base, delta: null, diagnostics: [], refusals: []});
  for (const delta of file.deltas || []) out.revisions.push({doc: applyDelta(out.revisions.at(-1).doc, delta), delta, diagnostics: [], refusals: []});
  if (out.revisions.at(-1).doc.revision.id !== file.result) throw new UxmlRefusal('UXML_STAGE_FILE_RESULT_MISMATCH', {expected: file.result});
  return out;
}

/** The inputs two stage files must share but do not (each file's stage decides which settings it carries). */
export function inputsDiffer(a, b) {
  const later = ORDER.indexOf(a.stage) < ORDER.indexOf(b.stage) ? b : a, earlier = later === a ? b : a;
  const skip = new Set([...(STAGES[earlier.stage]?.leftOut || []), 'runConfig']);
  if (ORDER.indexOf(earlier.stage) < ORDER.indexOf('S2')) for (const k of ['stagedJson', 'previewEdits', 'weightChoices']) skip.add(k);
  const keys = new Set([...Object.keys(a.inputs || {}), ...Object.keys(b.inputs || {})]);
  return [...keys].filter(k => !skip.has(k) && (a.inputs?.[k] ?? null) !== (b.inputs?.[k] ?? null)).sort();
}

/** The inputs a stage file and a step 10 Run record (one of its records) do not share: source, staged JSON, and for S4
 *  the settings the Run used. */
export function runRecordDiffers(stageFile, record) {
  const h = record?.hashes || {}, i = stageFile?.inputs || {}, out = [];
  if ((i.sourceXml ?? null) !== (h.sourceXml ?? null)) out.push('sourceXml');
  if (ORDER.indexOf(stageFile.stage) >= ORDER.indexOf('S2') && (i.stagedJson ?? null) !== (h.stagedJson ?? null)) out.push('stagedJson');
  if (stageFile.stage === 'S4' && (i.runConfig ?? null) !== (h.supportConfig ?? null)) out.push('settings');
  return out;
}

/** Download name: `<model without extension>.<stage>.uxml.json`. */
export const stageFileName = (model, stage) => `${String(model || 'model').replace(/\.[^.]+$/, '')}.${stage}.uxml.json`;
