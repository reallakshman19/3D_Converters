import { canonicalComparisonJson, createComparisonIdentity, graphComparisonIdentity } from './comparison-identity.js';
import { createMasterAttachmentSetIdentity, validateMasterFieldBindingConfig } from './comparison-binding.js';
import { findJsonSafetyErrors } from './extraction-rule.js';
import { normalizeComparisonValue } from './comparison-normalize.js';
import { sha256Hex } from './source-envelope.js';

function list(value) { return Array.isArray(value) ? value : []; }

function addSchemaError(errors, artifact, schema, label) {
  if (artifact?.schema !== schema) errors.push(`${label} schema must be ${schema}.`);
  if (!artifact?.validation?.ok) errors.push(`${label} validation status is not valid.`);
}

function metadataMismatch(artifact, graph) {
  const expected = graphComparisonIdentity(graph);
  return Object.entries(expected).some(([key, value]) => artifact?.[key] !== value);
}

function contiguousErrors(items, label, idKey, orderKey = 'sourceOrder') {
  const errors = []; const ids = new Set();
  items.forEach((item, index) => {
    if (item?.[orderKey] !== index) errors.push(`${label} ${index} order mismatch.`);
    const id = item?.[idKey];
    if (id && ids.has(id)) errors.push(`${label} contains duplicate identity ${id}.`);
    if (id) ids.add(id);
  });
  return errors;
}

function graphErrors(graph) {
  const errors = []; addSchemaError(errors, graph, 'UniversalSourceGraph.v1', 'Graph');
  if (!Array.isArray(graph?.entities)) errors.push('Graph entities must be an array.');
  else errors.push(...contiguousErrors(graph.entities, 'Graph entity', 'entityId'));
  return errors;
}

function ledgerErrors(ledger, graph) {
  const errors = []; addSchemaError(errors, ledger, 'FieldCandidateLedger.v1', 'Candidate ledger');
  if (metadataMismatch(ledger, graph)) errors.push('Candidate ledger graph identity mismatch.');
  if (!Array.isArray(ledger?.entries)) return [...errors, 'Candidate ledger entries must be an array.'];
  errors.push(...contiguousErrors(ledger.entries, 'Candidate ledger entry', 'entryId'));
  const candidateIds = new Set();
  ledger.entries.forEach((entry, index) => {
    if (!['candidate','rejected'].includes(entry.status)) errors.push(`Ledger entry ${index} status is invalid.`);
    if (entry.status === 'rejected' && entry.candidates?.length) errors.push(`Rejected ledger entry ${index} contains candidates.`);
    if (!Array.isArray(entry.candidates)) errors.push(`Ledger entry ${index} candidates must be an array.`);
    for (const candidate of list(entry.candidates)) {
      if (candidateIds.has(candidate.candidateId)) errors.push(`Duplicate candidate ID ${candidate.candidateId}.`);
      candidateIds.add(candidate.candidateId);
    }
  });
  return errors;
}

function datasetErrors(dataset, attachment) {
  const errors = [];
  if (dataset?.schema !== 'MasterDataset.v1' || !dataset?.validation?.ok) errors.push(`Dataset ${attachment.datasetId} is absent or invalid.`);
  if (dataset?.datasetRole !== attachment.datasetRole) errors.push(`Dataset ${attachment.datasetId} role mismatch.`);
  if (!Array.isArray(dataset?.columns) || !Array.isArray(dataset?.rows)) errors.push(`Dataset ${attachment.datasetId} table structure is invalid.`);
  errors.push(...contiguousErrors(list(dataset?.columns), `Dataset ${attachment.datasetId} column`, 'columnId'));
  errors.push(...contiguousErrors(list(dataset?.rows), `Dataset ${attachment.datasetId} row`, 'rowId'));
  const columns = new Set(list(dataset?.columns).map((item) => item.columnId));
  for (const row of list(dataset?.rows)) {
    if ([...columns].some((id) => !Object.hasOwn(row.values || {}, id))) errors.push(`Dataset row ${row.rowId} is missing a column value.`);
  }
  return errors;
}

