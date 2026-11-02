/**
 * WBS #391 F18/F19 read-only original XML qualification.
 * The public original BM2 is authentic repository evidence, NOT private V6.
 * An ORIGINAL_XML_TEE_BRAN_CANDIDATE_ONLY result never authorizes a weld.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {inspectXml229OriginalPortEvidence,challengeXml229TeeBranConnectionAliases}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-source-port-connection-evidence.mjs';
import {indexXml229OriginalPhysicalVertices}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-original-physical-vertices.mjs';
installWeightBasisXmlDom(globalThis);
const BM2=readFileSync(fileURLToPath(new URL(
  '../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml',import.meta.url)),'utf8');
const part=(number,xyz,kind,ref,endpoint,extra='')=>
 '<Node><NodeNumber>'+number+'</NodeNumber><Position>'+xyz+
 '</Position><ComponentType>'+kind+'</ComponentType>'+
 '<ComponentRefNo>'+ref+'</ComponentRefNo><Endpoint>'+endpoint+'</Endpoint>'+
 extra+'</Node>';
const branch=(name,...nodes)=>
 '<Branch><Branchname>'+name+'</Branchname>'+nodes.join('')+'</Branch>';
const original=(...branches)=>
 '<PipeStressExport><Pipe>'+branches.join('')+'</Pipe></PipeStressExport>';
function teeCrossing(){
 return original(
  branch('/MAIN/B1',
   part(2680,'0 0 0','TEE','=TEE17',1),
   part(-1,'100 0 60','TEE','=TEE17',3),
   part(2690,'100 0 0','TEE','=TEE17',0),
   part(2700,'200 0 0','TEE','=TEE17',2)),
  branch('/OTHER/B1',
   part(3450,'100 0 0','PIPE','=OTHER',0),
   part(3460,'100 100 0','PIPE','=OTHER',0)),
  branch('/MAIN/B2',
   part(2690,'100.000 0 0','BRAN','=DIFFERENT_BRAN_REF',1),
   part(2710,'150 60 0','PIPE','=BRANCH_PIPE',0)),
 );
}
const proposed={aliasBranchOccurrenceIndex:2,aliasSourceNodeOrdinal:0,
 terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:2};
const forged={aliasBranchOccurrenceIndex:1,aliasSourceNodeOrdinal:0,
 terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:2};

test('Original BM2 census: 31 TEE witnesses, 25 uniquely source-grounded BRAN candidates, 357 zero spans, 27 authored-positive conflicts',()=>{
 const r=inspectXml229OriginalPortEvidence({originalXmlText:BM2});
 assert.deepEqual({
  branches:r.summary.originalBranchCount,nodes:r.summary.originalNodeOccurrences,
  tee:r.summary.teePort3Witnesses,branCandidates:r.summary.uniqueTeeBranSourceCandidates,
  zeroEdges:r.summary.exactConsecutiveZeroSpanSourceEdges,
  positiveIdentityConflicts:r.summary.zeroSpanDistinctPositiveIds,
 },{branches:31,nodes:1196,tee:31,branCandidates:25,
  zeroEdges:357,positiveIdentityConflicts:27});
 assert.equal(r.summary.originalBranBoundaryOccurrences,57);
 assert.equal(r.summary.unresolvedBranBoundaries,32);
 assert.equal(r.summary.nativeReleaseAuthorized,false);
 assert.equal(r.summary.graphUnionAuthorized,false);
 assert.equal(r.summary.finalGeometryModified,false);
 assert(r.candidateLinks.every(x=>x.status==='ORIGINAL_XML_TEE_BRAN_CANDIDATE_ONLY'&&
  x.mechanicalApproval===false));
 assert(r.candidateLinks.some(x=>x.sourceBranRef!==x.sourceTeeRef),
  'original BM2 source branch and tee component ref need not match');
});

test('Original BM2 candidate link provenance: every pair has different branches, exact-ID/XYZ, and strictly unique endpoint station',()=>{
 const r=inspectXml229OriginalPortEvidence({originalXmlText:BM2});
 const key=x=>x.aliasBranchOccurrenceIndex+':'+x.aliasSourceNodeOrdinal;
 assert.equal(new Set(r.candidateLinks.map(key)).size,25);
 const seen=new Set();
 for(const candidate of r.candidateLinks){
  assert.notEqual(candidate.aliasBranchOccurrenceIndex,
   candidate.terminalBranchOccurrenceIndex);
  assert(/^[1-9][0-9]*$/.test(candidate.authoredPositiveId));
  assert(['1','2'].includes(candidate.sourceBranEndpoint));
  assert(!seen.has(candidate.terminalBranchOccurrenceIndex+':'+
   candidate.terminalSourceNodeOrdinal));
  seen.add(candidate.terminalBranchOccurrenceIndex+':'+
   candidate.terminalSourceNodeOrdinal);
 }
 const accepted=challengeXml229TeeBranConnectionAliases({
  originalXmlText:BM2,proposedAliases:r.candidateLinks.slice(0,3),
 });
 assert.equal(accepted.validatedOriginalSourceCandidates,3);
 assert.equal(accepted.engineeringGraphApproved,false);
});

test('F18: real BM2 zero-span source ports are not promoted into approved physical graph identity',()=>{
 const r=inspectXml229OriginalPortEvidence({originalXmlText:BM2});
 assert.equal(r.authoredPositiveConflicts.length,27);
 assert(r.authoredPositiveConflicts.every(x=>x.status==='SOURCE_PORT_IDENTITY_REVIEW_REQUIRED'));
 assert(r.zeroSpanRows.every(x=>x.nativeContractionAuthorized===false));
 const conflict=r.authoredPositiveConflicts[0];
 assert.notEqual(conflict.sourceNodeNumberPair[0],conflict.sourceNodeNumberPair[1]);
});

test('F18: synthetic same-ref RIGID endpoints 1/2 at exact XYZ remain unresolved regardless of proposed union',()=>{
 const s=original(branch('/RIGID/B1',
  part(101,'100 0 0','RIGID','R17',1),
  part(202,'100.000 0 0','RIGID','R17',2)));
 const proof=inspectXml229OriginalPortEvidence({originalXmlText:s});
 assert.equal(proof.zeroSpanRows.length,1);
 assert.equal(proof.zeroSpanRows[0].sameComponentTwoPorts,true);
 assert.equal(proof.zeroSpanRows[0].conflictingAuthoredPositiveId,true);
 assert.equal(proof.zeroSpanRows[0].status,'SOURCE_PORT_IDENTITY_REVIEW_REQUIRED');
 const current=indexXml229OriginalPhysicalVertices({xmlText:s});
 assert.equal(current.vertexForOriginal(0,0),current.vertexForOriginal(0,1),
  'F18 reproduces old index union; source port audit does not bless it');
 assert.equal(proof.summary.graphUnionAuthorized,false);
});

test('F19: synthetic TEE source candidate joins only TEE port0 and BRAN boundary as witness; crossing stays distinct',()=>{
 const s=teeCrossing(),r=inspectXml229OriginalPortEvidence({originalXmlText:s});
 assert.equal(r.summary.teePort3Witnesses,1);
 assert.equal(r.summary.uniqueTeeBranSourceCandidates,1);
 assert.equal(r.summary.unresolvedBranBoundaries,0);
 const c=r.candidateLinks[0];
 assert.equal(c.aliasBranchOccurrenceIndex,2);
 assert.equal(c.aliasSourceNodeOrdinal,0);
 assert.equal(c.terminalBranchOccurrenceIndex,0);
 assert.equal(c.terminalSourceNodeOrdinal,2);
 assert.equal(c.sourceBranRef,'=DIFFERENT_BRAN_REF');
 assert.equal(c.sourceTeeRef,'=TEE17');
 assert.equal(challengeXml229TeeBranConnectionAliases({
  originalXmlText:s,proposedAliases:[proposed],
 }).validatedOriginalSourceCandidates,1);
 const graph=indexXml229OriginalPhysicalVertices({
  xmlText:s,branchConnectionAliases:[proposed],
 });
 assert.equal(graph.vertexForOriginal(0,2),graph.vertexForOriginal(2,0));
 assert.notEqual(graph.vertexForOriginal(0,2),graph.vertexForOriginal(1,0));
 assert.equal(r.summary.nativeReleaseAuthorized,false);
});

test('F19: forged crossing alias fails original source-port qualification even at exact XYZ',()=>{
 const s=teeCrossing();
 const old=indexXml229OriginalPhysicalVertices({
  xmlText:s,branchConnectionAliases:[forged],
 });
 assert.equal(old.vertexForOriginal(0,2),old.vertexForOriginal(1,0),
  'original shadow index trusts arbitrary alias');
 assert.throws(()=>challengeXml229TeeBranConnectionAliases({
  originalXmlText:s,proposedAliases:[forged],
 }),{code:'XML229_PORT_ALIAS_SOURCE_WITNESS_REQUIRED'});
});

test('F19: duplicate alias, unrelated pipe and wrong TEE terminal are rejected',()=>{
 const s=teeCrossing();
 assert.throws(()=>challengeXml229TeeBranConnectionAliases({
  originalXmlText:s,proposedAliases:[proposed,proposed],
 }),{code:'XML229_PORT_ALIAS_DUPLICATED'});
 assert.throws(()=>challengeXml229TeeBranConnectionAliases({
  originalXmlText:s,proposedAliases:[{...proposed,terminalSourceNodeOrdinal:0}],
 }),{code:'XML229_PORT_ALIAS_SOURCE_WITNESS_REQUIRED'});
 assert.throws(()=>challengeXml229TeeBranConnectionAliases({
  originalXmlText:s,proposedAliases:[{...forged,terminalSourceNodeOrdinal:3}],
 }),{code:'XML229_PORT_ALIAS_SOURCE_WITNESS_REQUIRED'});
});

test('F19: a third positive ID occurrence at TEE junction makes source connection ambiguous (fail closed)',()=>{
 const s=teeCrossing().replace(
  '<NodeNumber>3450</NodeNumber>',
  '<NodeNumber>2690</NodeNumber>');
 const evidence=inspectXml229OriginalPortEvidence({originalXmlText:s});
 assert.equal(evidence.summary.uniqueTeeBranSourceCandidates,0);
 assert.equal(evidence.summary.unresolvedBranBoundaries,1);
 assert.equal(evidence.unresolvedBran[0].reason,'SOURCE_JUNCTION_IDENTITY_MULTIPLE_OR_INVALID');
 assert.throws(()=>challengeXml229TeeBranConnectionAliases({
  originalXmlText:s,proposedAliases:[proposed],
 }),{code:'XML229_PORT_ALIAS_SOURCE_WITNESS_REQUIRED'});
});

test('F19: altered original TEE port3/endpoint or incorrect positive junction ID cannot qualify',()=>{
 const s=teeCrossing();
 const wrongEndpoint=s.replace('<Endpoint>3</Endpoint>','<Endpoint>2</Endpoint>');
 assert.equal(inspectXml229OriginalPortEvidence({originalXmlText:wrongEndpoint})
  .summary.uniqueTeeBranSourceCandidates,0);
 const wrongJunction=s.replace('<NodeNumber>2690</NodeNumber>',
  '<NodeNumber>2691</NodeNumber>');
 assert.equal(inspectXml229OriginalPortEvidence({originalXmlText:wrongJunction})
  .summary.uniqueTeeBranSourceCandidates,0);
 const inconsistent=s.replace('<NodeNumber>-1</NodeNumber><Position>100 0 60',
  '<NodeNumber>-1</NodeNumber><Position>100 0 60');
 assert.equal(inconsistent,s);
});

test('F19: original TEE port3 carrying named engineering source authority refuses cleanup and source witness',()=>{
 const s=teeCrossing().replace(
  '<NodeNumber>-1</NodeNumber><Position>100 0 60',
  '<NodeNumber>-1</NodeNumber><NodeName>ENGINEERING-PORT-3</NodeName><Position>100 0 60');
 assert.throws(()=>inspectXml229OriginalPortEvidence({originalXmlText:s}),
  {code:'TEE_BRANCH_PORT_AUTHORITY_CONFLICT'});
});
