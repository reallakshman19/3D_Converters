/**
 * #1104 A04: bounded ORIGINAL R05 JSON-value → R02 typed source-node candidate.
 * This is a SOURCE-ONLY, noncredit preflight. Never engineeringReady, GC-PW
 * physical identity, Resolver CII, Preview/Weight, XML export or large-file DOM.
 * Only call with the complete, independently received selected fact generation;
 * direct R05→R02 substitution has no legitimate typed-node contract.
 * Full 30/90MB projection requires a separate durable/bounded paging adapter.
 */
import {resolveSourceOwners} from '../../adapters/ownership/source-ownership.mjs';

export class TypedOwnAttributesError extends TypeError {
  constructor(code,message){super(code+': '+message);this.name='TypedOwnAttributesError';this.code=code;}
}
const fail=(code,message)=>{throw new TypedOwnAttributesError(code,message);};
const positive=n=>Number.isSafeInteger(n)&&n>0;
const scalarTypes=new Set(['string','number','boolean','null']);
const ownedKeys=new Set(['OWNER_SITE','OWNER_ZONE','OWNER','SITE','ZONE_ID']);
const profiles=new Set(['staged-generic/v1','managed-stage-markup-rich/v2']);
const envelopes=new Set(['hierarchy','branches','objects']);
const encoder=new TextDecoder('utf-8',{fatal:true});
const parentPath=path=>path.slice(0,path.lastIndexOf('/'));
const directName=path=>path.slice(path.lastIndexOf('/')+1);
const own=(o,k)=>Object.hasOwn(o,k);
const validPointer=path=>typeof path==='string'&&path.length<=65536&&
  (path===''||(path[0]==='/'&&!/(~(?![01]))/.test(path)));
function exactScalar(fact,maxScalarBytes){
  if(!scalarTypes.has(fact.row.type)||!(fact.bytes instanceof Uint8Array)||
    !positive(fact.bytes.byteLength)||fact.bytes.byteLength>maxScalarBytes)
    fail('SCALAR_INVALID','original bounded scalar value required: '+fact.row.path);
  let parsed;
  try{parsed=JSON.parse(encoder.decode(fact.bytes));}
  catch{fail('SCALAR_INVALID','UTF-8/JSON scalar malformed at '+fact.row.path);}
  const type=parsed===null?'null':typeof parsed;
  if(type!==fact.row.type||(type==='number'&&!Number.isFinite(parsed)))
    fail('SCALAR_INVALID','source scalar parsed type disagrees with R05 at '+fact.row.path);
  return parsed;
}
function verifyProfile(rootProfile){
  if(rootProfile?.schema!=='lfj-root-profile/v1'||
    rootProfile.rightsBasis!=='STRUCTURAL_INSPECTION_ONLY'||
    !profiles.has(rootProfile.profileId)||
    rootProfile.capabilities?.read!==true||
    rootProfile.capabilities?.edit!==false||
    rootProfile.capabilities?.export!==false||
    !['array','typed-single','hierarchy','branches','objects'].includes(rootProfile.rootKind)||
    (envelopes.has(rootProfile.rootKind) && rootProfile.rootKey!==rootProfile.rootKind)||
    (!envelopes.has(rootProfile.rootKind) && rootProfile.rootKey!==null))
    fail('ROOT_PROFILE_REQUIRED','supported independently classified read-only original root required');
}
/**
 * @param {{facts:Array<{row,bytes,sourceOnly}>, receipt,rootProfile,maxRows?,maxScalarBytes?}} input
 * Note: this bounded preflight is NOT a signed source/profile attestation.
 * SourceSession + source-facts-receiver remain the authoritative input gate.
 */
