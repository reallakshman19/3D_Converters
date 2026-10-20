import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {reconcileXml229ActualCiiAgainstFinal}
 from '../converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs';

const sha=text=>createHash('sha256').update(text).digest('hex');
const source='<PipeStressExport><Pipe><Branch><Branchname>BR-1</Branchname>'+
 '<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType>'+
 '<Position>0 0 0</Position><Weight>0</Weight></Node>'+
 '<Node><NodeNumber>20</NodeNumber><NodeName>WGT</NodeName>'+
 '<ComponentType>RIGID</ComponentType><ComponentRefNo>REF-1</ComponentRefNo>'+
 '<Endpoint>2</Endpoint><Position>5 0 0</Position><Rigid>2</Rigid>'+
 '<Weight>0</Weight></Node></Branch></Pipe></PipeStressExport>';
const occurrenceId=JSON.stringify(['SOURCE',0,1,JSON.stringify(['RIGID','REF-1','2','WGT'])]);
const packet={schema:'XML229.NativeFinalPhysicalPacket.v1',
 sourceId:'SOURCE',basisId:'a'.repeat(64),finalIntentSha256:'b'.repeat(64),
 sourceXmlSha256:sha(source),physicalCount:1,nativeCiiReleaseAuthorized:false,
 components:[{occurrenceId,effectiveKg:12.5}]};
test('native Run surfaces post-acceptance geometry changes as actionable blocker',()=>{
 const ui=readFileSync(fileURLToPath(new URL(
  '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-native-cii-candidate-run.mjs',
  import.meta.url)),'utf8');
 assert.ok(ui.includes('native?.error'));
 assert.match(ui,/NATIVE_GEOMETRY_CHANGED_AFTER_WEIGHT_ACCEPTANCE/);
 assert.match(ui,/NATIVE_DOUBLE_ENDPOINT_MASS_OWNER/);
 assert.match(ui,/NATIVE_RIGID_OWNER_UNSUPPORTED/);
});

test('Run diagnostic binds to stable live GC-PW authority, not mutable state.current',()=>{
 const ui=readFileSync(fileURLToPath(new URL(
  '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
  import.meta.url)),'utf8');
 assert.match(ui,/const session=getXml229CurrentWorkerHeldReview\(stateRef\);/);
 assert.doesNotMatch(ui,/getXml229CurrentWorkerHeldReview\(stateRef\.current\)/);
 assert.match(ui,/receipt\.generationId/);
 assert.match(ui,/runXml229NativeCiiMassCandidate/);
});
test('REAL Python native converter CII independently reconciles against exact source Final kg',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'xml229-custody-'));
 try{
  const input=join(folder,'source.xml'),output=join(folder,'emitted.cii'),
        manifest=join(folder,'packet.json'),proofPath=join(folder,'native-proof.json');
  writeFileSync(input,source);
  writeFileSync(manifest,JSON.stringify(packet));
  const proc=spawnSync('python3',['converters/scripts/xml_to_cii2019_runtime_custody.py',
    '--input',input,'--output',output,'--weight-scale','10',
    '--xml229-native-final-packet',manifest,'--xml229-native-mass-proof',proofPath,
  ],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:45000});
  assert.equal(proc.status,0,(proc.stderr||'').slice(-2300));
  const ciiText=readFileSync(output,'utf8');
  const writerDiagnostic=JSON.parse(readFileSync(proofPath,'utf8'));
  const independent=await reconcileXml229ActualCiiAgainstFinal({
   originalXmlText:source,packet,ciiText,writerDiagnostic,
  });
  assert.equal(independent.massConsumptionVerified,true);
  assert.equal(independent.physicalCount,1);
  assert.equal(independent.actualCiiSha256,sha(ciiText));
  assert.equal(independent.nativeCiiReleaseAuthorized,true);
  // Native-owned claims cannot hide a modified mass record in actual CII.
  const tampered=ciiText.replace(/(#\$ RIGID\r?\n)([^\r\n]+)/,
   (_all,prefix,row)=>prefix+row.replace(/^\s*\S+/, '126'));
  assert.notEqual(tampered,ciiText);
  await assert.rejects(reconcileXml229ActualCiiAgainstFinal({
   originalXmlText:source,packet,ciiText:tampered,
   writerDiagnostic:{...writerDiagnostic,actualCiiSha256:sha(tampered)},
  }),{code:'NATIVE_CII_MASS_CONSUMPTION_MISMATCH'});
 }finally{rmSync(folder,{recursive:true,force:true});}
});
