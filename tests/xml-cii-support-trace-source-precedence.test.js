const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createStaticEsmFixture } = require('./xml-cii-standalone-esm-fixture-helper');

const root = path.resolve(__dirname, '..');
const fixture = createStaticEsmFixture(root, {
  prefix: 'xml-cii-trace-source-precedence-',
  entryFiles: [
    'tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js',
    'tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js',
  ],
});

(async () => {
  const load = file => import(pathToFileURL(path.join(fixture.tempRoot, file)).href);
  const { decorateJsonTraceMember, formatConfiguredJsonTraceMember } = await load('tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js');
  const { runStandaloneSupportTypeMapper } = await load('tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js');
  const member = attrs => {
    const { raw, ...projected } = decorateJsonTraceMember({
      raw: { attributes: attrs }, description: 'REST', labeled: 'REST',
    }, { captureFields: ['NAME'] });
    return projected;
  };
  const rows = attrs => runStandaloneSupportTypeMapper({
    supportConfigJson: '{}',
    resolverJsonTraceResult: { resolvedFacts: [{
      xmlNodeNumber: '500', effectiveDtxr: 'REST', dtxrPosValue: 'REST',
      positionMembers: attrs.map(member),
    }] },
  }).previewRows;
  const stop = {
    NAME: '/S-STOP', DTXR: '', MDSDTXR: 'LINE STOP ON BARE PIPE WITH WEAR PAD',
    MDSSUPPTYPE: 'GT575', SUPPORT_KIND: 'REST', CMPSUPGAP: '25MM GAP',
  };
  const rest = { NAME: '/S-REST', DTXR: 'REST', NODEGAP: '0', NODETYPE: '14' };
  const guide = { NAME: '/S-GUIDE', DTXR: 'GUIDE', MDSSUPPTYPE: 'GT500', NODEGAP: '5' };
  const actual = rows([rest, guide, stop]);
  assert.deepEqual(actual.map(r => [r.occurrenceName, r.supportKind, r.confidence]), [
    ['/S-REST', 'REST', 'HIGH'], ['/S-GUIDE', 'GUIDE', 'HIGH'], ['/S-STOP', 'LINESTOP', 'HIGH'],
  ]);
  // Owner rule (12 Nov): NODETYPE first, then the Step 7 support table.
  assert.equal(actual[0].matchMode, 'source-nodetype');
  assert.equal(actual[2].matchMode, 'step7-support-table');
  assert.match(actual[2].evidenceText, /CMPSUPGAP=25MM GAP/);
  assert.equal(rows([{ ...stop, DTXR: 'REST' }])[0].supportKind, 'REST');
  assert.equal(rows([{ NAME: '/CONFLICT', DTXR: 'GUIDE and LINE STOP' }])[0].status, 'ambiguous');
  assert.equal(rows([{ NAME: '/LOW', MDSSUPPTYPE: 'ST501' }])[0].confidence, 'LOW');
  const projected = member(stop);
  assert.equal(projected.capturedFields.MDSDTXR, undefined);
  assert.equal(projected.supportEvidence.MDSDTXR, stop.MDSDTXR);
  assert.equal(projected.raw, undefined);
  const display = decorateJsonTraceMember({ raw: { attributes: stop } }, {});
  assert.match(formatConfiguredJsonTraceMember(display), /^LINE STOP ON BARE PIPE/);
  console.log('XML/CII structured source precedence checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
