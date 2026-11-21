// End-to-end plan E4 (Owner 21 Nov 2026, "Yes, as suggested"): step 10's Enriched XML written from the UXML document
// (the "|" names and the CII engine's recorded steps), in the source's own layout. Same content as today's Enriched XML;
// a second step 10 run on it gives the same CII.
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
import { enrichedFromDocument } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-enriched.js';
import { carryTransferNote } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-transfer-protection.js';
import { writeJoinedNames } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-joined-names.js';
import { parsePlainXml, serializePlainXml } from '../vendor/uxml-v2/supports/PlainDom.js';

installWeightBasisXmlDom(globalThis);

const repo = fileURLToPath(new URL('../', import.meta.url));
const SCRIPTS = path.join(repo, 'v045/converters/scripts');
const MODEL = path.join(repo, 'Benchmarks/WSW-2-RE-AFC.xml');
const SOURCE = fs.readFileSync(MODEL, 'utf8');
const job = (sourceText) => applyEffectiveFactsToJob(normalizeWorkflowJob({ sourceKind: 'xml', sourceName: 'WSW-2-RE-AFC.xml', sourceText,
  stagedJsonText: '', supportConfigJson: '', options: { outputMode: 'both', splitCondensedValveFlange: true } }).job);
const plain = (x) => serializePlainXml(parsePlainXml(x));
const python = (args, cwd) => {
  const r = spawnSync(process.env.PYTHON || 'python', ['-B', ...args], { encoding: 'utf8', cwd });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
};
const ARGV = ['--coords-mode', 'first', '--weight-scale', '10', '--split-condensed-valve-flange', '--use-restraint-type-based-on-json'];
/** The CII engine as step 10 runs it, natively: from the document (rows = its changes) or from the XML. */
function cii(dir, name, input, uxml) {
  const out = path.join(dir, name + '.cii'), changes = path.join(dir, name + '.changes.json');
  python([path.join(SCRIPTS, 'xml_to_cii2019_runtime_custody.py'), '--input', input, '--output', out, ...ARGV,
    ...(uxml ? ['--input-uxml', '--uxml-changes-out', changes] : [])], dir);
  return { cii: fs.readFileSync(out, 'utf8'), rows: uxml ? JSON.parse(fs.readFileSync(changes, 'utf8')).rows : null };
}
/** Today's Enriched XML pass (engine.js ENRICH_XML_SNIPPET), natively, on the engine's input XML. */
function todayEnrichedPass(dir, input) {
  const out = path.join(dir, 'py-enriched.xml');
  python(['-c', [`import sys; sys.path.insert(0, ${JSON.stringify(SCRIPTS)})`, 'from pathlib import Path', 'import xml_to_cii2019_patched as patched',
    'from xml_to_cii2019_bend_radius_policy import apply_bend_radius_policy', 'cfg = patched._load_support_config("")', 'cfg["splitCondensedValveFlange"] = True',
    `inp = Path(${JSON.stringify(input)}); out = Path(${JSON.stringify(out)})`, 'cfg["_transferProtect"] = patched._load_transfer_protection(inp)',
    'x = patched._maybe_enrich_from_staged_json(inp, None, cfg)', 'x = patched._apply_process_data_to_xml(x, cfg)',
    'p, _ = apply_bend_radius_policy(x, cfg, out)', 'src = Path(p) if p else Path(x)', 'if src != out: out.write_bytes(src.read_bytes())'].join('\n')], dir);
  return fs.readFileSync(out, 'utf8');
}

