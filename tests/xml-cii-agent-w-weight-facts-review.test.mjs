import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { createWeightReviewService, WEIGHT_SCHEMA } from '../converters/xml-cii2019-core/weight-facts-review-service.js';
import { legacyXmlCiiWeightFacts, createXmlCiiFactWeightScorer } from '../converters/xml-cii2019-core/weight-facts-xml-cii-adapter.js';

const hash = (v) => createHash('sha256').update(String(v)).digest('hex');
function basis(domainId = 'xml-cii/2019', sources = ['one'], master = 'master-v1') {
  return { schemaVersion: WEIGHT_SCHEMA, domainId, basisId: hash(domainId + sources.join(',') + master),
    sourceRefs: sources.map((sourceId) => ({ sourceId, sha256: hash('source-' + sourceId), mediaType: 'application/xml' })),
    selectionSha256: hash('selection'), stagedSourceSha256: null,
    masters: { weight: { datasetId: 'w', revision: master, sha256: hash(master), mappingSha256: hash('mapping'), rowCount: 1595 } },
    configSha256: hash('config'), overridesSha256: hash('overrides'),
    scope: sources.map((sourceId) => ({ sourceId, selectionRef: 'all' })) };
}
function fixture(b, source = 'one', weight = null, index = 0) {
  return legacyXmlCiiWeightFacts([{ key: 'BR::-1', branchName: 'BR', nodeNumber: '-1',
    branchOccurrenceIndex: index, nodeOrdinal: 0, boreMm: 100, rating: '150',
    lengthMm: 100, nodeName: 'VGT-1', componentType: 'VALV', dtxr: 'GATE',
    originalWeight: weight }], b, source);
}
function oracleScore(records, b) {
  return [{ basisId: b.basisId, domainId: b.domainId, occurrenceId: records[0].occurrenceId,
    proposalId: b.basisId + '/15', unit: 'kg', value: 15, method: 'exact-master',
    ranking: 1, qualified: true, scoringRevision: 'oracle-v1',
    eligibilityReasons: ['bore-rating-length'], evidenceRefs: [b.masters.weight.sha256] }];
}
function command(b, id, action, revision = null, overrides = {}) {
  return { commandId: id, basisId: b.basisId, scopeId: 'one',
    occurrenceId: 'one/branch:0/physical:0', expectedDecisionRevision: revision, action, ...overrides };
}
const throws = (fn, code) => assert.throws(fn, (e) => e.code === code, 'expected ' + code);

test('59 kg source never becomes proposed 15 kg without explicit Match-1 acceptance', () => {
  const b = basis(), service = createWeightReviewService({ score: oracleScore });
  service.openBasis(b, { facts: fixture(b, 'one', 59) });
  const proposed = service.getProposals({ basisId: b.basisId, occurrenceIds: ['one/branch:0/physical:0'] });
  assert.equal(proposed.items[0].value, 15);
  assert.equal(service.getSnapshot({ basisId: b.basisId, stage: 'RigidMatch1' }).length, 0);
  assert.equal(service.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [],
    outputBasis: { components: [{ sourceId: 'one', occurrenceId: 'one/branch:0/physical:0',
      children: [{ childId: 'A', kg: 29 }, { childId: 'B', kg: 30 }] }] } }).verified, true);
  const accept = command(b, 'accept15', 'accept-proposal', null, { proposalId: proposed.items[0].proposalId });
  const result = service.applyDecisions({ basisId: b.basisId, scopeId: 'one', commands: [accept] });
  assert.equal(result[0].state, 'accepted');
  assert.deepEqual(service.applyDecisions({ basisId: b.basisId, scopeId: 'one', commands: [accept] }), result);
  const frozen = service.freezeSnapshot({ basisId: b.basisId, scopeId: 'one',
    stage: 'RigidMatch1', expectedDecisionRevision: result[0].decisionRevision });
  assert.equal(frozen.decisions[accept.occurrenceId].value, 15);
  throws(() => service.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [frozen.snapshotRef],
    outputBasis: { components: [{ sourceId: 'one', occurrenceId: accept.occurrenceId, children: [{ childId: 'A', kg: 59 }] }] } }), 'MASS_NOT_CONSERVED');
});

