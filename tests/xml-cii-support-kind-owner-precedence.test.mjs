// Owner rule (12 Nov, RCA-04): a staged support member's kind comes from its
// source NODETYPE when present (after the 8 Config mutation); otherwise from
// the Step 7 support table ("Use JSON/support mapper for restraints"), where a
// generated SUPPORT_KIND=REST is the weakest evidence. Root and v045 copies
// must agree, and the Step 7 preview must show the Run decision.
// Synthetic data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as rootRule from '../converters/xml-cii2019-core/support-kind-precedence.js';
import * as v045Rule from '../v045/converters/xml-cii2019-core/support-kind-precedence.js';
import { runStandaloneSupportTypeMapper as rootMapper } from '../tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js';
import { runStandaloneSupportTypeMapper as v045Mapper } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js';
import { decorateJsonTraceMember as v045Decorate } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';
import { mutateRestraintType as v045Mutate } from '../v045/converters/xml-cii2019-core/restraint-type-mutation.js';

const COPIES = { root: rootRule, v045: v045Rule };

test('NODETYPE wins over every description, code and generated label', () => {
  for (const [copy, rule] of Object.entries(COPIES)) {
    const cases = [
      [{ NODETYPE: '8', MDSSUPPTYPE: 'GT571', SUPPORT_KIND: 'REST', DTXR: 'PIPE REST' }, 'GUIDE'],
      [{ NODETYPE: '9', MDSSUPPTYPE: 'ST572', SUPPORT_KIND: 'REST' }, 'LINESTOP'],
      [{ NODETYPE: '14', MDSSUPPTYPE: 'GT571', SUPPORT_KIND: 'REST' }, 'REST'],
      [{ NODETYPE: '17' }, 'REST'], // default 8 Config mutation 17 -> 14
      [{ NODETYPE: '7' }, 'LINESTOP'], // 7 -> 9 (LIM)
      [{ NODETYPE: '10' }, 'GUIDE'], // 10 -> 8 (GUI)
    ];
    for (const [attrs, kind] of cases) {
      assert.deepEqual(rule.governedSupportKind(attrs, {}), { kind, source: 'NODETYPE' }, `${copy} ${JSON.stringify(attrs)}`);
    }
    // A configured mutation is honoured.
    const config = { inputXmlRestraintTypeMutation: { enabled: true, rows: [{ from: '30', to: '9' }] } };
    assert.equal(rule.governedSupportKind({ NODETYPE: '30', SUPPORT_KIND: 'REST' }, config).kind, 'LINESTOP', copy);
  }
});

test('without NODETYPE the Step 7 table decides; generated REST is weakest', () => {
  for (const [copy, rule] of Object.entries(COPIES)) {
    const table = (attrs) => rule.governedSupportKind(attrs, {});
    assert.deepEqual(table({ MDSSUPPTYPE: 'GT1', SUPPORT_KIND: 'REST' }), { kind: 'GUIDE', source: 'step7-support-table' }, copy);
    assert.equal(table({ MDSSUPPTYPE: 'GT571', SUPPORT_KIND: 'REST' }).kind, 'REST', copy); // table row GT5* -> REST
    // MDSDTXR stands in as the description and the table's stop rule wins.
    assert.equal(table({ MDSSUPPTYPE: 'GT575', SUPPORT_KIND: 'REST', MDSDTXR: 'LINE STOP ON BARE PIPE' }).kind, 'LINESTOP', copy);
    assert.equal(table({ SUPPORT_KIND: 'REST' }).kind, 'REST', copy);
    assert.equal(table({}).kind, '', copy);
  }
});

test('v045 default NODETYPE mutation matches CAESAR codes (GUI=8, LIM=9)', () => {
  assert.equal(v045Mutate('7', {}), '9');
  assert.equal(v045Mutate('10', {}), '8');
  assert.equal(v045Mutate('17', {}), '14');
});

test('v045 trace keeps support evidence independent of display fields', () => {
  const member = { raw: { attributes: { NODETYPE: '9', MDSSUPPTYPE: 'ST572', SUPPORT_KIND: 'REST', NAME: '/PS1' } } };
  const decorated = v045Decorate(member, { captureFields: ['DTXR'] });
  assert.equal(decorated.supportEvidence.NODETYPE, '9');
  assert.equal(decorated.supportEvidence.MDSSUPPTYPE, 'ST572');
});

test('Step 7 preview shows the same decision in both copies', () => {
  const trace = { resolvedFacts: [{ xmlNodeNumber: '3760', positionMembers: [
    { supportEvidence: { NODETYPE: '9', MDSSUPPTYPE: 'ST572', SUPPORT_KIND: 'REST', NAME: '/PS-1' } },
    { supportEvidence: { MDSSUPPTYPE: 'GT1', SUPPORT_KIND: 'REST', NAME: '/PS-2' } },
  ] }] };
  for (const [copy, mapper] of Object.entries({ root: rootMapper, v045: v045Mapper })) {
    const out = mapper({ resolverJsonTraceResult: trace, supportConfigJson: '{}' });
    const kinds = out.previewRows.map((row) => row.supportKind);
    assert.deepEqual(kinds, ['LINESTOP', 'GUIDE'], copy);
  }
});

test('Python native kinds(): NODETYPE wins', () => {
  const script = [
    'import sys, json', 'sys.path.insert(0, "converters/scripts")',
    'import xml229_prefinal_restraints as p',
    'def require(ok, code):',
    '    assert ok, code',
    'entries = [{"attrs": {"NODETYPE": "9", "MDSSUPPTYPE": "GT571", "SUPPORT_KIND": "REST"}, "desc": ""},',
    '           {"attrs": {"NODETYPE": "8", "DTXR": "PIPE REST"}, "desc": ""}]',
    'out = p.kinds(entries, require, {})',
    'print(json.dumps(sorted(out.keys()) if isinstance(out, dict) else out, default=str))',
  ].join('\n');
  const output = execFileSync('python', ['-c', script], { encoding: 'utf8' }).trim().split('\n').pop();
  assert.deepEqual(JSON.parse(output), ['GUIDE', 'LINESTOP']);
});