test('the Enriched XML from the document has today\'s content; a second step 10 run on it gives the same CII', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e4-enriched-'));
  try {
    const run = await runUxmlSupportsStage(job(SOURCE));
    const engineXml = carryTransferNote(SOURCE, run.xmlText);
    fs.writeFileSync(path.join(dir, 'in.xml'), engineXml);
    fs.writeFileSync(path.join(dir, 'in.uxml.json'), JSON.stringify(run.engineUxml));
    const first = cii(dir, 'first', path.join(dir, 'in.uxml.json'), true);
    const names = run.changes.names.filter((n) => n.written.length);
    assert.ok(names.length > 0, 'the model has "|" names');
    const today = writeJoinedNames(carryTransferNote(SOURCE, todayEnrichedPass(dir, path.join(dir, 'in.xml'))), names).xmlText;
    const mine = enrichedFromDocument(run.namesUxml, first.rows, { sourceText: SOURCE });
    assert.ok(mine.ok, mine.error);
    assert.ok(mine.removedValues > 0, 'the engine removed values (zero bend radii)');
    assert.equal(plain(mine.xmlText), plain(today), 'same content as today');
    assert.match(mine.xmlText, /\|/, 'the "|" names are in it');
    // Second step 10 run: on today's Enriched XML and on this one, the same CII.
    const again = async (text, name) => {
      const r = await runUxmlSupportsStage(job(text));
      fs.writeFileSync(path.join(dir, name + '.xml'), carryTransferNote(text, r.xmlText));
      return cii(dir, name, path.join(dir, name + '.xml'), false).cii;
    };
    const second = await again(mine.xmlText, 'second-mine');
    assert.equal(second, await again(today, 'second-today'));
    assert.equal(second, first.cii, 'and the first run CII');
    // Wrong modes: a removal the writer keeps, or the names left out, give other content.
    const keep = enrichedFromDocument(run.namesUxml, first.rows.filter((r) => r.after != null), { sourceText: SOURCE });
    assert.notEqual(plain(keep.xmlText), plain(today), 'a kept removed value is caught');
    const noNames = enrichedFromDocument(run.engineUxml, first.rows, { sourceText: SOURCE });
    assert.notEqual(plain(noNames.xmlText), plain(today), 'lost "|" names are caught');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an engine change the document cannot hold gives no Enriched XML from the document (today\'s pass runs)', async () => {
  const run = await runUxmlSupportsStage(job(SOURCE));
  const node = run.namesUxml.pipelines[0].components[0];
  const got = enrichedFromDocument(run.namesUxml, [{ uid: node.uid, field: 'Restraint+1.Type', before: null, after: 'X', rule: 'engine:bend-radius' }]);
  assert.equal(got.ok, false);
  assert.match(got.error, /cannot be written/);
});

/** Step 10's engine (engine.js) as the workflow calls it, run natively: the document when handed one, else the XML. */
function nativeEngine(dir, { spoilRows = false } = {}) {
  let n = 0;
  return async (job) => {
    const k = n++;
    const name = job.sourceName.replace(/\.[^.]+$/, '');
    if (job.options.outputMode === 'enriched-only') {
      fs.writeFileSync(path.join(dir, `e${k}.xml`), job.sourceText);
      const text = carryTransferNote(job.sourceText, todayEnrichedPass(dir, path.join(dir, `e${k}.xml`)));
      return { ok: true, enrichedText: text, enrichedName: `${name}_enriched.xml`, ciiText: null, logs: [] };
    }
    fs.writeFileSync(path.join(dir, `x${k}.xml`), job.sourceText);
    if (job.engineUxml) {
      fs.writeFileSync(path.join(dir, `d${k}.json`), JSON.stringify(job.engineUxml));
      const got = cii(dir, `c${k}`, path.join(dir, `d${k}.json`), true);
      const rows = spoilRows ? [...got.rows, { uid: job.engineUxml.pipelines[0].components[0].uid, field: 'Restraint+1.Type', after: 'X', rule: 'engine:bend-radius' }] : got.rows;
      // As engine.js: "CII only" makes no Enriched XML; with the document path the pass is left to the service.
      const enrichedText = job.enrichedFromUxml || job.options.outputMode === 'cii-only' ? '' : carryTransferNote(job.sourceText, todayEnrichedPass(dir, path.join(dir, `x${k}.xml`)));
      return { ok: true, ciiText: got.cii, ciiName: `${name}.cii`, enrichedText, enrichedName: `${name}_enriched.xml`, logs: [],
        engineUxml: { used: true, revision: job.engineUxml.revision.id, changes: rows } };
    }
    const enrichedText = job.options.outputMode === 'cii-only' ? '' : carryTransferNote(job.sourceText, todayEnrichedPass(dir, path.join(dir, `x${k}.xml`)));
    return { ok: true, ciiText: cii(dir, `c${k}`, path.join(dir, `x${k}.xml`), false).cii, ciiName: `${name}.cii`, enrichedText, enrichedName: `${name}_enriched.xml`, logs: [] };
  };
}

test('step 10 workflow: box on writes the Enriched XML from the document (same content, same CII); a change it cannot hold falls back', async () => {
  const api = await import('../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js');
  const rec = await import('../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-run-record.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e4-workflow-'));
  const saved = globalThis.localStorage;
  const storage = (engineOn) => ({ getItem: (k) => (k === 'xmlCii.engineReadsUxml' && engineOn ? 'on' : null), setItem() {}, removeItem() {} });
  try {
    const run = async (engineOn, opts, outputMode = 'both') => {
      globalThis.localStorage = storage(engineOn);
      rec.clearUxmlRunRecords();
      const r = await api.runXmlCii2019Workflow({ sourceText: SOURCE, sourceName: 'WSW-2-RE-AFC.xml', sourceKind: 'auto',
        options: { ...api.DEFAULT_XML_CII_WORKFLOW_OPTIONS, outputMode } }, { engineRunner: nativeEngine(dir, opts) });
      return { r, record: rec.uxmlRunRecords().at(-1) };
    };
    const off = await run(false), on = await run(true);
    assert.ok(off.r.ok && on.r.ok, on.r.error || off.r.error);
    assert.equal(on.r.ciiText, off.r.ciiText);
    assert.equal(plain(on.r.enrichedText), plain(off.r.enrichedText), 'same Enriched XML content');
    assert.equal(on.record.enriched.fromDocument, true);
    assert.equal(off.record.enriched, undefined, 'box off: the record is as before');
    assert.ok(on.r.logs.some((l) => /Enriched XML written from the UXML document/.test(l)));
    assert.equal(on.record.changes.steps.at(-1).base, on.record.changes.steps.at(-2).result, 'the engine steps follow the names step');
    const spoiled = await run(true, { spoilRows: true });
    assert.ok(spoiled.r.ok, spoiled.r.error);
    assert.equal(spoiled.record.enriched.fromDocument, false);
    assert.equal(plain(spoiled.r.enrichedText), plain(off.r.enrichedText), 'the fallback gives today\'s Enriched XML');
    // PR 440 review N2: "CII only" with the box on gives no Enriched XML and records none, as with the box off.
    const ciiOff = await run(false, {}, 'cii-only'), ciiOn = await run(true, {}, 'cii-only');
    assert.ok(ciiOff.r.ok && ciiOn.r.ok, ciiOn.r.error || ciiOff.r.error);
    assert.equal(ciiOn.r.ciiText, ciiOff.r.ciiText);
    assert.equal(ciiOn.r.enrichedText || '', '', 'no Enriched XML');
    assert.equal(ciiOn.record.enriched, undefined, 'no Enriched XML on the record');
    assert.ok(!ciiOn.r.logs.some((l) => /Enriched XML written from the UXML document/.test(l)));
  } finally {
    globalThis.localStorage = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
