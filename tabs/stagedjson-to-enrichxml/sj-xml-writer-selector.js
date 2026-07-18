/**
 * Selects canonical or source-sequential PSI XML and matching trace records.
 * Sequential mode is explicit and fail-closed behind the parity gate.
 */

export const PSI_XML_WRITER_SELECTION_SCHEMA = 'stagedjson-psi-xml-writer-selection/v1';
export const PSI_WRITER_MODE_CANONICAL = 'canonical';
export const PSI_WRITER_MODE_SEQUENTIAL = 'sequential';

export function selectPsiWriterOutput({
  canonicalXmlText,
  canonicalRecords = [],
  writerShadow,
  config = {},
}) {
  const requestedMode = normalizeMode(config.psiWriterMode);
  const blockers = requestedMode === PSI_WRITER_MODE_SEQUENTIAL
    ? sequentialBlockers(writerShadow, canonicalRecords)
    : [];
  const effectiveMode = requestedMode === PSI_WRITER_MODE_SEQUENTIAL && blockers.length === 0
    ? PSI_WRITER_MODE_SEQUENTIAL
    : PSI_WRITER_MODE_CANONICAL;
  const useSequential = effectiveMode === PSI_WRITER_MODE_SEQUENTIAL;
  const records = useSequential ? writerShadow.records : canonicalRecords;

  return Object.freeze({
    schema: PSI_XML_WRITER_SELECTION_SCHEMA,
    requestedMode,
    effectiveMode,
    fallbackApplied: requestedMode !== effectiveMode,
    xmlText: useSequential ? writerShadow.xmlText : canonicalXmlText,
    records: Object.freeze([...records]),
    gate: Object.freeze({
      allowed: blockers.length === 0,
      reason: blockers.length === 0
        ? (useSequential ? 'SEQUENTIAL_PARITY_PROVEN' : 'CANONICAL_DEFAULT')
        : 'SEQUENTIAL_BLOCKED',
      blockers: Object.freeze(blockers),
    }),
  });
}

function sequentialBlockers(writerShadow, canonicalRecords) {
  const blockers = [];
  if (!writerShadow?.generated) blockers.push('SHADOW_NOT_GENERATED');
  if (writerShadow?.validation?.ok !== true) blockers.push('SHADOW_VALIDATION_FAILED');
  if (writerShadow?.parity?.switchGate?.allowed !== true) {
    blockers.push(...(writerShadow?.parity?.switchGate?.blockers || ['PARITY_GATE_BLOCKED']));
  }
  if (!Array.isArray(writerShadow?.records)) blockers.push('SEQUENTIAL_TRACE_MISSING');
  if ((writerShadow?.records?.length ?? -1) !== canonicalRecords.length) {
    blockers.push('TRACE_CARDINALITY_MISMATCH');
  }
  if (writerShadow?.records?.some((record) => record.xmlNodeNum === null || record.xmlNodeNum === undefined)) {
    blockers.push('SEQUENTIAL_NODE_ALLOCATION_MISSING');
  }
  return [...new Set(blockers)];
}

function normalizeMode(value) {
  return String(value ?? '').trim().toLowerCase() === PSI_WRITER_MODE_SEQUENTIAL
    ? PSI_WRITER_MODE_SEQUENTIAL
    : PSI_WRITER_MODE_CANONICAL;
}
