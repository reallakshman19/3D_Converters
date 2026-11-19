// End-to-end plan E1 (Owner 19 Nov 2026): with "UXML route" ticked, step 10 reads the source once into a UXML document
// and runs the gasket drop as a UXML stage on it; the Run record lists the removed nodes. A file the UXML reader refuses
// (here: no PSI116 namespace) gets today's gasket drop on the XML text, and the log and the record say so.
import assert from 'node:assert/strict';
import test from 'node:test';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { enrichStandaloneXmlForUxmlRoute, runUxmlSupportsStage } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js';

installWeightBasisXmlDom(globalThis);

const NS = ' xmlns="http://aveva.com/pipeStress116.xsd"';
const node = (id, type, x) => `<Node><NodeNumber>${id}</NodeNumber><NodeName></NodeName><ComponentType>${type}</ComponentType>`
  + `<Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness></Node>`;
const xml = (ns) => `<?xml version="1.0"?>\n<PipeStressExport${ns}><Pipe><Branch><Branchname>/G/B1</Branchname>`
  + `${node(10, 'PIPE', 0)}${node(-1, 'GASK', 50)}${node(20, 'FLAN', 100)}${node(-1, 'GASK', 150)}${node(30, 'PIPE', 200)}</Branch></Pipe></PipeStressExport>`;
const config = { weight: { enabled: false }, pipingClass: { enabled: false }, material: { enabled: false } };
const job = (sourceText, extra = {}) => ({ sourceKind: 'xml', sourceName: 'g.xml', sourceText, stagedJsonText: '',
  supportConfigJson: JSON.stringify({ ...config, ...extra }), options: { outputMode: 'both', splitCondensedValveFlange: false } });
const types = (xmlText) => [...new DOMParser().parseFromString(xmlText, 'application/xml').getElementsByTagName('ComponentType')].map((e) => e.textContent);

test('the document records the two gaskets it removed; the supports stage starts without them', async () => {
  const stage = await runUxmlSupportsStage(job(xml(NS)));
  assert.equal(stage.document.stage, 'gasket-drop');
  assert.deepEqual(stage.document.removed.map((r) => [r.branchName, r.NodeNumber]), [['/G/B1', -1], ['/G/B1', -1]]);
  assert.notEqual(stage.document.sourceRevision, stage.document.revision);
  assert.deepEqual(types(stage.stageInputXml), ['PIPE', 'FLAN', 'PIPE']);
});

test('gasket drop turned off in the config: the document removes nothing', async () => {
  const stage = await runUxmlSupportsStage(job(xml(NS), { dropGasketNodes: false }));
  assert.deepEqual(stage.document.removed, []);
  assert.deepEqual(types(stage.stageInputXml), ['PIPE', 'GASK', 'FLAN', 'GASK', 'PIPE']);
});

test('no PSI116 namespace: today\'s gasket drop runs, and the log names the refusal', async () => {
  const stage = await runUxmlSupportsStage(job(xml('')));
  assert.deepEqual(stage.document, { made: false, refusal: 'PSI116_VERIFIED_NAMESPACE_REQUIRED' });
  assert.deepEqual(types(stage.stageInputXml), ['PIPE', 'FLAN', 'PIPE']);
  const out = await enrichStandaloneXmlForUxmlRoute(job(xml('')));
  assert.ok(out.logs.some((l) => l.includes('no UXML document (PSI116_VERIFIED_NAMESPACE_REQUIRED)')), out.logs.join('\n'));
});
