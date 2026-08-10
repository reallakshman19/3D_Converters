const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const match1Ui = read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js');
assert(match1Ui.includes('migrateMatch1ToPhysicalIdentity'));
assert(match1Ui.includes('xmlCiiWeightSourceId'));
assert(match1Ui.includes("schema: 'xml-cii-weight-source-identity/v1'"));
assert(match1Ui.includes("match1Identity: 'physical-component'"));
assert(match1Ui.includes('rigidWeightMatch1: migrated.accepted'));
assert(match1Ui.includes('delete config.overrides.rigidWeight'));

const identity = read('converters/xml-cii2019-core/weight-component-identity.js');
assert(identity.includes('collectXmlCiiWeightIdentityRows'));
assert(!identity.includes('endpointEligible'), 'Run-boundary compatibility materialization must include endpoint-1-only components.');
assert(identity.includes('dedupeXmlCiiPhysicalWeightRows(decorated)'), 'Sibling compatibility keys must collapse back to one physical mass before authority lookup.');

const finalAuthority = read('converters/xml-cii2019-core/final-weight-review-authority.js');
assert(finalAuthority.includes('collectXmlCiiFinalWeightReviewRows'));
assert(finalAuthority.includes('sourceIdentityRows'));
assert(finalAuthority.includes('collectXmlCiiWeightMatchRows'));
assert(finalAuthority.includes('return Number(record.rigid) === 2'));
assert(!finalAuthority.includes('lengthMm <= 6'), 'Final authority must not use the old >6 mm exemption.');
assert(!finalAuthority.includes('endpointEligible'), 'Final authority must not lose endpoint-1-only physical components.');
assert(finalAuthority.includes("weightSource: numberOrNull(childText(node, 'Weight')) > 0 ? 'xml-weight' : 'unresolved'"));

const finalUi = read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js');
assert(finalUi.includes('collectXmlCiiFinalWeightReviewRows'));
assert(!finalUi.includes('collectXmlCiiZeroRigidWeightIssues'));
assert(finalUi.includes("key.startsWith('WPC1::')"));
assert(finalUi.includes('rigidWeightFinal = { ...(result.weightsByKey || {}) }'));
assert(finalUi.includes('rigidWeightFinal = {}'));
assert(finalUi.includes("finalReviewDisposition: 'explicit-final-accepted'"));
assert(finalUi.includes("finalReviewDisposition: result.noReviewRows ? 'no-review-rows' : 'explicit-skip-use-match1-or-source'"));
assert(finalUi.includes("console.error('Standalone final rigid weight review blocked the run:'"));
assert(finalUi.includes('Source XML ${source} kg · Final confirmation required'));
assert(finalUi.includes('Length is candidate evidence only; it never exempts a weight-bearing component from Final review.'));

const enrichmentCore = read('tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js');
assert(enrichmentCore.includes('const manualRigidWeight = xmlCiiRigidWeightOverrideForNode(branchName, node, config, nodeIdx);'));
assert(enrichmentCore.includes("xmlSetText(document, node, 'Weight', String(manualRigidWeight));"), 'Explicit reviewed weight must overwrite an existing positive source XML Weight before conversion.');

const parity = read('tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js');
const processIndex = parity.indexOf('const process = await applyStandaloneProcessParity');
const conservationIndex = parity.indexOf('const splitWeight = applyXmlCiiSplitRigidWeightPropagation');
assert(processIndex >= 0 && conservationIndex > processIndex, 'Compatibility/override enrichment must run before split physical-mass conservation.');

const adapter = read('tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js');
assert(adapter.includes('sourceIdFromPhysicalWeightMap'));
assert(adapter.includes("String(key).startsWith('WPC1::')"));
assert(adapter.includes('materializeXmlCiiLegacyWeightCompatibility'));
assert(adapter.includes('branchScope.filteredSourceText'));

const evidence = read('tabs/xml-cii-2019-standalone/xml-cii-conversion-evidence.js');
assert(evidence.includes("identity: 'physical-component'"));
assert(evidence.includes('const finalMap = plainObject(config?.overrides?.rigidWeightFinal)'));
assert(!evidence.includes('const transient = plainObject(config?.overrides?.rigidWeight)'));
assert(evidence.includes('finalReviewDisposition'));

const lifecycle = read('converters/xml-cii2019-core/weight-review-lifecycle.js');
assert(lifecycle.includes("schema: 'xml-cii-weight-review-lifecycle/v2'"));
assert(lifecycle.includes('legacyRigidWeightDemotedToMatch1'));
assert(lifecycle.includes('const finalAccepted = explicitFinal.accepted'));
assert(!lifecycle.includes('const currentFinal = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeight)'));

console.log('XML CII X003 weight freeze-boundary regression passed.');
