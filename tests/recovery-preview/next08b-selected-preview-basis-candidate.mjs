/**
 * #212 NEXT-08B — isolated handoff candidate for B1 #133 and A3 #132.
 * Demonstrates a real selected original-root scope reaching the EXISTING
 * gc-pw/1.0 content-identity InputBasis without touching the production button.
 *
 * Test/qualification ONLY: sourceGeneration is caller-observed (not an IDB
 * attestation), master rows are not independently Owner-approved, scope is
 * not wired to a real Preview Worker, no engineering authority or release.
 */
import {
  createPreviewBasis, canonicalPreviewValue,
} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js';

export const CANDIDATE_SCOPE_SCHEMA='lfj.next08b.selected-original-scope.v1';
export const CANDIDATE_STATUS='TEST_ONLY_NOT_AUTHENTICATED_B1_PRODUCER';
const MASTER_KEYS=['linelist','material','pipingClass','weight'];
const HASH=/^[0-9a-f]{64}$/;
const requireField=(valid,code,message)=>{
  if(!valid)throw Object.assign(new Error(message),{code});
};
const object=value=>value!==null && typeof value==='object' && !Array.isArray(value)
  && Object.getPrototypeOf(value)===Object.prototype;
const nonempty=value=>typeof value==='string'&&value.trim().length>0;

function verifyJsonRoots(stagedJsonText) {
  const bytes=Buffer.byteLength(stagedJsonText,'utf8');
  requireField(bytes>0&&bytes<=32*1024*1024,'SOURCE_SIZE_UNSUPPORTED',
    'Original staged file exceeds bounded 32MiB source profile');
  let roots;
  try{roots=JSON.parse(stagedJsonText);}catch{throw Object.assign(
    new Error('Original staged JSON must parse'),{code:'SOURCE_JSON_INVALID'});}
  requireField(Array.isArray(roots)&&roots.length>0,'ROOT_PROFILE_UNSUPPORTED',
    'Selected indexed profile currently supports only a root array');
  for(const [ordinal,root] of roots.entries()){
    requireField(object(root),'ROOT_PROFILE_UNSUPPORTED',
      'Root ordinal '+ordinal+' must be an object');
    requireField((root.TYPE??root.Type??root.type)==='BRANCH',
      'ROOT_PROFILE_UNSUPPORTED','Only original flat BRANCH root profile is characterized');
    requireField(Array.isArray(root.children)&&root.children.length>0,
      'UNSUPPORTED_BRANCH_SHAPE','Branch needs its original nonempty children');
    const label=root.OWNER_ZONE;
    requireField(label===undefined||nonempty(label),
      'SOURCE_SCOPE_AMBIGUOUS','Direct Owner/zone label must be a nonempty string');
    for(const child of root.children){
      requireField(object(child)&&!Object.hasOwn(child,'children'),
        'UNSUPPORTED_BRANCH_SHAPE','Nested child containers are not characterized');
      requireField(!Object.hasOwn(child,'OWNER_ZONE'),
        'SOURCE_SCOPE_AMBIGUOUS','Nested OWNER_ZONE cannot masquerade as root selection authority');
    }
  }
  return roots;
}

/** Re-derive exact original-root ordinals from original JSON bytes, no ALL. */
export async function deriveSelectedOriginalManifest({
  xmlText, stagedJsonText, sourceId, sourceGeneration, requestedScopeId,
  config={}, sha256,
}){
  requireField(nonempty(sourceId)&&nonempty(xmlText)&&nonempty(stagedJsonText),
    'MISSING_ORIGINAL_FILE','Full original source XML/JSON and sourceId required');
  requireField(nonempty(sourceGeneration),'SOURCE_GENERATION_MISSING',
    'Committed source-generation identity must be supplied by existing A3 owner');
  requireField(nonempty(requestedScopeId)&&requestedScopeId!=='ALL'
    &&requestedScopeId!=='__ALL__','SCOPE_REQUIRED',
    'Non-ALL Owner/zone explicitly required, never fallback');
  requireField(typeof sha256==='function','HASH_PORT_MISSING','Hash function required');
  const roots=verifyJsonRoots(stagedJsonText);
  const orig=[];
  for(const [ordinal,root] of roots.entries()){
    const label=Object.hasOwn(root,'OWNER_ZONE')?root.OWNER_ZONE:'__UNSCOPED__';
    if(label===requestedScopeId)orig.push(ordinal);
  }
  requireField(orig.length>0,'UNKNOWN_SELECTED_SCOPE','Requested Owner/zone has no source roots');
  const sourceSha256=await sha256(stagedJsonText);
  const xmlSha256=await sha256(xmlText);
  requireField(HASH.test(sourceSha256)&&HASH.test(xmlSha256),
    'INVALID_ORIGINAL_SHA','Original source digests must be cryptographic SHA256');
  // Original source ordinals and dense display indices are intentionally
  // DIFFERENT. Do not silently renumber NodeNumber=-1 or source JSON paths.
  const rowMap=orig.map((originalRootOrdinal,selectedDisplayRootIndex)=>({
    originalRootOrdinal,
    originalRootPath:'$['+originalRootOrdinal+']',
    selectedDisplayRootIndex,
    selectedDisplayRootPath:'$['+selectedDisplayRootIndex+']',
    branchLabel:roots[originalRootOrdinal].OWNER_ZONE??'__UNSCOPED__',
  }));
  const manifest={
    schema:CANDIDATE_SCOPE_SCHEMA,sourceId,sourceSha256,xmlSha256,
    sourceGeneration,requestedScopeId,
    originalRootOrdinals:orig,
    originalRootPaths:rowMap.map(x=>x.originalRootPath),
    selectionDisplayMap:rowMap,
    configSha256:await sha256(canonicalPreviewValue(config)),
    rootCount:roots.length,
    selectedRootCount:orig.length,
  };
  const manifestDigest=await sha256(canonicalPreviewValue(manifest));
  requireField(HASH.test(manifestDigest),'INVALID_MANIFEST_HASH','Manifest digest invalid');
  return {manifest:{...manifest,manifestDigest},
    selectedRootRecords:orig.map(i=>roots[i])};
}