test('Final Match-2 is distinct, revisioned, idempotent, and changes require reasons', () => {
  const b = basis(), service = createWeightReviewService({ score: oracleScore });
  service.openBasis(b, { facts: fixture(b) });
  const m = service.applyDecisions({ basisId: b.basisId, scopeId: 'one', commands: [
    command(b, 'manual20', 'enter-manual', null, { value: 20, unit: 'kg' })] })[0];
  const s1 = service.freezeSnapshot({ basisId: b.basisId, scopeId: 'one', stage: 'RigidMatch1', expectedDecisionRevision: m.decisionRevision });
  const f = service.applyDecisions({ basisId: b.basisId, scopeId: 'one', stage: 'Rigidmatch2', commands: [
    command(b, 'final22', 'final-override', null, { value: 22, unit: 'kg' })] })[0];
  const s2 = service.freezeSnapshot({ basisId: b.basisId, scopeId: 'one', stage: 'Rigidmatch2', expectedDecisionRevision: f.decisionRevision });
  const outputBasis = { components: [{ sourceId: 'one', occurrenceId: 'one/branch:0/physical:0',
    children: [{ childId: 'a', kg: 10 }, { childId: 'b', kg: 12 }], output: { unit: 'cii-force', scale: 10, value: 220 } }] };
  assert.equal(service.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [s1.snapshotRef, s2.snapshotRef], outputBasis }).verified, true);
  throws(() => service.applyDecisions({ basisId: b.basisId, scopeId: 'one', stage: 'Rigidmatch2',
    commands: [command(b, 'replace23', 'final-override', f.decisionRevision, { value: 23, unit: 'kg' })],
    expectedDecisionRevision: f.decisionRevision }), 'OVERWRITE_REQUIRES_REASON');
  service.applyDecisions({ basisId: b.basisId, scopeId: 'one', stage: 'Rigidmatch2',
    commands: [command(b, 'replace23', 'final-override', f.decisionRevision, { value: 23, unit: 'kg', reason: 'engineer approved' })],
    expectedDecisionRevision: f.decisionRevision });
  throws(() => service.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [s2.snapshotRef], outputBasis }), 'STALE_SNAPSHOT');
});

test('source isolation, duplicate NodeNumber=-1, Mode B lineage, atomicity and conflict fences', () => {
  const b = basis('xml-cii/2019', ['one', 'two']);
  const facts = [...fixture(b, 'one'), ...fixture(b, 'one', null, 1), ...fixture(b, 'two')];
  const ids = new Set(facts.map((f) => f.occurrenceId));
  assert.equal(ids.size, 3);
  const service = createWeightReviewService({ score: oracleScore });
  service.openBasis(b, { facts });
  throws(() => service.applyDecisions({ basisId: b.basisId, scopeId: 'one', commands: [
    command(b, 'ok', 'enter-manual', null, { value: 12, unit: 'kg' }),
    { ...command(b, 'wrong', 'enter-manual', null, { value: 12, unit: 'kg' }), occurrenceId: 'two/branch:0/physical:0' },
  ] }), 'IDENTITY_CONFLICT');
  const accepted = service.applyDecisions({ basisId: b.basisId, scopeId: 'one',
    commands: [command(b, 'after-atomic', 'enter-manual', null, { value: 12, unit: 'kg' })] })[0];
  assert.equal(accepted.decisionRevision, 'm1');
  throws(() => service.applyDecisions({ basisId: b.basisId, scopeId: 'one',
    commands: [command(b, 'stale', 'enter-manual', null, { value: 13, unit: 'kg' })] }), 'STALE_DECISION');
  const first = service.getFacts({ basisId: b.basisId, sourceId: 'one', limit: 2 });
  assert.equal(first.items.length, 2);
  assert.equal(first.totalCount, fixture(b, 'one').length * 2);
  assert.equal(service.getFacts({ basisId: b.basisId, sourceId: 'one', cursor: first.nextCursor, limit: 500 }).complete, true);
});

test('changed master same row count or source contents cannot masquerade as old basis', () => {
  const b = basis(), service = createWeightReviewService({ score: oracleScore });
  service.openBasis(b, { facts: fixture(b) });
  const changed = basis('xml-cii/2019', ['one'], 'master-v2');
  throws(() => service.applyDecisions({ basisId: changed.basisId, scopeId: 'one',
    commands: [command(changed, 'stale', 'enter-manual', null, { value: 20, unit: 'kg' })] }), 'UNKNOWN_BASIS');
  throws(() => service.openBasis(b, { facts: fixture(b, 'one', 59) }), 'BASIS_COLLISION');
  const broken = fixture(b);
  broken[0].value = Number.POSITIVE_INFINITY;
  throws(() => service.openBasis(b, { facts: broken }), 'INVALID_NUMBER');
});

test('conversion input 1207.3401/10 kg remains mass without extra conversion', () => {
  const b = basis(), physicalKg = 1207.3401 / 10;
  const service = createWeightReviewService({ score: oracleScore });
  service.openBasis(b, { facts: fixture(b, 'one', physicalKg) });
  assert.ok(Math.abs(physicalKg - 120.73401) < 1e-10);
  assert.equal(service.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [], outputBasis: {
    components: [{ sourceId: 'one', occurrenceId: 'one/branch:0/physical:0',
      children: [{ childId: 'only', kg: physicalKg }], output: { unit: 'cii-force', scale: 10, value: 1207.3401 } }],
  } }).verified, true);
  throws(() => service.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [], outputBasis: {
    components: [{ sourceId: 'one', occurrenceId: 'one/branch:0/physical:0',
      children: [{ childId: 'only', kg: physicalKg }], output: { unit: 'cii-force', scale: 10, value: 12073.401 } }],
  } }), 'DOUBLE_CONVERSION');
});

