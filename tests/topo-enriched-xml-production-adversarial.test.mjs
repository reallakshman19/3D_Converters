import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { computeSemanticHash } from '../contracts/topo-enriched-xml/contract-core.js';
import { computeOccurrencePlanHash } from '../tabs/stagedjson-to-enrichxml/psi-serialization-plan.js';
import { computeTopologyNormalizationHash } from '../tabs/stagedjson-to-enrichxml/topology-normalization/topology-normalizer-shadow.js';
import {
  computeNormalizationApprovalHash,
} from '../tabs/stagedjson-to-enrichxml/production/topology-normalization-approval.js';
import {
  computeBootstrapResultHash,
} from '../tabs/stagedjson-to-enrichxml/production/production-evidence-validator.js';
import { runTopoEnrichedXmlProduction } from '../tabs/stagedjson-to-enrichxml/production/topo-enriched-xml-production.js';
import { makeProductionFixture } from './fixtures/topo-enriched-xml/production/production-fixture.mjs';

const blockerCodes = (result) => result.validation.blockers
  .flatMap((row) => [row.code, ...(row.evidence?.blockers || []).map((child) => child.code)]);

// 9 — normalization result, action and approval hashes are independent hard gates.
test('blocks stale normalization, action and approval hashes atomically', async () => {
  const cases = [
    async (input) => {
      input.topologyNormalizationApproval.topologyNormalizationHash = stale();
      await rehashApproval(input);
    },
    async (input) => {
      input.topologyNormalizationApproval.approvedActionHash = stale();
      await rehashApproval(input);
    },
    async (input) => { input.topologyNormalizationApproval.normalizationApprovalHash = stale(); },
  ];
  for (const mutate of cases) {
    const input = await makeProductionFixture();
    await mutate(input);
    const result = await runTopoEnrichedXmlProduction(input);
    assert.equal(result.validation.status, 'BLOCKED');
    assert.equal(result.productionBundle, null);
    assert.equal(result.xmlText, '');
    assert.deepEqual(result.trace, []);
  }
});

// 10 — bootstrap, current snapshot and registry patch hashes are independently recomputed.
test('blocks stale bootstrap, current-registry and registry-patch evidence', async () => {
  const bootstrap = await makeProductionFixture();
  bootstrap.bootstrapResult.bootstrapResultHash = stale();
  assertBlocked(await runTopoEnrichedXmlProduction(bootstrap), 'BOOTSTRAP_RESULT_HASH_MISMATCH');

  const current = await makeProductionFixture();
  current.currentRegistryEvidence.registrySnapshotHash = stale();
  assertBlocked(await runTopoEnrichedXmlProduction(current), 'CURRENT_REGISTRY_SNAPSHOT_HASH_MISMATCH');

  const patch = await makeProductionFixture();
  patch.bootstrapResult.registryPatch.proposedRegistryHash = stale();
  await rehashBootstrap(patch);
  assertBlocked(await runTopoEnrichedXmlProduction(patch), 'REGISTRY_PATCH_HASH_MISMATCH');
});

// 11 — no occurrence ownership inference.
test('blocks an occurrence without explicit logical-node ownership before writer invocation', async () => {
  const input = await makeProductionFixture();
  delete input.occurrencePlan.occurrences[0].logicalNodeId;
  input.occurrencePlan.occurrencePlanHash = await computeOccurrencePlanHash(input.occurrencePlan);
  const result = await runTopoEnrichedXmlProduction(input);
  assertBlocked(result, 'NODE_PLAN_BUILD_BLOCKED');
  assert.equal(result.canonicalBundle, null);
  assert.equal(result.sequentialBundle, null);
});

// 12 — current registry, not writer behavior, is the number authority.
test('blocks allocation renumbering that disagrees with approved current history', async () => {
  const input = await makeProductionFixture();
  const allocation = input.allocationResult.allocations.find((row) => row.logicalNodeId === 'LN-A-NEW');
  allocation.engineeringNodeNumber = 140;
  input.allocationResult.allocationResultHash = await computeSemanticHash(
    input.allocationResult, 'allocationResultHash',
  );
  input.bootstrapResult.allocationResultHash = input.allocationResult.allocationResultHash;
  input.bootstrapResult.approvalEvidence.approvedAllocationResultHash = input.allocationResult.allocationResultHash;
  await rehashBootstrap(input);
  const result = await runTopoEnrichedXmlProduction(input);
  assertBlocked(result, 'NODE_PLAN_BUILD_BLOCKED');
  assert.equal(result.productionBundle, null);
  assert.equal(result.xmlText, '');
});

// 13 — independently supplied current evidence is mandatory.
test('blocks when current registry evidence is absent even with an approved bootstrap', async () => {
  const input = await makeProductionFixture();
  input.currentRegistryEvidence = null;
  assertBlocked(await runTopoEnrichedXmlProduction(input), 'CURRENT_REGISTRY_EVIDENCE_MISSING');
});

