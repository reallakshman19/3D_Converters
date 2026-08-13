import assert from 'node:assert/strict';
import test from 'node:test';
import { VIBRATION_MASTER_TABLE_NORMALIZED_SCHEMA as OUT } from '../scripts/normalize-vibration-master-tables.mjs';
import { AUTHORITY, candidate, mapping, run } from './support/vibration-master-table-normalization-fixtures.mjs';

test('reviewed exact mapping creates typed candidate and preserves source strings',()=>{const r=run();assert.equal(r.schema,OUT);assert.equal(r.candidates[0].sourceState,'TABLE_MASTER_CANDIDATE_NORMALIZED');assert.equal(r.candidates[0].recoveryAction,'QUALIFICATION_REQUIRED');assert.equal(r.candidates[0].rows[0].values.factor.value,1.25);assert.equal(r.candidates[0].rows[0].values.factor.rawSource,'1.25');assert.deepEqual(r.authority,AUTHORITY);});

test('mapping review, hash and page-range drift fail closed',()=>{const a=mapping();a.mappings[0].reviewStatus='DRAFT';assert.throws(()=>run(candidate(),a),/MAPPING_NOT_REVIEWED/);const b=mapping();b.mappings[0].markdownSha256=`sha256:${'c'.repeat(64)}`;assert.throws(()=>run(candidate(),b),/SOURCE_BINDING_MISMATCH/);const d=mapping();d.mappings[0].pageRange.end=82;assert.throws(()=>run(candidate(),d),/PAGE_RANGE_MISMATCH/);});

test('candidate state and authority drift fail closed',()=>{const a=candidate();a.candidates[0].sourceState='RECONCILIATION_REQUIRED';assert.throws(()=>run(a),/CANDIDATE_NOT_RECOVERED/);const b=candidate();b.authority.screeningAuthority='DRIFTED';assert.throws(()=>run(b),/AUTHORITY_MISMATCH/);});
