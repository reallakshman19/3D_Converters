import { deepFreeze, text } from '../../contracts/topo-enriched-xml/contract-core.js';
import { runEnrichment } from './sj-enrichment-engine.js?v=4';
import { runTopoEnrichedXmlProduction } from './production/topo-enriched-xml-production.js';

export async function runEnrichmentWithTopology(input, dependencies = {}) {
  const mode = text(input?.operatingMode || input?.config?.psiWriterMode || 'LEGACY').toUpperCase();
  const runLegacy = dependencies.runLegacy || runEnrichment;
  const runProduction = dependencies.runProduction || runTopoEnrichedXmlProduction;
  if (mode === 'LEGACY') return runLegacy(input);
  if (mode === 'SHADOW') {
    const legacy = runLegacy(input);
    const topologyProduction = await runProduction({
      ...input,
      operatingMode: 'SHADOW',
      records: structuredClone(input?.records || legacy.canonicalRecords || legacy.records || []),
      legacyOutput: {
        xmlText: legacy.xmlText,
        trace: [],
        records: structuredClone(legacy.records || []),
        audit: structuredClone(legacy.audit || null),
      },
    });
    return deepFreeze({ ...legacy, topologyProduction });
  }
  return runProduction({
    ...input,
    operatingMode: mode,
    records: structuredClone(input?.records || []),
    legacyOutput: null,
  });
}
