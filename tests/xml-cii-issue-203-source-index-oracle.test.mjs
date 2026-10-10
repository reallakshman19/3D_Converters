import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeMasterRows} from '../tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js';

const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/xml-cii-203-tracked-piping-class-index-oracle.json',import.meta.url),'utf8'));
const bytes=await fs.readFile(new URL('../docs/Masters/Piping_class_master.json',import.meta.url));
const rows=JSON.parse(bytes.toString('utf8'));
const blob=buf=>createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');
function enforce(original,oracle){
  assert.equal(oracle.schema,'XMLCII_C05_203_TRACKED_CLASS_INDEX_ORACLE_V1');
  assert.equal(oracle.source,'docs/Masters/Piping_class_master.json');
  assert.equal(oracle.matchingCriterion,'EXACT_RAW_PIPING_CLASS_VALUE');
  assert.equal(oracle.sourceAuthority,'TRACKED_TEST_FIXTURE_NOT_OWNER_INDEPENDENT');
  assert.equal(oracle.sourceRows,10699);
  assert.equal(original.length,oracle.sourceRows);
  assert.equal(oracle.cases.length,3);
  const unique=new Set();
  let previousStart=-1;
  for(const specimen of oracle.cases){
    assert.ok(!unique.has(specimen.code),'oracle must cover three distinct exact class codes');
    unique.add(specimen.code);
    assert.match(specimen.code,/^\d{5,6}$/);
    const indexes=[];
    for(let index=0;index<original.length;index++){
      if(String(original[index]?.['Piping Class'])===specimen.code)indexes.push(index);
    }
    assert.deepEqual(indexes,specimen.indexes,'source independent full exact census for '+specimen.code);
    assert.ok(indexes.length>=1&&indexes.length<=12,'sparse class source selectivity');
    assert.ok(indexes[0]>previousStart,'source specimens must be geographically distributed in row order');
    previousStart=indexes[0];
    for(const [kind,row] of [['first',original[indexes[0]]],['last',original[indexes.at(-1)]]]){
      const expected=specimen.sourceCells[kind];
      for(const [field,value] of Object.entries(expected)){
        assert.deepEqual(row[field],value,specimen.code+' '+kind+' raw '+field+' mismatch');
      }
      assert.equal(row['Piping Class'],specimen.code);
    }
  }
  assert.ok(oracle.cases[0].indexes[0]<1500);
  assert.ok(oracle.cases[1].indexes[0]>3000);
  assert.ok(oracle.cases[2].indexes[0]>10000);
  return true;
}

test('oracle is explicitly a tracked-test fixture and its 2.44MB source has immutable Git blob custody',()=>{
  assert.equal(fixture.sourceGitBlob,'af218bf3692acd66c93e190635633e14ccfb30ac');
  assert.equal(bytes.length,2439490);
  assert.equal(blob(bytes),fixture.sourceGitBlob);
  assert.notEqual(fixture.sourceAuthority,'OWNER_ORIGINAL_INDEPENDENTLY_ATTESTED');
});

test('three independent early/middle/tail classes have full exact source index sets and original source cells',()=>{
  assert.equal(enforce(rows,fixture),true);
});

test('tampered source index or Piping Class code fails independent oracle before browser can claim green',()=>{
  const changedIndex=structuredClone(fixture);
  changedIndex.cases[2].indexes[0]+=1;
  assert.throws(()=>enforce(rows,changedIndex),/source independent full exact census/);
  const changedCell=structuredClone(fixture);
  changedCell.cases[1].sourceCells.first.Rating='999';
  assert.throws(()=>enforce(rows,changedCell),/raw Rating mismatch/);
});

test('mutated raw source Piping Class field fails without modifying checked-in fixture',()=>{
  const copy=rows.slice();
  copy[1277]={...copy[1277],'Piping Class':'FORGED'};
  assert.throws(()=>enforce(copy,fixture),/source independent full exact census/);
});

test('raw null convertedBore is explicitly canonicalized to empty only in mapped normalized Worker field',()=>{
  const raw=rows[10678];
  assert.equal(raw['Piping Class'],'25190');
  assert.equal(raw.convertedBore,null,'the tracked original raw null must remain visible in the source oracle');
  const normalized=normalizeMasterRows([raw],{pipingClass:'Piping Class',convertedBore:'convertedBore'},'pipingClass')[0];
  assert.equal(normalized['Piping Class'],'25190');
  assert.equal(normalized.pipingClass,'25190');
  assert.equal(normalized.convertedBore,'','current normalizer maps null with ?? empty-string fallback');
  assert.equal(raw.convertedBore,null,'the source row must never be rewritten by canonicalization');
  const blankMapped=normalizeMasterRows([raw],
    {pipingClass:'Piping Class',convertedBore:''},'pipingClass')[0];
  assert.equal(blankMapped.convertedBore,'',
    'missing/empty canonical header also yields empty normalized bore');
  const unMapped=normalizeMasterRows([raw],{pipingClass:'Piping Class'},'pipingClass')[0];
  assert.equal(unMapped.convertedBore,null,'null survives only when field is not mapped');
});
