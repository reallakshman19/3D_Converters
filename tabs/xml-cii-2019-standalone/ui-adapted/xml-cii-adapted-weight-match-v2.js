import './xml-cii-adapted-authority-migration.js';
import { DEFAULT_WEIGHT_MASTER_ROWS } from '../../../converters/xml-cii2019-core/default-weight-master-rows.js';
import {
  withXmlCiiEffectiveRigidWeightLegacyView,
  withXmlCiiRigidWeightMatch1,
  xmlCiiEffectiveRigidWeightMap,
} from '../../../converters/xml-cii2019-core/rigid-weight-authority.js?v=20260928-issue776-authority-2';
import {
  saveMasterContextToLocalStorage,
  updateWorkflowState,
  xmlCiiEnrichedConfigFromState,
} from './xml-cii-adapted-state.js';
import { appendEmpiricalWeightValidationReport } from './xml-cii-adapted-weight-validation-report.js?v=20260928-issue776-authority-2';
import { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';
import { materializeMasterDatasetRows, prepareMasterDatasetWeightBasis, rankMasterDatasetWeightIssues } from './xml-cii-adapted-master-dataset-runtime.js?v=20260930-issue781-screenshot-repair-1';
import { installWeightMatchAuthorityPresentation } from './xml-cii-adapted-weight-match-authority-ui.js?v=20260930-issue781-live-acceptance-1';
import { readXmlCiiPreviewRatingSnapshot } from '../../../converters/xml-cii2019-core/preview-rating-snapshot.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function escapeHtml(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasWeightRows(config) {
  return Array.isArray(config?.weight?.masterRows) && config.weight.masterRows.length > 0;
}

function weightBuildAuthority(stateRef, sourceId) {
  const raw = (stateRef.modeABaseRef || stateRef).current || {};
  const batch = raw.sourceBatch;
  const source = sourceId && batch?.activeSourceId !== sourceId
    ? batch.sources?.find((row) => row.sourceId === sourceId)
    : raw;
  const context = raw.masterContext || {};
  return {
    activeSourceId: batch?.activeSourceId || '',
    sourceId: source?.sourceId || sourceId || '',
    sourceText: source?.sourceText || '',
    sourceFile: source?.sourceFile || null,
    stagedJsonText: source?.stagedJsonText || '',
    stagedJsonFile: source?.stagedJsonFile || null,
    branchSelection: JSON.stringify(source?.branchSelection || {}),
    supportConfigJson: source?.supportConfigJson || '',
    sharedSupportConfigJson: batch?.sharedSupportConfigJson || '',
    weightMatchOverridesJson: raw.weightMatchOverridesJson || '',
    masterContext: context,
    masterDatasetRefs: JSON.stringify(context.datasetRefs || {}),
    masterRevisions: JSON.stringify(context.appliedMappingRevision || {}),
  };
}

function sameWeightBuildAuthority(left, right) {
  return Object.keys(left).every((key) => Object.is(left[key], right[key]));
}

function sameWeightSourceAndMaster(left, right) {
  return [
    'activeSourceId', 'sourceId', 'sourceText', 'sourceFile',
    'stagedJsonText', 'stagedJsonFile', 'branchSelection',
    'masterDatasetRefs', 'masterRevisions',
  ].every((key) => Object.is(left[key], right[key]));
}

async function ensureWeightRows(config, masterContext, materializeRows = materializeMasterDatasetRows) {
  const out = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const residentRows = Array.isArray(masterContext?.weightMasterRows) && masterContext.weightMasterRows.length
    ? masterContext.weightMasterRows
    : null;
  const datasetRef = masterContext?.datasetRefs?.weight;

  // Dataset custody is authoritative. If compatibility hydration has been removed,
  // fetch only this master for the current operation instead of accepting defaults.
  if (datasetRef?.datasetId && !residentRows && !hasWeightRows(out)) {
    const rows = await materializeRows('weight', datasetRef);
    if (rows.length !== Number(datasetRef.rowCount || 0)) {
      throw new Error(`Weight dataset materialization mismatch: expected ${Number(datasetRef.rowCount || 0)}, received ${rows.length}.`);
    }
    out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight)
      ? { ...out.weight }
      : {};
    out.weight.masterRows = rows;
    const revision = Number(masterContext?.appliedMappingRevision?.weight || out.weight.masterRevision || 0);
    if (revision > 0) out.weight.masterRevision = revision;
    if (datasetRef.masterFingerprint) out.weight.masterFingerprint = datasetRef.masterFingerprint;
    return out;
  }

  if (hasWeightRows(out)) return out;
  const rows = residentRows || DEFAULT_WEIGHT_MASTER_ROWS;
  out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight)
    ? { ...out.weight }
    : {};
  out.weight.masterRows = rows.map((row) => ({ ...row }));
  return out;
}

