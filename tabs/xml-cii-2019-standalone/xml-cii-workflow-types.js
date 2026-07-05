export const XML_CII_WORKFLOW_SOURCE_KINDS = Object.freeze(['xml', 'inputxml', 'auto']);
export const XML_CII_WORKFLOW_RESOLVED_SOURCE_KINDS = Object.freeze(['xml', 'inputxml']);
export const XML_CII_WORKFLOW_COORDS_MODES = Object.freeze(['first', 'all', 'none']);
export const XML_CII_WORKFLOW_OUTPUT_MODES = Object.freeze(['enriched-only', 'cii-only', 'both']);
export const XML_CII_INPUTXML_OUTPUT_MODES = Object.freeze(['full-document', 'fragment']);
export const XML_CII_POINT_PROPERTY_BASIS = Object.freeze(['TO', 'FROM', 'auto']);
export const XML_CII_INPUTXML_RESTRAINT_POLICIES = Object.freeze([
  'preserve-existing-restraints',
  'convert-existing-restraints',
  'replace-with-dtxr-derived-restraints',
  'merge-existing-and-dtxr-derived-restraints',
]);

export const DEFAULT_XML_CII_WORKFLOW_OPTIONS = Object.freeze({
  coordsMode: 'first',
  kgToNewton: true,
  splitCondensedValveFlange: null,
  useRestraintTypeBasedOnJson: true,
  outputMode: 'enriched-only',
  inputXmlOutputMode: 'full-document',
  pointPropertiesBasis: 'auto',
  inputXmlRestraintPolicy: 'preserve-existing-restraints',
  fillSentinelFromLineContext: true,
  normalizePressureCaseNames: true,
  escapeXmlAttributes: true,
});

function bool(value, fallback) {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  return fallback;
}

function boolOrNull(value) {
  return value === undefined || value === '' ? null : bool(value, null);
}

function enumValue(value, allowed, fallback) {
  const text = String(value || '').trim();
  return allowed.includes(text) ? text : fallback;
}

export function normalizeWorkflowOptions(options = {}) {
  const input = options && typeof options === 'object' ? options : {};
  return {
    coordsMode: enumValue(String(input.coordsMode || '').toLowerCase(), XML_CII_WORKFLOW_COORDS_MODES, 'first'),
    kgToNewton: bool(input.kgToNewton, true),
    splitCondensedValveFlange: boolOrNull(input.splitCondensedValveFlange),
    useRestraintTypeBasedOnJson: bool(input.useRestraintTypeBasedOnJson, true),
    outputMode: enumValue(String(input.outputMode || '').toLowerCase(), XML_CII_WORKFLOW_OUTPUT_MODES, 'enriched-only'),
    inputXmlOutputMode: enumValue(String(input.inputXmlOutputMode || '').toLowerCase(), XML_CII_INPUTXML_OUTPUT_MODES, 'full-document'),
    pointPropertiesBasis: enumValue(String(input.pointPropertiesBasis || '').toUpperCase(), XML_CII_POINT_PROPERTY_BASIS, 'auto'),
    inputXmlRestraintPolicy: enumValue(String(input.inputXmlRestraintPolicy || ''), XML_CII_INPUTXML_RESTRAINT_POLICIES, 'preserve-existing-restraints'),
    fillSentinelFromLineContext: bool(input.fillSentinelFromLineContext, true),
    normalizePressureCaseNames: bool(input.normalizePressureCaseNames, true),
    escapeXmlAttributes: bool(input.escapeXmlAttributes, true),
  };
}

export function validateSupportConfigJson(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: true, value: {}, normalizedText: '{}' };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Support/config JSON must be a JSON object.' };
    return { ok: true, value, normalizedText: raw };
  } catch (err) {
    return { ok: false, error: 'Malformed support/config JSON: ' + String(err && err.message ? err.message : err) };
  }
}

export function normalizeWorkflowJob(job = {}) {
  if (!job || typeof job !== 'object') return { ok: false, error: 'Workflow job must be an object.' };
  const sourceText = String(job.sourceText ?? '');
  if (!sourceText.trim()) return { ok: false, error: 'Workflow sourceText is required.' };
  const sourceKind = String(job.sourceKind || 'auto').toLowerCase();
  if (!XML_CII_WORKFLOW_SOURCE_KINDS.includes(sourceKind)) return { ok: false, error: 'sourceKind must be xml, inputxml, or auto.' };
  const supportValidation = validateSupportConfigJson(job.supportConfigJson ?? '{}');
  if (!supportValidation.ok) return supportValidation;
  return { ok: true, job: {
    sourceKind,
    sourceText,
    sourceName: String(job.sourceName || (sourceKind === 'inputxml' ? 'input.input.xml' : 'input.xml')),
    stagedJsonText: job.stagedJsonText == null ? null : String(job.stagedJsonText),
    elementSideLoadText: job.elementSideLoadText == null ? null : String(job.elementSideLoadText),
    supportConfigJson: supportValidation.normalizedText,
    options: normalizeWorkflowOptions(job.options),
  } };
}

export function createWorkflowDiagnostics(extra = {}) {
  return {
    schema: 'xml-cii-2019-workflow-diagnostics/v1',
    elementCount: 0,
    enrichedElementCount: 0,
    restraintCount: 0,
    sideLoadMatched: 0,
    sideLoadUnmatched: [],
    inheritedFieldCount: 0,
    sentinelFieldCount: 0,
    warnings: [],
    ...extra,
  };
}

export function normalizeWorkflowResult(partial = {}) {
  const sourceKind = XML_CII_WORKFLOW_RESOLVED_SOURCE_KINDS.includes(partial.sourceKind) ? partial.sourceKind : 'xml';
  const outputKind = partial.outputKind || (sourceKind === 'inputxml' ? 'enrichedInputXML' : 'enrichedXML');
  return {
    ok: partial.ok === true,
    sourceKind,
    outputKind,
    enrichedText: String(partial.enrichedText || ''),
    enrichedName: String(partial.enrichedName || ''),
    ciiText: partial.ciiText == null ? null : String(partial.ciiText),
    ciiName: partial.ciiName == null ? null : String(partial.ciiName),
    diagnostics: partial.diagnostics && typeof partial.diagnostics === 'object' ? partial.diagnostics : null,
    logs: Array.isArray(partial.logs) ? partial.logs.map((line) => String(line)) : [],
    error: partial.error ? String(partial.error) : null,
  };
}
