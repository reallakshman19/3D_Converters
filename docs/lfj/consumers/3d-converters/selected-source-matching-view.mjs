/**
 * A3 T05c: reconstruct the legacy *selected* branch tree from previously
 * source/HEAD/page-digest-qualified facts and a separately reattested original
 * Blob/catalog root manifest. No independent match/CSV engine or export right.
 *
 * The current B0 projection can prove flat BRANCH→direct-leaf occurrences
 * only. Keep the complete authenticated fact census, then select before
 * invoking the existing DTXR matching/CSV implementation.
 */
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const aliases=new Set(['JSONNODENO','JSON_NODE_NO','NODE_NO','NODENUMBER',
  'NODE','SEQ','SEQUENCE']);
function explicitNodeId(evidence){
  if(!evidence||typeof evidence!=='object')
    fail('SCOPE_EVIDENCE_MISSING','original matching evidence required');
  for(const obj of [evidence.attributes,evidence.direct]){
    for(const [key,value] of Object.entries(obj||{}))
      if(aliases.has(key.toUpperCase()) &&
         value!==null && value!==undefined && String(value).trim()!=='')
        return true;
  }
  return false;
}

/** The source manifest must be generated from actual original source bytes. */
export function reconstructVerifiedSelectedMatchingView({
  completeBranches,authenticatedFacts,rootManifest
}={}){
  if(rootManifest?.schema!=='LFJ.A3.OriginalToSelectedRootManifest.v1' ||
     rootManifest.sourceOnly!==true ||
     rootManifest.engineeringReady!==false ||
     rootManifest.downloadAuthorized!==false ||
     !/^[a-f0-9]{64}$/.test(rootManifest.selectionDigestSha256||'') ||
     !Array.isArray(rootManifest.selected) ||
     !Array.isArray(rootManifest.census) ||
     !Object.isFrozen(rootManifest.selected) ||
     !Object.isFrozen(rootManifest.census) ||
     rootManifest.originalRootCount!==rootManifest.census.length ||
     rootManifest.selectedRootCount!==rootManifest.selected.length ||
     !Array.isArray(completeBranches) ||
     completeBranches.length!==rootManifest.originalRootCount ||
     !Array.isArray(authenticatedFacts))
    fail('SCOPE_MANIFEST_INVALID',
      'source-verified complete roots and immutable selected scope are required');
  const factByPath=new Map();
  for(const fact of authenticatedFacts){
    if(!fact||typeof fact.path!=='string'||factByPath.has(fact.path))
      fail('SCOPE_SOURCE_PROVENANCE','source fact path duplicate or invalid');
    factByPath.set(fact.path,fact);
  }
  let localSequence=0,lastOriginalRoot=-1;
  const selected= rootManifest.selected.map((entry,localIndex)=>{
    const rootIndex=entry?.originalRootIndex;
    const proof=rootManifest.census[rootIndex];
    const original=completeBranches[rootIndex];
    if(!Number.isSafeInteger(rootIndex) || rootIndex<=lastOriginalRoot ||
       entry.selectedIndex!==localIndex ||
       entry.displayPath!=='$['+localIndex+']' ||
       entry.originalPath!=='$['+rootIndex+']' ||
       proof?.ordinal!==entry.originalOrdinal ||
       proof?.originalPath!==entry.originalPath ||
       proof?.name!==entry.branchName ||
       (rootManifest.requestedScopeId!=='__ALL__' &&
        proof.scopeId!==rootManifest.requestedScopeId) ||
       original?.type!=='BRANCH' || original.name!==entry.branchName ||
       !Array.isArray(original.children) || !original.children.length)
      fail('SCOPE_ROOT_PROVENANCE',
        'selected roots disagree with the verified original source and matching tree');
    lastOriginalRoot=rootIndex;
    localSequence++; // legacy walkStaged counts each selected branch object.
    const children=original.children.map((node,childIndex)=>{
      localSequence++; // and then each leaf in local selected preorder.
      const path=entry.originalPath+'.children['+childIndex+']';
      const fact=factByPath.get(path);
      if(!fact || !node || typeof node!=='object' ||
         !fact.matchingEvidence || !Number.isSafeInteger(fact.sourceOrdinal))
        fail('SCOPE_FACT_PROVENANCE',
          'selected domain leaf lacks original source-backed matching fact');
      const attrs={...(node.attributes||{})};
      // The normal complete-source reconstruction records global fallback IDs.
      // Legacy selection instead numbers only the visited selected stage objects.
      // Explicit ORIGINAL node aliases must win over either fallback sequence.
      if(!explicitNodeId(fact.matchingEvidence))
        attrs.JsonNodeNo=String(localSequence);
      return {...node,attributes:attrs};
    });
    return {...original,children};
  });
  if(selected.length===0)
    fail('SCOPE_EMPTY','selected original branch scope has no matching roots');
  return selected;
}
