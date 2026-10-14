import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  projectXml229SelectedPreviewSource,
  XML229_PREVIEW_PROJECTION_SCHEMA,
} from '../tabs/xml-cii-2019-standalone/integration/xml229-preview-source-projection.mjs';

const full=readFileSync(new URL('../Benchmarks/1885Sjson/Sjson.json',import.meta.url),'utf8');
const input=JSON.parse(full)[0];
const sha=s=>createHash('sha256').update(s).digest('hex');
const sourceSha=sha(full);
const sourceRefId='P3B2A-NODE-FIXTURE',generationId='P3B2A-G1';
const sourceRevision=generationId+':sha256:'+sourceSha;
const bytes=new TextEncoder().encode(JSON.stringify(input));
const config={};
const dependencies={
  xmlSha256:'a'.repeat(64),selectionSha256:'b'.repeat(64),
  configSha256:sha(JSON.stringify(config)),mastersSha256:'d'.repeat(64),
};
function fixture(){
  const source={
    generationId,sourceRefId,sourceRevision,
    sha256:sourceSha,byteLength:Buffer.byteLength(full),pageCount:47,
    occurrenceCount:23754,...dependencies,
  };
  const path='/0',occurrenceId=JSON.stringify(['lfj-json-value/v1',sourceRefId,sourceRevision,path]);
  const manifest={
    schema:'XML229.BoundedOriginalRead.v1',...source,
    requestedPaths:[path],valueCount:1,byteCount:bytes.length,
    complete:true,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
  };
  const value={
    schema:manifest.schema,...source,path,occurrenceId,ordinal:1,
    sourceType:'object',parentId:'root',startByte:0,
    endByteExclusive:bytes.length,valueByteLength:bytes.length,
    bytes,complete:false,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
  };
  return {manifest,values:[value],config};
}
test('P3B.2A original fixture builds source-only DTXR/wall/geometry projection using existing engines',async()=>{
  const result=await projectXml229SelectedPreviewSource(fixture());
  assert.equal(result.schema,XML229_PREVIEW_PROJECTION_SCHEMA);
  assert.equal(result.sha256,sourceSha);
  assert.deepEqual(result.selectedOriginalPointers,['/0']);
  assert.equal(result.completeSelectedSourceInputs,true);
  assert.equal(result.scopeMembershipVerified,false);
  assert.equal(result.consumerReady,false);
  assert.equal(result.engineeringReady,false);
  assert.equal(result.rightsBasis,'SOURCE_FACTS_ONLY');
  assert.ok(result.dtxr.count>0);
  assert.ok(result.wall.groupCount>0);
  assert.ok(result.geometry.count>0);
  assert.ok(result.dtxr.candidates.some(x=>
    x.dtxr==='ELBOW 90 DEG LR BW Sch 80'&&x.boreText==='150mm'));
  assert.ok(result.geometry.byRef.some(x=>x.ref==='1006649732/51228'&&x.boreMm===150));
  assert.ok(result.outputByteLength<1048576);
  assert.ok(result.dtxr.candidates.every(x=>x.raw===undefined&&x.component===undefined));
});
test('P3B.2A rejects config drift even with unchanged source SHA',async()=>{
  const f=fixture();
  await assert.rejects(projectXml229SelectedPreviewSource({...f,config:{sourceSchema:{enabled:false}}}),{
    code:'P3B_PROJECT_CONFIG_STALE'});
});
test('P3B.2A rejects forged value byte span / original source file-byte mismatch',async()=>{
  const f=fixture();
  await assert.rejects(projectXml229SelectedPreviewSource({...f,values:[{
    ...f.values[0],valueByteLength:1,
  }]}),{code:'P3B_PROJECT_VALUE_INVALID'});
  await assert.rejects(projectXml229SelectedPreviewSource({...f,values:[{
    ...f.values[0],byteLength:1,
  }]}),{code:'P3B_PROJECT_VALUE_INVALID'});
});
test('P3B.2A rejects child value, missing selection, duplicated selection and forged occurrence',async()=>{
  const f=fixture();
  await assert.rejects(projectXml229SelectedPreviewSource({
    ...f,manifest:{...f.manifest,requestedPaths:['/0/children/0']},
  }),{code:'P3B_PROJECT_VALUE_INVALID'});
  await assert.rejects(projectXml229SelectedPreviewSource({
    ...f,manifest:{...f.manifest,requestedPaths:[]},
  }),{code:'P3B_PROJECT_MANIFEST_INVALID'});
  await assert.rejects(projectXml229SelectedPreviewSource({
    ...f,values:[{...f.values[0],occurrenceId:'forged'}],
  }),{code:'P3B_PROJECT_VALUE_INVALID'});
  await assert.rejects(projectXml229SelectedPreviewSource({
    ...f,manifest:{...f.manifest,valueCount:2,requestedPaths:['/0','/0']},
    values:[f.values[0],f.values[0]],
  }),{code:'P3B_PROJECT_DUPLICATE_SELECTION'});
});
test('P3B.2A refuses non-branch JSON payload',async()=>{
  const f=fixture();const wrong=new TextEncoder().encode('{"type":"SUPPORT","children":[]}');
  await assert.rejects(projectXml229SelectedPreviewSource({
    ...f,manifest:{...f.manifest,byteCount:wrong.length},
    values:[{...f.values[0],bytes:wrong,valueByteLength:wrong.length,endByteExclusive:wrong.length}],
  }),{code:'P3B_PROJECT_NOT_ORIGINAL_BRANCH'});
});
test('P3B.2A cannot run on an authored document main thread',async()=>{
  const prior=globalThis.document;
  globalThis.document={};
  try{await assert.rejects(projectXml229SelectedPreviewSource(fixture()),{
    code:'P3B_PROJECT_BROWSER_MAIN_THREAD_FORBIDDEN'});}
  finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});

test('P3B.2A rejects long original evidence instead of silently truncating DTXR',async()=>{
  const f=fixture();
  const modified=structuredClone(input);
  modified.children[0].attributes.DTXR='X'.repeat(1001);
  const changed=new TextEncoder().encode(JSON.stringify(modified));
  const value={...f.values[0],bytes:changed,valueByteLength:changed.length,
    endByteExclusive:changed.length};
  await assert.rejects(projectXml229SelectedPreviewSource({
    ...f,manifest:{...f.manifest,byteCount:changed.length},values:[value],
  }),{code:'P3B_PROJECT_FIELD_BOUND'});
});