// 14 — a late topology/trace blocker still clears all production output.
test('clears production output after a late source-path topology evidence blocker', async () => {
  const input = await makeProductionFixture();
  input.sourceInventory.entities.find((row) => row.sourceEntityId === 'SE-ELBO').sourcePath = '';
  await rehashSourceChain(input);
  const result = await runTopoEnrichedXmlProduction(input);
  assert.equal(result.validation.status, 'BLOCKED');
  assert.ok(result.canonicalBundle?.generated);
  assert.ok(result.sequentialBundle?.generated);
  assert.equal(result.productionBundle, null);
  assert.equal(result.proposedBundle, null);
  assert.equal(result.xmlText, '');
  assert.deepEqual(result.trace, []);
});

// 15 — REVIEW technical blockers cannot leave a proposed bundle.
test('REVIEW exposes no proposed bundle when a technical hash gate is blocked', async () => {
  const input = await makeProductionFixture({ operatingMode: 'REVIEW' });
  input.configHash = stale();
  const result = await runTopoEnrichedXmlProduction(input);
  assert.equal(result.validation.status, 'BLOCKED');
  assert.equal(result.proposedBundle, null);
  assert.equal(result.productionBundle, null);
  assert.equal(result.xmlText, '');
  assert.deepEqual(result.trace, []);
});

// 16 — no hidden legacy, numbering or CII authority in TE-013 modules.
test('production modules contain no legacy writer, counter, mutation or CII invocation authority', () => {
  const files = [
    'production/production-common.js',
    'production/topology-normalization-approval.js',
    'production/production-evidence-validator.js',
    'production/topo-node-plan-indexes.js',
    'production/topo-node-plan-builder.js',
    'production/psi-branch-projection-builder.js',
    'production/topo-production-audit.js',
    'production/topo-enriched-xml-production.js',
  ];
  const prohibited = [
    /buildEnrichedXml\s*\(/, /buildSequentialWriterShadow\s*\(/,
    /selectPsiWriterOutput\s*\(/, /new Date\s*\(/, /Date\.now\s*\(/,
    /nodeCounter/, /numberingSpan/, /xmlNodeNum\s*=/,
    /inputxml_to_cii2019|xml_to_cii2019|convert.*cii/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../tabs/stagedjson-to-enrichxml/${file}`, import.meta.url), 'utf8');
    for (const pattern of prohibited) assert.doesNotMatch(source, pattern, `${file}: ${pattern}`);
  }
});

function assertBlocked(result, code) {
  assert.equal(result.validation.status, 'BLOCKED');
  assert.ok(blockerCodes(result).includes(code), `${code}: ${blockerCodes(result)}`);
  assert.equal(result.productionBundle, null);
  assert.equal(result.xmlText, '');
  assert.deepEqual(result.trace, []);
}

async function rehashApproval(input) {
  input.topologyNormalizationApproval.normalizationApprovalHash =
    await computeNormalizationApprovalHash(input.topologyNormalizationApproval);
}

async function rehashBootstrap(input) {
  input.bootstrapResult.bootstrapResultHash = await computeBootstrapResultHash(input.bootstrapResult);
  input.currentRegistryEvidence.bootstrapResultHash = input.bootstrapResult.bootstrapResultHash;
}

async function rehashSourceChain(input) {
  const sourceInventoryHash = await computeSemanticHash(input.sourceInventory, 'sourceInventoryHash');
  input.logicalGraph.sourceInventoryHash = sourceInventoryHash;
  input.topologyNormalizationResult.proposedLogicalGraph.sourceInventoryHash = sourceInventoryHash;
  input.sequencePlan.sourceInventoryHash = sourceInventoryHash;
  input.sequencePlan.sequencePlanHash = await computeSemanticHash(input.sequencePlan, 'sequencePlanHash');
  input.occurrencePlan.sourceInventoryHash = sourceInventoryHash;
  input.occurrencePlan.sequencePlanHash = input.sequencePlan.sequencePlanHash;
  input.occurrencePlan.occurrencePlanHash = await computeOccurrencePlanHash(input.occurrencePlan);
  const normalization = input.topologyNormalizationResult.normalization;
  normalization.sourceInventoryHash = sourceInventoryHash;
  normalization.occurrencePlanHash = input.occurrencePlan.occurrencePlanHash;
  normalization.normalizationHash = await computeTopologyNormalizationHash(normalization);
  input.topologyNormalizationApproval.topologyNormalizationHash = normalization.normalizationHash;
  await rehashApproval(input);
  input.bootstrapResult.registryPatch.sourceHash = sourceInventoryHash;
  await rehashBootstrap(input);
}

function stale() { return `sha256:${'f'.repeat(64)}`; }
