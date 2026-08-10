const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const zipPath = path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-evidence-zip.js');
let source = fs.readFileSync(zipPath, 'utf8')
  .replace(/^import\s+[^;]+;\s*$/gm, '')
  .replace(/\bexport\s+(?=function|const|let|class)/g, '');
source += '\n;globalThis.__x005a = { buildXmlCiiModeAEvidenceZipPackage };';
function digest(value) {
  const raw = String(value ?? '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) { hash ^= raw.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}:${raw.length}`;
}
const context = vm.createContext({ console, TextEncoder, Uint8Array, Uint32Array, DataView, Blob, URL, setTimeout, digestXmlCiiEvidenceText: digest });
new vm.Script(source, { filename: zipPath }).runInContext(context);
const api = context.__x005a;

function result(tag) {
  return {
    enrichedText: `<enriched id="${tag}"/>`,
    enrichedEvidenceXml: `<ConversionEvidence id="${tag}"><preview/><RigidMatch1/><Rigidmatch2/></ConversionEvidence>`,
    ciiText: `CII ${tag}`,
    diagnostics: {
      engineRequestXmlText: `<engine id="${tag}"/>`,
      converterParseXmlText: `<parse id="${tag}"/>`,
      runParityEvidence: { ok: true },
      weightConservation: [],
    },
  };
}

const state = {
  batchRunResult: {
    sources: [
      { sourceId: 'src-A-1234567890', sourceDigest: 'A', fileName: 'same.xml', alias: 'same', sourceText: '<source id="A"/>', status: 'SUCCEEDED', result: result('A') },
      { sourceId: 'src-B-1234567890', sourceDigest: 'B', fileName: 'same.xml', alias: 'same', sourceText: '<source id="B"/>', status: 'SUCCEEDED', result: result('B') },
    ],
  },
};
const pkg = api.buildXmlCiiModeAEvidenceZipPackage(state);
assert.strictEqual(pkg.manifest.mode, 'separate-model');
assert.strictEqual(pkg.manifest.crossFileTopology, false);
assert.strictEqual(pkg.manifest.crossFileNodeRenumbering, false);
assert.strictEqual(pkg.manifest.crossFilePhysicalComponentGrouping, false);
assert.strictEqual(pkg.manifest.qualificationStatus, 'PACKAGE_COMPLETE');
assert.strictEqual(pkg.manifest.sources.length, 2);
assert.notStrictEqual(pkg.manifest.sources[0].directory, pkg.manifest.sources[1].directory, 'Duplicate filenames must still receive isolated Mode A directories.');
for (const row of pkg.manifest.sources) {
  assert(Object.keys(pkg.files).some((name) => name.startsWith(row.directory) && name.endsWith('.source.xml')));
  assert(Object.keys(pkg.files).some((name) => name.startsWith(row.directory) && name.endsWith('.engine-input.xml')));
  assert(Object.keys(pkg.files).some((name) => name.startsWith(row.directory) && name.endsWith('.converter-parse-input.xml')));
}
assert(pkg.files['batch/batch-manifest.json']);

const incomplete = api.buildXmlCiiModeAEvidenceZipPackage({
  batchRunResult: { sources: [{ ...state.batchRunResult.sources[0], status: 'FAILED', result: {} }] },
});
assert.strictEqual(incomplete.manifest.qualificationStatus, 'INCOMPLETE');
assert.deepStrictEqual(incomplete.manifest.incompleteSourceIds, ['src-A-1234567890']);

const runnerSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a.js'), 'utf8');
assert(runnerSource.includes('sourceText: scopedSourceText'));
assert(!runnerSource.includes('syncActiveModeASatchState'));

console.log('XML CII X005 Mode A evidence ZIP local regression passed.');
