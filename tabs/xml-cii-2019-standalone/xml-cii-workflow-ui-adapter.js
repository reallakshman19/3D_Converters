export function readTextFile(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

function getStoredJson(key, fallback = null) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredMaster(key) {
  return getStoredJson(`xml-cii-master-${key}`);
}

function enrichSupportConfigJson(state) {
  let config = {};
  try {
    config = JSON.parse(state.supportConfigJson || '{}');
  } catch {}
  
  const lineRows = state.masterContext?.lineRows || getStoredMaster('lineList') || [];
  const materialMapRows = state.masterContext?.materialMapRows || getStoredMaster('materialMap') || [];
  const weightMasterRows = state.masterContext?.weightMasterRows || getStoredMaster('weight') || [];
  // Piping class rows live in config.pipingClass.masterRows; prefer in-memory masterContext if available
  const pipingClassRows = state.masterContext?.pipingClassRows?.length
    ? state.masterContext.pipingClassRows
    : (config.pipingClass?.masterRows || []);

  if (lineRows.length) {
    if (!config.linelist) config.linelist = {};
    config.linelist.masterRows = lineRows;
  }
  if (pipingClassRows.length) {
    if (!config.pipingClass) config.pipingClass = {};
    config.pipingClass.masterRows = pipingClassRows;
  }
  if (materialMapRows.length) {
    if (!config.material) config.material = {};
    config.material.mapRows = materialMapRows;
  }
  if (weightMasterRows.length) {
    if (!config.weight) config.weight = {};
    config.weight.masterRows = weightMasterRows;
  }
  return JSON.stringify(config, null, 2);
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
    supportConfigJson: enrichSupportConfigJson(state),
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