function attachmentErrors(attachmentSet, graph, registry) {
  const errors = []; addSchemaError(errors, attachmentSet, 'MasterAttachmentSet.v1', 'Attachment set');
  if (metadataMismatch(attachmentSet, graph)) errors.push('Attachment-set graph identity mismatch.');
  if (!Array.isArray(attachmentSet?.attachments)) return [...errors, 'Attachment references must be an array.'];
  const datasets = new Map(list(registry?.datasets).map((item) => [item.datasetId, item]));
  const seen = new Set();
  attachmentSet.attachments.forEach((item, index) => {
    if (item.attachmentOrder !== index) errors.push(`Attachment ${index} order mismatch.`);
    if (seen.has(item.datasetId)) errors.push(`Duplicate attachment ${item.datasetId}.`); seen.add(item.datasetId);
    errors.push(...datasetErrors(datasets.get(item.datasetId), item));
  });
  return errors;
}

function ledgerCandidateMap(ledger) {
  const map = new Map();
  for (const entry of list(ledger?.entries)) {
    if (entry.status !== 'candidate') continue;
    for (const candidate of list(entry.candidates)) map.set(candidate.candidateId, { entry, candidate });
  }
  return map;
}

function registryEvidence(registry) {
  const datasets = new Map();
  for (const dataset of list(registry?.datasets)) {
    const rows = new Map(list(dataset.rows).map((row) => [row.rowId, row]));
    const columns = new Map(list(dataset.columns).map((column) => [column.columnId, column]));
    datasets.set(dataset.datasetId, { dataset, rows, columns });
  }
  return datasets;
}

function resultReferenceErrors(run, ledger, config, attachmentSet, registry) {
  const errors = []; const candidates = ledgerCandidateMap(ledger); const datasets = registryEvidence(registry);
  const bindings = new Map(list(config?.bindings).map((item) => [item.bindingId, item]));
  const attached = new Set(list(attachmentSet?.attachments).map((item) => item.datasetId));
  const resultIds = new Set(); const triples = new Set(); const matchIds = new Set();
  list(run?.results).forEach((result, index) => {
    const evidence = candidates.get(result.candidateId); const binding = bindings.get(result.bindingId);
    if (result.sourceOrder !== index) errors.push(`Comparison result ${index} order mismatch.`);
    if (resultIds.has(result.comparisonResultId)) errors.push(`Duplicate comparison result ID ${result.comparisonResultId}.`); resultIds.add(result.comparisonResultId);
    const triple = `${result.entryId}\0${result.candidateId}\0${result.bindingId}`;
    if (triples.has(triple)) errors.push(`Duplicate comparison result projection ${triple}.`); triples.add(triple);
    if (!evidence || evidence.entry.entryId !== result.entryId) errors.push(`Comparison result ${index} candidate reference is stale.`);
    if (evidence && (result.entityId !== evidence.entry.entityId || result.fieldKey !== evidence.entry.fieldKey
      || canonicalComparisonJson(result.candidateValue) !== canonicalComparisonJson(evidence.candidate.value))) errors.push(`Comparison result ${index} candidate evidence mismatch.`);
    if (!binding || !binding.enabled || binding.fieldKey !== result.fieldKey) errors.push(`Comparison result ${index} binding reference is stale.`);
    if (!attached.has(result.datasetId) || binding?.datasetId !== result.datasetId || binding?.columnId !== result.columnId
      || !datasets.get(result.datasetId)?.columns.has(result.columnId)) errors.push(`Comparison result ${index} dataset/column reference is stale.`);
    if (!['unique-match','multiple-match','unmatched'].includes(result.status)) errors.push(`Comparison result ${index} status is invalid.`);
    const matches = list(result.matches); const expectedStatus = matches.length === 0 ? 'unmatched' : matches.length === 1 ? 'unique-match' : 'multiple-match';
    if (result.status !== expectedStatus) errors.push(`Comparison result ${index} status/match-count mismatch.`);
    const normalized = binding ? normalizeComparisonValue(evidence?.candidate.value, binding.comparisonMode, binding.normalization) : null;
    if (!normalized?.valid || canonicalComparisonJson(normalized.normalizedValue) !== canonicalComparisonJson(result.normalizedCandidate)) errors.push(`Comparison result ${index} normalized candidate evidence mismatch.`);
    errors.push(...matchReferenceErrors(result, datasets.get(result.datasetId), binding, index, matchIds));
  });
  return errors;
}

