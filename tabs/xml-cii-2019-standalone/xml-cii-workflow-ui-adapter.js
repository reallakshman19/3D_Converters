export function readTextFile(file) {
  if (!file) return Promise.resolve(null);
  return file.text();
}

export async function buildXmlCiiWorkflowJobFromUiState(state) {
  const [sourceText, stagedJsonText] = await Promise.all([
    readTextFile(state.sourceFile),
    readTextFile(state.stagedJsonFile),
  ]);
  return {
    sourceKind: state.sourceKind || 'auto',
    sourceText: sourceText || '',
    sourceName: state.sourceFile?.name || '',
    stagedJsonText,
    elementSideLoadText: state.elementSideLoadText || null,
    supportConfigJson: state.supportConfigJson || '{}',
    options: {
      coordsMode: state.options?.coordsMode || 'first',
      kgToNewton: state.options?.kgToNewton !== false,
      splitCondensedValveFlange: state.options?.splitCondensedValveFlange ?? null,
      useRestraintTypeBasedOnJson: state.options?.useRestraintTypeBasedOnJson !== false,
      outputMode: state.options?.outputMode || 'enriched-only',
      inputXmlOutputMode: state.options?.inputXmlOutputMode || 'full-document',
      pointPropertiesBasis: state.options?.pointPropertiesBasis || 'auto',
      inputXmlRestraintPolicy: state.options?.inputXmlRestraintPolicy || 'preserve-existing-restraints',
      fillSentinelFromLineContext: state.options?.fillSentinelFromLineContext !== false,
      normalizePressureCaseNames: state.options?.normalizePressureCaseNames !== false,
      escapeXmlAttributes: state.options?.escapeXmlAttributes !== false,
    },
  };
}

export function summarizeWorkflowFile(file) {
  if (!file) return 'No file selected.';
  const size = Number(file.size || 0);
  return `${file.name} (${size.toLocaleString()} bytes)`;
}
