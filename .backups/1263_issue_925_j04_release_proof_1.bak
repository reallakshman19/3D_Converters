/** Release custody for explicitly configured branch formats.
 * Evaluates every selected occurrence, independently of Regex's interactive sample cap. */
import { extractBranchFieldsWithFormats } from '../../converters/xml-cii2019-core/branch-format-extraction.js';

function text(value) { return String(value ?? '').trim(); }
function configured(config) {
  return Array.isArray(config?.regexTester?.formats) || Array.isArray(config?.formats);
}

/** branchOccurrences: occurrence rows with branchName and optional branchOccurrenceId. */
export function auditConfiguredBranchFormats(branchOccurrences = [], config = {}, previewRows = null) {
  const required = configured(config);
  const source = Array.isArray(branchOccurrences) ? branchOccurrences : [];
  if (!required) return { required: false, checkedCount: 0, blocked: false, failures: [] };
  const failures = [];
  const expected = source.map((branch, index) => {
    const result = extractBranchFieldsWithFormats(branch.branchName, config);
    if (result.status !== 'MATCHED') failures.push({
      branchName: branch.branchName, branchOccurrenceId: branch.branchOccurrenceId || '',
      occurrenceIndex: index, status: result.status, reason: 'FORMAT_UNRESOLVED',
    });
    return result;
  });
  if (Array.isArray(previewRows)) {
    for (let index = 0; index < source.length; index += 1) {
      const branch = source[index], actual = previewRows[index], identity = expected[index];
      if (!actual || text(actual.branchName) !== text(branch.branchName)) {
        failures.push({ branchName: branch.branchName, occurrenceIndex: index,
          status: 'MISSING_PREVIEW_PROOF', reason: 'OCCURRENCE_MISMATCH' });
        continue;
      }
      if (identity.status !== 'MATCHED') continue;
      if (actual.extractionStatus !== 'MATCHED' || actual.branchIdentityConflict
        || !text(actual.lineKey) || !text(actual.pipingClass)) {
        failures.push({ branchName: branch.branchName, occurrenceIndex: index,
          status: actual.extractionStatus || 'MISSING_PREVIEW_PROOF',
          reason: actual.branchIdentityConflict || 'PREVIEW_AUTHORITY_BLOCKED' });
      }
    }
    if (previewRows.length !== source.length) failures.push({
      status: 'MISSING_PREVIEW_PROOF', reason: 'POPULATION_COUNT_MISMATCH',
      expectedCount: source.length, actualCount: previewRows.length,
    });
  }
  return { required: true, checkedCount: source.length,
    blocked: failures.length > 0, failures };
}
