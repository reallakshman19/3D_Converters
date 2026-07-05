const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function fail(message) { throw new Error(message); }
function walk(dir) { const abs = path.join(root, dir); if (!fs.existsSync(abs)) return []; const out = []; for (const entry of fs.readdirSync(abs, { withFileTypes: true })) { const rel = path.join(dir, entry.name).replace(/\\/g, '/'); if (entry.isDirectory()) out.push(...walk(rel)); else out.push(rel); } return out; }

const runtime = read('core/app-standalone-runtime.js');
if (!runtime.includes("id: 'xml-cii-2019-standalone'")) fail('Missing xml-cii-2019-standalone app-level tab.');
if (!runtime.includes("id: 'model-converters'")) fail('Existing model-converters tab must remain registered.');
if (!runtime.includes('renderXmlCii2019StandaloneTab')) fail('Standalone tab renderer is not registered.');

const tab = read('tabs/xml-cii-2019-standalone-tab.js');
if (!tab.includes('runXmlCii2019Workflow(')) fail('Standalone tab must call the public workflow API.');
if (!tab.includes('Source type')) fail('Standalone tab must expose source type controls.');
if (!tab.includes('Element-based InputXML')) fail('Standalone tab must expose InputXML mode.');
if (!tab.includes('Element side-load text')) fail('Standalone tab must expose element side-load text for InputXML.');
if (!tab.includes('Restraint policy')) fail('Standalone tab must expose InputXML restraint policy.');
if (!tab.includes('Fill missing/sentinel')) fail('Standalone tab must expose sentinel fill option.');
if (!tab.includes('Output')) fail('Standalone tab must expose output mode controls.');

const api = read('tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js');
if (!api.includes('export async function runXmlCii2019Workflow')) fail('Public workflow API export is missing.');
if (!api.includes('detectXmlCiiWorkflowSourceKind')) fail('Public API must resolve source kind.');

const detect = read('tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js');
for (const token of ['PipeStressExport', 'CAESARII', 'PIPINGELEMENT']) if (!detect.includes(token)) fail('Source detector missing token ' + token);

const types = read('tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js');
for (const token of ['validateSupportConfigJson', 'JSON.parse', 'normalizeWorkflowOptions', 'coordsMode', 'kgToNewton', 'splitCondensedValveFlange', 'useRestraintTypeBasedOnJson', 'outputMode', 'elementSideLoadText', 'inputXmlOutputMode', 'pointPropertiesBasis', 'inputXmlRestraintPolicy', 'fillSentinelFromLineContext', 'normalizePressureCaseNames']) if (!types.includes(token)) fail('Workflow type utility missing token ' + token);

const service = read('tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js');
if (!service.includes('enrichInputXmlDocument')) fail('InputXML branch must call direct InputXML enrichment.');

const defaults = read('tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js');
for (const token of ['inputXmlRatingByPipingClass', 'inputXmlPipingClass', 'typeCode: 14', 'typeCode: 9', 'typeCode: 8', 'friction: -1.0101', '91261', '900']) if (!defaults.includes(token)) fail('Default standalone config missing token ' + token);

const inputxml = read('tabs/xml-cii-2019-standalone/xml-cii-inputxml-enrichment.js');
for (const token of ['parseInputXmlElementSideLoad', 'deriveRestraints', 'extractPipingClassFromLineId', 'LINE_ID', 'FROM_NAME', 'TO_NAME', 'DTXR_POS', 'DTXR_PS', 'inputXmlRatingByPipingClass', 'inputXmlPipingClass', 'typeCode: 9', 'typeCode: 8', 'PRESSURE_C1', 'PRESSURE1', 'isSentinel', 'replace-with-dtxr-derived-restraints', 'merge-existing-and-dtxr-derived-restraints', 'XMLSerializer', 'DOMParser', 'sideLoadMatched', 'sideLoadUnmatched', 'inheritedFieldCount', 'sentinelFieldCount']) if (!inputxml.includes(token)) fail('InputXML enrichment module missing token ' + token);

const engine = read('converters/xml-cii-2019-standalone/engine.js');
if (!engine.includes('standalone-compatibility-engine')) fail('Standalone engine diagnostics must identify engine mode.');
if (!engine.includes('xml_to_cii2019_direction.py')) fail('Standalone engine must use the XML to CII direction compatibility route.');
if (!engine.includes('inputxml_to_cii2019.py')) fail('Standalone engine must expose the InputXML to CII branch.');

const forbidden = ['xmlCiiWorkflowRequestFinalRun', '#model-converters-run', '__xmlCiiWorkflowRunHandoff_v1', '__xmlCiiConversionWorkflowAllowDirectRun'];
for (const file of ['tabs/xml-cii-2019-standalone-tab.js', ...walk('tabs/xml-cii-2019-standalone'), ...walk('converters/xml-cii-2019-standalone')]) {
  const text = read(file);
  for (const token of forbidden) if (text.includes(token)) fail(file + ' references forbidden legacy handoff token ' + token);
}
console.log('XML CII standalone workflow static checks passed.');
