/**
 * #212 NEXT-06A: independent original GLRD X001 source oracle.
 * Tests parse source only; they do NOT run/accept B4 geometry, CII or full Owner release.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const originalPath=new URL('../../Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml',import.meta.url);
const originalBlob='8769ffe538ecacc621daf39919ca00ba27008211';
const witnesses=[
  {id:10,xyz:[111369.76,108416.90,101088.18],cii:[111369.76,101088.18,-108416.90],count:1},
  {id:760,xyz:[109700,107022.33,101229.30],cii:[109700,101229.30,-107022.33],count:2},
  {id:1200,xyz:[108200,107022.33,101229.30],cii:[108200,101229.30,-107022.33],count:2},
  {id:1640,xyz:[106700,107022.33,101229.30],cii:[106700,101229.30,-107022.33],count:2},
  {id:2080,xyz:[105200,107022.33,101229.30],cii:[105200,101229.30,-107022.33],count:2},
  {id:2520,xyz:[103700,107022.33,101229.30],cii:[103700,101229.30,-107022.33],count:2},
  {id:2960,xyz:[102200,107022.33,101229.30],cii:[102200,101229.30,-107022.33],count:2},
];
const fail=(code,description)=>{throw Object.assign(new Error(description),{code});};
const xmlField=(fragment,tag)=>{
  const found=[...fragment.matchAll(new RegExp('<'+tag+'>([\\s\\S]*?)</'+tag+'>','g'))];
  if(found.length!==1)fail('X001_SOURCE_FIELD_INVALID','Must have exactly one '+tag);
  return found[0][1].trim();
};
const parsePosition=(source)=>{
  const raw=source.trim().split(/\s+/);
  if(raw.length!==3 || raw.some(x=>!/^[-+]?\d+(?:\.\d+)?$/.test(x)))
    fail('X001_INVALID_POSITION','Three explicit numeric position coordinates required');
  const coords=raw.map(Number);
  if(coords.some(x=>!Number.isFinite(x)))fail('X001_INVALID_POSITION','Nonfinite coordinates');
  return coords;
};
const toCii=([x,y,z])=>[x,z,-y];
function parseOriginal(text,sourceId='GLRD-original.xml'){
  if(!text.includes('<PipeStressExport') || !text.includes('</PipeStressExport>'))
    fail('X001_SOURCE_XML_INVALID','PipeStressExport root missing');
  const branches=[...text.matchAll(/<Branch>([\s\S]*?)<\/Branch>/g)];
  if(branches.length!==[...text.matchAll(/<Branch>/g)].length ||
    branches.length!==[...text.matchAll(/<\/Branch>/g)].length)
    fail('X001_SOURCE_XML_INVALID','Malformed Branch elements');
  const records=[];
  for(const [branchOrdinal,branch] of branches.entries()){
    const branchName=xmlField(branch[1],'Branchname');
    const nodes=[...branch[1].matchAll(/<Node>([\s\S]*?)<\/Node>/g)];
    if(nodes.length!==[...branch[1].matchAll(/<Node>/g)].length ||
      nodes.length!==[...branch[1].matchAll(/<\/Node>/g)].length)
      fail('X001_SOURCE_XML_INVALID','Malformed Node elements');
    for(const [nodeOrdinal,node] of nodes.entries()){
      const rawId=xmlField(node[1],'NodeNumber');
      if(!/^-?\d+$/.test(rawId))fail('X001_NODE_ID_INVALID',rawId);
      records.push({
        sourceId,branchOrdinal,nodeOrdinal,branchName,
        occurrenceId:JSON.stringify([sourceId,branchOrdinal,nodeOrdinal]),
        nodeNumber:Number(rawId),
        position:parsePosition(xmlField(node[1],'Position')),
      });
    }
  }
  return {branchCount:branches.length,records};
}
async function readOriginal(){
  const bytes=await readFile(originalPath);
  const actualBlob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0'))
    .update(bytes).digest('hex');
  assert.equal(actualBlob,originalBlob,'Check original Git blob identity, not just filename');
  return {text:bytes.toString('utf8'),length:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')};
}
test('NEXT-06A authentic GLRD immutable blob, SHA256 and complete source occurrence census',async()=>{
  const original=await readOriginal();
  const result=parseOriginal(original.text);
  assert.equal(original.length,627599);
  assert.equal(result.branchCount,41,'GLRD differs from another 19-branch PL01/PL06 benchmark');
  assert.equal(result.records.length,1166);
  assert.equal(result.records.filter(n=>n.nodeNumber===-1).length,778);
  assert.equal(new Set(result.records.map(n=>n.occurrenceId)).size,1166);
  assert.equal(result.records[0].nodeNumber,10);
  assert.equal(new Set(result.records.map(n=>n.branchOrdinal)).size,41);
  console.log('NEXT06A_GLRD_SOURCE_RECEIPT '+JSON.stringify({
    schema:'LFJ.NEXT06A.GLRD.SourceReceipt.v1',
    file:'Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml',
    gitBlob:originalBlob,sha256:original.sha256,bytes:original.length,
    branches:result.branchCount,nodeOccurrences:1166,repeatedMinusOne:778,
    status:'ORIGINAL_XML_SOURCE_ORACLE_ONLY_NOT_ENGINEERING_CII',
  }));
});
test('NEXT-06A seven exact original positions project into explicit CII X,Z,-Y axes, no origin fallback',async()=>{
  const {records}=parseOriginal((await readOriginal()).text);
  for(const w of witnesses){
    const matches=records.filter(n=>n.nodeNumber===w.id);
    assert.equal(matches.length,w.count,'Original node count '+w.id);
    for(const node of matches){
      assert.deepEqual(node.position,w.xyz,'Original XYZ '+w.id);
      assert.deepEqual(toCii(node.position),w.cii,'Expected CII orientation '+w.id);
      assert.notDeepEqual(toCii(node.position),[0,0,0]);
    }
  }
});
test('NEXT-06A coordinate seam may connect physical geometry but cannot coalesce source occurrences',async()=>{
  const original=await readOriginal(),{records}=parseOriginal(original.text);
  for(const w of witnesses.slice(1)){
    const pair=records.filter(n=>n.nodeNumber===w.id);
    assert.equal(pair.length,2);
    assert.equal(pair[0].branchOrdinal+1,pair[1].branchOrdinal);
    assert.equal(pair[1].nodeOrdinal,0);
    assert.notEqual(pair[0].occurrenceId,pair[1].occurrenceId);
    assert.notEqual(pair[0].branchName,pair[1].branchName);
    assert.deepEqual(pair[0].position,pair[1].position,
      'Same 3D seam position does not imply same source occurrence');
  }
  const minusOne=records.filter(n=>n.nodeNumber===-1);
  assert.equal(new Set(minusOne.map(n=>n.occurrenceId)).size,778);
  const another=parseOriginal(original.text,'other-file.xml').records[0];
  assert.equal(another.nodeNumber,records[0].nodeNumber);
  assert.deepEqual(another.position,records[0].position);
  assert.notEqual(another.occurrenceId,records[0].occurrenceId,'No cross-file merging');
});
test('NEXT-06A malformed, absent, nonfinite or 2D/4D Position rejects instead of origin defaults',async()=>{
  const {text}=await readOriginal();
  const old='<Position>111369.76 108416.90 101088.18</Position>';
  assert.equal(text.split(old).length-1,1);
  for(const bad of ['111369.76 108416.90','111369.76 bogus 101088.18',
    '111369.76 108416.90 Infinity','NaN 108416.90 101088.18',
    '111369.76 108416.90 101088.18 0','']){
    assert.throws(()=>parseOriginal(text.replace(old,'<Position>'+bad+'</Position>')),
      {code:'X001_INVALID_POSITION'});
  }
  assert.throws(()=>parseOriginal(text.replace(old,'')),{code:'X001_SOURCE_FIELD_INVALID'});
});
test('NEXT-06A broken Branch/Node or nonnumeric node identity fails source admission',async()=>{
  const {text}=await readOriginal();
  assert.throws(()=>parseOriginal(text.replace('</Branch>','')),{code:'X001_SOURCE_XML_INVALID'});
  assert.throws(()=>parseOriginal(text.replace('</Node>','')),{code:'X001_SOURCE_XML_INVALID'});
  assert.throws(()=>parseOriginal(text.replace('<NodeNumber>10</NodeNumber>',
    '<NodeNumber>-1??</NodeNumber>')),{code:'X001_NODE_ID_INVALID'});
});
