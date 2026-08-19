import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const receipt = JSON.parse(await readFile(
  new URL('../ValidationRecords/VibrationMasters/t4-source-qualification-blocked-v1.json', import.meta.url), 'utf8',
));
const candidate = JSON.parse(await readFile(
  new URL('../ValidationRecords/VibrationMasters/ei-aviff-t4-wall-modifier-candidate-v1.json', import.meta.url), 'utf8',
));
const sourceRegister = JSON.parse(await readFile(
  new URL('../docs/Masters/Vibration/source-register.json', import.meta.url), 'utf8',
));
const sourceRegistryText = await readFile(
  new URL('../converters/vibration/source/registry.js', import.meta.url), 'utf8',
);

assert.equal(receipt.schema, 'T4ControlledSourceQualification.v1');
assert.equal(receipt.controlledSource.gitBlobSha1, 'sha1:9d3eccc56429411e17c07a579bdebbd13cb0bdc5');
assert.equal(receipt.controlledSource.controlledPageExecution, 'NOT_RUN_ENVIRONMENT_BLOCKED');
assert.deepEqual(receipt.controlledSource.pageHashes, []);
assert.equal(receipt.qualification.fullMethodQualification, 'NOT_QUALIFIED');
assert.equal(receipt.qualification.numericalMutationDisposition, 'NOT_QUALIFIED_FOR_T4_NUMERICAL_MUTATION');
assert.equal(receipt.qualification.sourceRegisterPromotionAllowed, false);
assert.equal(receipt.qualification.screeningPromotionAllowed, false);
assert.equal(receipt.authority.engineeringAuthority, 'NONE');
assert.equal(receipt.authority.screeningAuthority, 'NOT_AUTHORIZED');
assert.equal(receipt.authority.designAuthority, false);
assert.equal(receipt.authority.productionKernelAuthorized, false);
assert.equal(receipt.authority.asmeMethodImportedIntoEiMaster, false);

assert.equal(candidate.publicationState, 'CANDIDATE');
assert.equal(candidate.qualificationStatus, 'NOT_QUALIFIED');
assert.equal(candidate.masterValuesPublished, false);
assert.equal(candidate.authority.screeningAuthority, 'NOT_AUTHORIZED');
assert.deepEqual(receipt.mergedWallModifierCandidate.rows, candidate.independentEiCorroboration.rows);
assert.equal(receipt.mergedWallModifierCandidate.lookupBehavior.interpolationForbidden, true);
assert.equal(receipt.mergedWallModifierCandidate.lookupBehavior.nearestBandFallbackForbidden, true);
assert.equal(receipt.mergedWallModifierCandidate.lookupBehavior.implicitStdMappingForbidden, true);

assert.equal(receipt.publicCorroboration.candidateFlowchart.qualificationStatus, 'NOT_QUALIFIED_PUBLIC_CORROBORATION_ONLY');
const thresholdStep = receipt.publicCorroboration.candidateFlowchart.steps.find((step) => step.stepId === 'T4-CAND-005');
assert.equal(thresholdStep.candidateThreshold, 0.8);
assert.equal(thresholdStep.exactEqualityDirection, 'PENDING_CONTROLLED_SOURCE');

assert.equal(receipt.methodIdentity.currentMechanismBinding, 'CONFLICTED');
assert.match(sourceRegistryText, /thermowells:\s*binding\(\{/);
assert.match(sourceRegistryText, /status:\s*'CONFLICTED'/);
assert.match(sourceRegistryText, /EI_AVIFF_2008:T4/);
assert.match(sourceRegistryText, /ASME_PTC_19_3_TW_2016:REPOSITORY_LABEL/);

const wallMaster = sourceRegister.entries.find((entry) => entry.masterId === 'EI_AVIFF.T4.WALL_MODIFIER.v1');
const geometryMaster = sourceRegister.entries.find((entry) => entry.masterId === 'EI_AVIFF.T4.GEOMETRY_TYPES.v1');
assert.equal(wallMaster.sourceState, 'SOURCE_PINNED');
assert.equal(wallMaster.locator.locatorStatus, 'NAVIGATION_ONLY');
assert.deepEqual(wallMaster.locator.pdfPages, []);
assert.equal(geometryMaster.sourceState, 'SOURCE_PINNED');
assert.equal(geometryMaster.extractionReceipt, null);

console.log('T4 source contract remains fail-closed pending controlled-source method execution.');
