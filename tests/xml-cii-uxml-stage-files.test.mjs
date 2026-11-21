// End-to-end plan E2c step 4 (Owner 20 Nov 2026, "Yes, build it"): UXML stage files from step 10's code. S4 is the
// document step 10 sends the CII engine; S2 leaves out Preview edits and weight choices, S3 weight choices; S1 records
// the gasket drop; a file the UXML reader refuses says why. The review page (XML_Compare_Utilities) opens them.
import assert from 'node:assert/strict';
import test from 'node:test';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { runUxmlSupportsStage } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js';
import { applyEffectiveFactsToJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js';
import { normalizeWorkflowJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js';
import { buildUxmlStageFile, settingsParts, stageJob, STAGES_OF_PHASE } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-stage-files.js';
import { EMPTY_SETTINGS_SHA256, readStageFile } from '../vendor/uxml-v2/UxmlV2StageFile.js';
import { writePsi116FromUxmlV2 } from '../vendor/uxml-v2/UxmlV2Psi116Writer.js';
import { parsePlainXml, serializePlainXml } from '../vendor/uxml-v2/supports/PlainDom.js';

installWeightBasisXmlDom(globalThis);

const NS = ' xmlns="http://aveva.com/pipeStress116.xsd"';
const node = (id, type, x) => `<Node><NodeNumber>${id}</NodeNumber><NodeName></NodeName><ComponentType>${type}</ComponentType>`
  + `<Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness></Node>`;
const xml = (ns) => `<?xml version="1.0"?>\n<PipeStressExport${ns}><Pipe><Branch><Branchname>/G/B1</Branchname>`
  + `${node(10, 'PIPE', 0)}${node(-1, 'GASK', 50)}${node(20, 'FLAN', 100)}${node(-1, 'GASK', 150)}${node(30, 'PIPE', 200)}</Branch></Pipe></PipeStressExport>`;
const base = { weight: { enabled: false }, pipingClass: { enabled: false }, material: { enabled: false } };
const job = (sourceText, extra = {}) => ({ sourceKind: 'xml', sourceName: 'g.xml', sourceText, stagedJsonText: '',
  supportConfigJson: JSON.stringify({ ...base, ...extra }), options: { outputMode: 'both', splitCondensedValveFlange: false } });
const opened = async (j, stage) => readStageFile(JSON.parse(JSON.stringify((await buildUxmlStageFile(j, stage)).file)));
const engineDoc = (o) => o.revisions.findLast((r) => !String(r.doc.revision.stage).startsWith('supports:names')).doc;
const asToday = (x) => serializePlainXml(parsePlainXml(x));

test('S0 is the read, S1 adds the gasket drop, and S4 is the document step 10 sends the CII engine', async () => {
  const j = job(xml(NS));
  const s0 = await opened(j, 'S0');
  assert.deepEqual(s0.revisions.map((r) => r.doc.revision.stage), ['read-psi116']);
  const s1 = await opened(j, 'S1');
  assert.equal(s1.revisions[1].delta.ops.filter((o) => o.op === 'remove').length, 2);
  const s4 = await opened(j, 'S4');
  const run = await runUxmlSupportsStage(applyEffectiveFactsToJob(normalizeWorkflowJob(j).job));
  assert.equal(asToday(writePsi116FromUxmlV2(engineDoc(s4)).text), run.xmlText);
  const s2 = await opened(j, 'S2'), s3 = await opened(j, 'S3');
  assert.equal(s2.revisions.at(-1).doc.revision.id, s4.revisions.at(-1).doc.revision.id, 'no edits: S2 = S4');
  assert.equal(s3.revisions.at(-1).doc.revision.id, s4.revisions.at(-1).doc.revision.id, 'no edits: S3 = S4');
  assert.deepEqual(STAGES_OF_PHASE, { source: ['S0', 'S1'], 'json-trace': ['S2'], preview: ['S3'], 'weight-match': ['S4'] });
});

test('S2 leaves out Preview edits and weight choices, S3 weight choices; S4 keeps both, as step 10 does', async () => {
  const edits = { overrides: { processData: { L1: { t1: '400' } }, rigidWeight: { '/G/B1::20': 50 } } };
  const j = { ...job(xml(NS), edits), weightOverrides: { '/G/B1::30': 7 } };
  const parts = (s) => settingsParts(stageJob(j, s));
  assert.deepEqual([parts('S2').previewEdits, parts('S2').weightChoices], [{}, {}]);
  assert.deepEqual([parts('S3').previewEdits, parts('S3').weightChoices], [{ processData: { L1: { t1: '400' } } }, {}]);
  assert.deepEqual(parts('S4').weightChoices, { '/G/B1::20': 50, '/G/B1::30': 7 });
  const files = {};
  for (const s of ['S2', 'S3', 'S4']) files[s] = (await buildUxmlStageFile(j, s)).file;
  assert.equal(files.S2.inputs.previewEdits, EMPTY_SETTINGS_SHA256);
  assert.equal(files.S3.inputs.weightChoices, EMPTY_SETTINGS_SHA256);
  assert.notEqual(files.S4.inputs.weightChoices, EMPTY_SETTINGS_SHA256);
  for (const s of ['S2', 'S3', 'S4']) readStageFile(JSON.parse(JSON.stringify(files[s])));
  // Wrong mode: an S2 made without leaving the choices out is refused when opened.
  const wrong = JSON.parse(JSON.stringify({ ...files.S4, stage: 'S2' }));
  assert.throws(() => readStageFile(wrong), (e) => e.code === 'UXML_STAGE_SETTINGS_NOT_LEFT_OUT');
});

test('a file the UXML reader refuses gives a stage file that says why; an InputXML source gives none', async () => {
  for (const s of ['S1', 'S3']) {
    const { file } = await buildUxmlStageFile(job(xml('')), s);
    assert.equal(file.refusal, 'PSI116_VERIFIED_NAMESPACE_REQUIRED');
    assert.equal(readStageFile(JSON.parse(JSON.stringify(file))).revisions.length, 0);
  }
  await assert.rejects(buildUxmlStageFile({ ...job(xml(NS)), sourceKind: 'inputxml' }, 'S2'), /PSI116 XML source/);
});
