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

const finalUi = read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js');
assert(finalUi.includes('collectXmlCiiWeightMatchRows'));
assert(!finalUi.includes('collectXmlCiiZeroRigidWeightIssues'));
assert(finalUi.includes('dedupeXmlCiiPhysicalWeightRows'));
assert(finalUi.includes("key.startsWith('WPC1::')"));
assert(finalUi.includes('rigidWeightFinal = { ...(result.weightsByKey || {}) }'));
assert(finalUi.includes('rigidWeightFinal = {}'));
assert(finalUi.includes("finalReviewDisposition: 'explicit-final-accepted'"));
assert(finalUi.includes("finalReviewDisposition: result.noReviewRows ? 'no-review-rows' : 'explicit-skip-use-match1'"));
assert(finalUi.includes("console.error('Standalone final rigid weight review blocked the run:'"));

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
