import {
  ensureXmlCiiBranchSelectionState as ensureBaseBranchSelectionState,
} from './xml-cii-adapted-branch-scope.js?v=20260804-branch-scope-v1';
import { xmlCiiBranchScopeFromState } from '../xml-cii-branch-scope.js?v=20260804-branch-scope-v1';

const PROCESSING_PHASES = new Set([
  'regex', 'json-trace', 'preview', 'diagnostics', 'matched-audit',
  'weight-match', 'support-mapper', 'config', 'run',
]);

export function ensureXmlCiiBranchSelectionState(state = {}) {
  if (state.branchScope?.manifest) return state;
  return ensureBaseBranchSelectionState(state);
}

export function ensureXmlCiiBranchSelectionInRef(stateRef) {
  if (!stateRef?.current) return;
  stateRef.current = ensureXmlCiiBranchSelectionState(stateRef.current);
}

function processingState(base) {
  if (!PROCESSING_PHASES.has(base.activePhaseId)) return base;
  const normalized = ensureXmlCiiBranchSelectionState(base);
  const scope = xmlCiiBranchScopeFromState(normalized);
  return {
    ...normalized,
    sourceFile: null,
    stagedJsonFile: null,
    sourceText: scope.filteredSourceText,
    stagedJsonText: scope.filteredStagedJsonText,
    branchScope: scope,
    sourceNameOverride: base.sourceFile?.name || base.sourceNameOverride || '',
  };
}

function inputFileChanged(base, next) {
  return (!!next?.sourceFile && next.sourceFile !== base.sourceFile)
    || (!!next?.stagedJsonFile && next.stagedJsonFile !== base.stagedJsonFile);
}

export function createXmlCiiBranchScopedStateRef(baseRef) {
  return {
    get current() {
      return processingState(baseRef.current);
    },
    set current(next) {
      const base = baseRef.current;
      if (!PROCESSING_PHASES.has(base.activePhaseId)) {
        baseRef.current = { ...next, branchScope: null };
        return;
      }
      if (inputFileChanged(base, next)) {
        const sourceChanged = !!next?.sourceFile && next.sourceFile !== base.sourceFile;
        baseRef.current = ensureXmlCiiBranchSelectionState({
          ...next,
          branchScope: null,
          branchSelection: sourceChanged ? {} : base.branchSelection,
        });
        return;
      }
      const resetToEmpty = next?.activePhaseId === 'source' && !next?.sourceText && !next?.sourceFile;
      baseRef.current = resetToEmpty ? { ...next, branchScope: null } : {
        ...next,
        sourceText: base.sourceText,
        sourceFile: base.sourceFile,
        stagedJsonText: base.stagedJsonText,
        stagedJsonFile: base.stagedJsonFile,
        branchSelection: next?.branchSelection || base.branchSelection,
        branchScope: null,
        sourceNameOverride: base.sourceNameOverride,
      };
    },
  };
}