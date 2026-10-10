/** H10 deterministic author regression; no product or protected-golden writes. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEARCH_HANDOFF_MAX_BYTES as CAP,
  assertResearchHandoffPayloadBytes as count
} from './xml-research-handoff-budget.mjs';
const args=(nodeCsv='',evidenceCsv='',nodeWiseRows=[],evidenceTreeRows=[])=>({
  nodeCsv,evidenceCsv,nodeWiseRows,evidenceTreeRows
});
const rejected=fn=>assert.throws(fn,{code:'RESEARCH_HANDOFF_TOO_LARGE'});
test('H10 empty rows count includes both JSON array encodings',()=>{
  assert.equal(count(args()),4);
});
test('H10 accepted original-size UTF8 strings count all four parts independently',()=>{
  const fields=args('node,csv\n','evidence,csv\n',[{source:'é/🧭'}],[{PS:'Γ'}]);
  const expected=[fields.nodeCsv,fields.evidenceCsv,
    JSON.stringify(fields.nodeWiseRows),JSON.stringify(fields.evidenceTreeRows)]
    .reduce((n,s)=>n+new TextEncoder().encode(s).length,0);
  assert.equal(count(fields),expected);
});
test('H10 exactly 8MiB payload is allowed',()=>{
  assert.equal(count(args('A'.repeat(CAP-4))),CAP);
});
test('H10 8MiB+1 ASCII payload rejects before any success',()=>{
  rejected(()=>count(args('A'.repeat(CAP-3))));
});
test('H10 UTF8 multi-byte boundary rejects even when UTF16 length fits',()=>{
  rejected(()=>count(args('é'.repeat(Math.floor(CAP/2))))); // + 4 JSON bytes
});
test('H10 a single oversized CSV component rejects',()=>{
  rejected(()=>count(args('A'.repeat(CAP+1))));
});
test('H10 oversized actual row JSON rejects',()=>{
  rejected(()=>count(args('','',[{big:'x'.repeat(CAP)}])));
});
test('H10 invalid internal CSV field fails closed with typed code',()=>{
  assert.throws(()=>count(args(null)),{code:'RESEARCH_HANDOFF_INVALID'});
});
test('H10 non-serializable row payload fails before transfer',()=>{
  const cycle={};cycle.self=cycle;
  assert.throws(()=>count(args('','',[cycle])),TypeError);
});
test('H10 accepted Unicode payload reports actual byte length',()=>{
  const input=args('α😀\n','βγ\n',[{node:'E/N/EL',position:'١ ٢ ٣'}],
    [{branch:'π',support:'PS A'}]);
  assert.equal(count(input),new TextEncoder().encode(input.nodeCsv+
    input.evidenceCsv+JSON.stringify(input.nodeWiseRows)+
    JSON.stringify(input.evidenceTreeRows)).length);
});