export function projectTypedOwnAttributes({
  facts,receipt,rootProfile,maxRows=4096,maxScalarBytes=65536
}={}){
  if(!positive(maxRows)||maxRows>4096||!positive(maxScalarBytes)||maxScalarBytes>1048576)
    fail('SOURCE_LIMIT','preflight row and scalar resource budgets must be bounded');
  if(!Array.isArray(facts)||facts.length>maxRows)
    fail('SOURCE_LIMIT','bounded complete original source fact list required');
  if(receipt?.schema!=='LFJ.3D.ConsumerSourceFactsReceipt.v1'||
    receipt.complete!==true||receipt.engineeringReady!==false||
    receipt.rightsBasis!=='SOURCE_FACTS_ONLY'||
    !Number.isSafeInteger(receipt.selectedCount)||
    receipt.selectedCount!==facts.length||
    typeof receipt.sourceRefId!=='string'||!receipt.sourceRefId||
    typeof receipt.sourceSha256!=='string'||!receipt.sourceSha256||
    typeof receipt.sourceRevision!=='string'||!receipt.sourceRevision||
    typeof receipt.selectionDigest!=='string'||!receipt.selectionDigest||
    typeof receipt.jobId!=='string'||!receipt.jobId||
    typeof receipt.dependencyRevision!=='string'||!receipt.dependencyRevision||
    !positive(receipt.byteLength))
    fail('SOURCE_SCOPE_INCOMPLETE','whole verified source-facts receipt must cover exactly this selected set');
  verifyProfile(rootProfile);
  // Exact R05 source identity and parent chain, not engineering attributes.
  const pathMap=new Map(),ids=new Set();
  let previousOrdinal=-1;
  for(const fact of facts){
    const row=fact?.row;
    if(fact?.sourceOnly!==true||!row||
      row.kind!=='OPEN'||!validPointer(row.path)||
      row.sourceRefId!==receipt.sourceRefId||
      row.sourceSha256!==receipt.sourceSha256||
      row.sourceRevision!==receipt.sourceRevision||
      !Number.isSafeInteger(row.ordinal)||row.ordinal<=previousOrdinal||
      !Number.isSafeInteger(row.startByte)||row.startByte<0||
      row.startByte>=receipt.byteLength||
      typeof row.occurrenceId!=='string'||
      row.occurrenceId!==JSON.stringify([
        'lfj-json-value/v1',receipt.sourceRefId,receipt.sourceRevision,row.path
      ])||
      !(scalarTypes.has(row.type)||row.type==='object'||row.type==='array')||
      (scalarTypes.has(row.type)?!(fact.bytes instanceof Uint8Array):fact.bytes!==null)||
      pathMap.has(row.path)||ids.has(row.occurrenceId))
      fail('SOURCE_GRAPH_INVALID','original ordered typed R05 OPEN identity required');
    previousOrdinal=row.ordinal;
    if(row.path===''){
      if(row.parentId!==null||pathMap.size)
        fail('SOURCE_GRAPH_INVALID','exact source root OPEN required before descendants');
    }else{
      const parent=pathMap.get(parentPath(row.path))?.row;
      if(!parent||parent.occurrenceId!==row.parentId||
        !['array','object'].includes(parent.type))
        fail('SOURCE_GRAPH_INVALID','original parent relation absent or forged at '+row.path);
    }
    pathMap.set(row.path,fact);ids.add(row.occurrenceId);
  }
  const root=pathMap.get('')?.row;
  if(!root)fail('SOURCE_GRAPH_INVALID','complete original source root required');
  const typeWanted=rootProfile.rootKind==='array'?'array':'object';
  if(root.type!==typeWanted)
    fail('ROOT_PROFILE_REQUIRED','original root structure disagrees with classified root');
  function requiredObject(path){
    const row=pathMap.get(path)?.row;
    if(!row||row.type!=='object')
      fail('SOURCE_GRAPH_INVALID','typed child must be exact original object at '+path);
    return row;
  }
  function childrenOf(arrayPath){
    const arr=pathMap.get(arrayPath)?.row;
    if(!arr||arr.type!=='array')
      fail('SOURCE_GRAPH_INVALID','own typed collection must be an original array: '+arrayPath);
    const values=[];
    for(const [path,fact] of pathMap){
      if(path && parentPath(path)===arrayPath){
        const seg=directName(path);
        if(!/^(0|[1-9][0-9]*)$/.test(seg)||!Number.isSafeInteger(+seg))
          fail('SOURCE_GRAPH_INVALID','noncanonical JSON array ordinal: '+path);
        values.push([+seg,fact.row]);
      }
    }
    values.sort((a,b)=>a[0]-b[0]);
    for(let i=0;i<values.length;i++){
      if(values[i][0]!==i||values[i][1].type!=='object')
        fail('SOURCE_GRAPH_INVALID','typed collection is noncontiguous or contains nonnode value');
    }
    return values.map(x=>x[1].path);
  }
  const kind=rootProfile.rootKind;
  const base=kind==='array'?'':envelopes.has(kind)?'/'+kind:null;
  let roots;
  if(kind==='typed-single')roots=[''];
  else{
    if(base!==''&&!pathMap.has(base))
      fail('SOURCE_GRAPH_INVALID','declared envelope absent from source');
    roots=childrenOf(base);
  }
  const queue=roots.map(path=>({path,parentOccurrenceId:null}));
  const projected=[],seen=new Set();
  const sourceId=JSON.stringify([
    'lfj-source-candidate/v1',receipt.sourceRefId,receipt.sourceRevision
  ]);
  for(let i=0;i<queue.length;i++){
    const item=queue[i];
    const row=requiredObject(item.path);
    if(seen.has(row.occurrenceId))fail('SOURCE_GRAPH_INVALID','duplicate typed node');
    seen.add(row.occurrenceId);
    const direct=key=>pathMap.get(item.path+'/'+key);
    const t=direct('type'),n=direct('name');
    if(t?.row?.type!=='string'||n?.row?.type!=='string')
      fail('SOURCE_GRAPH_INVALID','typed node missing own type or name at '+item.path);
    const type=exactScalar(t,maxScalarBytes),name=exactScalar(n,maxScalarBytes);
    if(!type.trim()||!name.trim())
      fail('SOURCE_GRAPH_INVALID','nonempty typed node type/name required');
    const attrs=Object.create(null);
    const a=direct('attributes');
    if(a!==undefined){
      if(a.row.type!=='object')
        fail('SOURCE_GRAPH_INVALID','own attributes must be immediate original object');
      for(const [path,fact] of pathMap){
        if(parentPath(path)!==a.row.path)continue;
        const key=directName(path);
        if(!ownedKeys.has(key))continue;
        if(fact.row.type!=='string')
          fail('SCALAR_INVALID','recognized own owner attribute must be original string');
        attrs[key]=exactScalar(fact,maxScalarBytes);
      }
    }
    projected.push(Object.freeze({
      sourceId,occurrenceId:row.occurrenceId,
      parentOccurrenceId:item.parentOccurrenceId,
      type,name,attributes:Object.freeze(attrs),
      sourcePath:row.path,ordinal:row.ordinal,startByte:row.startByte
    }));
    const child=direct('children');
    if(child!==undefined){
      const paths=childrenOf(child.row.path);
      for(const path of paths)queue.push({path,parentOccurrenceId:row.occurrenceId});
    }
  }
  const resolved=resolveSourceOwners(projected);
  const nodes=Object.freeze(resolved.map((owner,i)=>Object.freeze({
    ...owner,sourcePath:projected[i].sourcePath,
    attributes:projected[i].attributes,
    ordinal:projected[i].ordinal,startByte:projected[i].startByte
  })));
  return Object.freeze({
    schema:'LFJ.3D.TypedOwnAttributesCandidate.v1',
    complete:true,sourceRefId:receipt.sourceRefId,
    sourceSha256:receipt.sourceSha256,sourceRevision:receipt.sourceRevision,
    selectionDigest:receipt.selectionDigest,jobId:receipt.jobId,
    dependencyRevision:receipt.dependencyRevision,sourceId,
    selectedCount:receipt.selectedCount,rootKind:kind,
    profileId:rootProfile.profileId,nodes,
    rightsBasis:'SOURCE_ONLY_PROJECTED_CANDIDATE',engineeringReady:false
  });
}
