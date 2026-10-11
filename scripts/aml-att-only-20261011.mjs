// One-off isolated runner using the unchanged 3D Model Converters ATT/RVM converter.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { run } from '../tabs/model-converters/converters/rvmattr-to-xml.js';

const inputPath = 'conversion-input/AML_2026Oct06-1417.txt';
const outputDir = 'conversion-output';
const expectedSha = '1c1702d3a352c9f62f0b85f41c8185d2a64501e75fcd85c94a0662efad1853f5';
const sha256 = x => createHash('sha256').update(x).digest('hex');
mkdirSync(outputDir, { recursive: true });
const raw = readFileSync(inputPath);
const actualSha = sha256(raw);
if (actualSha !== expectedSha) throw new Error('Original ATT SHA-256 mismatch: ' + actualSha);
console.log('Verified original ATT:', raw.length, actualSha, 'repository:', process.env.GITHUB_SHA || 'UNKNOWN');
const start = performance.now();
const result = await run({
  converterId: 'rvmattr_to_xml',
  inputFiles: [{ role: 'secondary', name: 'AML_2026Oct06-1417.txt', text: raw.toString('utf8') }],
  options: { rvmScope: { wildcard: '', selectedIds: [], nativeScope: { mode: 'FULL' } } },
});
if (!result?.ok || !Array.isArray(result.outputs)) throw new Error('ATT-only native converter did not return outputs: ' + JSON.stringify(result?.logs));
const exported = [];
let branches = null, children = null;
let byType = null;
for (const part of result.outputs) {
  if (!part || typeof part.text !== 'string' || !/^AML_2026Oct06-1417_[A-Za-z0-9_.-]+$/.test(part.name)) {
    throw new Error('Unexpected converter output name or body');
  }
  const buf = Buffer.from(part.text, 'utf8');
  writeFileSync(outputDir + '/' + part.name, buf);
  exported.push({name:part.name,bytes:buf.length,sha256:sha256(buf),mime:part.mime});
  console.log('Created output:', part.name, 'bytes:', buf.length, 'SHA256:', sha256(buf));
  if (part.name.endsWith('_managed_stage.json')) {
    const parsed = JSON.parse(part.text);
    if (!Array.isArray(parsed)) throw new Error('Converter StagedJSON was not a bare branch array');
    branches = parsed.length;
    byType = {};
    children = 0;
    for (const branch of parsed) {
      if (branch.type !== 'BRANCH' || !Array.isArray(branch.children)) throw new Error('Non-branch staged JSON entry found');
      children += branch.children.length;
      for (const child of branch.children) {
        const key = String(child.type || '<missing>');
        byType[key] = (byType[key] || 0) + 1;
      }
    }
    if (!branches) throw new Error('No retained engineering branches; fail instead of publishing empty conversion');
  }
}
const manifest = {
  schema: 'aml-att-20261011-3dconverters-run/v1',
  process: '3D Model Converters > Converter > ATT/RVM -> XML+JSON+STP > ATT/TXT-only',
  repository: 'reallakshman19/3D_Converters',
  exactHead: process.env.GITHUB_SHA || null,
  inputZip: {name:'AML_2026Oct06-1417.zip',bytes:3599929,sha256:'5613b81694161834601e1bde254f0381a2ffead57feaa872fa3deeedb6f87c06'},
  originalAtt: {name:'AML_2026Oct06-1417.txt',bytes:raw.length,sha256:actualSha,sourceFileLines:2204593,sourceNewBlocks:105602,sourceBranRecords:778},
  selection: {mode:'FULL',wildcard:'',selectedIds:[],rvmPresent:false},
  output: {branches,childNodes:children,childTypes:byType,files:exported},
  converter: {stdout:result.logs?.stdout||[],stderr:result.logs?.stderr||[]},
  durationSeconds:Math.round((performance.now()-start)/1000*100)/100,
  memoryBytes:process.memoryUsage(),
  notes: [
    'Actual unmodified ATT/RVM converter run on original extracted input; full native ATT scope.',
    'Any .stp output is ATT-derived structural/support polyline representation, not RVM binary-model geometry.',
    'Output JSON is the bare engineering branch hierarchy, not a lossless 105602-record native ATT index.',
  ],
};
writeFileSync(outputDir + '/AML_2026Oct06-1417_conversion-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('RESULT',JSON.stringify({branches,children,files:exported.length,durationSeconds:manifest.durationSeconds,stderr:manifest.converter.stderr}));
