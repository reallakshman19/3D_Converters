import { canonicalJson } from './canonical-json.js';
import { validateConnectivity } from './connectivity.js';
import { validateMappingManifest } from './mapping-validator.js';
import { resolveEntryPorts } from './port-resolver.js';
import { writeNativeStagedJson } from './staged-writer.js';

function baseName(name) {
  return String(name || 'model.fbx').replace(/\.[^.]+$/, '');
}

function artifact(name, value) {
  return { name, text: canonicalJson(value), mime: 'application/json;charset=utf-8' };
}

function report(status, diagnostics, counts = {}) {
  return {
    schema: 'FbxConversionReport.v1',
    status,
    diagnostics: [...diagnostics].sort(),
    counts,
  };
}

function blockedResult(stem, graph, status, diagnostics, ledger = null) {
  const outputs = [artifact(`${stem}.fbx-source-graph.json`, graph)];
  if (ledger) outputs.push(artifact(`${stem}.fbx-mapping-ledger.json`, ledger));
  outputs.push(artifact(`${stem}.fbx-conversion-report.json`, report(status, diagnostics, {
    sourceObjects: graph.sourceObjects.length,
    occurrences: graph.occurrences.length,
    geometries: graph.geometries.length,
  })));
  return { ok: true, conversionStatus: status, outputs, logs: { stdout: [], stderr: diagnostics } };
}

function mappingLedger(mapping, resolvedByEntry, links) {
  return {
    schema: 'FbxMappingLedger.v1',
    mappingSchema: mapping.schema,
    scope: mapping.scope,
    exclusions: mapping.exclusions,
    promoted: mapping.entries.map((entry) => ({
      mappingEntryId: entry.mappingEntryId,
      logicalComponentId: entry.logicalComponentId,
      sourceModelObjectId: entry.sourceModelObjectId,
      sourceOccurrenceId: entry.sourceOccurrenceId,
      componentType: entry.componentType,
      ports: resolvedByEntry.get(entry.mappingEntryId),
    })),
    explicitConnections: links.map((link) => link.endpoints),
  };
}

export async function convertFbxToStagedJson({ bytes, inputName, mapping, parse }) {
  const stem = baseName(inputName);
  let graph;
  try {
    graph = await parse(bytes);
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    const emptyGraph = { schema: 'FbxSourceGraph.v1', sourceObjects: [], occurrences: [], geometries: [] };
    return blockedResult(stem, emptyGraph, 'BLOCKED_PARSE', [diagnostic]);
  }
  if (!mapping) return blockedResult(stem, graph, 'BLOCKED_MAPPING', ['Mapping manifest is required.']);
  try {
    const accepted = validateMappingManifest(mapping, graph);
    const resolvedByEntry = new Map(accepted.entries.map((entry) => [
      entry.mappingEntryId, resolveEntryPorts(entry, graph),
    ]));
    const links = validateConnectivity(accepted.entries, resolvedByEntry);
    const ledger = mappingLedger(accepted, resolvedByEntry, links);
    const staged = writeNativeStagedJson(accepted.entries, resolvedByEntry, links);
    const outputs = [
      artifact(`${stem}.fbx-source-graph.json`, graph),
      artifact(`${stem}.fbx-mapping-ledger.json`, ledger),
      artifact(`${stem}.staged.json`, staged),
      artifact(`${stem}.fbx-conversion-report.json`, report('STAGEDJSON_PASS', [
        'PARSE_PASS', 'MAPPING_PASS', 'STAGEDJSON_PASS',
      ], { promotedPipes: accepted.entries.length, explicitConnections: links.length })),
    ];
    return { ok: true, conversionStatus: 'STAGEDJSON_PASS', outputs, logs: {
      stdout: ['PARSE_PASS', 'MAPPING_PASS', 'STAGEDJSON_PASS'], stderr: [],
    } };
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    const status = diagnostic.startsWith('BLOCKED_TRANSFORM') ? 'BLOCKED_TRANSFORM' : 'BLOCKED_MAPPING';
    return blockedResult(stem, graph, status, [diagnostic]);
  }
}