export async function weightMatchConfigFromState(state, options = {}) {
  const materializeRows = options.materializeRows || materializeMasterDatasetRows;
  const context = state?.masterContext || {};
  const datasetRef = context?.datasetRefs?.weight;
  const base = compactDatasetBackedConfig(xmlCiiEnrichedConfigFromState(state), context);
  if (datasetRef?.datasetId) {
    const out = { ...base };
    out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight) ? { ...out.weight } : {};
    delete out.weight.masterRows;
    const revision = Number(context?.appliedMappingRevision?.weight ?? out.weight.masterRevision ?? datasetRef.datasetRevision ?? 0);
    if (revision > 0) out.weight.masterRevision = revision;
    if (datasetRef.masterFingerprint) out.weight.masterFingerprint = String(datasetRef.masterFingerprint);
    return out;
  }
  return ensureWeightRows(base, context, materializeRows);
}

function persistConfig(stateRef, config) {
  const compactConfig = compactDatasetBackedConfig(config, stateRef.current.masterContext || {});
  const masterContext = { ...(stateRef.current.masterContext || {}), config: compactConfig };
  stateRef.current = updateWorkflowState(stateRef.current, {
    supportConfigJson: JSON.stringify(compactConfig, null, 2),
    masterContext,
  });
  saveMasterContextToLocalStorage(stateRef.current.masterContext);
}

function ensureOverrides(config) {
  if (!config.overrides || typeof config.overrides !== 'object' || Array.isArray(config.overrides)) {
    config.overrides = {};
  }
  return config.overrides;
}

function changedWeightMap(nextConfig, baseline) {
  const bucket = nextConfig?.overrides?.rigidWeight;
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return {};
  const changes = {};
  for (const [key, rawValue] of Object.entries(bucket)) {
    const value = Number(rawValue);
    if (!key || !Number.isFinite(value) || value <= 0) continue;
    if (Number(baseline?.[key]) !== value) changes[key] = value;
  }
  return changes;
}

function persistSharedWeightMatchConfig(stateRef, nextConfig, baseline, calculationBasis) {
  const current = calculationBasis && hasWeightRows(calculationBasis)
    ? calculationBasis
    : nextConfig;
  const proposalMeta = { ...(nextConfig?.overrides?.rigidWeightProposalMeta || {}) };
  const overrides = {
    ...(nextConfig?.overrides || {}),
    rigidWeight: { ...(current?.overrides?.rigidWeight || {}) },
  };
  delete overrides.rigidWeightProposalMeta;
  const clean = {
    ...nextConfig,
    weight: { ...(nextConfig?.weight || {}), masterRows: [...(current?.weight?.masterRows || [])] },
    overrides,
  };
  const changes = changedWeightMap(nextConfig, baseline);
  for (const [key, provenance] of Object.entries(proposalMeta)) {
    const value = Number(nextConfig?.overrides?.rigidWeight?.[key]);
    if (key && Number.isFinite(value) && value > 0 && provenance && typeof provenance === 'object') changes[key] = value;
  }
  const staged = withXmlCiiRigidWeightMatch1(clean, changes, proposalMeta);
  persistConfig(stateRef, staged);
  return staged;
}