function requireSameManifest(actual,claim) {
  requireField(object(claim),'MISSING_SELECTED_MANIFEST',
    'A3 selected source manifest required before bridging Preview');
  const received=canonicalPreviewValue(claim);
  const expected=canonicalPreviewValue(actual);
  requireField(received===expected,'STALE_OR_FORGED_SCOPE_MANIFEST',
    'Full-file/hash/config/revision/ordered root mapping differs from the current original');
}

/**
 * Uses B1's unmodified actual InputBasis primitive but NEVER emits a trusted
 * engineering-ready issuer, GC-PW facts, approved Line List or selected UI.
 */
export async function buildSelectedPreviewBasisCandidate({
  xmlText, stagedJsonText, sourceId, sourceGeneration,
  requestedScopeId, claimedManifest, masters, config={}, overrides={},
  sha256,
}){
  const {manifest,selectedRootRecords}=await deriveSelectedOriginalManifest({
    xmlText,stagedJsonText,sourceId,sourceGeneration,requestedScopeId,config,sha256});
  requireSameManifest(manifest,claimedManifest);
  requireField(object(masters)&&
    canonicalPreviewValue(Object.keys(masters).sort())===canonicalPreviewValue(MASTER_KEYS),
    'FOUR_MASTERS_REQUIRED','Exactly four separately versioned original master sections required');
  for(const key of MASTER_KEYS){
    const entry=masters[key];
    requireField(object(entry)&&nonempty(entry.datasetId)
      &&(nonempty(entry.revision)||Number.isSafeInteger(entry.revision))
      &&Array.isArray(entry.rows)&&entry.rows.length>0
      &&object(entry.mapping),'MASTER_INPUT_INCOMPLETE',
      'Master '+key+' must have dataset/revision/nonempty rows/explicit mapping');
  }
  // Unmodified existing gc-pw/1.0 portable identity primitive signs neither
  // owner authority nor approved line keys. The caller-visible sealed metadata
  // below is intentionally marked NOT_AUTHENTICATED.
  const selectionRef='lfj-selected:'+manifest.requestedScopeId+':'+manifest.manifestDigest;
  const basis=await createPreviewBasis({
    domainId:'xml-cii/2019',sources:[{sourceId,mediaType:'application/xml',text:xmlText}],
    selection:[{sourceId,selectionRef}],
    stagedSource:stagedJsonText,masters,
    config:{...config,lfjOriginalScopeManifest:manifest},
    overrides,sha256,
  });
  requireField(basis.scope.length===1&&basis.scope[0].selectionRef===selectionRef
      &&!basis.scope[0].selectionRef.includes(':ALL:'),
    'SELECTION_NOT_BOUND','Current basis failed exact manifest scope binding');
  return {
    status:CANDIDATE_STATUS,basis,
    selectedManifest:manifest,
    selectedOriginalRootCount:selectedRootRecords.length,
    sourceOnly:true,engineeringReady:false,
    approvedMasterMapping:false,
    selectedPreviewWorkerConnected:false,
    issuedEngineeringAuthority:false,
    finalRunAuthorized:false,
    requiredB1Decisions:[
      'Owner-approved 385 logical Line List original file SHA, sheet, key/duplicate rule',
      'Exclusive #133 production writer and A3 indexed File/IDB revision attestation',
      'Real full physical GC-PW FactRecords and source/docs/Chromium integration',
    ],
  };
}
