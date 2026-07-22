import { canonicalJson } from './canonical-json.js';
import { validateConnectivity } from './connectivity.js';
import { validateMappingManifest } from './mapping-validator.js';
import { resolveEntryPorts } from './port-resolver.js';
import { projectSourceGraphV1 } from './source-graph-v1-compat.js';
import { writeNativeStagedJson } from './staged-writer.js';

function baseName(name) {
  return String(name || 'model.fbx').replace(/\.[^.]+$/, '');
}

function artifact(name, value) {
  return { name, text: canonicalJson(value), mime: 'application/json;charset=utf-8' };
}

function report(status, diagnostics, counts = {}) {
  return { schema: 'FbxConversionReport.v1', status, diagnostics: [...diagnostics].sort(), counts };
}

function graphCounts(graph) {
  return graph ? {
    sourceObjects: graph.sourceObjects.length,
    occurrences: graph.occurrences.length,
    geometries: graph.geometries.length,
  } : {};
}

function blockedResult(stem, graph, status, diagnostics, ledger = null) {
  const outputs = [];
  if (graph) outputs.push(artifact(`${stem}.fbx-source-graph.json`, graph));
  if (ledger) outputs.push(artifact(`${stem}.fbx-mapping-ledger.json`, ledger));
  outputs.push(artifact(`${stem}.fbx-conversion-report.json`, report(status, diagnostics, graphCounts(graph))));
  return { ok: true, conversionStatus: status, outputs, logs: { stdout: [], stderr: diagnostics } };
}

function mappingLedger(mapping, resolvedByEntry, links) {
  return {
    schema: 'FbxMappingLedger.v1', mappingSchema: mapping.schema,
    scope: mapping.scope, exclusions: mapping.exclusions,
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

function blockedStatus(diagnostic) {
  if (diagnostic.startsWith('BLOCKED_TRANSFORM')) return 'BLOCKED_TRANSFORM';
  if (diagnostic.startsWith('BLOCKED_STAGEDJSON_CONTRACT')) return 'BLOCKED_STAGEDJSON_CONTRACT';
  return 'BLOCKED_MAPPING';
}

function successResult(stem, graph, ledger, staged, counts) {
  const outputs = [
    artifact(`${stem}.fbx-source-graph.json`, graph),
    artifact(`${stem}.fbx-mapping-ledger.json`, ledger),
    artifact(`${stem}.staged.json`, staged),
    artifact(`${stem}.fbx-conversion-report.json`, report('STAGEDJSON_PASS', [
      'PARSE_PASS', 'MAPPING_PASS', 'STAGEDJSON_PASS',
    ], counts)),
  ];
  return { ok: true, conversionStatus: 'STAGEDJSON_PASS', outputs, logs: {
    stdout: ['PARSE_PASS', 'MAPPING_PASS', 'STAGEDJSON_PASS'], stderr: [],
  } };
}

function compatibilityGraph(stem, graph) {
  try {
    return { graph: projectSourceGraphV1(graph), blocked: null };
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    return { graph: null, blocked: blockedResult(stem, graph, 'BLOCKED_PARSE', [diagnostic]) };
  }
}

export async function convertFbxToStagedJson({ bytes, inputName, mapping, mappingError, parse }) {
  const stem = baseName(inputName);
  let graph;
  try {
    graph = await parse(bytes);
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    return blockedResult(stem, null, 'BLOCKED_PARSE', [diagnostic]);
  }
  const compatibility = compatibilityGraph(stem, graph);
  if (compatibility.blocked) return compatibility.blocked;
  if (mappingError) return blockedResult(stem, graph, 'BLOCKED_MAPPING', [mappingError]);
  if (!mapping) return blockedResult(stem, graph, 'BLOCKED_MAPPING', ['Mapping manifest is required.']);
  try {
    const accepted = validateMappingManifest(mapping, compatibility.graph);
    const resolvedByEntry = new Map(accepted.entries.map((entry) => [
      entry.mappingEntryId, resolveEntryPorts(entry, compatibility.graph),
    ]));
    const links = validateConnectivity(accepted.entries, resolvedByEntry);
    const ledger = mappingLedger(accepted, resolvedByEntry, links);
    const staged = writeNativeStagedJson(accepted.entries, resolvedByEntry, links);
    return successResult(stem, graph, ledger, staged, {
      promotedPipes: accepted.entries.length,
      explicitConnections: links.length,
      branches: staged.length,
    });
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    return blockedResult(stem, graph, blockedStatus(diagnostic), [diagnostic]);
  }
}
