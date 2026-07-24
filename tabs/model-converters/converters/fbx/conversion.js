import { canonicalJson } from './canonical-json.js';
import {
  addBinding, addMappingBinding, addStatus, createBindingReport,
  failBindingReport, finishBindingReport, invalidBindingReport,
} from './binding-report.js';
import { validateConnectivity, validateConnectivityV2 } from './connectivity.js';
import {
  BindingFailure, isMappingPackage, observeSource, validateMappingPackageShape,
  verifyMappingBinding, verifyParserBinding, verifySourceBinding, verifySourceGraphBinding,
} from './mapping-package.js';
import { validateMappingManifest } from './mapping-validator.js';
import { resolveEntryPorts, resolveEntryPortsV2 } from './port-resolver.js';
import { projectSourceGraphV1 } from './source-graph-v1-compat.js';
import { writeNativeStagedJson, writeNativeStagedJsonV2 } from './staged-writer.js';

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

function packageBlockedResult(stem, graph, status, diagnostics, binding) {
  const result = blockedResult(stem, graph, status, [...binding.statuses, ...diagnostics]);
  result.outputs.push(artifact(`${stem}.fbx-binding-report.json`, binding));
  result.logs.stdout = [...binding.statuses];
  result.logs.stderr = [...diagnostics];
  return result;
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
      ...(entry.sourceGeometryObjectIds ? { sourceGeometryObjectIds: [...entry.sourceGeometryObjectIds] } : {}),
      ...(entry.engineering ? { engineering: structuredClone(entry.engineering) } : {}),
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

function packageSuccessResult(stem, graph, ledger, staged, counts, binding) {
  const result = successResult(stem, graph, ledger, staged, counts);
  const diagnostics = [...binding.statuses];
  result.outputs[3] = artifact(`${stem}.fbx-conversion-report.json`, report('STAGEDJSON_PASS', diagnostics, counts));
  result.outputs.push(artifact(`${stem}.fbx-binding-report.json`, binding));
  result.logs.stdout = diagnostics;
  return result;
}

function compatibilityGraph(stem, graph) {
  try {
    return { graph: projectSourceGraphV1(graph), blocked: null };
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    return { graph: null, blocked: blockedResult(stem, graph, 'BLOCKED_PARSE', [diagnostic]) };
  }
}

function executeMapping(mapping, graph, compatibility) {
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

function successCounts(execution) {
  if (!execution.v2) return {
    promotedPipes: execution.accepted.entries.length,
    explicitConnections: execution.links.length,
    branches: execution.staged.length,
  };
  const byFamily = Object.fromEntries(['PIPE', 'ELBOW', 'TEE', 'REDUCER', 'FLANGE', 'VALVE'].map((type) => [
    type, execution.accepted.entries.filter((entry) => entry.componentType === type).length,
  ]));
  return {
    promotedComponents: execution.accepted.entries.length,
    promotedByFamily: byFamily,
    explicitConnections: execution.links.length,
    branches: execution.staged.length,
  };
}
function diagnosticOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function failureStatus(error, fallback) {
  return error instanceof BindingFailure ? error.status : fallback;
}
function packageFailure(stem, graph, reportValue, error, fallback) {
  const diagnostic = diagnosticOf(error), status = failureStatus(error, fallback);
  const binding = failBindingReport(reportValue, status, diagnostic, error?.evidence);
  return packageBlockedResult(stem, graph, status, [diagnostic], binding);
}
function createValidatedBinding(packageValue) {
  validateMappingPackageShape(packageValue);
  return createBindingReport(packageValue);
}
async function addSourceBinding(binding, packageValue, bytes) {
  return addBinding(binding, 'source', verifySourceBinding(packageValue, await observeSource(bytes)));
}
function addParserBinding(binding, packageValue, parserEvidence, parserEvidenceError) {
  if (parserEvidenceError) {
    const detail = parserEvidenceError.replace(/^BLOCKED_PARSER_BINDING\s+/, '');
    throw new BindingFailure('BLOCKED_PARSER_BINDING', detail);
  }
  if (!parserEvidence) throw new BindingFailure('BLOCKED_PARSER_BINDING', 'Repository parser evidence is unavailable.');
  return addBinding(binding, 'parser', verifyParserBinding(packageValue, parserEvidence));
}
async function parsePackageSource(bytes, parse, binding) {
  try {
    const graph = await parse(bytes);
    return { graph, binding: addStatus(binding, 'PARSE_PASS') };
  } catch (error) {
    throw new BindingFailure('BLOCKED_PARSE', diagnosticOf(error));
  }
}

async function packageConversion(options) {
  const { bytes, stem, packageValue, parse, parserEvidence, parserEvidenceError } = options;
  let binding;
  try {
    binding = createValidatedBinding(packageValue);
  } catch (error) {
    const reportValue = invalidBindingReport(failureStatus(error, 'BLOCKED_MAPPING_BINDING'), diagnosticOf(error));
    return packageFailure(stem, null, reportValue, error, 'BLOCKED_MAPPING_BINDING');
  }
  try {
    binding = await addSourceBinding(binding, packageValue, bytes);
  } catch (error) {
    return packageFailure(stem, null, binding, error, 'BLOCKED_SOURCE_BINDING');
  }
  try {
    binding = addParserBinding(binding, packageValue, parserEvidence, parserEvidenceError);
  } catch (error) {
    return packageFailure(stem, null, binding, error, 'BLOCKED_PARSER_BINDING');
  }
  const parsed = await packageParsedResult({ bytes, stem, parse, binding });
  if (parsed.blocked) return parsed.blocked;
  return packageGraphResult({ ...options, graph: parsed.graph, binding: parsed.binding });
}

async function packageParsedResult({ bytes, stem, parse, binding }) {
  try {
    const parsed = await parsePackageSource(bytes, parse, binding);
    return { ...parsed, blocked: null };
  } catch (error) {
    return { blocked: packageFailure(stem, null, binding, error, 'BLOCKED_PARSE') };
  }
}

async function packageGraphResult(options) {
  const { stem, packageValue, graph } = options;
  let { binding } = options;
  try {
    binding = addBinding(binding, 'sourceGraph', await verifySourceGraphBinding(packageValue, graph));
  } catch (error) {
    return packageFailure(stem, graph, binding, error, 'BLOCKED_SOURCE_GRAPH_BINDING');
  }
  const compatibility = compatibilityGraph(stem, graph);
  if (compatibility.blocked) return packageCompatibilityFailure(stem, graph, binding, compatibility);
  return packageMappingResult({ ...options, binding, compatibility: compatibility.graph });
}

function packageCompatibilityFailure(stem, graph, binding, compatibility) {
  const diagnostic = compatibility.blocked.logs.stderr[0] || 'FbxSourceGraph.v1 compatibility projection failed.';
  const error = new BindingFailure('BLOCKED_PARSE', diagnostic);
  return packageFailure(stem, graph, binding, error, 'BLOCKED_PARSE');
}

async function packageMappingResult(options) {
  const { stem, packageValue, graph, compatibility } = options;
  let { binding } = options;
  try {
    binding = addMappingBinding(binding, await verifyMappingBinding(packageValue));
  } catch (error) {
    return packageFailure(stem, graph, binding, error, 'BLOCKED_MAPPING_BINDING');
  }
  try {
    const execution = executeMapping(packageValue.mapping.manifest, graph, compatibility);
    const ledger = mappingLedger(execution.accepted, execution.resolvedByEntry, execution.links);
    binding = finishBindingReport(addStatus(addStatus(binding, 'MAPPING_PASS'), 'STAGEDJSON_PASS'), 'STAGEDJSON_PASS');
    return packageSuccessResult(stem, graph, ledger, execution.staged, successCounts(execution), binding);
  } catch (error) {
    const status = blockedStatus(diagnosticOf(error));
    return packageFailure(stem, graph, binding, error, status);
  }
}

async function legacyConversion({ bytes, stem, mapping, parse }) {
  let graph;
  try {
    graph = await parse(bytes);
  } catch (error) {
    return blockedResult(stem, null, 'BLOCKED_PARSE', [diagnosticOf(error)]);
  }
  const compatibility = compatibilityGraph(stem, graph);
  if (compatibility.blocked) return compatibility.blocked;
  try {
    const execution = executeMapping(mapping, graph, compatibility.graph);
    const ledger = mappingLedger(execution.accepted, execution.resolvedByEntry, execution.links);
    return successResult(stem, graph, ledger, execution.staged, successCounts(execution));
  } catch (error) {
    const diagnostic = diagnosticOf(error);
    return blockedResult(stem, graph, blockedStatus(diagnostic), [diagnostic]);
  }
}

function markLegacy(result) {
  return { ...result, logs: { ...result.logs, stdout: ['UNBOUND_LEGACY_MAPPING', ...result.logs.stdout] } };
}

export async function convertFbxToStagedJson({
  bytes, inputName, mapping, mappingError, parse, parserEvidence, parserEvidenceError,
}) {
  const stem = baseName(inputName);
  if (mappingError || !mapping) {
    const diagnostic = mappingError || 'Mapping manifest is absent. StagedJSON conversion skipped. FBX Source Graph extracted successfully.';
    return legacyMappingProblem({ bytes, stem, parse, diagnostic });
  }
  if (isMappingPackage(mapping)) {
    return packageConversion({
      bytes, stem, packageValue: mapping, parse, parserEvidence, parserEvidenceError,
    });
  }
  return markLegacy(await legacyConversion({ bytes, stem, mapping, parse }));
}

async function legacyMappingProblem({ bytes, stem, parse, diagnostic }) {
  let graph;
  try {
    graph = await parse(bytes);
  } catch (error) {
    return blockedResult(stem, null, 'BLOCKED_PARSE', [diagnosticOf(error)]);
  }
  const compatibility = compatibilityGraph(stem, graph);
  if (compatibility.blocked) return compatibility.blocked;
  return blockedResult(stem, graph, 'BLOCKED_MAPPING', [diagnostic]);
}
