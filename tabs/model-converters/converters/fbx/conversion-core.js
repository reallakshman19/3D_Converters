// Build deterministic FBX conversion artifacts and execute validated mapping manifests.
// Inputs are accepted graphs/mappings; outputs preserve blocked states without hidden fallback.
import { canonicalJson } from './canonical-json.js';
import { validateConnectivity, validateConnectivityV2 } from './connectivity.js';
import { validateMappingManifest } from './mapping-validator.js';
import { resolveEntryPorts, resolveEntryPortsV2 } from './port-resolver.js';
import { projectSourceGraphV1 } from './source-graph-v1-compat.js';
import { writeNativeStagedJson, writeNativeStagedJsonV2 } from './staged-writer.js';

export function baseName(name) {
  return String(name || 'model.fbx').replace(/\.[^.]+$/, '');
}

export function artifact(name, value) {
  return { name, text: canonicalJson(value), mime: 'application/json;charset=utf-8' };
}

function report(status, diagnostics, counts) {
  return {
    schema: 'FbxConversionReport.v1',
    status,
    diagnostics: [...diagnostics].sort(),
    counts,
  };
}

function graphCounts(graph) {
  return graph ? {
    sourceObjects: graph.sourceObjects.length,
    occurrences: graph.occurrences.length,
    geometries: graph.geometries.length,
  } : {};
}

export function blockedResult(stem, graph, status, diagnostics, ledger = null) {
  const outputs = [];
  if (graph) outputs.push(artifact(`${stem}.fbx-source-graph.json`, graph));
  if (ledger) outputs.push(artifact(`${stem}.fbx-mapping-ledger.json`, ledger));
  outputs.push(artifact(
    `${stem}.fbx-conversion-report.json`,
    report(status, diagnostics, graphCounts(graph)),
  ));
  return {
    ok: false,
    blocked: true,
    conversionStatus: status,
    outputs,
    logs: { stdout: [], stderr: diagnostics },
  };
}

export function packageBlockedResult(stem, graph, status, diagnostics, binding) {
  const result = blockedResult(stem, graph, status, [...binding.statuses, ...diagnostics]);
  result.outputs.push(artifact(`${stem}.fbx-binding-report.json`, binding));
  result.logs.stdout = [...binding.statuses];
  result.logs.stderr = [...diagnostics];
  return result;
}

export function mappingLedger(mapping, resolvedByEntry, links) {
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
      ...(entry.sourceGeometryObjectIds
        ? { sourceGeometryObjectIds: [...entry.sourceGeometryObjectIds] } : {}),
      ...(entry.engineering ? { engineering: structuredClone(entry.engineering) } : {}),
      ports: resolvedByEntry.get(entry.mappingEntryId),
    })),
    explicitConnections: links.map((link) => link.endpoints),
  };
}

export function blockedStatus(diagnostic) {
  if (diagnostic.startsWith('BLOCKED_TRANSFORM')) return 'BLOCKED_TRANSFORM';
  if (diagnostic.startsWith('BLOCKED_STAGEDJSON_CONTRACT')) {
    return 'BLOCKED_STAGEDJSON_CONTRACT';
  }
  return 'BLOCKED_MAPPING';
}

export function successResult(stem, graph, ledger, staged, counts) {
  const outputs = [
    artifact(`${stem}.fbx-source-graph.json`, graph),
    artifact(`${stem}.fbx-mapping-ledger.json`, ledger),
    artifact(`${stem}.staged.json`, staged),
    artifact(`${stem}.fbx-conversion-report.json`, report('STAGEDJSON_PASS', [
      'PARSE_PASS', 'MAPPING_PASS', 'STAGEDJSON_PASS',
    ], counts)),
  ];
  return {
    ok: true,
    blocked: false,
    conversionStatus: 'STAGEDJSON_PASS',
    outputs,
    logs: {
      stdout: ['PARSE_PASS', 'MAPPING_PASS', 'STAGEDJSON_PASS'],
      stderr: [],
    },
  };
}

export function packageSuccessResult(stem, graph, ledger, staged, counts, binding) {
  const result = successResult(stem, graph, ledger, staged, counts);
  const diagnostics = [...binding.statuses];
  result.outputs[3] = artifact(
    `${stem}.fbx-conversion-report.json`,
    report('STAGEDJSON_PASS', diagnostics, counts),
  );
  result.outputs.push(artifact(`${stem}.fbx-binding-report.json`, binding));
  result.logs.stdout = diagnostics;
  return result;
}

export function compatibilityGraph(stem, graph) {
  try {
    return { graph: projectSourceGraphV1(graph), blocked: null };
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    return {
      graph: null,
      blocked: blockedResult(stem, graph, 'BLOCKED_PARSE', [diagnostic]),
    };
  }
}

export function executeMapping(mapping, graph, compatibility) {
  const v2 = mapping.schema === 'FbxStagedMapping.v2';
  const authorityGraph = v2 ? graph : compatibility;
  const accepted = validateMappingManifest(mapping, authorityGraph);
  const resolve = v2 ? resolveEntryPortsV2 : resolveEntryPorts;
  const resolvedByEntry = new Map(accepted.entries.map((entry) => [
    entry.mappingEntryId, resolve(entry, authorityGraph),
  ]));
  const links = v2
    ? validateConnectivityV2(accepted.entries, resolvedByEntry)
    : validateConnectivity(accepted.entries, resolvedByEntry);
  const staged = v2
    ? writeNativeStagedJsonV2(accepted.entries, resolvedByEntry, links)
    : writeNativeStagedJson(accepted.entries, resolvedByEntry, links);
  return { accepted, resolvedByEntry, links, staged, v2 };
}

export function successCounts(execution) {
  if (!execution.v2) {
    return {
      promotedPipes: execution.accepted.entries.length,
      explicitConnections: execution.links.length,
      branches: execution.staged.length,
    };
  }
  const families = ['PIPE', 'ELBOW', 'TEE', 'REDUCER', 'FLANGE', 'VALVE'];
  const promotedByFamily = Object.fromEntries(families.map((type) => [
    type,
    execution.accepted.entries.filter((entry) => entry.componentType === type).length,
  ]));
  return {
    promotedComponents: execution.accepted.entries.length,
    promotedByFamily,
    explicitConnections: execution.links.length,
    branches: execution.staged.length,
  };
}
