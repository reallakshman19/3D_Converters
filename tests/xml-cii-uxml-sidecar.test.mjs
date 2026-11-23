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
import { buildCiiSidecar, enrichedPlaces, sidecarFileName } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-sidecar.js';
import { enrichedFromDocument } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-enriched.js';

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

/** The CII's elements in order: [from, to] of each 15-line block of #$ ELEMENTS. */
function ciiElements(text) {
  const lines = String(text).split(/\r?\n/), at = lines.findIndex((l) => /^#\$ ELEMENTS/.test(l));
  const end = lines.findIndex((l, i) => i > at && /^#\$ /.test(l));
  const rows = lines.slice(at + 1, end);
  assert.equal(rows.length % 15, 0);
  return Array.from({ length: rows.length / 15 }, (_, k) => rows[k * 15].trim().split(/\s+/).slice(0, 2).map(Number));
}
const kidsOf = (el, tag) => [...el.childNodes].filter((c) => c.nodeType === 1 && String(c.localName || c.nodeName).replace(/^.*:/, '') === tag);

/** S-fix step 2: the CII's support blocks, in order: per block its written slots [node, type, stiffness, gap, friction, cx, cy, cz]. */
function ciiSupports(text) {
  const lines = String(text).split(/\r?\n/), at = lines.findIndex((l) => /^#\$ RESTRANT/.test(l));
  const end = lines.findIndex((l, i) => i > at && /^#\$ /.test(l));
  const rows = lines.slice(at + 1, end);
  assert.equal(rows.length % 24, 0);
  return Array.from({ length: rows.length / 24 }, (_, b) => Array.from({ length: 6 }, (_, k) => [
    ...rows[b * 24 + k * 4].trim().split(/\s+/).slice(0, 5), ...rows[b * 24 + k * 4 + 1].trim().split(/\s+/)].map(Number))
    .filter((slot) => slot[0] !== 0));
}
const near = (a, b) => Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b));
function assertWrittenAsInCii(supports, cii) {
  const want = ciiSupports(cii);
  assert.equal(supports.length, want.length, 'one entry per CII support block');
  supports.forEach((b, i) => {
    assert.equal(b.written.length, want[i].length, `block ${i + 1}: support count`);
    b.written.forEach((s, k) => {
      const [node, type, stiffness, gap, friction, ...cos] = want[i][k];
      assert.equal(b.cii, node);
      assert.equal(s.type, type);
      for (const [x, y] of [[s.stiffness, stiffness], [s.gap, gap], [s.friction, friction], ...s.cosines.map((c, j) => [c, cos[j]])]) {
        assert.ok(near(x, y), `CII node ${node} support ${k + 1}: ${x} vs ${y}`);
      }
    });
  });
}
const sidecarOf = (name, { run, doc, rec }) => buildCiiSidecar({ model: name, chain: run.chain, engineDeltas: rec.deltas, finalDoc: rec.uxml,
  nodeMap: doc.nodeMap, names: run.changes.names });
/** Independent of the sidecar: each UXML support id -> the node id that holds it, and each node id -> its NodeNumber. */
function holders(doc) {
  const of = new Map(), number = new Map();
  for (const c of doc.pipelines.flatMap((p) => p.components)) {
    number.set(c.uid, Number(c.values.NodeNumber?.text));
    for (const r of c.restraints || []) of.set(r.uid, c.uid);
  }
  return { of, number };
}

test('S-fix step 2, WSW: the engine lists each CII support as written, the CII is today\'s; each support names its source', async () => {
  const { run, doc, xml, rec } = await setup();
  assert.equal(doc.cii, xml.cii, 'same CII as from the XML');
  assertWrittenAsInCii(doc.nodeMap.supports, doc.cii);
  const sc = sidecarOf('WSW-2-RE-AFC.xml', { run, doc, rec });
  assert.deepEqual(sc.ciiSupports.map((b) => b.cii), doc.nodeMap.supports.map((b) => b.cii));
  const { of } = holders(rec.uxml);
  const under = new Map(doc.nodeMap.nodes.map((n) => [n.cii, new Set(n.ids)]));
  const from = {};
  for (const b of sc.ciiSupports) {
    for (const s of b.written) {
      from[s.from] = (from[s.from] || 0) + 1;
      if (s.from === 'xml') assert.ok(of.get(s.support) === s.id && under.get(b.cii).has(s.id), JSON.stringify(s));
      if (s.from === 'moved') assert.ok(of.get(s.support) === s.fromId && !under.get(b.cii).has(s.fromId), JSON.stringify(s));
    }
  }
  assert.ok(from.xml > 0 && from.openEnd > 0, JSON.stringify(from));
  assert.equal(from.engine, undefined, JSON.stringify(from));
  // A sidecar from an engine that did not list its supports says so (null), never an empty list.
  assert.equal(buildCiiSidecar({ chain: run.chain, finalDoc: rec.uxml, nodeMap: { ...doc.nodeMap, supports: undefined } }).ciiSupports, null);
});

test('S-fix step 2, EF-05: the 11 supports step 10 moves from unnumbered nodes name the unnumbered node they came from', async () => {
  const { run, doc, rec } = await setup('EF-05-PRO.TEST.xml', false);
  assertWrittenAsInCii(doc.nodeMap.supports, doc.cii);
  const sc = sidecarOf('EF-05-PRO.TEST.xml', { run, doc, rec });
  const { of, number } = holders(rec.uxml);
  const moved = sc.ciiSupports.flatMap((b) => b.written.filter((s) => s.from === 'moved').map((s) => ({ cii: b.cii, ...s })));
  assert.equal(moved.length, 11, JSON.stringify(moved.map((m) => m.cii)));
  for (const m of moved) {
    assert.equal(of.get(m.support), m.fromId);
    assert.ok(number.get(m.fromId) <= 0, `CII node ${m.cii}: moved from NodeNumber ${number.get(m.fromId)}`);
  }
  assert.ok(moved.some((m) => m.cii === 800), 'node 800 (K1)');
  const count = (f) => sc.ciiSupports.flatMap((b) => b.written).filter((s) => s.from === f).length;
  assert.equal(count('openEnd'), 30);
  assert.equal(count('engine'), 0);
});

test('S-fix step 2: a numbered ANCI node without a support gets the engine rule\'s +Y, listed as the rule on that node id', async () => {
  const { run, doc } = await setup();
  const edited = structuredClone(run.engineUxml);
  const comps = edited.pipelines.flatMap((p) => p.components);
  // A CII element carries one support block: a node next to a supported node would take that block (as step 10 does today).
  const held = new Set(doc.nodeMap.supports.map((b) => b.cii));
  const nextToHeld = (n) => doc.nodeMap.elements.some((e) => (e.from === n && held.has(e.to)) || (e.to === n && held.has(e.from)));
  const target = comps.find((c) => Number(c.values.NodeNumber?.text) > 0 && !(c.restraints || []).length && c.values.ComponentType
    && doc.nodeMap.nodes.find((n) => n.ids.includes(c.uid))?.ids.length === 1 && !held.has(Number(c.values.NodeNumber.text))
    && !nextToHeld(Number(c.values.NodeNumber.text)));
  assert.ok(target, 'a plain numbered node');
  target.values.ComponentType.text = 'ANCI';
  // At a point with several ids (a branch's first node on its parent's node) the rule names only the ANCI one.
  const sharedAt = (c) => doc.nodeMap.nodes.find((n) => n.ids.includes(c.uid));
  const shared = comps.find((c) => c !== target && Number(c.values.NodeNumber?.text) > 0 && !(c.restraints || []).length && c.values.ComponentType
    && sharedAt(c)?.ids.length > 1 && !held.has(sharedAt(c).cii) && !nextToHeld(sharedAt(c).cii)
    && sharedAt(c).ids.every((id) => !(comps.find((x) => x.uid === id).restraints || []).length));
  assert.ok(shared, 'a plain node at a point with several ids');
  shared.values.ComponentType.text = 'ANCI';
  // Two supports at one CII node are listed in the CII's slot order: a second XML support added to a held node.
  const one = comps.find((c) => (c.restraints || []).length === 1 && doc.nodeMap.supports.find((b) => b.cii === Number(c.values.NodeNumber?.text))
    ?.written.map((w) => w.source).join() === c.restraints[0].uid);
  assert.ok(one, 'a node with one XML support');
  const extra = structuredClone(one.restraints[0]);
  extra.uid = `${extra.uid}-sfix2`;
  extra.values.Type.text = /Z/.test(extra.values.Type.text) ? '+X' : '+Z';
  one.restraints.push(extra);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfix2-anci-'));
  fs.writeFileSync(path.join(dir, 'doc.json'), JSON.stringify(edited));
  const out = engine(dir, path.join(dir, 'doc.json'), true);
  fs.rmSync(dir, { recursive: true, force: true });
  assertWrittenAsInCii(out.nodeMap.supports, out.cii);
  const sc = buildCiiSidecar({ chain: { base: edited, deltas: [] }, finalDoc: edited, nodeMap: out.nodeMap });
  const at = sc.ciiSupports.find((b) => b.cii === Number(target.values.NodeNumber.text));
  assert.deepEqual(at?.written.map((s) => [s.from, s.rule, s.ids, s.type, s.friction]), [['rule', 'componentType', [target.uid], 14, 0.3]]);
  const at2 = sc.ciiSupports.find((b) => b.cii === sharedAt(shared).cii);
  assert.deepEqual(at2?.written.map((s) => [s.from, s.rule, s.ids]), [['rule', 'componentType', [shared.uid]]]);
  const atOne = sc.ciiSupports.find((b) => b.cii === Number(one.values.NodeNumber.text));
  assert.deepEqual(atOne?.written.map((s) => [s.from, s.support]), [['xml', one.restraints[0].uid], ['xml', extra.uid]]);
  assert.notEqual(atOne.written[0].type, atOne.written[1].type);
  // Only those nodes are new; every other support keeps its source.
  const key = (x) => x.ciiSupports.flatMap((b) => b.written.map((s) => `${b.cii} ${s.from} ${s.support || ''}`)).sort();
  const before = buildCiiSidecar({ chain: { base: run.engineUxml, deltas: [] }, finalDoc: run.engineUxml, nodeMap: doc.nodeMap });
  const mine = (k) => [at.cii, at2.cii, atOne.cii].some((n) => k.startsWith(`${n} `));
  assert.deepEqual(key(sc).filter((k) => !mine(k)), key(before).filter((k) => !mine(k)), `targets ${at.cii} ${at2.cii} ${atOne.cii}`);
});

for (const name of ['WSW-2-RE-AFC.xml', 'EF-05-PRO.TEST.xml']) {
  test(`T1 ${name}: the engine names the node id behind each CII element end; the sidecar places every id in the Enriched XML`, async () => {
    const { run, doc, rec } = await setup(name, false);
    // Each CII element, in order, with its two ends' ids: the CII's own numbers, each id under its number in the map.
    const els = ciiElements(doc.cii);
    assert.deepEqual(doc.nodeMap.elements.map((e) => [e.from, e.to]), els, 'the CII elements in order');
    const under = new Map(doc.nodeMap.nodes.map((n) => [n.cii, new Set(n.ids)]));
    for (const e of doc.nodeMap.elements) for (const end of ['from', 'to']) assert.ok(under.get(e[end])?.has(e[end + 'Id']), JSON.stringify(e));
    // At a point with several ids the engine may use different ones for different elements: the transfer follows each end.
    const used = new Map();
    for (const e of doc.nodeMap.elements) for (const end of ['from', 'to']) used.set(e[end], new Set([...(used.get(e[end]) || []), e[end + 'Id']]));
    assert.ok([...used.values()].some((ids) => ids.size > 1), 'several ids used at one CII node');
    // Places: the Enriched XML written from the document, counted as the transfer counts (n-th Branch, its n-th Node).
    const enriched = enrichedFromDocument(run.namesUxml, doc.rows, { sourceText: fs.readFileSync(path.join(repo, 'Benchmarks', name), 'utf8') });
    assert.ok(enriched.ok, enriched.error);
    const sc = buildCiiSidecar({ model: name, chain: run.chain, engineDeltas: rec.deltas, finalDoc: rec.uxml, nodeMap: doc.nodeMap,
      names: run.changes.names, enriched: { sha256: 'abc', xmlText: enriched.xmlText } });
    assert.equal(sc.enriched.sha256, 'abc');
    assert.ok(!sc.enriched.error, sc.enriched.error);
    assert.deepEqual(sc.elements, doc.nodeMap.elements);
    const dom = new DOMParser().parseFromString(enriched.xmlText, 'application/xml');
    const branches = kidsOf(dom.documentElement, 'Pipe').flatMap((p) => kidsOf(p, 'Branch'));
    const all = [...sc.nodes.flatMap((n) => n.ids), ...sc.notInCii];
    assert.equal(all.length, rec.uxml.pipelines.flatMap((p) => p.components).length);
    assert.equal(new Set(all.map((n) => n.at.join(':'))).size, all.length, 'one place per id');
    for (const n of all) {
      const x = kidsOf(branches[n.at[0]], 'Node')[n.at[1]];
      assert.equal(kidsOf(x, 'NodeName')[0]?.textContent ?? '', n.NodeName.join('|'), n.id);
    }
    assert.equal(sc.enriched.branches.length, branches.length);
    // Wrong modes: an Enriched XML that is not the document's gives no places, and says why.
    const one = enriched.xmlText.replace(/<Node>[\s\S]*?<\/Node>/, '');
    assert.equal(enrichedPlaces(one, rec.uxml).ok, false);
    const first = rec.uxml.pipelines[0].components[0].values.NodeName?.text;
    if (first) assert.equal(enrichedPlaces(enriched.xmlText.replace(`<NodeName>${first}</NodeName>`, '<NodeName>X-OTHER</NodeName>'), rec.uxml).ok, false);
    const bad = buildCiiSidecar({ chain: run.chain, finalDoc: rec.uxml, nodeMap: doc.nodeMap, enriched: { sha256: 'abc', xmlText: one } });
    assert.ok(bad.enriched.error && !bad.nodes.some((n) => n.ids.some((i) => i.at)), 'no places at all');
    assert.equal(buildCiiSidecar({ chain: run.chain, finalDoc: rec.uxml, nodeMap: doc.nodeMap }).enriched, null, 'no Enriched XML (CII only)');
  });
}
