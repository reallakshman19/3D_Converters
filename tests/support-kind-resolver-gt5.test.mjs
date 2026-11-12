// Owner rule (12 Nov): GT5* support codes are GUIDE in the shared default table,
// and free text containing GT5 is weaker than every support-code row.
// Synthetic attributes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolveKindPure, DEFAULT_RULES } from '../support/SupportKindResolver.js';

const CASES = [
  [{ MDSSUPPTYPE: 'GT500' }, 'GUIDE'],
  [{ CMPSUPTYPE: 'GT571' }, 'GUIDE'],
  [{ DESC: 'GT500-80mm' }, 'GUIDE'],
  [{ CMPSUPTYPE: 'PG-1', MDSSUPPTYPE: 'GT500' }, 'GUIDE'],
  [{ CMPSUPTYPE: 'LS-2', MDSSUPPTYPE: 'GT500' }, 'LINESTOP'],
  [{ CMPSUPTYPE: 'BP-3', MDSSUPPTYPE: 'GT500' }, 'REST'],
  // Text GT5 in a name or catalogue path must not beat a support code.
  [{ NAME: '/SL-GT5-1', MDSSUPPTYPE: 'AN1' }, 'ANCHOR'],
  [{ SPRE: '/MDS/GT575-80-PMP', MDSSUPPTYPE: 'PIPE-REST' }, 'REST'],
  [{ NAME: '/SL-GT5-2', MDSSUPPTYPE: 'BT2' }, 'REST'],
];

test('shared resolver (RVM viewer, PCF, interchange): GT5 is GUIDE, text GT5 is weakest', () => {
  for (const [attrs, kind] of CASES) assert.equal(resolveKindPure(attrs), kind, JSON.stringify(attrs));
});

test('the Python default table is the same rows in the same order', () => {
  const py = execFileSync('python', ['-c',
    'import sys,json;sys.path.insert(0,"converters/scripts");import xml229_support_type_mapper as m;print(json.dumps(m.TABLE_DEFAULT_RULES))'],
  { encoding: 'utf8' });
  const keep = (r) => ({ id: r.id, field: r.field, pattern: r.pattern, match: r.match, kind: r.kind, label: r.label });
  assert.deepEqual(JSON.parse(py).map(keep), DEFAULT_RULES.map(keep));
});
