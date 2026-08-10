import { DEFAULT_WEIGHT_MASTER_ROWS } from '../../../converters/xml-cii2019-core/default-weight-master-rows.js';
import {
  collectXmlCiiWeightIdentityRows,
  migrateXmlCiiWeightDecisionMap,
  xmlCiiWeightSourceId,
} from '../../../converters/xml-cii2019-core/weight-component-identity.js';
import {
  saveMasterContextToLocalStorage,
  xmlCiiEnrichedConfigFromState,
} from './xml-cii-adapted-state.js';

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

function ensureWeightRows(config, masterContext) {
  const out = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  if (hasWeightRows(out)) return out;
  const rows = Array.isArray(masterContext?.weightMasterRows) && masterContext.weightMasterRows.length
    ? masterContext.weightMasterRows
    : DEFAULT_WEIGHT_MASTER_ROWS;
  out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight)
    ? { ...out.weight }
    : {};
  out.weight.masterRows = rows.map((row) => ({ ...row }));
  return out;
}

function persistConfig(stateRef, config) {
  const context = stateRef.current.masterContext || {};
  context.config = config;
  stateRef.current = {
    ...stateRef.current,
    supportConfigJson: JSON.stringify(config, null, 2),
    masterContext: { ...context, config },
  };
  saveMasterContextToLocalStorage(stateRef.current.masterContext);
}

function ensureOverrides(config) {
  if (!config.overrides || typeof config.overrides !== 'object' || Array.isArray(config.overrides)) {
    config.overrides = {};
  }
  return config.overrides;
}

function migrateMatch1ToPhysicalIdentity(stateRef, config) {
  const state = stateRef.current || {};
  const sourceText = state.sourceText || '';
  const rows = collectXmlCiiWeightIdentityRows(sourceText);
  const sourceId = xmlCiiWeightSourceId({
    sourceText,
    sourceId: state.sourceBatch?.activeSourceId || '',
    config,
  });
  config.weightIdentity = {
    ...(config.weightIdentity || {}),
    schema: 'xml-cii-weight-source-identity/v1',
    sourceId,
  };
  const migrated = migrateXmlCiiWeightDecisionMap(
    config?.overrides?.rigidWeightMatch1 || {},
    rows,
    { sourceText, sourceId, config },
  );
  config.overrides = { ...(config.overrides || {}), rigidWeightMatch1: migrated.accepted };
  delete config.overrides.rigidWeight;
  config.weightReviewLifecycle = {
    ...(config.weightReviewLifecycle || {}),
    schema: 'xml-cii-weight-review-lifecycle/v2',
    match1Identity: 'physical-component',
    match1SourceId: sourceId,
    match1PhysicalMigrationCount: migrated.migrations.length,
    unresolvedLegacyMatch1Keys: migrated.unmatched,
  };
  return config;
}

export function renderAdaptedWeightMatchPanelV2(card, stateRef) {
  card.innerHTML = '<div class="model-converters-workflow-detail-note">Loading shared Weight Match authority…</div>';
  void (async () => {
    try {
      const [renderer, parity] = await Promise.all([
        import('../../model-converters/converters/xmltocii2019_helper/weight-match-renderer.js'),
        import('../xml-cii-standalone-run-parity.js'),
      ]);
      const shared = await parity.loadParentWeightMatchModules();
      if (
        typeof renderer.xmlCiiRenderWeightMatchPhase !== 'function'
        || typeof shared.bindXmlCiiWeightMatchPhase !== 'function'
        || typeof shared.enrichXmlForCii2019 !== 'function'
      ) {
        throw new Error('Shared Weight Match renderer contract is incomplete.');
      }
      const state = stateRef.current;
      const config = ensureWeightRows(xmlCiiEnrichedConfigFromState(state), state.masterContext);
      const xmlFile = state.sourceFile || (state.sourceText
        ? new File([state.sourceText], 'source.xml', { type: 'application/xml' })
        : null);
      card.innerHTML = renderer.xmlCiiRenderWeightMatchPhase();
      shared.bindXmlCiiWeightMatchPhase(card, {
        xmlFile,
        stagedJsonText: state.stagedJsonText || '',
        config,
        enrichXmlForCii2019: shared.enrichXmlForCii2019,
        onSaveConfig: (nextConfig) => persistConfig(stateRef, migrateMatch1ToPhysicalIdentity(stateRef, nextConfig)),
        ensureOverrides,
        resolveStagedJsonText: async () => ({
          text: stateRef.current.stagedJsonText || '',
          label: stateRef.current.stagedJsonFile?.name || '',
        }),
      });
    } catch (error) {
      card.innerHTML = `<div class="model-converters-workflow-detail-note" style="border-color:#b91c1c;color:#fecaca;background:#450a0a;">Weight Match was not started because the shared Preview Rating authority could not load: ${escapeHtml(error?.message || error)}</div>`;
      console.error('Standalone Weight Match authority load failed:', error);
    }
  })();
}
