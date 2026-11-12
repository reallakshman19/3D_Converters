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
import { migrateSupportMappingConfig, supportRulesFromMapping } from '../converters/xml-cii2019-core/support-mapping-config.js';

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

test('Python mirror equals JS: same table rows and the same kind on 300 random members', () => {
  const pool = {
    DTXR: ['', 'PIPE REST', 'GUIDE', 'LINE STOP', 'SHOE', 'GUIDE and LINE STOP', 'WEAR PAD'],
    MDSDTXR: ['', 'LINE STOP ON BARE PIPE', 'PIPE SHOE', 'GUIDE WITH SHOE'],
    MDSSUPPTYPE: ['', 'GT1', 'GT571', 'ST572', 'AT01', 'BT2', 'AN3', 'PIPE-REST'],
    CMPSUPTYPE: ['', 'PG-1', 'LS-2', 'BP-3', 'REST', 'GT500'],
    SPRE: ['', 'GT01', 'ST06', 'AT05', '/SPEC/X'],
    SKEY: ['', 'CA150', 'CA100'],
    NAME: ['', '/PS-1', '/PS-REST-2'],
    SUPPORT_KIND: ['', 'REST', 'GUIDE', 'LINESTOP', 'ANCHOR'],
  };
  let seed = 7;
  const pick = (list) => { seed = (seed * 1103515245 + 12345) % 2147483648; return list[seed % list.length]; };
  const cases = Array.from({ length: 300 }, () => Object.fromEntries(Object.entries(pool)
    .map(([key, values]) => [key, pick(values)]).filter(([, value]) => value)));
  const custom = { supportMapping: { version: 2, rules: [
    { id: 'user-st', priority: 5, field: 'MDSSUPPTYPE', match: 'startsWith', pattern: 'ST', kind: 'LINESTOP' },
    { id: 'builtin-user-guide', enabled: false },
  ] } };
  const script = [
    'import sys, json', 'sys.path.insert(0, "converters/scripts")',
    'import xml229_support_type_mapper as m',
    'data = json.load(sys.stdin)',
    'out = {"rows": [m.table_rules(c) for c in data["configs"]],',
    '       "kinds": [[m.owner_rule_kind(a, c)[0] for a in data["cases"]] for c in data["configs"]]}',
    'print(json.dumps(out))',
  ].join('\n');
  const configs = [{}, custom];
  const py = JSON.parse(execFileSync('python', ['-c', script], { input: JSON.stringify({ cases, configs }), encoding: 'utf8' }));
  configs.forEach((config, index) => {
    const jsRows = supportRulesFromMapping(migrateSupportMappingConfig(config)).map((r) => [r.field, r.match, r.pattern, r.kind]);
    assert.deepEqual(py.rows[index].map((r) => [r.field, r.match, r.pattern, r.kind]), jsRows, `rows ${index}`);
    const jsKinds = cases.map((attrs) => rootRule.governedSupportKind(attrs, config).kind);
    assert.deepEqual(py.kinds[index], jsKinds, `kinds ${index}`);
  });
});

test('review fixes: generated labels never beat a description; a refused member shows its code in Step 7', () => {
  for (const [copy, rule] of Object.entries(COPIES)) {
    assert.equal(rule.governedSupportKind({ DTXR: 'GUIDE', SUPPORT_KIND: 'LINESTOP' }, {}).kind, 'GUIDE', copy);
    assert.equal(rule.governedSupportKind({ MDSSUPPTYPE: 'GT1', SUPPORT_KIND: 'REST' }, {}).kind, 'GUIDE', copy);
    assert.equal(rule.governedSupportKind({ SUPPORT_KIND: 'GUIDE' }, {}).source, 'generated-label', copy);
  }
  const config = { inputXmlRestraintTypeMutation: { enabled: true, rows: [{ label: 'LIM', from: '7', to: '8' }] } };
  const trace = { resolvedFacts: [{ xmlNodeNumber: '1', positionMembers: [{ supportEvidence: { NODETYPE: '7', NAME: '/PS-1' } }] }] };
  for (const [copy, mapper] of Object.entries({ root: rootMapper, v045: v045Mapper })) {
    const row = mapper({ resolverJsonTraceResult: trace, supportConfig: config }).previewRows[0];
    assert.equal(row.status, 'refused', copy);
    assert.match(row.decisionReason, /PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/, copy);
  }
});