export function renderAdaptedWeightMatchPanelV2(card, stateRef) {
  card.__xmlCiiWeightAuthorityPresentationCleanup?.();
  card.__xmlCiiWeightAuthorityPresentationCleanup = null;
  card.__xmlCiiWeightBuildSnapshotCleanup?.();
  card.__xmlCiiWeightBuildSnapshotCleanup = null;
  card.innerHTML = '<div class="model-converters-workflow-detail-note">Loading shared Weight Match authority…</div>';
  void (async () => {
    try {
      const renderer = await import('../../model-converters/converters/xmltocii2019_helper/weight-match-renderer.js?v=20260930-issue781-weight-no-staged-rewrite-1');
      if (
        typeof renderer.xmlCiiRenderWeightMatchPhase !== 'function'
        || typeof renderer.bindXmlCiiWeightMatchPhase !== 'function'
      ) {
        throw new Error('Shared Weight Match renderer contract is incomplete.');
      }
      const state = stateRef.current;
      const weightDatasetRef = state?.masterContext?.datasetRefs?.weight || null;
      let renderedAuthority = weightBuildAuthority(stateRef, state.modeASourceId);
      let buildSnapshot = null;
      const currentBuild = () => {
        if (buildSnapshot) return buildSnapshot;
        const authority = weightBuildAuthority(stateRef, state.modeASourceId);
        // The filtered Mode A scope is deterministic for this raw source authority.
        // Reuse the rendered scope only while every relevant input still matches.
        if (!sameWeightBuildAuthority(authority, renderedAuthority)) {
          throw new Error('Weight Match source, selection, staged JSON, or master changed. Reopen Weight Match and build again.');
        }
        buildSnapshot = {
          state: { ...state, masterContext: authority.masterContext },
          authority,
          ratingRevision: readXmlCiiPreviewRatingSnapshot().revision,
        };
        return buildSnapshot;
      };
      const assertCurrentBuild = (request = {}) => {
        const snapshot = currentBuild();
        if (!sameWeightBuildAuthority(snapshot.authority, weightBuildAuthority(stateRef, snapshot.state.modeASourceId))
          || readXmlCiiPreviewRatingSnapshot().revision !== snapshot.ratingRevision
          || (request.snapshot && request.snapshot.revision !== snapshot.ratingRevision)) {
          throw new Error('Weight Match authority changed during this build. Reopen Weight Match and build again.');
        }
        return snapshot.state;
      };
      let calculationBasis = await weightMatchConfigFromState(state);
      const rendererConfig = withXmlCiiEffectiveRigidWeightLegacyView(calculationBasis);
      let baseline = xmlCiiEffectiveRigidWeightMap(calculationBasis);
      const xmlFile = state.sourceFile || (state.sourceText
        ? new File([state.sourceText], 'source.xml', { type: 'application/xml' })
        : null);
      card.innerHTML = renderer.xmlCiiRenderWeightMatchPhase();
      const resetBuildSnapshot = (event) => {
        if (!event.target.closest?.('#mc-wm-refresh, #mc-wm-use-dtxr-rating')) return;
        if (card.querySelector('#mc-wm-refresh')?.dataset.wmBusy === 'true') return;
        buildSnapshot = null;
      };
      card.addEventListener('click', resetBuildSnapshot, true);
      card.__xmlCiiWeightBuildSnapshotCleanup = () => card.removeEventListener('click', resetBuildSnapshot, true);
      renderer.bindXmlCiiWeightMatchPhase(card, {
        xmlFile,
        stagedJsonText: state.stagedJsonText || '',
        config: rendererConfig,
        weightDatasetRef,
        rankWeightIssues: weightDatasetRef?.datasetId ? async (issues, request = {}) => {
          const currentContext = assertCurrentBuild(request).masterContext || {};
          const compactConfig = compactDatasetBackedConfig(request.config || rendererConfig, currentContext);
          const result = await rankMasterDatasetWeightIssues('weight', weightDatasetRef.datasetId, issues, compactConfig, {
            ratingMode: request.ratingMode || 'preview',
            previewRatingSnapshot: request.snapshot || {},
          });
          assertCurrentBuild(request);
          return result;
        } : null,
        prepareWeightBasis: async (request = {}) => {
          const currentContext = assertCurrentBuild(request).masterContext || {};
          const compactConfig = compactDatasetBackedConfig(request.config || rendererConfig, currentContext);
          const result = await prepareMasterDatasetWeightBasis({
            xmlText: request.xmlText || '',
            stagedJsonText: request.stagedJsonText || '',
            config: compactConfig,
            datasetRefs: { ...(currentContext.datasetRefs || {}) },
            ratingMode: request.ratingMode || 'preview',
            previewRatingSnapshot: request.snapshot || {},
          }, { onProgress: request.onProgress });
          assertCurrentBuild(request);
          return result;
        },
        resolveWeightValidationMasterRows: weightDatasetRef?.datasetId
          ? async () => materializeMasterDatasetRows('weight', weightDatasetRef)
          : async () => calculationBasis?.weight?.masterRows || [],
        onSaveConfig: (nextConfig) => {
          const saved = persistSharedWeightMatchConfig(stateRef, nextConfig, baseline, calculationBasis);
          calculationBasis = saved;
          baseline = xmlCiiEffectiveRigidWeightMap(saved);
          const nextAuthority = weightBuildAuthority(stateRef, state.modeASourceId);
          if (card.querySelector('#mc-wm-refresh')?.dataset.wmBusy !== 'true'
            && sameWeightSourceAndMaster(renderedAuthority, nextAuthority)) {
            renderedAuthority = nextAuthority;
            buildSnapshot = null;
          }
        },
        ensureOverrides,
        resolveStagedJsonText: async () => ({
          text: assertCurrentBuild().stagedJsonText || '',
          label: assertCurrentBuild().stagedJsonFile?.name || '',
        }),
      });
      card.__xmlCiiWeightAuthorityPresentationCleanup = installWeightMatchAuthorityPresentation(card);
      appendEmpiricalWeightValidationReport(card, stateRef);
    } catch (error) {
      card.innerHTML = `<div class="model-converters-workflow-detail-note" style="border-color:#b91c1c;color:#fecaca;background:#450a0a;">Weight Match was not started because the shared Preview Rating authority could not load: ${escapeHtml(error?.message || error)}</div>`;
      console.error('Standalone Weight Match authority load failed:', error);
    }
  })();
}
