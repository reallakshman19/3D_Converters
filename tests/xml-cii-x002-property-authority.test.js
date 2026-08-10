const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const coreRoot = path.join(root, 'converters', 'xml-cii2019-core');
const benchmarkPath = path.join(root, 'Benchmarks', 'XML to CII 2019', 'GLRD-1000-PI-01.xml');

function loadModule(fileName, exportsList, stubs = {}) {
  const file = path.join(coreRoot, fileName);
  let source = fs.readFileSync(file, 'utf8')
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/\bexport\s+(?=function|const|let|class)/g, '');
  source += `\n;globalThis.__x002Exports = { ${exportsList.join(', ')} };`;
  const context = vm.createContext({ console, ...stubs });
  new vm.Script(source, { filename: file }).runInContext(context);
  return context.__x002Exports;
}

const staged = loadModule('staged-geometry-authority.js', [
  'buildXmlCiiStagedGeometryIndex',
  'xmlCiiNominalDnFromOd',
], {
  applyXmlCiiPostSplitElementLengthCleanup: (xmlText) => ({ xmlText, stats: {}, diagnostics: [] }),
  cleanXmlCiiNodeBlocks: (xmlText) => ({ xmlText, stats: {}, diagnostics: [] }),
});
const od = loadModule('outside-diameter-resolver.js', ['resolveXmlCiiEffectiveOutsideDiameterRows']);

function stagedJson(attrs) {
  return JSON.stringify({ type: 'PIPE', attributes: { REF: '=R1', ...attrs } });
}

let index = staged.buildXmlCiiStagedGeometryIndex(stagedJson({ ABORE: '4' }));
let geometry = index.byRef.get('R1');
assert.strictEqual(geometry.boreMm, null, 'A naked staged 4 must not become 4 mm.');
assert.strictEqual(geometry.boreAuthority.reason, 'unit-not-declared');
assert.strictEqual(staged.xmlCiiNominalDnFromOd(114.3), 100, '114.3 mm OD must fall back to DN100.');

index = staged.buildXmlCiiStagedGeometryIndex(stagedJson({ DN: '100' }));
assert.strictEqual(index.byRef.get('R1').boreMm, 100);
index = staged.buildXmlCiiStagedGeometryIndex(stagedJson({ ABORE: '4', BOREUNITS: 'inch' }));
assert.strictEqual(index.byRef.get('R1').boreMm, 100);
index = staged.buildXmlCiiStagedGeometryIndex(stagedJson({ ABORE: '4"' }));
assert.strictEqual(index.byRef.get('R1').boreMm, 100);

function field(block, name) {
  return String(block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '').trim();
}
function numberField(block, name) {
  const value = Number(field(block, name));
  return Number.isFinite(value) ? value : null;
}
function normalizeRef(value) {
  return String(value || '').trim().replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}
function parseGlrdBranches(xmlText) {
  return [...xmlText.matchAll(/<Branch>([\s\S]*?)<\/Branch>/gi)].map((branchMatch) => {
    const branchBlock = branchMatch[1];
    const branchName = field(branchBlock, 'Branchname');
    const records = [...branchBlock.matchAll(/<Node>([\s\S]*?)<\/Node>/gi)].map((nodeMatch, index) => {
      const block = nodeMatch[1];
      return {
        index,
        branchName,
        nodeNumber: field(block, 'NodeNumber'),
        nodeName: field(block, 'NodeName'),
        endpoint: field(block, 'Endpoint'),
        componentType: field(block, 'ComponentType'),
        componentRefNo: field(block, 'ComponentRefNo'),
        outsideDiameter: field(block, 'OutsideDiameter'),
        position: field(block, 'Position'),
      };
    });
    return { branchName, records };
  });
}

const glrdRefs = [
  '134234934/19410',
  '134234934/21710',
  '134234934/21765',
  '134234934/21820',
  '134234934/21875',
  '134234934/21930',
];
assert(fs.existsSync(benchmarkPath), benchmarkPath);
const glrdText = fs.readFileSync(benchmarkPath, 'utf8');
const branches = parseGlrdBranches(glrdText);
const corrections = [];
for (const branch of branches) corrections.push(...od.resolveXmlCiiEffectiveOutsideDiameterRows(branch.records).corrections);
for (const ref of glrdRefs) {
  const normalized = normalizeRef(ref);
  const rawRows = branches.flatMap((branch) => branch.records).filter((row) => normalizeRef(row.componentRefNo) === normalized);
  const rawOds = rawRows.map((row) => Number(row.outsideDiameter)).filter(Number.isFinite);
  assert(rawOds.some((value) => Math.abs(value - 60.3) < 1e-9), `${ref} must retain source endpoint OD 60.3.`);
  assert(rawOds.some((value) => Math.abs(value - 26.7) < 1e-9), `${ref} must retain source endpoint OD 26.7.`);
  const correction = corrections.find((row) => row.componentRefNo === normalized && Math.abs(row.sourceOutsideDiameter - 26.7) < 1e-9);
  assert(correction, `${ref} must resolve the raw 26.7 endpoint from GLRD flow-path context.`);
  assert.strictEqual(correction.effectiveOutsideDiameter, 60.3, ref);
}

// Hostile negative control: a real 60.3 -> 114.3 transition is review-required, not flattened.
const realTransition = od.resolveXmlCiiEffectiveOutsideDiameterRows([
  { index: 0, componentRefNo: 'PRE', componentType: 'PIPE', outsideDiameter: '60.3', nodeNumber: '1' },
  { index: 1, componentRefNo: 'F', componentType: 'FLAN', outsideDiameter: '60.3', nodeNumber: '2', endpoint: '1' },
  { index: 2, componentRefNo: 'F', componentType: 'FLAN', outsideDiameter: '114.3', nodeNumber: '3', endpoint: '2' },
  { index: 3, componentRefNo: 'POST', componentType: 'PIPE', outsideDiameter: '114.3', nodeNumber: '4' },
]);
assert.strictEqual(realTransition.corrections.length, 0);
assert.strictEqual(realTransition.unresolved.length, 1);
assert.strictEqual(realTransition.unresolved[0].reason, 'adjacent-flow-path-disagrees');

console.log('XML CII X002 property-authority local regression passed.');
