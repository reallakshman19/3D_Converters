import { validateWeightSubsets } from '../../converters/xml-cii2019-core/weight-subset-validator.js';
import { getXmlCiiPreviewRuntimeConfig } from './shared/preview-filldown.js?v=20260620-rating-runtime-1';

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function mergeRuntimeOverrides(baseConfig, runtimeConfig) {
  const out = { ...object(baseConfig) };
  const runtimeOverrides = object(object(runtimeConfig).overrides);
  if (!Object.keys(runtimeOverrides).length) return out;
  out.overrides = { ...object(out.overrides) };
  for (const [key, value] of Object.entries(runtimeOverrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.overrides[key] = { ...object(out.overrides[key]), ...value };
    } else if (value != null && String(value).trim()) {
      out.overrides[key] = value;
    }
  }
  return out;
}

function currentDomSupportConfig() {
  const input = document?.querySelector?.('[data-option-key="supportConfigJson"]');
  if (!input || !('value' in input)) return {};
  try { return JSON.parse(input.value) || {}; } catch { return {}; }
}

function activeConfig(baseConfig) {
  return mergeRuntimeOverrides(
    mergeRuntimeOverrides(
      mergeRuntimeOverrides(baseConfig || {}, currentDomSupportConfig()),
      getXmlCiiPreviewRuntimeConfig(),
    ),
    currentDomSupportConfig(),
  );
}

function catalogSummary(validatedIssues) {
  const rows = Array.isArray(validatedIssues) ? validatedIssues : [];
  return {
    total: rows.length,
    flagged: rows.filter((row) => row.validatorIsFlagged).length,
    odd: rows.filter((row) => row.validatorIsOdd).length,
    suspect: rows.filter((row) => row.validatorIsSuspect).length,
    noMatch: rows.filter((row) => row.validatorNoMatch).length,
    standard: rows.filter((row) => row.validatorLengthClass === 'standard').length,
    interpolated: rows.filter((row) => row.validatorLengthClass === 'interpolated').length,
    extrapolated: rows.filter((row) => row.validatorLengthClass === 'extrapolated').length,
  };
}

let installed = false;

/**
 * Compatibility bridge for the old catalog-subset validator.
 *
 * The catalog validator is useful as a diagnostic, but it is not an
 * independent health oracle: the accepted weight may originate from the same
 * catalog candidate used as its expected value. It therefore must not pop up
 * automatically and claim "All good". Consumers that still need these
 * diagnostics can listen for `xml-cii-catalog-weight-validation-ready`.
 */
export function installXmlCiiPostRunValidator(container) {
  if (!container || installed) return;
  installed = true;
  document.addEventListener('xml-cii-weight-validator-ready', (event) => {
    const issues = event.detail?.issues || [];
    if (!issues.length) return;
    const masterRows = event.detail?.masterRows || [];
    const config = activeConfig(event.detail?.config || {});
    const rows = validateWeightSubsets(issues, masterRows, config);
    document.dispatchEvent(new CustomEvent('xml-cii-catalog-weight-validation-ready', {
      detail: {
        rows,
        summary: catalogSummary(rows),
        authority: 'CATALOG_CONSISTENCY_DIAGNOSTIC_NOT_INDEPENDENT_HEALTH_ORACLE',
      },
    }));
  });
}
