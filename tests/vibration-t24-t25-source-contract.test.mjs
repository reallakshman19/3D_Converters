import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const receipt = JSON.parse(await readFile(
  new URL('../ValidationRecords/VibrationMasters/t24-t25-source-qualification-blocked-v1.json', import.meta.url),
  'utf8',
));
const sourceRegister = JSON.parse(await readFile(
  new URL('../docs/Masters/Vibration/source-register.json', import.meta.url),
  'utf8',
));

assert.equal(receipt.schema, 'T24T25ControlledSourceQualification.v1');
assert.equal(receipt.controlledSource.gitBlobSha1, 'sha1:9d3eccc56429411e17c07a579bdebbd13cb0bdc5');
assert.equal(receipt.controlledSource.sizeBytes, 10348594);
assert.equal(receipt.controlledSource.controlledPageExecution, 'NOT_RUN_ENVIRONMENT_BLOCKED');
assert.deepEqual(receipt.controlledSource.pageHashes, []);

assert.equal(receipt.qualification.t24, 'NOT_QUALIFIED');
assert.equal(receipt.qualification.t25, 'NOT_QUALIFIED');
assert.equal(receipt.qualification.numericalMutationDisposition, 'NOT_QUALIFIED_FOR_T24_T25_NUMERICAL_MUTATION');
assert.equal(receipt.qualification.sourceRegisterPromotionAllowed, false);
assert.equal(receipt.qualification.candidateRuleMasterPublicationAllowed, false);
assert.equal(receipt.qualification.screeningPromotionAllowed, false);
assert.equal(receipt.authority.engineeringAuthority, 'NONE');
assert.equal(receipt.authority.screeningAuthority, 'NOT_AUTHORIZED');
assert.equal(receipt.authority.designAuthority, false);
assert.equal(receipt.authority.productionRuleMasterAuthorized, false);
assert.equal(receipt.authority.productionCalculatorAuthorized, false);

assert.equal(receipt.candidateRuleGraphs.t24.qualificationStatus, 'NOT_QUALIFIED_PUBLIC_CORROBORATION_ONLY');
assert.equal(receipt.candidateRuleGraphs.t25.qualificationStatus, 'NOT_QUALIFIED_PUBLIC_CORROBORATION_ONLY');
assert.equal(receipt.candidateRuleGraphs.t24.rules[1].boundaryQualification, 'PENDING_CONTROLLED_SOURCE');
assert.equal(receipt.candidateRuleGraphs.t25.rules[2].numericMargin, 'PENDING_CONTROLLED_SOURCE');
assert.equal(receipt.candidateRuleGraphs.t25.rules[2].evidenceClass, 'PROJECT_OR_OEM_OPERATING_MAP_EVIDENCE');

const quarantined = new Set(receipt.secondarySynthesis.quarantinedClaims.map((item) => item.claimId));
assert.ok(quarantined.has('T24-SECONDARY-002'));
assert.ok(quarantined.has('T25-SECONDARY-002'));
assert.equal(receipt.secondarySynthesis.productionUse, 'PROHIBITED_UNTIL_CONTROLLED_SOURCE_RECONCILIATION');

assert.equal(receipt.identityFindings[0].findingId, 'T24-ID-001');
assert.equal(receipt.identityFindings[0].status, 'IDENTITY_RECONCILIATION_REQUIRED');
assert.equal(receipt.identityFindings[0].sourceRegisterMechanismId, 'reciprocatingPositiveDisplacement');
assert.equal(receipt.identityFindings[0].canonicalMechanismRegistryId, 'reciprocatingPulsation');

const t24 = sourceRegister.entries.find((entry) => entry.masterId === 'EI_AVIFF.T2.4.RECIP_PD_RULES.v1');
const t25 = sourceRegister.entries.find((entry) => entry.masterId === 'EI_AVIFF.T2.5.ROTATING_STALL_RULES.v1');
assert.ok(t24);
assert.ok(t25);
assert.equal(t24.sourceState, 'SOURCE_PINNED');
assert.equal(t24.locator.locatorStatus, 'NAVIGATION_ONLY');
assert.deepEqual(t24.locator.pdfPages, []);
assert.equal(t25.sourceState, 'SOURCE_PINNED');
assert.equal(t25.locator.locatorStatus, 'NAVIGATION_ONLY');
assert.deepEqual(t25.locator.pdfPages, []);

console.log('T2.4/T2.5 source contract remains fail-closed pending controlled-source execution.');
