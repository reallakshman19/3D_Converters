import { createHash } from '../../core/browser-node-crypto.js';

export const MODE_B_SOURCE_CONFIG_NOT_APPLIED = 'MODE_B_SOURCE_CONFIG_NOT_APPLIED';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Sort object keys recursively; retain array order and every JSON value.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function configError(fileName) {
  return new Error(`MODE_B_SOURCE_CONFIG_INVALID: ${fileName || 'source'}: invalid source support configuration.`);
}

// Capture only the three source-specific keys. No masters or staged JSON.
export function captureModeBSourceConfig(raw = '{}', fileName = '') {
  let config;
  try { config = JSON.parse(raw || '{}'); }
  catch { throw configError(fileName); }
  if (!isObject(config)) throw configError(fileName);
  const overrides = config.overrides ?? {};
  const branchLineKeyMap = config.linelist?.branchLineKeyMap ?? {};
  const finalizedMatches = config.weight?.finalizedMatches ?? [];
  if (!isObject(overrides) || !isObject(branchLineKeyMap) || !Array.isArray(finalizedMatches)) throw configError(fileName);
  const payload = canonical({ overrides, branchLineKeyMap, finalizedMatches });
  return { ...payload, sha256: createHash('sha256').update(JSON.stringify(payload)).digest('hex') };
}

// Counts describe captured entries, not applied edits. An overrides entry is
// a top-level override bucket; branch mappings and finalized rows are counted individually.
export function modeBSourceConfigWarning(manifest) {
  if (manifest?.schema !== 'xml-node-offset-combine/v1' || manifest.sourceConfigVersion !== 1
      || !Array.isArray(manifest.sourceOrder)) return null;
  const sources = manifest.sourceOrder.map((row, index) => ({
    sourceId: row.sourceId || '', fileName: row.fileName, sourceOrdinal: index + 1,
    overrides: Object.keys(row.sourceConfig?.overrides || {}).length,
    branchLineKeyMap: Object.keys(row.sourceConfig?.branchLineKeyMap || {}).length,
    finalizedMatches: row.sourceConfig?.finalizedMatches?.length || 0,
  }));
  if (!sources.some(row => row.overrides || row.branchLineKeyMap || row.finalizedMatches)) return null;
  const detail = sources.map(row => `${row.sourceOrdinal}. ${row.fileName} (${row.sourceId}): overrides=${row.overrides}, branchLineKeyMap=${row.branchLineKeyMap}, finalizedMatches=${row.finalizedMatches}`).join('; ');
  return { code: MODE_B_SOURCE_CONFIG_NOT_APPLIED, sources,
    message: `${MODE_B_SOURCE_CONFIG_NOT_APPLIED}: Captured source configuration is NOT applied yet (overrides counts buckets). ${detail}` };
}

export function withModeBSourceConfigWarning(result, manifest) {
  const warning = modeBSourceConfigWarning(manifest);
  if (!warning) return result;
  const diagnostics = result.diagnostics || {};
  return { ...result, diagnostics: { ...diagnostics,
    warnings: [...(Array.isArray(diagnostics.warnings) ? diagnostics.warnings : []), warning.message],
    modeBSourceConfigNotApplied: warning,
  } };
}
