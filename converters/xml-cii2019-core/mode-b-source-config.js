import { createHash } from '../../core/browser-node-crypto.js';

export const MODE_B_SOURCE_CONFIG_NOT_APPLIED = 'MODE_B_SOURCE_CONFIG_NOT_APPLIED';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Sort object keys recursively; retain array order and every JSON value.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function configError(fileName, detail) {
  const code = 'MODE_B_SOURCE_CONFIG_INVALID';
  return Object.assign(new Error(`${code}: ${fileName || 'source'}: ${detail}`), { code });
}

function checkedPayload(overrides, branchLineKeyMap, finalizedMatches, fileName) {
  if (!isObject(overrides) || !Object.values(overrides).every(isObject)) {
    throw configError(fileName, 'overrides must be an object of objects (use {}, not [], for empty overrides).');
  }
  if (!isObject(branchLineKeyMap) || !Array.isArray(finalizedMatches)) {
    throw configError(fileName, 'branchLineKeyMap must be an object and finalizedMatches an array.');
  }
  return canonical({ overrides, branchLineKeyMap, finalizedMatches });
}

const digest = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');

// Capture only the three source-specific keys. No masters or staged JSON.
export function captureModeBSourceConfig(raw = '{}', fileName = '') {
  let config;
  try { config = JSON.parse(raw || '{}'); }
  catch { throw configError(fileName, 'invalid source support configuration JSON.'); }
  if (!isObject(config)) throw configError(fileName, 'source support configuration must be an object.');
  const payload = checkedPayload(
    config.overrides === undefined ? {} : config.overrides,
    config.linelist?.branchLineKeyMap === undefined ? {} : config.linelist.branchLineKeyMap,
    config.weight?.finalizedMatches === undefined ? [] : config.weight.finalizedMatches, fileName);
  return { ...payload, sha256: digest(payload) };
}

function verifiedSourceConfig(row, index) {
  const fileName = row?.fileName || `source ${index + 1}`;
  const config = row?.sourceConfig;
  if (!isObject(config) || Object.keys(config).length !== 4) {
    throw configError(fileName, 'missing or invalid captured sourceConfig; combine again.');
  }
  const payload = checkedPayload(config.overrides, config.branchLineKeyMap, config.finalizedMatches, fileName);
  if (config.sha256 !== digest(payload)) throw configError(fileName, 'captured sourceConfig SHA-256 mismatch; combine again.');
  return payload;
}

// Validate every captured row before counting, even for all-empty configs.
// The original X4 manifest (without any X5a fields) remains compatible.
export function modeBSourceConfigWarning(manifest) {
  if (!manifest) return null;
  if (manifest.sourceConfigVersion === undefined &&
      !manifest.sourceOrder?.some?.(row => row && Object.hasOwn(row, 'sourceConfig'))) return null;
  if (manifest.schema !== 'xml-node-offset-combine/v1' || manifest.sourceConfigVersion !== 1
      || !Array.isArray(manifest.sourceOrder) || manifest.sourceOrder.length < 2
      || manifest.sourceOrder.length !== manifest.sourceCount) {
    throw configError('manifest', 'invalid sourceConfigVersion or sourceOrder; combine again.');
  }
  const sources = manifest.sourceOrder.map((row, index) => {
    const config = verifiedSourceConfig(row, index);
    return {
      sourceId: row.sourceId || '', fileName: row.fileName, sourceOrdinal: index + 1,
      overrides: Object.keys(config.overrides).length,
      overrideEntries: Object.values(config.overrides).reduce((sum, group) => sum + Object.keys(group).length, 0),
      branchLineKeyMap: Object.keys(config.branchLineKeyMap).length,
      finalizedMatches: config.finalizedMatches.length,
    };
  });
  if (!sources.some(row => row.overrides || row.branchLineKeyMap || row.finalizedMatches)) return null;
  const detail = sources.map(row => `${row.sourceOrdinal}. ${row.fileName} (${row.sourceId}): overrides=${row.overrides} groups, overrideEntries=${row.overrideEntries}, branchLineKeyMap=${row.branchLineKeyMap}, finalizedMatches=${row.finalizedMatches}`).join('; ');
  return { code: MODE_B_SOURCE_CONFIG_NOT_APPLIED, sources,
    message: `${MODE_B_SOURCE_CONFIG_NOT_APPLIED}: Captured source configuration is NOT applied yet. ${detail}` };
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
