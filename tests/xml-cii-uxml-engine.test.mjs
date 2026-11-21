// End-to-end plan E3 (Owner 21 Nov 2026, "Yes, build E3"): the CII engine reads the UXML document step 10's route makes
// (the revision before the "|" names), not the XML written from it. Same CII; the engine's own changes are recorded.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { ENGINE_UXML_STORAGE_KEY, engineReadsUxmlOn, runUxmlSupportsStage } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js';
import { applyEffectiveFactsToJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js';
import { normalizeWorkflowJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js';
import { engineChangeSteps, withEngineChanges } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-engine-changes.js';
import { writePsi116FromUxmlV2 } from '../vendor/uxml-v2/UxmlV2Psi116Writer.js';
import { parsePlainXml, serializePlainXml } from '../vendor/uxml-v2/supports/PlainDom.js';
import { withoutTransferNote } from '../vendor/uxml-v2/transfer/TransferNote.js';

installWeightBasisXmlDom(globalThis);

const repo = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = path.join(repo, 'v045/converters/scripts/xml_to_cii2019_runtime_custody.py');
const MODEL = path.join(repo, 'Benchmarks/WSW-2-RE-AFC.xml');
const job = () => applyEffectiveFactsToJob(normalizeWorkflowJob({ sourceKind: 'xml', sourceName: 'WSW-2-RE-AFC.xml',
  sourceText: fs.readFileSync(MODEL, 'utf8'), stagedJsonText: '', supportConfigJson: '{}',
  options: { outputMode: 'both', splitCondensedValveFlange: true } }).job);
const asToday = (x) => serializePlainXml(parsePlainXml(withoutTransferNote(x)));

/** The engine as step 10 runs it (engine.js argv), natively: from an XML file, or (uxml) from a UXML document. */
function engine(dir, input, uxml) {
  const out = path.join(dir, 'out.cii'), changes = path.join(dir, 'changes.json');
  const argv = [SCRIPT, '--input', input, '--output', out, '--coords-mode', 'first', '--weight-scale', '10', '--support-config-json', '{}',
    '--split-condensed-valve-flange', '--use-restraint-type-based-on-json', ...(uxml ? ['--input-uxml', '--uxml-changes-out', changes] : [])];
  const run = spawnSync(process.env.PYTHON || 'python', ['-B', ...argv], { encoding: 'utf8', cwd: dir });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  return { cii: fs.readFileSync(out, 'utf8'), changes: uxml ? JSON.parse(fs.readFileSync(changes, 'utf8')).rows : null };
}

test('the switch is off unless turned on in this browser; blocked or missing storage is off', () => {
  assert.equal(engineReadsUxmlOn(null), false);
  assert.equal(engineReadsUxmlOn({ getItem: () => null }), false);
  assert.equal(engineReadsUxmlOn({ getItem: (k) => (k === ENGINE_UXML_STORAGE_KEY ? 'on' : null) }), true);
  assert.equal(engineReadsUxmlOn({ getItem: () => { throw new Error('blocked'); } }), false);
});

test('the CII from the document equals the CII from the XML; no XML file is given; wrong documents give another CII', async () => {
  const run = await runUxmlSupportsStage(job());
  assert.ok(run.engineUxml, 'the route hands the engine document');
  assert.equal(asToday(writePsi116FromUxmlV2(run.engineUxml).text), run.xmlText, 'the engine XML is written from it');
  assert.ok(!JSON.stringify(run.engineUxml).includes('|'), 'no "|" names reach the engine');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e3-engine-'));
  try {
    const xmlDir = fs.mkdirSync(path.join(dir, 'xml'), { recursive: true }) || path.join(dir, 'xml');
    fs.writeFileSync(path.join(xmlDir, 'in.xml'), run.xmlText);
    const fromXml = engine(xmlDir, path.join(xmlDir, 'in.xml'), false);
    // The document run's folder holds no XML at all: the engine can only read the document.
    const docDir = fs.mkdirSync(path.join(dir, 'doc'), { recursive: true }) || path.join(dir, 'doc');
    const write = (name, doc) => { fs.writeFileSync(path.join(docDir, name), JSON.stringify(doc)); return path.join(docDir, name); };
    const fromDoc = engine(docDir, write('in.uxml.json', run.engineUxml), true);
    assert.equal(fromDoc.cii, fromXml.cii);
    assert.ok(!fs.readdirSync(docDir).some((f) => /\.xml$/i.test(f)));
    assert.ok(fromDoc.changes.some((r) => r.rule === 'engine:bend-radius'), 'the engine lists its bend radius changes');
    // Wrong modes: a document with one support dropped, or two nodes swapped, gives another CII.
    const drop = structuredClone(run.engineUxml);
    // A support on a numbered node (the engine leaves unnumbered ATTA, NodeNumber -2, out of the CII).
    const holder = drop.pipelines.flatMap((p) => p.components).find((c) => c.restraints?.length && Number(c.values.NodeNumber?.text) > 0);
    holder.restraints.pop();
    assert.notEqual(engine(docDir, write('drop.uxml.json', drop), true).cii, fromXml.cii, 'a dropped support changes the CII');
    const swap = structuredClone(run.engineUxml);
    // Two numbered nodes of one branch trade places (their positions).
    const numbered = swap.pipelines.map((p) => p.components.filter((c) => Number(c.values.NodeNumber?.text) > 0 && c.values.Position))
      .find((cs) => cs.length > 3);
    [numbered[1].values.Position, numbered[2].values.Position] = [numbered[2].values.Position, numbered[1].values.Position];
    assert.notEqual(engine(docDir, write('swap.uxml.json', swap), true).cii, fromXml.cii, 'two swapped nodes change the CII');
    // The engine's changes become recorded steps, listed with their rule.
    const rec = engineChangeSteps(run.engineUxml, fromDoc.changes);
    // WSW: process data changes nothing, so only the bend radius step is recorded (E4: no empty steps).
    assert.deepEqual(rec.steps.map((s) => s.stage), ['engine:bend-radius']);
    assert.equal(rec.steps.reduce((n, s) => n + s.ops, 0) + rec.notRecorded + rec.conflicts.length, fromDoc.changes.length);
    assert.deepEqual(rec.list.map((s) => s.listed), rec.steps.map((s) => s.ops));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the Run record gets the engine steps after the supports sub-steps; a refusal is recorded, nothing added', async () => {
  const run = await runUxmlSupportsStage(job());
  const node = run.engineUxml.pipelines.flatMap((p) => p.components).find((c) => c.values?.BendRadius);
  const rows = [{ uid: node.uid, field: 'BendRadius', before: node.values.BendRadius.text, after: null, rule: 'engine:bend-radius' },
    { uid: node.uid, field: 'Restraint+1.Type', before: null, after: 'X', rule: 'engine:bend-radius' }];
  const rec = engineChangeSteps(run.engineUxml, rows);
  assert.equal(rec.notRecorded, 1, 'a support the engine adds is counted, not recorded');
  const record = { model: 'm', changes: { made: true, steps: [{ stage: 'supports:branch-pass', ops: 1 }], list: [{ stage: 'supports:branch-pass', listed: 1 }] } };
  const after = withEngineChanges(record, { used: true, revision: run.engineUxml.revision.id, changes: rows }, rec);
  assert.deepEqual(after.changes.steps.map((s) => s.stage), ['supports:branch-pass', 'engine:bend-radius']);
  assert.equal(after.changes.list.length, 2);
  assert.deepEqual([after.engine.readUxml, after.engine.changes, after.engine.notRecorded], [true, 2, 1]);
  const refused = withEngineChanges(record, { used: false, refusal: 'UXML_TREE_HEADER' }, null);
  assert.deepEqual([refused.engine.readUxml, refused.engine.refusal, refused.changes], [false, 'UXML_TREE_HEADER', record.changes]);
});

test('PR 439 review N1: a second tree in the same engine process carries only its own uids (Pyodide keeps one process)', async () => {
  const run = await runUxmlSupportsStage(job());
  const one = { ...structuredClone(run.engineUxml), pipelines: [structuredClone(run.engineUxml.pipelines[0])] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e3-uids-'));
  try {
    fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(run.engineUxml));
    fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify(one));
    const py = ['import gc, json, sys', `sys.path.insert(0, ${JSON.stringify(path.dirname(SCRIPT))})`, 'import uxml_tree',
      `a = uxml_tree.tree_from_uxml(json.load(open(${JSON.stringify(path.join(dir, 'a.json'))}, encoding="utf-8")))`, 'del a', 'gc.collect()',
      `b = uxml_tree.tree_from_uxml(json.load(open(${JSON.stringify(path.join(dir, 'b.json'))}, encoding="utf-8")))`,
      'mine = {id(e) for e in b.getroot().iter()}',
      'print(json.dumps({"map": len(uxml_tree._UIDS), "stale": sum(1 for k in uxml_tree._UIDS if k not in mine)}))'].join('\n');
    const r = spawnSync(process.env.PYTHON || 'python', ['-B', '-c', py], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const got = JSON.parse(r.stdout);
    const entities = one.pipelines.reduce((n, p) => n + 1 + p.components.reduce((m, c) => m + 1 + (c.restraints?.length || 0), 0), 0);
    assert.deepEqual(got, { map: entities, stale: 0 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