test('round 3: catalogue paths never decide; refusals and parity for regex and priority', () => {
  for (const [copy, rule] of Object.entries(COPIES)) {
    // SPRE/NAME paths are not read by the table: /MDS-Ancillaries/ANCI/... is not a REST.
    assert.notEqual(rule.governedSupportKind({ SPRE: '/MDS-Ancillaries/ANCI/ST501-80mm', MDSSUPPTYPE: 'ST501' }, {}).kind, 'REST', copy);
    assert.equal(rule.governedSupportKind({ NAME: '/WP-1', MDSSUPPTYPE: 'GT1' }, {}).kind, 'GUIDE', copy);
    const rows = (list) => ({ supportMapping: { version: 2, rules: list } });
    assert.throws(() => rule.governedSupportKind({ MDSSUPPTYPE: 'ST1' }, rows([{ id: 'u', priority: 5, field: 'MDSSUPPTYPE', match: 'regex', pattern: '(?i)st1', kind: 'LINESTOP' }])),
      /PREFINAL_RESTRAINT_CONFIG_INVALID/, copy);
    assert.throws(() => rule.governedSupportKind({ MDSSUPPTYPE: 'ST1' }, rows([
      { id: 'u', priority: 5, field: 'MDSSUPPTYPE', match: 'startsWith', pattern: 'ST', kind: 'LINESTOP' },
      { id: 'v', priority: 5, field: 'MDSSUPPTYPE', match: 'startsWith', pattern: 'S', kind: 'GUIDE' }])), /PREFINAL_RESTRAINT_KIND_AMBIGUOUS/, copy);
    assert.equal(rule.governedSupportKind({ MDSSUPPTYPE: 'ST1' }, rows([{ id: 'r', source: 'rvm', priority: 1, field: 'MDSSUPPTYPE', match: 'startsWith', pattern: 'ST', kind: 'REST' }])).kind === 'REST', false, copy);
    assert.throws(() => rule.governedSupportKind({ NODETYPE: '9', DTXR: 'X' }, rows([{ id: 'u', priority: 1, field: 'DTXR', match: 'equals', pattern: 'X', kind: 'GUIDE' }])),
      /PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT/, copy);
  }
  // Python gives the same answers, including JS Number() priorities ('' = 0, '0x5' = 5).
  const configs = [
    { supportMapping: { version: 2, rules: [{ id: 'p', priority: '', field: 'MDSSUPPTYPE', match: 'startsWith', pattern: 'ST', kind: 'LINESTOP' }] } },
    { supportMapping: { version: 2, rules: [{ id: 'p', priority: '0x5', field: 'DTXR', match: 'contains', pattern: 'X', kind: 'GUIDE' }] } },
  ];
  const cases = [{ DTXR: 'GUIDE X', MDSSUPPTYPE: 'ST1' }, { DTXR: 'X', MDSSUPPTYPE: 'GT1' }, { SPRE: '/MDS-Ancillaries/ANCI/GT01', MDSSUPPTYPE: 'ST2' }];
  const script = ['import sys, json', 'sys.path.insert(0, "converters/scripts")', 'import xml229_support_type_mapper as m',
    'd = json.load(sys.stdin)', 'print(json.dumps([[m.owner_rule_kind(a, c)[0] for a in d["cases"]] for c in d["configs"]]))'].join('\n');
  const py = JSON.parse(execFileSync('python', ['-c', script], { input: JSON.stringify({ cases, configs }), encoding: 'utf8' }));
  assert.deepEqual(py, configs.map((c) => cases.map((a) => rootRule.governedSupportKind(a, c).kind)));
});
