// End-to-end plan E4 (Owner 21 Nov 2026, "Yes, as suggested"): step 10's Enriched XML written from the UXML document.
// The document is the route's final revision (the "|" names included) plus the CII engine's own recorded steps
// (process data, bend radius), so it holds what today's Enriched XML pass and the names step put in the text. It is
// written by XCU's PSI116 writer in the source's own layout (the Owner's choice: comments kept), then the SIF facts and
// the transfer protection note go on as today. Only when the engine read the document ("Engine reads UXML" on).
import { applyStandaloneSifFacts } from '../../../tabs/xml-cii-2019-standalone/xml-cii-standalone-sif-apply.js';
import { carryTransferNote } from './xml-cii-transfer-protection.js';
import { engineChangeSteps } from './xml-cii-uxml-engine-changes.js';
import { writePsi116FromUxmlV2 } from '../../../vendor/uxml-v2/UxmlV2Psi116Writer.js';

/**
 * {ok: true, xmlText, revision, removedValues} or {ok: false, error}: the Enriched XML from `namesDoc` (the route's
 * document with the "|" names) and the engine's change rows. Never throws.
 */
export function enrichedFromDocument(namesDoc, engineRows, { sourceText = '', sifFacts, recorded: given = null } = {}) {
  try {
    // `recorded`: the engine's steps already built on namesDoc (the Run record's), so they are built once.
    const recorded = given || engineChangeSteps(namesDoc, engineRows);
    if (recorded.notRecorded || recorded.conflicts.length) {
      return { ok: false, error: `${recorded.notRecorded + recorded.conflicts.length} engine change(s) cannot be written from the document` };
    }
    const written = writePsi116FromUxmlV2(recorded.uxml);
    const sif = applyStandaloneSifFacts(written.text, 'xml', sifFacts);
    return { ok: true, xmlText: carryTransferNote(String(sourceText || ''), sif.text), revision: recorded.uxml.revision.id,
      removedValues: written.stats.removedValues || 0 };
  } catch (error) {
    return { ok: false, error: String(error?.code || error?.message || error) };
  }
}
