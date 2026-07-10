const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-table-trace-test-'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}', 'utf8');
  for (const relPath of [
    'tabs/xml-cii-2019-standalone/xml-cii-table-trace-source.js',
    'tabs/xml-cii-2019-standalone/xml-cii-table-trace-table.js',
    'tabs/xml-cii-2019-standalone/xml-cii-table-trace-config.js',
    'tabs/xml-cii-2019-standalone/xml-cii-table-trace-match.js',
  ]) {
    const target = path.join(tempRoot, relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relPath), target);
  }
  return tempRoot;
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const mod = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-table-trace-source.js')).href);
  const tableText = [
    'PIPE,Detailing Text,Element Reference,Support Name',
    '/ASIM-1836/B1,Pipe Rest XRT01,=1006649732/121515,PS-14416.2',
  ].join('\n');
  const xmlText = '<PipeStressExport><Branchname>/ASIM-1836/B1</Branchname><Node><NodeNumber>10</NodeNumber><NodeName>PS-14416.2</NodeName><ComponentType>ATTA</ComponentType><ComponentRefNo>=1006649732/121515</ComponentRefNo><Position>1 2 3</Position></Node></PipeStressExport>';
  const rows = mod.parseTraceTableText(tableText);
  const result = mod.buildTraceTableResolverResult({ sourceText: xmlText, rawRows: rows });

  assert.strictEqual(result.fieldMap.componentRefNo, 'Element Reference');
  assert.strictEqual(result.fieldMap.dtxrPos, 'Detailing Text');
  assert.strictEqual(result.matchedFacts.length, 1);
  assert.strictEqual(result.rejectedFacts.length, 0);
  assert.strictEqual(result.matchedFacts[0].matchedBy[0], 'componentRefNo+nodeName');
  assert.strictEqual(result.matchedFacts[0].dtxrPosValue, 'Pipe Rest XRT01');

  const comparison = mod.compareTraceResultsByComponentRef({ matchedFacts: [{ xmlIndex: 1, dtxrPosValue: 'Pipe Rest XRT01' }] }, result);
  assert.strictEqual(comparison.compared, 1);
  assert.strictEqual(comparison.percent, 100);

  const wrongRefResult = mod.buildTraceTableResolverResult({
    sourceText: '<PipeStressExport><Node><NodeNumber>11</NodeNumber><NodeName>PS-14416.2</NodeName><ComponentType>ATTA</ComponentType><ComponentRefNo>=1006649732/999999</ComponentRefNo><Position>1 2 3</Position></Node></PipeStressExport>',
    rawRows: rows,
  });
  assert.strictEqual(wrongRefResult.matchedFacts.length, 0);
  assert.strictEqual(wrongRefResult.rejectedFacts.length, 1);
  assert.strictEqual(wrongRefResult.rejectedFacts[0].matchStatus, 'no-match');

  const fcsgText = [
    'TYPE,REF,NAME,POS WRT /*,SPRE,PIPE OF COMPREF,SITE',
    'ANCI,67131562/2123,PS00298.1,E 129177mm N 229049.98mm U 109805mm,/MDS-Ancillaries/ANCI/PIPE-REST-600mm,,MCA-CU-PI',
    'ANCI,67131562/2123,PS00999.9,E 129999mm N 229999mm U 109999mm,/MDS-Ancillaries/ANCI/OTHER,,MCA-CU-PI',
  ].join('\n');
  const fcsgXml = '<PipeStressExport><Branchname>/FCSG/B1</Branchname><Node><NodeNumber>20</NodeNumber><NodeName>PS00298.1</NodeName><ComponentType>ANCI</ComponentType><ComponentRefNo>67131562/2123</ComponentRefNo><Position>129177 229049.98 109805</Position></Node></PipeStressExport>';
  const fcsgRows = mod.parseTraceTableText(fcsgText);
  const fcsgResult = mod.buildTraceTableResolverResult({
    sourceText: fcsgXml,
    rawRows: fcsgRows,
    traceConfig: { profileId: 'fcsg-component-report', ambiguityPolicy: 'reject-duplicates', coordinateTolerance: 6 },
  });

  assert.strictEqual(fcsgResult.fieldMap.componentRefNo, 'REF');
  assert.strictEqual(fcsgResult.fieldMap.nodeName, 'NAME');
  assert.strictEqual(fcsgResult.fieldMap.position, 'POS WRT /*');
  assert.strictEqual(fcsgResult.fieldMap.componentType, 'TYPE');
  assert.strictEqual(fcsgResult.fieldMap.dtxrPos, 'SPRE');
  assert.strictEqual(fcsgResult.traceConfig.profileId, 'fcsg-component-report');
  assert.strictEqual(fcsgResult.traceConfig.duplicateRefCount, 1);
  assert.strictEqual(fcsgResult.matchedFacts.length, 1);
  assert.strictEqual(fcsgResult.rejectedFacts.length, 0);
  assert.strictEqual(fcsgResult.matchedFacts[0].matchedBy[0], 'componentRefNo+nodeName');
  assert.strictEqual(fcsgResult.matchedFacts[0].dtxrPosValue, '/MDS-Ancillaries/ANCI/PIPE-REST-600mm');
  assert.strictEqual(fcsgResult.matchedFacts[0].sourceComponentType, 'ANCI');

  console.log('XML CII table trace source checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
