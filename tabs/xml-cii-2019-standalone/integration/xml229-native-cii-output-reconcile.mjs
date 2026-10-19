/**
 * XML229 — second-path challenge of the ACTUAL CII bytes, the native
 * retained-edge witness, and all independently Worker-attested R2 owners.
 * Nonreleasing. No invented VALV/INST/FLAN or split mass representation.
 */
const HEX=/^[0-9a-f]{64}$/i;
const number=(value,code)=>{
  const n=Number(value);
  if(value===null||value===undefined||String(value).trim()===''||
     !Number.isFinite(n))deny(code);
  return n;
};
function deny(code){const e=new Error(code);e.code=code;e.retryable=false;throw e;}
const text=x=>String(x??'').trim();
const integer=(x,code)=>{
  const n=number(x,code);
  if(!Number.isSafeInteger(n))deny(code);
  return n;
};
async function sha(value){
  if(!globalThis.crypto?.subtle?.digest)deny('XML229_NATIVE_OUTPUT_CRYPTO_REQUIRED');
  const bytes=new TextEncoder().encode(value);
  const raw=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(raw)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function parseOutput(cii){
  const sections=new Map();let current=null;
  for(const line of cii.split(/\r?\n/)){
    if(line.startsWith('#$ ')){
      const name=line.slice(3).trim();
      if(!name||sections.has(name))deny('XML229_NATIVE_CII_SECTION_INVALID');
      current=[];sections.set(name,current);
    }else if(current&&line.trim())current.push(line);
  }
  for(const name of ['CONTROL','ELEMENTS','RIGID','UNITS'])
    if(!sections.has(name))deny('XML229_NATIVE_CII_SECTIONS_MISSING');
  const control=sections.get('CONTROL');
  if(control.length!==4)deny('XML229_NATIVE_CII_CONTROL_INVALID');
  const elementCount=integer(control[0].trim().split(/\s+/)[0],
    'XML229_NATIVE_CII_CONTROL_INVALID');
  const elements=sections.get('ELEMENTS'),rigid=sections.get('RIGID');
  if(elementCount<1||elements.length!==elementCount*15)
    deny('XML229_NATIVE_CII_ELEMENT_COUNT_DRIFT');
  if(!sections.get('UNITS').some(x=>x.trim()==='N.'))
    deny('XML229_NATIVE_CII_FORCE_UNITS_INVALID');
  const pointers=[],used=new Set();
  for(let i=0;i<elementCount;i++){
    const base=elements[i*15].trim().split(/\s+/);
    const pointerRow=elements[i*15+12].trim().split(/\s+/);
    if(base.length!==6||pointerRow.length!==6)
      deny('XML229_NATIVE_CII_ELEMENT_INVALID');
    const start=integer(base[0],'XML229_NATIVE_CII_NODE_INVALID');
    const end=integer(base[1],'XML229_NATIVE_CII_NODE_INVALID');
    const raw=integer(pointerRow[1],'XML229_NATIVE_CII_POINTER_INVALID');
    if(raw<0||raw>rigid.length)deny('XML229_NATIVE_CII_POINTER_INVALID');
    const slot=raw?raw-1:null;
    if(slot!==null){
      if(used.has(slot))deny('XML229_NATIVE_CII_POINTER_DUPLICATE');
      used.add(slot);
    }
    pointers.push({start,end,slot});
  }
  if(used.size!==rigid.length)deny('XML229_NATIVE_CII_RIGID_ORPHAN');
  const forces=rigid.map(v=>{
    const fields=v.trim().split(/\s+/);
    if(fields.length!==2)deny('XML229_NATIVE_CII_RIGID_INVALID');
    return number(fields[0],'XML229_NATIVE_CII_FORCE_INVALID');
  });
  return {pointers,forces};
}
function samePosition(raw,coords){
  if(typeof raw!=='string'||!Array.isArray(coords)||coords.length!==3)return false;
  const values=raw.replace(/,/g,' ').trim().split(/\s+/).map(Number);
  return values.length===3&&values.every((n,i)=>Number.isFinite(n)&&
    Number.isFinite(Number(coords[i]))&&Math.abs(n-Number(coords[i]))<=1e-7);
}
function matchesNative(to,edge,match){
  return to&&edge.branchName===match.branchName&&
    text(to.componentType)===text(match.componentType)&&
    text(to.componentRefNo)===text(match.componentRefNo)&&
    text(to.endpoint)===text(match.endpoint)&&
    text(to.sourceNodeNumber)===text(match.engineNodeNumber)&&
    samePosition(match.enginePosition,to.position);
}

/** No private owner details or raw CII text in returned aggregate. */
export async function reconcileXml229NonreleasingNativeOutput({
  transfer,witness,ciiText,
}={}){
  if(transfer?.schema!=='XML229.R2.OriginalPhysicalEngineInputTransfer.v1'||
     !transfer.complete||transfer.nativeCiiReleaseAuthorized!==false||
     !Array.isArray(transfer.matches)||transfer.matches.length<1||
     witness?.schema!=='XML229.NativeRetainedCandidateWitness.v1'||
     witness.evidenceKind!=='FIRST_PARTY_RUNTIME_NOT_INDEPENDENT_AUTHORITY'||
     witness.nativeCiiReleaseAuthorized!==false||
     witness.nativeCiiPhysicalSlotVerified!==false||
     witness.physicalMatch2ConsumptionVerified!==false||
     typeof ciiText!=='string'||!ciiText.trim()||
     !HEX.test(witness.engineInputSha256||'')||
     !HEX.test(witness.ciiSha256||'')||
     witness.engineInputSha256!==transfer.engineInputSha256)
    deny('XML229_NATIVE_WITNESS_UNQUALIFIED');
  const digest=await sha(ciiText);
  if(witness.ciiSha256!==digest)deny('XML229_NATIVE_CII_SHA_DRIFT');
  const {pointers,forces}=parseOutput(ciiText);
  if(!Array.isArray(witness.edges)||
     witness.modelElementCount!==pointers.length||
     witness.edges.length!==pointers.length||
     witness.modelRigidCount!==forces.length)
    deny('XML229_NATIVE_WITNESS_COUNT_DRIFT');
  const scale=number(witness.weightScale,'XML229_NATIVE_WITNESS_SCALE_INVALID');
  if(scale<=0)deny('XML229_NATIVE_WITNESS_SCALE_INVALID');
  for(let i=0;i<pointers.length;i++){
    const e=witness.edges[i],p=pointers[i];
    if(!e||e.nativeElementIndex!==i||
       e.ciiFromNode!==p.start||e.ciiToNode!==p.end||
       e.rigidRecordIndex!==p.slot||
       integer(e.from?.nativeNodeNumber,'XML229_NATIVE_WITNESS_NODE_INVALID')!==p.start||
       integer(e.to?.nativeNodeNumber,'XML229_NATIVE_WITNESS_NODE_INVALID')!==p.end)
      deny('XML229_NATIVE_WITNESS_ELEMENT_DRIFT');
    if(p.slot!==null){
      const claimed=number(e.rigidForce,'XML229_NATIVE_WITNESS_FORCE_INVALID');
      const emitted=forces[p.slot];
      const tolerated=Math.max(1e-4,Math.abs(emitted)*1e-5);
      if(Math.abs(claimed-emitted)>tolerated)
        deny('XML229_NATIVE_WITNESS_FORCE_DRIFT');
    }
  }
  const used=new Set(),byType={};
  let nativeRigidObserved=0,unresolved=0,observedKg=0,unresolvedKg=0;
  const reasons={};
  for(const row of transfer.matches){
    const kg=number(row?.engineWeightKg,'XML229_NATIVE_R2_WEIGHT_INVALID');
    if(kg<=0)deny('XML229_NATIVE_R2_WEIGHT_INVALID');
    const kind=text(row.componentType)||'UNSPECIFIED';
    const entry=byType[kind]||(byType[kind]={originalPhysicals:0,
      nativeRigidObserved:0,unresolved:0,observedKg:0,unresolvedKg:0});
    entry.originalPhysicals++;
    const possible=witness.edges.filter(edge=>matchesNative(edge.to,edge,row));
    let reason='';
    if(possible.length!==1)
      reason=possible.length?'AMBIGUOUS_RETAINED_EDGE':'RETAINED_OWNER_NOT_FOUND';
    else {
      const edge=possible[0];
      if(used.has(edge.nativeElementIndex))reason='DUPLICATE_NATIVE_PHYSICAL_OWNER';
      else if(edge.rigidRecordIndex===null)reason='NATIVE_MASS_RULE_REQUIRED';
      else {
        const force=forces[edge.rigidRecordIndex],expected=kg*scale;
        if(Math.abs(force-expected)>Math.max(1e-4,Math.abs(expected)*1e-5))
          deny('XML229_NATIVE_PHYSICAL_MASS_DRIFT');
        used.add(edge.nativeElementIndex);
        nativeRigidObserved++;entry.nativeRigidObserved++;
        observedKg+=kg;entry.observedKg+=kg;
      }
    }
    if(reason){
      reasons[reason]=(reasons[reason]||0)+1;
      unresolved++;entry.unresolved++;
      unresolvedKg+=kg;entry.unresolvedKg+=kg;
    }
  }
  if(nativeRigidObserved+unresolved!==transfer.originalPhysicalCount||
     transfer.originalPhysicalCount!==transfer.matches.length)
    deny('XML229_NATIVE_R2_CENSUS_DRIFT');
  return Object.freeze({
    schema:'XML229.NativeCandidateOutputReconciliation.v1',
    status:unresolved?'NATIVE_MASS_POLICY_OR_GEOMETRY_UNRESOLVED':
      'OBSERVED_RIGID_POINTERS_CHALLENGED_NOT_RELEASED',
    ciiSha256:digest,engineInputSha256:transfer.engineInputSha256,
    originalPhysicalCount:transfer.originalPhysicalCount,
    actualNativeElements:pointers.length,actualNativeRigidRecords:forces.length,
    nativeRigidObserved,unresolved,observedKg,unresolvedKg,reasons,byType,
    // First-party model witness + second-path CII readback are not an
    // independent accepted physical-to-native mass review/release.
    independentLineageAuthorVerified:false,
    physicalMatch2ConsumptionVerified:false,
    nativeCiiPhysicalSlotVerified:false,
    nativeCiiReleaseAuthorized:false,ciiDownloadAuthorized:false,
  });
}
