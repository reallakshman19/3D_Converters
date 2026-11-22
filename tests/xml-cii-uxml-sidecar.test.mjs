// End-to-end plan E4b steps 2 and 3 (Owner 21 Nov 2026, "Yes, as suggested"): the CII engine lists which UXML node ids
// made each CII node number (the CII does not change), and step 10 builds the CII's sidecar from the recorded steps:
// per node id its name history and only what changed. Checked against a direct diff of the source and final documents.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { runUxmlSupportsStage } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js';
import { applyEffectiveFactsToJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js';
import { normalizeWorkflowJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js';
import { engineChangeSteps } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-engine-changes.js';
import { buildCiiSidecar, sidecarFileName } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-sidecar.js';

installWeightBasisXmlDom(globalThis);

const repo = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = path.join(repo, 'v045/converters/scripts/xml_to_cii2019_runtime_custody.py');
const job = (name = 'WSW-2-RE-AFC.xml') => applyEffectiveFactsToJob(normalizeWorkflowJob({ sourceKind: 'xml', sourceName: name,
  sourceText: fs.readFileSync(path.join(repo, 'Benchmarks', name), 'utf8'),
  stagedJsonText: '', supportConfigJson: '', options: { outputMode: 'both', splitCondensedValveFlange: true } }).job);
const ARGV = ['--coords-mode', 'first', '--weight-scale', '10', '--split-condensed-valve-flange', '--use-restraint-type-based-on-json'];
function engine(dir, input, uxml) {
  const out = path.join(dir, 'out.cii'), changes = path.join(dir, 'changes.json');
  const r = spawnSync(process.env.PYTHON || 'python', ['-B', SCRIPT, '--input', input, '--output', out, ...ARGV,
    ...(uxml ? ['--input-uxml', '--uxml-changes-out', changes] : [])], { encoding: 'utf8', cwd: dir });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return { cii: fs.readFileSync(out, 'utf8'), ...(uxml ? JSON.parse(fs.readFileSync(changes, 'utf8')) : {}) };
}
const entities = (doc) => new Map(doc.pipelines.flatMap((p) => [p, ...p.components, ...p.components.flatMap((c) => c.restraints || [])]).map((e) => [e.uid, e]));
/** Independent of the sidecar: every (uid, field) whose text differs between the source and the final document. */
function directDiff(base, final) {
  const b = entities(base), out = new Set();
  for (const [uid, e] of entities(final)) {
    const was = b.get(uid);
    if (!was) continue;
    for (const k of new Set([...Object.keys(was.values || {}), ...Object.keys(e.values || {})])) {
      if ((was.values?.[k]?.text ?? null) !== (e.values?.[k]?.text ?? null)) out.add(`${uid} ${k}`);
    }
  }
  return out;
}
function listed(sc) {
  const out = new Set();
  for (const n of [...sc.nodes.flatMap((x) => x.ids), ...sc.notInCii]) {
    for (const c of n.changed || []) out.add(`${n.id} ${c.field}`);
    for (const s of n.supports || []) for (const c of s.changed || []) out.add(`${s.id} ${c.field}`);
  }
  for (const b of sc.branches) for (const c of b.changed) out.add(`${b.id} ${c.field}`);
  return out;
}

/** E4b review B2: every node and support of the source missing from the final document is listed as removed. */
function removedIds(base, final) {
  const now = entities(final);
  return new Set([...entities(base).keys()].filter((uid) => !now.has(uid) && !base.pipelines.some((p) => p.uid === uid)));
}
function listedRemoved(sc) {
  const out = new Set();
  for (const r of sc.removed) { out.add(r.id); for (const s of r.supports || []) out.add(s.id); }
  for (const n of [...sc.nodes.flatMap((x) => x.ids), ...sc.notInCii]) for (const s of n.supports || []) if (s.removed) out.add(s.id);
  return out;
}

const shared = new Map();
async function setup(name = 'WSW-2-RE-AFC.xml', withXml = true) {
  if (shared.has(name)) return shared.get(name);
  const run = await runUxmlSupportsStage(job(name));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e4b-sidecar-'));
  fs.writeFileSync(path.join(dir, 'doc.json'), JSON.stringify(run.engineUxml));
  const doc = engine(dir, path.join(dir, 'doc.json'), true);
  fs.writeFileSync(path.join(dir, 'in.xml'), run.xmlText);
  const xml = withXml ? engine(dir, path.join(dir, 'in.xml'), false) : null;
  fs.rmSync(dir, { recursive: true, force: true });
  const rec = engineChangeSteps(run.namesUxml, doc.rows);
  shared.set(name, { run, doc, xml, rec });
  return shared.get(name);
}

test('the engine lists the node ids of every CII node number; the CII is today\'s', async () => {
  const { run, doc, xml } = await setup();
  assert.equal(doc.cii, xml.cii, 'same CII as from the XML');
  const map = doc.nodeMap;
  assert.equal(map.schema, 'uxml-cii-node-map/v1');
  assert.ok(map.nodes.length > 50 && map.nodes.every((n) => n.ids.length > 0), 'every CII node number has its ids');
  const ids = [...map.nodes.flatMap((n) => n.ids), ...map.notInCii.map((n) => n.id)];
  const comps = run.engineUxml.pipelines.flatMap((p) => p.components);
  assert.equal(new Set(ids).size, ids.length, 'each id once');
  assert.equal(ids.length, comps.length, 'every node id is listed');
  // WSW: the engine joins island node 770 into 769. A map by the document's NodeNumber would put it under 770, which
  // is no CII node (wrong mode); the map follows the engine.
  const num = Object.fromEntries(comps.map((c) => [c.uid, c.values.NodeNumber?.text]));
  const moved = map.nodes.flatMap((n) => n.ids.filter((id) => Number(num[id]) !== n.cii).map((id) => [num[id], n.cii]));
  assert.ok(moved.some(([from, to]) => from === '770' && to === 769), JSON.stringify(moved));
  assert.ok(!map.nodes.some((n) => n.cii === 770));
});

test('a NodeNumber the engine does not read as a number is not mapped to a CII node (review B3)', async () => {
  const { run, doc } = await setup();
  const edited = structuredClone(run.engineUxml);
  const target = edited.pipelines.flatMap((p) => p.components).find((c) => c.values.NodeNumber?.text === '-1');
  assert.ok(target, 'an unnumbered node');
  const nodes = doc.nodeMap.nodes.map((n) => n.cii);
  target.values.NodeNumber.text = `${nodes[0]}.0`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e4b-b3-'));
  fs.writeFileSync(path.join(dir, 'doc.json'), JSON.stringify(edited));
  const out = engine(dir, path.join(dir, 'doc.json'), true);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(out.cii, doc.cii, 'the engine ignores "N.0"');
  assert.ok(!out.nodeMap.nodes.some((n) => n.ids.includes(target.uid)), 'so does the node map');
  assert.equal(out.nodeMap.notInCii.find((n) => n.id === target.uid)?.nodeNumber, `${nodes[0]}.0`);
});

test('the sidecar lists exactly what changed, node id wise, with the "|" name history', async () => {
  const { run, doc, rec } = await setup();
  const sc = buildCiiSidecar({ model: 'WSW-2-RE-AFC.xml', cii: { name: 'WSW-2-RE-AFC.cii' }, chain: run.chain, engineDeltas: rec.deltas,
    finalDoc: rec.uxml, nodeMap: doc.nodeMap, names: run.changes.names, conflicts: run.changes.conflicts });
  assert.equal(sidecarFileName(sc.cii.name), 'WSW-2-RE-AFC.cii.sidecar.json');
  assert.equal(sc.nodes.length, doc.nodeMap.nodes.length);
  assert.equal(sc.document.revision, rec.uxml.revision.id);
  const want = directDiff(run.chain.base, rec.uxml);
  assert.ok(want.size > 100);
  assert.deepEqual([...listed(sc)].sort(), [...want].sort(), 'no change missing, none extra');
  assert.deepEqual([...listedRemoved(sc)].sort(), [...removedIds(run.chain.base, rec.uxml)].sort(), 'every removed node and support');
  const byId = new Map([...sc.nodes.flatMap((n) => n.ids), ...sc.notInCii].map((n) => [n.id, n]));
  assert.ok(run.changes.names.length > 0);
  for (const n of run.changes.names) {
    assert.deepEqual(byId.get(n.node).NodeName, n.NodeName, 'NodeName.1..n in order');
    assert.deepEqual(byId.get(n.node).joined, n.from);
    for (const from of n.from) assert.equal(sc.removed.find((r) => r.id === from)?.joinedInto, n.node);
  }
  // Wrong modes: without the engine's steps the bend radius removals go missing; without the names step the history does.
  const noEngine = buildCiiSidecar({ chain: run.chain, finalDoc: rec.uxml, nodeMap: doc.nodeMap, names: run.changes.names });
  assert.ok([...want].some((x) => !listed(noEngine).has(x)), 'the engine steps are needed');
  const noNames = buildCiiSidecar({ chain: { ...run.chain, deltas: run.chain.deltas.filter((d) => d.stage !== 'supports:names') }, engineDeltas: rec.deltas,
    finalDoc: rec.uxml, nodeMap: doc.nodeMap });
  assert.ok([...want].some((x) => !listed(noNames).has(x)), 'the names step is needed');
});

test('EF-05: the supports of joined-away duplicate nodes are listed with them (review B2)', async () => {
  const { run, doc, rec } = await setup('EF-05-PRO.TEST.xml', false);
  const sc = buildCiiSidecar({ model: 'EF-05-PRO.TEST.xml', chain: run.chain, engineDeltas: rec.deltas, finalDoc: rec.uxml,
    nodeMap: doc.nodeMap, names: run.changes.names, conflicts: run.changes.conflicts, notRecorded: rec.notRecorded });
  const want = removedIds(run.chain.base, rec.uxml);
  assert.ok(want.size > 300, String(want.size));
  assert.deepEqual([...listedRemoved(sc)].sort(), [...want].sort(), 'no removed node or support missing, none extra');
  const withSupports = sc.removed.filter((r) => r.joinedInto && r.supports?.length);
  assert.ok(withSupports.length >= 25, String(withSupports.length));
  assert.deepEqual([...listed(sc)].sort(), [...directDiff(run.chain.base, rec.uxml)].sort(), 'values as before');
  assert.equal(sc.document.notRecorded, rec.notRecorded);
});
