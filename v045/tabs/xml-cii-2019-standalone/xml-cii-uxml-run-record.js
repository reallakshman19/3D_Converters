// Run record (Owner 17 Nov 2026, "Yes, build it"): what one Run on the UXML route changed, with rule and source.
// It holds the supports stage's own provenance from that Run (no re-run), the XML the CII engine received, and the
// hashes the review page (XML_Compare_Utilities, section 4 "Open a Run record") uses to check it is the right file.
// Kept in memory for the last Run only; step 10 offers it as one download. Nothing is uploaded.

import { carryTransferNote, snapshotTransferProtection } from './xml-cii-transfer-protection.js';
import { engineChangeSteps, withEngineChanges } from './xml-cii-uxml-engine-changes.js';

export const UXML_RUN_RECORD_FORMAT = 'uxml-run-record';
export const UXML_RUN_RECORD_VERSION = 1;

let lastRun = [];

/** SHA-256 (hex) of the text's UTF-8 bytes. */
export async function sha256Text(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Values the source's transfer note protects, and whether the CII input XML still has each one. null: no note. */
export function transferKept(sourceText, ciiInputXml) {
  const before = snapshotTransferProtection(sourceText);
  if (!before) return null;
  if (before.error) return { error: before.error, values: [] };
  const key = (v) => `${v.scope}|${v.branchName}|${v.nodeNumber ?? ''}|${v.path}`;
  const after = new Map((snapshotTransferProtection(carryTransferNote(sourceText, ciiInputXml))?.values || []).map((v) => [key(v), v.value]));
  return { values: before.values.map((v) => ({ ...v, now: after.get(key(v)) ?? null, kept: after.get(key(v)) === v.value })) };
}

/** One model's record. `stage` is runSupportsStage's result on `stageInputXml`; `evidence` today's parity on its XML. */
export async function buildUxmlRunRecord({ job, stageInputXml, stage, evidence, compare, vendor, ms, document = null, changes = null }) {
  const sha = (text) => (text ? sha256Text(text) : null);
  return {
    format: UXML_RUN_RECORD_FORMAT, version: UXML_RUN_RECORD_VERSION, model: String(job?.sourceName || 'model'),
    createdAt: new Date().toISOString(), stage: vendor, ms,
    // Written before the CII engine runs: 'held' = parity failed, no CII; otherwise the input went to the engine
    // (the record does not say whether the engine then wrote the CII). Review 17 Nov.
    outcome: evidence?.ok === true ? 'released-to-engine' : 'held',
    hashes: { sourceXml: await sha(job?.sourceText), stageInputXml: await sha(stageInputXml), ciiInputXml: await sha(stage.xmlText),
      stagedJson: await sha(job?.stagedJsonText), supportConfig: await sha(job?.supportConfigJson) },
    parity: { ok: evidence?.ok === true, comparisons: evidence?.comparisons ?? null, mismatches: evidence?.mismatchCount ?? null },
    compare: { equal: compare?.equal === true, nodesDiffer: compare?.nodesDiffer ?? null, fields: compare?.fields || {} },
    transferProtected: transferKept(job?.sourceText, stage.xmlText),
    // End-to-end plan E1 (19 Nov 2026): the step-10 UXML document's revisions and the nodes its gasket drop removed.
    document,
    // End-to-end plan E2c step 2 (20 Nov 2026): the supports stage recorded on the document, sub-step by sub-step, the
    // locked duplicates joined, the kept nodes given the "|" names (their history) and the lock conflicts.
    changes,
    ciiInputXml: stage.xmlText,
    provenance: stage.provenance,
    engineeringProvenance: stage.engineeringProvenance,
    // The review page's warnings: staged supports that became no restraint, duplicate supports removed.
    diagnostics: (stage.diagnostics || []).filter((d) => d.type === 'staged-support-unmatched' || d.type === 'duplicate-support-removed'),
  };
}

/** Called when a Run starts: records of the previous Run are dropped. */
export function clearUxmlRunRecords() {
  lastRun = [];
}

export function rememberUxmlRunRecord(record) {
  lastRun = [...lastRun.filter((r) => r.model !== record.model), record];
}

/** End-to-end plan E4 (Owner 21 Nov 2026): how step 10 made this model's Enriched XML: from the document (its final
 *  revision and the file's SHA-256), or from the XML because the document could not be written (why). */
export function noteEnrichedOnRunRecord(model, enriched) {
  const i = lastRun.findIndex((r) => r.model === String(model || 'model'));
  if (i < 0) return null;
  const record = { ...lastRun[i], enriched: { ...enriched } };
  lastRun = lastRun.map((r, k) => (k === i ? record : r));
  return record;
}

/**
 * End-to-end plan E3 (Owner 21 Nov 2026): after the CII engine read the UXML document `doc`, its own changes
 * (`engine.changes`, by uid and rule) become recorded steps in that model's record, listed with the supports sub-steps.
 * `engine` is the engine's engineUxml result ({used, revision, changes} or {used: false, refusal}).
 */
export function noteEngineOnRunRecord(model, doc, engine, given = null) {
  const seen = engine || { used: false, refusal: 'the engine gave no UXML result' };
  let recorded = null, error = null;
  if (seen.used) {
    try {
      recorded = given || engineChangeSteps(doc, seen.changes);
    } catch (err) {
      error = String(err?.code || err?.message || err);
    }
  }
  const i = lastRun.findIndex((r) => r.model === String(model || 'model'));
  if (i >= 0) {
    const record = withEngineChanges(lastRun[i], seen, recorded);
    if (error) record.engine.recordError = error;
    lastRun = lastRun.map((r, k) => (k === i ? record : r));
  }
  // E4: the engine's recorded steps (null if none), so the Enriched XML is written from the same steps.
  return recorded;
}

export const uxmlRunRecords = () => lastRun;

/** The download: every model of the last Run in one file. */
export function uxmlRunRecordFileText(records = lastRun) {
  return JSON.stringify({ format: `${UXML_RUN_RECORD_FORMAT}s`, version: UXML_RUN_RECORD_VERSION, records });
}
