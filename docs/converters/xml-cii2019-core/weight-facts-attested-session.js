// Fail-closed production-bound GC-PW Weight consumer. No XML, DOM, storage or transport.
import { createWeightReviewService } from './weight-facts-review-service.js';

function custodyError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.retryable = false;
  throw error;
}
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
function exactKeys(actual, required, label) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    custodyError('CUSTODY_MISSING', label + ' requires explicit source-bound records');
  }
  if (Object.keys(actual).length !== required.length ||
      required.some(key => !Object.hasOwn(actual, key))) {
    custodyError('CUSTODY_SCOPE_MISMATCH', label + ' differs from selected InputBasis');
  }
}
async function assertHash(content, expected, digestUtf8, label) {
  if (typeof content !== 'string' || !sha(expected)) {
    custodyError('CUSTODY_MISSING', label + ' content and SHA-256 are required');
  }
  const actual = await digestUtf8(content);
  if (!sha(actual) || actual.toLowerCase() !== expected.toLowerCase()) {
    custodyError('INPUT_DIGEST_MISMATCH', label + ' changed after InputBasis was frozen');
  }
}
function checkPhysicalPopulation(basis, facts, expected) {
  const sourceIds = basis.sourceRefs.map(ref => ref.sourceId);
  exactKeys(expected, sourceIds, 'Selected physical occurrences');
  const found = new Map(sourceIds.map(sourceId => [sourceId, new Set()]));
  for (const fact of facts) {
    if (fact.extensions?.adapter === 'legacy-read-only' ||
        fact.diagnostics?.some(d => /legacy-row-order identity/i.test(d))) {
      custodyError('LEGACY_ONLY_FACT', 'Untrusted row-index/legacy facts cannot become accepted reviews');
    }
    if (fact.subjectType !== 'physical-component') continue;
    if (!found.has(fact.sourceId) || !fact.occurrenceId) {
      custodyError('CUSTODY_SCOPE_MISMATCH', 'Physical component claims an unknown source');
    }
    found.get(fact.sourceId).add(fact.occurrenceId);
  }
  for (const sourceId of sourceIds) {
    const expectedIds = expected[sourceId];
    if (!Array.isArray(expectedIds) || expectedIds.some(id => typeof id !== 'string' || !id)) {
      custodyError('CUSTODY_MISSING', 'Authoritative original occurrence IDs are required for ' + sourceId);
    }
    const allow = new Set(expectedIds);
    if (allow.size !== expectedIds.length || allow.size !== found.get(sourceId).size ||
        [...found.get(sourceId)].some(id => !allow.has(id))) {
      custodyError('POPULATION_MISMATCH', 'Missing/extra/duplicate selected physical component: ' + sourceId);
    }
  }
}
export async function assertWeightInputCustody(basis, facts, custody, digests) {
  const { digestUtf8, digestCanonical } = digests || {};
  if (typeof digestUtf8 !== 'function' || typeof digestCanonical !== 'function') {
    custodyError('CRYPTO_UNAVAILABLE', 'Inject GC-PW SHA256 and canonical JSON digest functions');
  }
  if (!basis || typeof basis !== 'object' || !sha(basis.basisId) || !Array.isArray(facts)) {
    custodyError('CUSTODY_MISSING', 'Immutable InputBasis and FactRecords are required');
  }
  const { basisId, ...body } = basis;
  const computed = await digestCanonical(body);
  if (!sha(computed) || computed.toLowerCase() !== basisId.toLowerCase()) {
    custodyError('BASIS_DIGEST_MISMATCH', 'InputBasis id is not canonical SHA256 of its entire body');
  }
  const sourceIds = basis.sourceRefs.map(ref => ref.sourceId);
  exactKeys(custody?.sourceTexts, sourceIds, 'Source content');
  const masters = Object.keys(basis.masters || {});
  exactKeys(custody?.masters, masters, 'Master content');
  for (const ref of basis.sourceRefs) {
    await assertHash(custody.sourceTexts[ref.sourceId], ref.sha256, digestUtf8,
      'source:' + ref.sourceId);
  }
  await assertHash(custody?.selectionText, basis.selectionSha256, digestUtf8, 'selection');
  if (basis.stagedSourceSha256 === null) {
    if (custody?.stagedSourceText !== null) {
      custodyError('CUSTODY_MISSING', 'Absent staged source must be explicitly null');
    }
  } else {
    await assertHash(custody?.stagedSourceText, basis.stagedSourceSha256, digestUtf8, 'staged');
  }
  await assertHash(custody?.configText, basis.configSha256, digestUtf8, 'config');
  await assertHash(custody?.overridesText, basis.overridesSha256, digestUtf8, 'overrides');
  for (const [name, ref] of Object.entries(basis.masters || {})) {
    await assertHash(custody.masters[name]?.datasetText, ref.sha256, digestUtf8, 'master:' + name);
    await assertHash(custody.masters[name]?.mappingText, ref.mappingSha256, digestUtf8, 'mapping:' + name);
  }
  checkPhysicalPopulation(basis, facts, custody?.occurrenceIdsBySource);
  return { basisId, sourceCount: sourceIds.length, masterCount: masters.length,
    physicalCount: Object.values(custody.occurrenceIdsBySource).reduce((sum, ids) => sum + ids.length, 0) };
}
// This wrapper withholds the mock-only openBasis/openBasisJob bypasses.
// The #999 integrator supplies authoritative bytes/store leases and occurrence custody.
export function createAttestedWeightReviewService({ score, digestReview, digestUtf8, digestCanonical } = {}) {
  const core = createWeightReviewService({ score, digestReview });
  const { openBasis: _unsafe, openBasisJob: _unsafeJob, ...safe } = core;
  return Object.freeze({
    ...safe,
    async openBasis(basis, { facts, custody } = {}) {
      const attestation = await assertWeightInputCustody(basis, facts, custody,
        { digestUtf8, digestCanonical });
      const result = core.openBasis(basis, { facts });
      return { ...result, attestation };
    },
  });
}
