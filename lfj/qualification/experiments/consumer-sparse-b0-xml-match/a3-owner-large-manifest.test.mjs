import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateOwnerLargeManifest} from './a3-owner-large-manifest.mjs';

const MiB=1024*1024,sha=x=>x.repeat(64);
function valid(){
  return {
    schema:'LFJ.A3.OwnerLargeQualification.v1',
    provenanceClass:'OWNER_SUPPLIED_EXTERNAL',
    ownerEvidenceReference:'owner-audit-2026-10-10',
    workloads:[
      {
        id:'owner-30mb',sourcePath:'/safe/owner30.json',
        xmlPath:'/safe/original30.xml',sourceBytes:30*MiB,
        sourceSha256:sha('a'),xmlSha256:sha('c'),
        sourceEvidenceReference:'owner-upload-30',
        expectedOutcome:'INDEXED_TWO_CSV',expectedXmlNodes:216,
        expectedMatchedNodes:164,
        expectedNodeWiseCsvSha256:sha('d'),
        expectedEvidenceTreeCsvSha256:sha('e')
      },{
        id:'owner-90mb',sourcePath:'/safe/owner90.json',
        xmlPath:'/safe/original90.xml',sourceBytes:90*MiB,
        sourceSha256:sha('b'),xmlSha256:sha('f'),
        sourceEvidenceReference:'owner-upload-90',
        expectedOutcome:'REJECT_CURRENT_32MIB_LIMIT'
      }
    ]
  };
}
const reject=m=>assert.throws(()=>validateOwnerLargeManifest(m),
  e=>e.code==='LFJ_OWNER_MANIFEST_INVALID');

test('accepts two independent SHA-pinned original input entries, not proof of authorship',()=>{
  const m=validateOwnerLargeManifest(valid());
  assert.equal(m.workloads.length,2);
  assert.equal(Object.isFrozen(m),true);
  assert.equal(Object.isFrozen(m.workloads[0]),true);
});
test('rejects renamed/synthetic provenance and omitted owner evidence',()=>{
  for(const provenanceClass of ['SYNTHETIC','REPOSITORY_DERIVED','OWNER_REPORTED']){
    const m=valid();m.provenanceClass=provenanceClass;reject(m);
  }
  const m=valid();m.ownerEvidenceReference='';reject(m);
});
test('rejects same source identity, path, or missing XML hash',()=>{
  for(const name of ['sourceSha256','sourcePath']){
    const m=valid();
    m.workloads[1][name]=m.workloads[0][name];reject(m);
  }
  const m=valid();m.workloads[0].xmlSha256='';reject(m);
});
test('rejects false claim that 90MB runs in current 32MiB preview',()=>{
  const m=valid();m.workloads[1].expectedOutcome='INDEXED_TWO_CSV';reject(m);
});
test('rejects Owner 30MB record without externally expected CSV digests and census',()=>{
  const m=valid();delete m.workloads[0].expectedNodeWiseCsvSha256;reject(m);
  const n=valid();n.workloads[0].expectedMatchedNodes=217;reject(n);
});
test('rejects invalid sizes, single-source duplication and swapped 90/30 order',()=>{
  let m=valid();m.workloads[0].sourceBytes=33*MiB;reject(m);
  m=valid();m.workloads[1].sourceBytes=30*MiB;reject(m);
  m=valid();m.workloads.reverse();reject(m);
});