function matchReferenceErrors(result, evidence, binding, resultIndex, globalIds) {
  const errors = []; const seen = new Set(); let priorOrder = -1;
  if (!Array.isArray(result.matches)) return [`Comparison result ${resultIndex} matches must be an array.`];
  result.matches.forEach((match, index) => {
    const row = evidence?.rows.get(match.rowId);
    if (seen.has(match.matchId) || globalIds.has(match.matchId)) errors.push(`Comparison result ${resultIndex} has duplicate match ${match.matchId}.`); seen.add(match.matchId); globalIds.add(match.matchId);
    if (match.rowSourceOrder <= priorOrder) errors.push(`Comparison result ${resultIndex} match order is not deterministic.`); priorOrder = match.rowSourceOrder;
    if (!row || row.sourceOrder !== match.rowSourceOrder) errors.push(`Comparison result ${resultIndex} match ${index} row reference is stale.`);
    const cell = row?.values?.[result.columnId];
    if (row && canonicalComparisonJson(cell) !== canonicalComparisonJson(match.masterValue)) errors.push(`Comparison result ${resultIndex} match ${index} master evidence mismatch.`);
    const normalized = binding ? normalizeComparisonValue(cell, binding.comparisonMode, binding.normalization) : null;
    if (!normalized?.valid || canonicalComparisonJson(normalized.normalizedValue) !== canonicalComparisonJson(match.normalizedMasterValue)) errors.push(`Comparison result ${resultIndex} match ${index} normalized evidence mismatch.`);
  });
  return errors;
}

function coverageErrors(run, ledger, config) {
  const errors = []; const candidates = ledgerCandidateMap(ledger);
  const enabled = list(config?.bindings).filter((item) => item.enabled);
  const actual = new Map();
  for (const result of list(run?.results)) {
    const key = `${result.candidateId}\0${result.bindingId}`; actual.set(key, (actual.get(key) || 0) + 1);
  }
  const unbound = new Map(list(run?.unbound).map((item) => [item.candidateId, item]));
  for (const [candidateId, evidence] of candidates) {
    const matching = enabled.filter((binding) => binding.fieldKey === evidence.entry.fieldKey);
    if (!matching.length && !unbound.has(candidateId)) errors.push(`Candidate ${candidateId} is missing unbound evidence.`);
    if (matching.length && unbound.has(candidateId)) errors.push(`Candidate ${candidateId} has extra unbound evidence.`);
    matching.forEach((binding) => { if (actual.get(`${candidateId}\0${binding.bindingId}`) !== 1) errors.push(`Candidate ${candidateId} comparison coverage mismatch.`); });
  }
  if (list(run?.unbound).length !== unbound.size) errors.push('Duplicate unbound candidate evidence exists.');
  list(run?.unbound).forEach((item, index) => {
    const evidence = candidates.get(item.candidateId);
    if (item.sourceOrder !== index) errors.push(`Unbound candidate ${index} order mismatch.`);
    if (!evidence || item.entryId !== evidence.entry.entryId || item.entityId !== evidence.entry.entityId
      || item.fieldKey !== evidence.entry.fieldKey) errors.push(`Unbound candidate ${index} evidence is stale.`);
    if (item.reason !== 'No enabled binding exists for this field key.') errors.push(`Unbound candidate ${index} reason mismatch.`);
  });
  return errors;
}