test('existing indexed ranker: ±6 mm, top five, inferred not exact, 1595-row synthetic scale', () => {
  const b = basis();
  const masterRows = Array.from({ length: 1595 }, (_, i) => ({
    boreMm: i < 10 ? 100 : 200, rating: i < 10 ? '150' : '300',
    lengthMm: i < 10 ? 100 + i : 500, weight: 15 + i,
    type: 'VALVE', typeDesc: 'Gate Valve', id: i,
  }));
  const score = createXmlCiiFactWeightScorer({ weight: { masterRows, valveHintLengthToleranceMm: 6 } });
  const service = createWeightReviewService({ score });
  const t0 = performance.now();
  service.openBasis(b, { facts: fixture(b) });
  const proposals = service.getProposals({ basisId: b.basisId, occurrenceIds: ['one/branch:0/physical:0'], limit: 5 });
  assert.equal(proposals.items.length, 5);
  assert.ok(proposals.items.every((p) => p.value > 0 && p.unit === 'kg'));
  assert.equal(proposals.items[0].value, 15);
  assert.equal(proposals.items.filter((p) => p.qualified).length, 5);
  const ms = performance.now() - t0;
  assert.ok(Number.isFinite(ms));
  console.log('SYNTHETIC_1595_WEIGHT_RANK_MS=' + ms.toFixed(2) + ' (NOT owner-scale browser evidence)');
});

test('non-XML facts use identical transactions and never import XML schema', () => {
  const b = basis('synthetic/mechanical-v1', ['one']);
  const f = [{ schemaVersion: WEIGHT_SCHEMA, domainId: b.domainId, basisId: b.basisId,
    subjectType: 'machine-part', sourceId: 'one', occurrenceId: 'one/part-1', fieldId: 'mass.kg',
    value: null, authority: 'unresolved', provenance: [{ sourceRef: 'one' }], diagnostics: [] }];
  const service = createWeightReviewService({ score: () => [] });
  service.openBasis(b, { facts: f });
  const c = { ...command(b, 'manual', 'enter-manual', null, { value: 7, unit: 'kg' }), occurrenceId: 'one/part-1' };
  const result = service.applyDecisions({ basisId: b.basisId, scopeId: 'one', commands: [c] });
  assert.equal(result[0].state, 'accepted');
  assert.equal(service.freezeSnapshot({ basisId: b.basisId, scopeId: 'one',
    stage: 'RigidMatch1', expectedDecisionRevision: result[0].decisionRevision }).decisions['one/part-1'].value, 7);
});

test('candidate audit retains length-rejected semantics and unresolved Rating never scores', () => {
  const b = basis();
  const config = { weight: { masterRows: [
    { boreMm: 100, rating: '150', lengthMm: 106, weight: 9, typeDesc: 'Gate Valve' },
    { boreMm: 100, rating: '150', lengthMm: 106.1, weight: 10, typeDesc: 'Gate Valve' },
  ], valveHintLengthToleranceMm: 6 } };
  const service = createWeightReviewService({ score: createXmlCiiFactWeightScorer(config) });
  const facts = fixture(b);
  service.openBasis(b, { facts });
  const proposals = service.getProposals({ basisId: b.basisId, occurrenceIds: ['one/branch:0/physical:0'] });
  assert.equal(proposals.items[0].value, 9);
  const rejected = service.getCandidateAudit({ basisId: b.basisId, occurrenceId: 'one/branch:0/physical:0' }).rejectedCandidates;
  assert.ok(rejected.some((c) => c.rowLength === 106.1 && c.rejectedReason.includes('length failed')));
  const blocked = createWeightReviewService({ score: createXmlCiiFactWeightScorer(config) });
  const conflict = facts.map((f) => f.fieldId === 'rating' ? { ...f, authority: 'conflict', diagnostics: ['unresolved Rating'] } : f);
  blocked.openBasis(b, { facts: conflict });
  assert.equal(blocked.getProposals({ basisId: b.basisId, occurrenceIds: ['one/branch:0/physical:0'] }).items.length, 0);
});

test('cancelled asynchronous fact job fences late worker completion; incomplete run fails', async () => {
  const b = basis();
  const service = createWeightReviewService({ score: oracleScore });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  service.openBasisJob(b, { requestId: 'worker-001', loadFacts: async () => gate });
  assert.equal(service.subscribeJob('worker-001').event, 'progress');
  service.cancelJob('worker-001');
  release(fixture(b, 'one', 59));
  assert.equal((await service.awaitJob('worker-001')).event, 'cancelled');
  throws(() => service.getFacts({ basisId: b.basisId }), 'UNKNOWN_BASIS');
  const newer = createWeightReviewService({ score: oracleScore });
  newer.openBasis(b, { facts: [...fixture(b, 'one', 59), ...fixture(b, 'one', 60, 1)] });
  throws(() => newer.verifyRun({ basisId: b.basisId, reviewedSnapshotIds: [], outputBasis: {
    components: [{ sourceId: 'one', occurrenceId: 'one/branch:0/physical:0',
      children: [{ childId: 'only', kg: 59 }] }],
  } }), 'INCOMPLETE_RUN');
});
