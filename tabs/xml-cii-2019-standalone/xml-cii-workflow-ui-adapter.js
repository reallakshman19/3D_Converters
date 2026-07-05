export function readTextFile(file) {
  if (!file) return Promise.resolve(null);
  return file.text();
}

export async function buildXmlCiiWorkflowJobFromUiState(state) {
  const [sourceFileText, stagedJsonText] = await Promise.all([
    readTextFile(state.sourceFile),
    readTextFile(state.stagedJsonFile),
  ]);
  const sourceText = sourceFileText || String(state.sourceText || '');
  return {
    sourceKind: state.sourceKind || 'auto',
    sourceText,
    sourceName: sourceNameFromState(state),
    stagedJsonText,
    elementSideLoadText: state.elementSideLoadText || null,
    supportConfigJson: state.supportConfigJson || '{}',
    options: workflowOptionsFromState(state),
  };
}

export function sourceNameFromState(state) {
  if (state.sourceFile?.name) return state.sourceFile.name;
  return state.sourceKind === 'inputxml' ? 'standalone.input.xml' : 'standalone.xml';
}

export function workflowOptionsFromState(state) {
  return {
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
  };
}

export function summarizeWorkflowFile(file) {
  if (!file) return 'No file selected.';
  const size = Number(file.size || 0);
  return `${file.name} (${size.toLocaleString()} bytes)`;
}
