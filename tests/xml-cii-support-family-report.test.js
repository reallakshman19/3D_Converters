const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

function entry(overrides = {}) {
  return {
    jsonNodeNo: '10',
    branchName: '/LINE-A/B1',
    branch: { original: '/LINE-A/B1', full: '/LINE-A/B1', root: '/LINE-A' },
    point: { x: 100, y: 200, z: 300 },
    bore: '100',
    type: 'REST',
    description: 'REST',
    dtxrPs: '',
    labeled: 'REST',
    name: '/PS-14416.2',
    componentRef: '=100/200',
    tags: ['PS14416.2'],
    cmpSupGap: '5',
    path: '$[0].children[0]',
    ...overrides,
  };
}

(async () => {
  const api = await import(pathToFileURL(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-support-family-report.js')).href);
  assert.strictEqual(api.normalizeSupportIdentity('/PS-14416.2'), 'PS-14416.2');
  assert.strictEqual(api.normalizeSupportIdentity(' /ps 14416 / datum '), 'PS-14416/DATUM');
  assert.strictEqual(api.normalizeSupportIdentity('Copy-(2)-of-/ps 14416.3'), 'Copy-(2)-of-PS-14416.3');
  assert.strictEqual(api.supportFamilyFromIdentity('Copy-(2)-of-PS-14416.3'), 'PS-14416');

  const resolverResult = {
    traceResolutionLedger: {
      schema: 'xml-cii-trace-resolution-ledger/v1',
      groups: [
        {
          id: 'DTXR-G1',
          branch: { original: '/LINE-A/B1', full: '/LINE-A/B1', root: '/LINE-A' },
          anchor: { x: 100, y: 200, z: 300 },
          entries: [
            entry(),
            entry({ jsonNodeNo: '11', name: '/PS-14416/DATUM', type: 'DATUM', description: '', labeled: '', dtxrPs: 'GUIDE', path: '$[0].children[1]' }),
            entry({ jsonNodeNo: '12', name: 'Copy-(2)-of-/ps 14416.3', type: 'GUIDE', description: 'GUIDE', labeled: 'GUIDE', dtxrPs: 'LINE STOP', path: '$[0].children[2]' }),
            entry({ jsonNodeNo: '13', name: '/PS-14416.2', path: '$[0].children[3]' }),
            entry({ jsonNodeNo: '14', name: '=unidentified', description: 'REST', labeled: 'REST', tags: [], path: '$[0].children[4]' }),
          ],
        },
        {
          id: 'DTXR-G2',
          branch: { original: '/LINE-B/B2', full: '/LINE-B/B2', root: '/LINE-B' },
          anchor: { x: 500, y: 600, z: 700 },
          entries: [entry({ jsonNodeNo: '20', branchName: '/LINE-B/B2', branch: { original: '/LINE-B/B2', full: '/LINE-B/B2', root: '/LINE-B' }, point: { x: 500, y: 600, z: 700 }, path: '$[1].children[0]' })],
        },
      ],
    },
    resolutionLedger: [
      { groupId: 'DTXR-G1', candidateCount: 2, status: 'RESOLVED_POS_PS', derivedSupportTypes: ['REST', 'GUIDE'] },
      { groupId: 'DTXR-G2', candidateCount: 1, status: 'RESOLVED_POS', derivedSupportTypes: ['REST'] },
    ],
  };

  const before = JSON.stringify(resolverResult);
  const report = api.buildSupportFamilyReport(resolverResult);
  assert.strictEqual(JSON.stringify(resolverResult), before, 'report projection must not mutate the resolver result');
  assert.strictEqual(report.schema, 'xml-cii-support-family-report/v1');
  assert.strictEqual(report.members.length, 6);
  assert.strictEqual(report.summaries.length, 2, 'branch-qualified family roots must remain separate');
  assert(report.members.some((row) => row['Support Family Key'] === '/LINE-A::PS-14416'));
  assert(report.members.some((row) => row['Support Family Key'] === '/LINE-B::PS-14416'));

  const fallback = report.members.find((row) => row['Name of the element'] === 'PS-14416/DATUM');
  assert.strictEqual(fallback.DTXR, 'GUIDE');
  assert.strictEqual(fallback.DTXR_SOURCE, 'DTXR_PS_FALLBACK');
  assert.strictEqual(fallback.DTXR_FALLBACK_USED, 'TRUE');
  assert.strictEqual(fallback.DTXR_STATUS, 'DTXR_PS_ONLY');

  const conflict = report.members.find((row) => row['Name of the element'] === 'Copy-(2)-of-PS-14416.3');
  assert.strictEqual(conflict.DTXR, 'GUIDE');
  assert.strictEqual(conflict.DTXR_STATUS, 'DTXR_POS_AND_PS_DIFFERENT');
  assert(conflict.Diagnostics.includes('DTXR_POS_PS_CONFLICT'));

  assert(report.diagnostics.some((row) => row.Code === 'SUPPORT_IDENTITY_DUPLICATE'));
  assert(report.diagnostics.some((row) => row.Code === 'SUPPORT_MEMBER_MULTI_BRANCH'));
  assert(report.diagnostics.some((row) => row.Code === 'SUPPORT_IDENTITY_MISSING'));

  const firstCsv = api.buildSupportFamilyMembersCsv(report);
  const secondCsv = api.buildSupportFamilyMembersCsv(api.buildSupportFamilyReport(resolverResult));
  assert.strictEqual(firstCsv, secondCsv, 'identical evidence must produce byte-identical CSV');
  assert(firstCsv.startsWith('\uFEFFReport Row,Support Family Key'));
  assert(firstCsv.endsWith('\r\n'));
  assert(!firstCsv.includes('\n') || firstCsv.includes('\r\n'));

  console.log('XML CII Support Family Report checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
