/**
 * Generates source-branch PSI XML beside the production canonical XML.
 * Records are cloned because the legacy writer annotates xmlNodeNum.
 */

import { buildEnrichedXml } from './sj-xml-writer.js?v=4';
import { comparePsiWriterOutputs } from './sj-xml-writer-parity.js?v=1';

export const PSI_SEQUENTIAL_WRITER_SHADOW_SCHEMA = 'stagedjson-psi-sequential-writer-shadow/v1';

export function buildSequentialWriterShadow({ sequencePlan, canonicalXmlText, config = {} }) {
  if (!sequencePlan || sequencePlan.validation?.ok !== true) {
    return failedShadow(['A valid PSI sequence plan is required.']);
  }

  try {
    const branchMap = new Map();
    for (const branch of sequencePlan.branches) {
      branchMap.set(
        branch.sourceBranchName,
        branch.components.map((component) => ({ ...component.record })),
      );
    }

    const xmlText = buildEnrichedXml(branchMap, config);
    const parity = comparePsiWriterOutputs({ canonicalXmlText, sequentialXmlText: xmlText, sequencePlan });
    return Object.freeze({
      schema: PSI_SEQUENTIAL_WRITER_SHADOW_SCHEMA,
      generated: true,
      xmlText,
      parity,
      validation: Object.freeze({ ok: parity.validation.ok, errors: parity.validation.errors }),
    });
  } catch (error) {
    return failedShadow([error instanceof Error ? error.message : String(error)]);
  }
}

function failedShadow(errors) {
  return Object.freeze({
    schema: PSI_SEQUENTIAL_WRITER_SHADOW_SCHEMA,
    generated: false,
    xmlText: '',
    parity: null,
    validation: Object.freeze({ ok: false, errors: Object.freeze([...new Set(errors)]) }),
  });
}
