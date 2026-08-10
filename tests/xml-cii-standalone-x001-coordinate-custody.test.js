const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

(async () => {
  const source = path.join(root, 'converters', 'xml-cii-2019-standalone', 'invocation-builder.js');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-x001-invocation-'));
  const modulePath = path.join(tempRoot, 'invocation-builder.mjs');
  fs.copyFileSync(source, modulePath);
  const { buildStandaloneCiiInvocation } = await import(pathToFileURL(modulePath).href);

  const xmlInvocation = buildStandaloneCiiInvocation(
    {
      sourceKind: 'xml',
      sourceName: 'GLRD-1000-PI-01.xml',
      supportConfigJson: '{}',
      options: { coordsMode: 'first' },
    },
    { inputPath: '/work/glrd.xml', stagedJsonPath: null },
    '/work/job',
  );
  assert.strictEqual(xmlInvocation.scriptPath, '/scripts/xml_to_cii2019_coordinate_custody.py');
  assert.strictEqual(xmlInvocation.argv[0], '/scripts/xml_to_cii2019_coordinate_custody.py');
  assert(xmlInvocation.argv.includes('--coords-mode'));
  assert(xmlInvocation.argv.includes('first'));

  const inputXmlInvocation = buildStandaloneCiiInvocation(
    { sourceKind: 'inputxml', sourceName: 'model.input.xml', options: {} },
    { inputPath: '/work/model.input.xml', stagedJsonPath: null },
    '/work/job',
  );
  assert.strictEqual(inputXmlInvocation.scriptPath, '/scripts/inputxml_to_cii2019.py');
  assert.strictEqual(inputXmlInvocation.argv[0], '/scripts/inputxml_to_cii2019.py');

  const engineSource = fs.readFileSync(
    path.join(root, 'converters', 'xml-cii-2019-standalone', 'engine.js'),
    'utf8',
  );
  assert(engineSource.includes("'xml_to_cii2019_contracted_direction.py'"));
  assert(engineSource.includes("'xml_to_cii2019_coordinate_custody.py'"));

  const custodySource = fs.readFileSync(
    path.join(root, 'converters', 'scripts', 'xml_to_cii2019_coordinate_custody.py'),
    'utf8',
  );
  assert(custodySource.includes('import xml_to_cii2019_contracted_direction as contracted'));
  assert(custodySource.includes('CII_NODE_POSITION_CONFLICT'));
  assert(custodySource.includes('refusing implicit (0,0,0) fallback'));

  const generalInvocationSource = fs.readFileSync(
    path.join(root, 'converters', 'invocation-builder.js'),
    'utf8',
  );
  assert(
    generalInvocationSource.includes("if (converterId === 'xml_to_cii') return { script: 'xml_to_cii2019_contracted_direction.py'"),
    'X001 must not regress the pre-existing general XML->CII contracted topology route.',
  );

  console.log('XML CII X001 standalone activation checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
