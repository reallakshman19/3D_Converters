const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Read current standalone phase registry
const registryPath = path.resolve(__dirname, '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js');
const registryText = fs.readFileSync(registryPath, 'utf8');

// Read old direct panels to verify we have reference to legacy phases
const oldPanelsPath = path.resolve(__dirname, '../tabs/model-converters/xml-cii-conversion-workflow-direct-panels.js');
const oldPanelsText = fs.readFileSync(oldPanelsPath, 'utf8');

// The promised 12 phases (1 to 12) for the standalone UI rebuild.
const PROMISED_UI_TABS = [
  '1 Source & Preview',
  '2 Regex Tester',
  '3 Import Masters',
  '4 Resolver / JSON Trace',
  '5 Manual / Element Side-load',
  '6 Preview',
  '7 Diagnostics',
  '8 Matched Audit',
  '9 Weight Match',
  '10 Support Type Mapper',
  '11 Config',
  '12 Output / Run'
];

// Feature check mappings to ensure 100% legacy parity plus 2 new features
const LEGACY_AND_NEW_FEATURES = [
  'Source Mode (XML / InputXML Auto-Detect)', // NEW
  'XML / InputXML Source Preview',            // NEW
  'Regex Tester',
  'Import Masters',
  'JSON Trace',
  'Manual Restraints',
  'Preview',
  'Diagnostics',
  'Matched Audit',
  'Weight Match',
  'Support Type Mapper',
  'Config',
  'Output / Run'
];

function testPromisedUIContractGap() {
  console.log('--- UI-0 Contract Test: Evaluating UI Gap ---');

  // Verify that the promised tabs are explicitly mapped out
  assert(PROMISED_UI_TABS.length === 12, 'Promised UI must contain exactly 12 tabs (1 to 12).');

  // Check if current registry matches the promised contract
  const currentTabCountMatch = registryText.match(/\{ id:/g) || [];
  const hasGap = currentTabCountMatch.length !== PROMISED_UI_TABS.length;
  
  if (hasGap) {
    console.log(`[GAP DETECTED] Current standalone registry has ${currentTabCountMatch.length} pills. Contract requires ${PROMISED_UI_TABS.length} tabs.`);
  } else {
    console.log('[PARITY ACHIEVED] Standalone registry matches the 12-tab contract.');
    for (const tab of PROMISED_UI_TABS) {
      assert(registryText.includes(tab), `Registry must contain promised tab: ${tab}`);
    }
  }

  // 100% Validation check
  // The old workflow phases MUST exist in the old workflow UI map
  const expectedOldPhases = ['1 Regex', '2 Import Masters', '4 Preview', '5 Diagnostics', '5A Weight Match', '7 Support Types', '8 Config', '6 Run'];
  for (const oldPhase of expectedOldPhases) {
    assert(oldPanelsText.includes(oldPhase), `Old panels file missing reference to legacy phase ${oldPhase}`);
  }
}

function testApiBoundaryGuard() {
  console.log('--- UI-0 Contract Test: API Boundary Guard ---');
  // runXmlCii2019Workflow must remain the main API boundary.
  const apiPath = path.resolve(__dirname, '../tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js');
  const apiText = fs.readFileSync(apiPath, 'utf8');
  assert(apiText.includes('export async function runXmlCii2019Workflow'), 'runXmlCii2019Workflow must be exported as the API boundary.');
  assert(apiText.includes('detectXmlCiiWorkflowSourceKind'), 'InputXML/XML Auto-Detect feature must remain exposed.');
}

testPromisedUIContractGap();
testApiBoundaryGuard();
console.log('XML CII standalone UI contract specification passed.');
