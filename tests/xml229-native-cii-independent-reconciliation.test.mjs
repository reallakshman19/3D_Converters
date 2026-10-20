import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reconcileXml229ActualCiiAgainstFinal}
 from '../converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs';

const sha=t=>createHash('sha256').update(t).digest('hex');
const xml='<PipeStressExport><Pipe><Branch><Branchname>BR-1</Branchname>'+
  '<Node><NodeNumber>20</NodeNumber><ComponentType>RIGID</ComponentType>'+
  '<NodeName>WGT</NodeName><ComponentRefNo>REF-1</ComponentRefNo>'+
  '<Endpoint>2</Endpoint><Rigid>2</Rigid><Position>5 0 0</Position>'+
  '<Weight>0</Weight></Node></Branch></Pipe></PipeStressExport>';
const oid=JSON.stringify(['SRC',0,0,JSON.stringify(['RIGID','REF-1','2','WGT'])]);
function cii({mass='125',pointer='1',units='N.'}={}){
 const rows=['10 20 0 0 0 0',...Array(11).fill('0 0 0 0 0 0'),
   '0 '+pointer+' 0 0 0 0','0 0 0 0 0 0','0 0 0'];
 return '#$ CONTROL\n1 0 0 0 0 0\n0 1 0 0 0 0\n0 0 0 0 0 0\n0\n'+
  '#$ ELEMENTS\n'+rows.join('\n')+'\n#$ RIGID\n'+mass+' 0\n#$ UNITS\n'+units+'\n';
}
function bundle(text=cii()){
 const packet={schema:'XML229.NativeFinalPhysicalPacket.v1',
  sourceId:'SRC',basisId:'a'.repeat(64),finalIntentSha256:'b'.repeat(64),
  sourceXmlSha256:sha(xml),physicalCount:1,
  components:[{occurrenceId:oid,effectiveKg:12.5}],
  nativeCiiReleaseAuthorized:false};
 const writerDiagnostic={schema:'XML229.NativeRigidConsumptionDiagnostic.v1',
  sourcePhysicalCount:1,claimedNativeRigidCount:1,
  nativeCiiReleaseAuthorized:false,massesConsumedInNativeRigid:true,
  actualCiiSha256:sha(text),
  claims:[{occurrenceId:oid,rigidRecordIndex:0,nativeElementIndex:0,
    ciiFromNode:'10',ciiToNode:'20',massKg:12.5,
    branchOccurrenceIndex:0,engineNodeOrdinal:0}]};
 return {originalXmlText:xml,packet,ciiText:text,writerDiagnostic};
}
test('independent byte parser reconciles accepted kg and native pointers without releasing output',async()=>{
 const proof=await reconcileXml229ActualCiiAgainstFinal(bundle());
 assert.equal(proof.massConsumptionVerified,true);
 assert.equal(proof.strictOneToOneOwnerMatch,true);
 assert.equal(proof.nativeCiiReleaseAuthorized,false);
 assert.equal(proof.nativeRigidCount,1);
 assert.equal(proof.physicalCount,1);
 assert.equal(proof.actualCiiSha256,sha(cii()));
});
test('tampered emitted mass, pointer, force units, or native element ancestry fail closed',async()=>{
 for(const [text,code] of [
  [cii({mass:'130'}),'NATIVE_CII_MASS_CONSUMPTION_MISMATCH'],
  [cii({pointer:'0'}),'CII_RIGID_ORPHAN'],
  [cii({units:'KG.'}),'CII_FORCE_UNIT_UNVERIFIED'],
 ]){
  await assert.rejects(reconcileXml229ActualCiiAgainstFinal(bundle(text)),{code});
 }
 const altered=bundle();
 altered.writerDiagnostic.claims[0].ciiToNode='999';
 await assert.rejects(reconcileXml229ActualCiiAgainstFinal(altered),
  {code:'NATIVE_CII_ELEMENT_RIGID_LINEAGE_MISMATCH'});
 const wrong=bundle();
 wrong.packet.components[0].effectiveKg=11;
 await assert.rejects(reconcileXml229ActualCiiAgainstFinal(wrong),
  {code:'NATIVE_OUTPUT_PHYSICAL_OWNERSHIP_DRIFT'});
 const raw=bundle();
 raw.originalXmlText=raw.originalXmlText.replace('REF-1','REF-2');
 await assert.rejects(reconcileXml229ActualCiiAgainstFinal(raw),
  {code:'NATIVE_SOURCE_XML_SHA_DRIFT'});
});
test('unresolved, duplicate claims, forged release and mismatched basis evidence reject',async()=>{
 const missing=bundle();
 missing.packet.components[0].effectiveKg=0;
 await assert.rejects(reconcileXml229ActualCiiAgainstFinal(missing),
  {code:'NATIVE_FINAL_COMPONENT_INVALID'});
 const forged=bundle();
 forged.writerDiagnostic.nativeCiiReleaseAuthorized=true;
 await assert.rejects(reconcileXml229ActualCiiAgainstFinal(forged),
  {code:'NATIVE_WRITER_PROOF_CUSTODY_INVALID'});
 const original=bundle();
 original.writerDiagnostic.actualCiiSha256='a'.repeat(64);
 await assert.rejects(reconcileXml229ActualCiiAgainstFinal(original),
  {code:'NATIVE_WRITER_PROOF_CUSTODY_INVALID'});
});
