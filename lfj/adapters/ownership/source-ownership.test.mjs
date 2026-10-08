// LFJ V4 / R02 independently precommitted ownership truth table.
// Fixture objects are controlled source-occurrence facts: NOT byte-verified source spans.
// Legacy RED observed separately in the actual Resolver JSON scope implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOccurrenceOwnership } from './source-ownership.mjs';

const fact=(id,parent,type,name,attributes={},sourceId='SRC-1')=>({
 sourceId,occurrenceId:id,parentOccurrenceId:parent,type,name,attributes
});
const at=(results,id)=>results.find(x=>x.occurrenceId===id);
const reject=(fn,code)=>assert.throws(fn,e=>e?.code===code,`expected typed ${code}`);

test('U01 parent without local Zone remains unresolved despite child OWNER_ZONE',()=>{
 const items=[fact('P',null,'BRANCH','/P',{OWNER:'a'}),fact('C','P','PIPE','C',{OWNER_ZONE:'CHILD'})];
 const x=resolveOccurrenceOwnership(items);
 assert.equal(at(x,'P').ownerZone,null);
 assert.equal(at(x,'C').ownerZone,'CHILD');
 assert.equal(at(x,'P').branchOwner,'a');
});
test('U01 parent own Site remains unchanged when child declares Zone',()=>{
 const x=resolveOccurrenceOwnership([fact('P',null,'BRANCH','P',{OWNER_SITE:'PS'}),fact('C','P','PIPE','C',{OWNER_ZONE:'CZ'})]);
 assert.equal(at(x,'P').ownerSite,'PS');assert.equal(at(x,'P').ownerZone,null);
 assert.equal(at(x,'C').ownerSite,'PS');assert.equal(at(x,'C').ownerZone,'CZ');
});
test('U01 own Zone overrides inherited Zone for child but not ancestor',()=>{
 const x=resolveOccurrenceOwnership([fact('Z',null,'ZONE','ZONE-A'),fact('P','Z','PIPE','P'),fact('C','P','PIPE','C',{OWNER_ZONE:'ZONE-B'})]);
 assert.equal(at(x,'P').ownerZone,'ZONE-A');assert.equal(at(x,'C').ownerZone,'ZONE-B');assert.equal(at(x,'Z').ownerZone,'ZONE-A');
});
test('U02 SITE and ZONE containers establish documented exact ancestor contexts',()=>{
 const x=resolveOccurrenceOwnership([fact('CH','Z','PIPE','Child'),fact('Z','S','ZONE','Zone-1'),fact('S',null,'SITE','Site-1')]);
 assert.equal(at(x,'S').ownerSite,'Site-1'); assert.equal(at(x,'S').ownerZone,null);
 assert.equal(at(x,'Z').ownerSite,'Site-1');assert.equal(at(x,'Z').ownerZone,'Zone-1');
 assert.equal(at(x,'CH').ownerSite,'Site-1');assert.equal(at(x,'CH').ownerZone,'Zone-1');
 assert.equal(x[0].occurrenceId,'CH','original source order remains unchanged even for forward parent references');
});
test('U02 branch OWNER is not interpreted as OWNER_SITE or OWNER_ZONE',()=>{
 const x=resolveOccurrenceOwnership([fact('B',null,'BRANCH','B',{OWNER:'OWNER-1'})]);
 assert.equal(x[0].ownerSite,null);assert.equal(x[0].ownerZone,null);assert.equal(x[0].branchOwner,'OWNER-1');
});
test('U02 new own Site cannot inherit a Zone from a different site',()=>{
 const x=resolveOccurrenceOwnership([fact('S',null,'SITE','Site-A'),fact('Z','S','ZONE','Zone-A'),fact('C','Z','PIPE','Child',{OWNER_SITE:'Site-B'})]);
 assert.equal(at(x,'C').ownerSite,'Site-B');assert.equal(at(x,'C').ownerZone,null);
});
test('U02 missing owner facts remain null rather than inferred from descendant',()=>{
 const x=resolveOccurrenceOwnership([fact('B',null,'BRANCH','B'),fact('C','B','PIPE','C',{OWNER_ZONE:'Z'})]);
 assert.equal(at(x,'B').ownerSite,null);assert.equal(at(x,'B').ownerZone,null);
});
test('U03 incompatible own Zone aliases are rejected',()=>{
 reject(()=>resolveOccurrenceOwnership([fact('A',null,'PIPE','A',{OWNER_ZONE:'Z-A',ZONE_ID:'Z-B'})]),'OWNER_CONFLICT');
});
test('U03 incompatible own typed ZONE declaration is rejected',()=>{
 reject(()=>resolveOccurrenceOwnership([fact('A',null,'ZONE','Zone-A',{OWNER_ZONE:'Zone-B'})]),'OWNER_CONFLICT');
});
test('U03 conflicting typed SITE and explicit Site are rejected',()=>{
 reject(()=>resolveOccurrenceOwnership([fact('A',null,'SITE','Site-A',{OWNER_SITE:'Site-B'})]),'OWNER_CONFLICT');
});
test('U03 unsupported owner scalar types fail explicitly',()=>{
 for(const owner of [42,{},['ZONE'],true])reject(()=>resolveOccurrenceOwnership([fact('A',null,'PIPE','A',{OWNER_ZONE:owner})]),'INVALID_OWNER');
});
test('U04 duplicate identical names in different branches stay distinct',()=>{
 const x=resolveOccurrenceOwnership([fact('S1',null,'SITE','North'),fact('S2',null,'SITE','South'),fact('C1','S1','PIPE','PIPE-77'),fact('C2','S2','PIPE','PIPE-77')]);
 assert.equal(at(x,'C1').name,'PIPE-77');assert.equal(at(x,'C2').name,'PIPE-77');
 assert.equal(at(x,'C1').ownerSite,'North');assert.equal(at(x,'C2').ownerSite,'South');
 assert.notEqual(at(x,'C1').occurrenceId,at(x,'C2').occurrenceId);
});
test('U04 cross-source parent does not create false owner relations',()=>{
 reject(()=>resolveOccurrenceOwnership([fact('P',null,'SITE','A',{},'SRC-A'),fact('C','P','PIPE','C',{},'SRC-B')]),'PARENT_NOT_FOUND');
});
test('U04 duplicate source occurrence ID rejects even when names differ',()=>{
 reject(()=>resolveOccurrenceOwnership([fact('A',null,'PIPE','1'),fact('A',null,'PIPE','2')]),'DUPLICATE_OCCURRENCE');
});
test('U04 ancestry cycle is an error even when inputs arrive child first',()=>{
 reject(()=>resolveOccurrenceOwnership([fact('A','B','PIPE','1'),fact('B','A','PIPE','2')]),'ANCESTRY_CYCLE');
});
test('U04 ordinary sourceId is preserved and never replaced by an LFJ SHA-derived value',()=>{
 const x=resolveOccurrenceOwnership([fact('P',null,'SITE','Site',{OWNER_SITE:'Site'},'GC-PW/Original-Id')]);
 assert.equal(x[0].sourceId,'GC-PW/Original-Id');
 assert.equal(x[0].occurrenceId,'P');
});

test('U04 very deep valid ancestor chain stays bounded by available heap, not JS call-stack depth',()=>{
 const depth=15000;
 const items=Array.from({length:depth},(_,i)=>fact('N'+i,i===0?null:'N'+(i-1),i===0?'SITE':'PIPE',i===0?'ROOT-SITE':'Part'));
 const resolved=resolveOccurrenceOwnership(items);
 assert.equal(resolved.length,depth);
 assert.equal(resolved[depth-1].ownerSite,'ROOT-SITE');
 assert.equal(resolved[depth-1].occurrenceId,'N'+(depth-1));
});