async function identityReferenceErrors(graph, ledger, config, run, attachmentId, hashText) {
  const errors = [];
  for (const binding of list(config?.bindings)) {
    const { bindingId, ...evidence } = binding;
    const expected = await createComparisonIdentity('master-binding', evidence, hashText);
    if (bindingId !== expected) errors.push(`Binding ${binding.sourceOrder} identity mismatch.`);
  }
  const expectedConfigId = await createComparisonIdentity('master-binding-config', {
    graph: graphComparisonIdentity(graph), ledgerId: ledger?.ledgerId,
    attachmentSetIdentity: attachmentId, bindings: config?.bindings || [],
  }, hashText);
  if (config?.bindingConfigId !== expectedConfigId) errors.push('Binding-config identity does not match canonical evidence.');
  for (const result of list(run?.results)) {
    const expectedResultId = await createComparisonIdentity('candidate-comparison-result', {
      entryId: result.entryId, candidateId: result.candidateId, bindingId: result.bindingId,
    }, hashText);
    if (result.comparisonResultId !== expectedResultId) errors.push(`Comparison result ${result.sourceOrder} identity mismatch.`);
    for (const match of list(result.matches)) {
      const expectedMatchId = await createComparisonIdentity('candidate-master-match', {
        comparisonResultId: result.comparisonResultId, datasetId: result.datasetId, rowId: match.rowId,
        columnId: result.columnId, masterValue: match.masterValue, normalizedMasterValue: match.normalizedMasterValue,
      }, hashText);
      if (match.matchId !== expectedMatchId) errors.push(`Comparison result ${result.sourceOrder} match identity mismatch.`);
    }
  }
  const expectedRunId = await createComparisonIdentity('candidate-comparison-run', {
    graph: graphComparisonIdentity(graph), ledgerId: ledger?.ledgerId, bindingConfigId: config?.bindingConfigId,
    attachmentSetIdentity: attachmentId, results: list(run?.results), unbound: list(run?.unbound),
  }, hashText);
  if (run?.comparisonRunId !== expectedRunId) errors.push('Comparison-run identity does not match canonical evidence.');
  return errors;
}

export async function validateComparisonReviewAuthority(upstream, dependencies = {}) {
  const { graph, ledger, config, run, attachmentSet, registry } = upstream || {};
  const hashText = dependencies.hashText || sha256Hex; const errors = [
    ...graphErrors(graph), ...ledgerErrors(ledger, graph), ...attachmentErrors(attachmentSet, graph, registry),
  ];
  addSchemaError(errors, config, 'MasterFieldBindingConfig.v1', 'Binding config');
  addSchemaError(errors, run, 'CandidateComparisonRun.v1', 'Comparison run');
  if (!Array.isArray(registry?.datasets)) errors.push('Master Registry datasets must be an array.');
  if (!Array.isArray(config?.bindings)) errors.push('Binding config bindings must be an array.');
  if (!Array.isArray(run?.results)) errors.push('Comparison run results must be an array.');
  if (!Array.isArray(run?.unbound)) errors.push('Comparison run unbound evidence must be an array.');
  const attachmentId = await createMasterAttachmentSetIdentity(graph, attachmentSet, hashText);
  if (config?.ledgerId !== ledger?.ledgerId || run?.ledgerId !== ledger?.ledgerId) errors.push('Ledger identity mismatch across review authorities.');
  if (run?.bindingConfigId !== config?.bindingConfigId) errors.push('Binding-config identity mismatch across review authorities.');
  if (config?.attachmentSetIdentity !== attachmentId || run?.attachmentSetIdentity !== attachmentId) errors.push('Attachment-set identity mismatch across review authorities.');
  if (metadataMismatch(config, graph) || metadataMismatch(run, graph)) errors.push('Graph identity mismatch across review authorities.');
  const validateConfig = dependencies.validateMasterFieldBindingConfig || validateMasterFieldBindingConfig;
  let configCheck = { errors: [], warnings: [] };
  try { configCheck = await validateConfig(config, graph, ledger, attachmentSet, registry, { ...dependencies, hashText }); }
  catch (error) { errors.push(`Binding config validation failed: ${error.message}`); }
  errors.push(...(configCheck.errors || []));
  errors.push(...resultReferenceErrors(run, ledger, config, attachmentSet, registry), ...coverageErrors(run, ledger, config));
  errors.push(...await identityReferenceErrors(graph, ledger, config, run, attachmentId, hashText));
  errors.push(...findJsonSafetyErrors({ graph, ledger, config, run, attachmentSet, registry }, 'Review authority'));
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(configCheck.warnings || [])] };
}
