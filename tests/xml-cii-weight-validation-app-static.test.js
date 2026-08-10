const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const panel = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-validation-report.js'), 'utf8');
assert(panel.includes("from '../../../converters/empirical-weight/index.js'"));
assert(panel.includes('createEmpiricalWeightValidator'));
assert(panel.includes('abnormalityThresholdPct: 30'));
assert(panel.includes('Save abnormal CSV'));
assert(panel.includes('Save audit JSON'));
assert(panel.includes('stateRef.current.empiricalWeightValidationReport = report'));
assert(!panel.includes('Math.exp('), 'UI consumer must not duplicate empirical formulas.');
assert(!panel.includes('LOG1') && !panel.includes('LOG2') && !panel.includes('RAW1') && !panel.includes('RAW2'), 'UI consumer must call API, not hardcode A1 models.');

const wm = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js'), 'utf8');
assert(wm.includes('appendEmpiricalWeightValidationReport(card, stateRef)'));
console.log('Empirical weight validation app wiring checks passed.');
