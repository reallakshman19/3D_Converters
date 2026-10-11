/**
 * NEXT-08B test-only executable selected original→B1 InputBasis handoff.
 * It must NOT be confused with selected LFJ indexed File/Worker UI activation,
 * approved 385-LineList mapping or engineering facts/Run authorization.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {
  deriveSelectedOriginalManifest,buildSelectedPreviewBasisCandidate,
  CANDIDATE_STATUS,
} from './next08b-selected-preview-basis-candidate.mjs';
import {createPreviewButtonBasis} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-button-session.js';

if(!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;
const sha256=async text=>createHash('sha256').update(text,'utf8').digest('hex');
const roots=()=>[
 {TYPE:'BRANCH',OWNER_ZONE:'A/Z1',name:'branch-A1',children:[
  {NodeNumber:-1,NodeName:'A:1',POS:'10 20 30'},
  {NodeNumber:10,NodeName:'A:2'}]},
 {TYPE:'BRANCH',OWNER_ZONE:'B/Z2',name:'branch-B1',children:[
  {NodeNumber:-1,NodeName:'B:1'}]},
 {TYPE:'BRANCH',OWNER_ZONE:'A/Z1',name:'branch-A2',children:[
  {NodeNumber:-1,NodeName:'A:3'}]},
 {TYPE:'BRANCH',OWNER_ZONE:'B/Z2',name:'branch-B2',children:[
  {NodeNumber:-1,NodeName:'B:2'}]},
];
const masters=()=>({
 linelist:{datasetId:'candidate-LL-not-approved',revision:'test-v1',
  rows:[{line:'A',class:'P100'},{line:'B',class:'P200'}],mapping:{lineKey:'line',class:'class'}},
 pipingClass:{datasetId:'candidate-PC',revision:'test-v1',
  rows:[{code:'P100',wall:5},{code:'P200',wall:6}],mapping:{class:'code'}},
 material:{datasetId:'candidate-MAT',revision:'test-v1',
  rows:[{code:'001',material:'A106'}],mapping:{material:'material'}},
 weight:{datasetId:'candidate-WT',revision:'test-v1',
  rows:[{part:'V1',weight:100}],mapping:{part:'part'}},
});
const seed=()=>({
 sourceId:'authenticity-not-yet-approved.xml',
 xmlText:'<PipeStressExport><Pipe><Branch><Branchname>/A/Z1</Branchname></Branch><Branch><Branchname>/B/Z2</Branchname></Branch></Pipe></PipeStressExport>',
 stagedJsonText:JSON.stringify(roots()),sourceGeneration:'test-generation-only',
 config:{units:'mm',mode:'A'},overrides:{},
 masters:masters(),sha256,
});
const candidate=async(s,requestedScopeId,claimOverride=null)=>{
 const selection={...s,requestedScopeId};
 const computed=await deriveSelectedOriginalManifest(selection);
 return buildSelectedPreviewBasisCandidate({...selection,
  claimedManifest:claimOverride??computed.manifest});
};
test('NEXT-08B-01 real GC-PW basis binds ordered noncontiguous original A/Z1 root selection',async()=>{
 const s=seed(),a=await candidate(s,'A/Z1'),b=await candidate(s,'B/Z2');
 assert.equal(a.status,CANDIDATE_STATUS);
 assert.deepEqual(a.selectedManifest.originalRootOrdinals,[0,2]);
 assert.deepEqual(b.selectedManifest.originalRootOrdinals,[1,3]);
 assert.deepEqual(a.selectedManifest.originalRootPaths,['$[0]','$[2]']);
 assert.deepEqual(a.selectedManifest.selectionDisplayMap.map(x=>x.selectedDisplayRootPath),['$[0]','$[1]']);
 assert.deepEqual(b.selectedManifest.originalRootPaths,['$[1]','$[3]']);
 assert.notEqual(a.selectedManifest.manifestDigest,b.selectedManifest.manifestDigest);
 assert.notEqual(a.basis.basisId,b.basis.basisId);
 assert.notEqual(a.basis.selectionSha256,b.basis.selectionSha256);
 assert.deepEqual(a.basis.scope,[{sourceId:s.sourceId,
  selectionRef:'lfj-selected:A/Z1:'+a.selectedManifest.manifestDigest}]);
 assert.equal(a.basis.stagedSourceSha256,await sha256(s.stagedJsonText),
  'Must bind ORIGINAL full staged JSON, not selected fragment');
 assert.equal(a.basis.sourceRefs[0].sha256,await sha256(s.xmlText),
  'Must bind ORIGINAL full XML, not filtered selected XML');
 assert.equal(a.selectedOriginalRootCount,2);
 assert.equal(a.sourceOnly,true);assert.equal(a.engineeringReady,false);
 assert.equal(a.approvedMasterMapping,false);
 assert.equal(a.issuedEngineeringAuthority,false);
 assert.equal(a.finalRunAuthorized,false);
 console.log('NEXT08B_SOURCE_SCOPE_BASIS '+JSON.stringify({
  schema:a.selectedManifest.schema,sourceSha256:a.selectedManifest.sourceSha256,
  xmlSha256:a.selectedManifest.xmlSha256,originalRootOrdinals:a.selectedManifest.originalRootOrdinals,
  selectedDisplayPaths:a.selectedManifest.selectionDisplayMap.map(x=>x.selectedDisplayRootPath),
  distinctZoneBasisId:a.basis.basisId!==b.basis.basisId,
  totalOriginalRootCount:4,selectedRoots:2,approvedLineList385:'NOT_ATTESTED',
  productPreview:'NOT_CONNECTED',status:a.status,
 }));
});
test('NEXT-08B-02 legacy real Preview button still selects ALL, candidate does not pretend integration',async()=>{
 const s=seed();
 const actual=await createPreviewButtonBasis({
  xmlText:s.xmlText,stagedJsonText:s.stagedJsonText,sourceId:s.sourceId,
  config:{
   linelist:{masterRows:masters().linelist.rows,fieldMap:{line:'line'}},
   pipingClass:{masterRows:masters().pipingClass.rows,fieldMap:{}},
   material:{mapRows:masters().material.rows},
   weight:{masterRows:masters().weight.rows},overrides:{},
  },
  selection:[{sourceId:s.sourceId,selectionRef:'A/Z1'}],
 });
 const portable=await candidate(s,'A/Z1');
 assert.deepEqual(actual.scope,[{sourceId:s.sourceId,selectionRef:'ALL'}],
  'Actual current production button is not wired to selected-manifest basis');
 assert.notDeepEqual(actual.scope,portable.basis.scope);
 assert.equal(portable.selectedPreviewWorkerConnected,false);
});
test('NEXT-08B-02 no ALL or unknown Owner zone or missing source generation fallback',async()=>{
 const s=seed();
 for(const bad of ['ALL','__ALL__',''])await assert.rejects(candidate(s,bad),
  {code:'SCOPE_REQUIRED'});
 await assert.rejects(candidate(s,'NONEXISTENT/Z1'),{code:'UNKNOWN_SELECTED_SCOPE'});
 await assert.rejects(candidate({...s,sourceGeneration:''},'A/Z1'),
  {code:'SOURCE_GENERATION_MISSING'});
});
test('NEXT-08B-02 stale file, revision, config and tampered original-path manifest all fail closed',async()=>{
 const s=seed(),baseline=(await deriveSelectedOriginalManifest({...s,requestedScopeId:'A/Z1'})).manifest;
 const changed=roots();changed[2].children[0].NodeName='ALTERED';
 const tampered={...s,stagedJsonText:JSON.stringify(changed)};
 await assert.rejects(buildSelectedPreviewBasisCandidate({
  ...tampered,requestedScopeId:'A/Z1',claimedManifest:baseline}),
  {code:'STALE_OR_FORGED_SCOPE_MANIFEST'});
 await assert.rejects(buildSelectedPreviewBasisCandidate({
  ...s,sourceGeneration:'new-revision',requestedScopeId:'A/Z1',claimedManifest:baseline}),
  {code:'STALE_OR_FORGED_SCOPE_MANIFEST'});
 await assert.rejects(buildSelectedPreviewBasisCandidate({
  ...s,config:{units:'in',mode:'A'},requestedScopeId:'A/Z1',claimedManifest:baseline}),
  {code:'STALE_OR_FORGED_SCOPE_MANIFEST'});
 await assert.rejects(buildSelectedPreviewBasisCandidate({
  ...s,requestedScopeId:'A/Z1',claimedManifest:{
   ...baseline,originalRootOrdinals:[2,0]}}),
  {code:'STALE_OR_FORGED_SCOPE_MANIFEST'});
 await assert.rejects(buildSelectedPreviewBasisCandidate({
  ...s,requestedScopeId:'A/Z1',claimedManifest:{
   ...baseline,selectionDisplayMap:[...baseline.selectionDisplayMap,baseline.selectionDisplayMap[0]]}}),
  {code:'STALE_OR_FORGED_SCOPE_MANIFEST'});
});
test('NEXT-08B-02 unsupported root-wrapper, nested owner spoof and flat-branch constraints reject',async()=>{
 const s=seed();
 await assert.rejects(candidate({...s,stagedJsonText:JSON.stringify({children:roots()})},'A/Z1'),
  {code:'ROOT_PROFILE_UNSUPPORTED'});
 const nested=roots();nested[0].children[0].OWNER_ZONE='B/Z2';
 await assert.rejects(candidate({...s,stagedJsonText:JSON.stringify(nested)},'A/Z1'),
  {code:'SOURCE_SCOPE_AMBIGUOUS'});
 const rootOnly=roots();delete rootOnly[0].OWNER_ZONE;
 rootOnly[0].children[0].OWNER_ZONE='A/Z1';
 await assert.rejects(candidate({...s,stagedJsonText:JSON.stringify(rootOnly)},'A/Z1'),
  {code:'SOURCE_SCOPE_AMBIGUOUS'});
 const deep=roots();deep[0].children[0].children=[{NodeNumber:-1}];
 await assert.rejects(candidate({...s,stagedJsonText:JSON.stringify(deep)},'A/Z1'),
  {code:'UNSUPPORTED_BRANCH_SHAPE'});
});
test('NEXT-08B-02 original repeated -1 stays distinct across roots, no fabricated renumbering',async()=>{
 const s=seed(),c=await candidate(s,'A/Z1');
 assert.equal(JSON.parse(s.stagedJsonText)[0].children[0].NodeNumber,-1);
 assert.equal(JSON.parse(s.stagedJsonText)[2].children[0].NodeNumber,-1);
 assert.deepEqual(c.selectedManifest.originalRootOrdinals,[0,2]);
 assert.notEqual(c.selectedManifest.selectionDisplayMap[0].originalRootPath,
  c.selectedManifest.selectionDisplayMap[1].originalRootPath);
 assert.equal(c.basis.stagedSourceSha256,await sha256(s.stagedJsonText));
});
test('NEXT-08B-02 four-master missing/empty/changed content blocks admission or changes basis',async()=>{
 const s=seed(),a=await candidate(s,'A/Z1');
 const missing=seed();delete missing.masters.linelist;
 await assert.rejects(candidate(missing,'A/Z1'),{code:'FOUR_MASTERS_REQUIRED'});
 const empty=seed();empty.masters.linelist.rows=[];
 await assert.rejects(candidate(empty,'A/Z1'),{code:'MASTER_INPUT_INCOMPLETE'});
 const changed=seed();changed.masters.linelist.rows[1].class='CHANGED';
 const b=await candidate(changed,'A/Z1');
 assert.notEqual(a.basis.masters.linelist.sha256,b.basis.masters.linelist.sha256);
 assert.notEqual(a.basis.basisId,b.basis.basisId);
 assert.equal(a.basis.masters.linelist.rowCount,b.basis.masters.linelist.rowCount);
 assert.equal(b.approvedMasterMapping,false,
  'Content identity alone does not create authorized 385-line mapping');
});
