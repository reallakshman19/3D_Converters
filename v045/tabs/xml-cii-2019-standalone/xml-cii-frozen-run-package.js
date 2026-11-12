/**
 * Explicit, read-only export of the CURRENT successful browser converter
 * boundary. Captures exact EnrichedXML handed to Python, not the originally
 * uploaded raw XML. Never infer missing Step 4 settings or engineering mass.
 */
import { ciiSha256 } from './xml-cii-final-property-reader.js';
import { parseFinalCiiRigidInventory } from './xml-cii-final-rigid-inventory.js';

export const FROZEN_CII_RUN_SCHEMA='xml-cii2019-current-converter-run/v1';
const fail=(detail)=>{throw Error('FROZEN_RUN_NOT_EXPORTABLE: '+detail);};
const text=(v)=>typeof v==='string'?v:null;
const frozenOptions=(v)=>v && typeof v==='object' && !Array.isArray(v) ?
  JSON.parse(JSON.stringify(v)) : null;

function verifyOptions(options){
  if(!options || !['first','all','none'].includes(options.coordsMode) ||
    typeof options.kgToNewton!=='boolean' ||
    typeof options.splitCondensedValveFlange!=='boolean' ||
    typeof options.useRestraintTypeBasedOnJson!=='boolean'){
    fail('Exact converter options are unavailable; do not substitute defaults.');
  }
}
function verifyInventory(inventory){
  if(!Array.isArray(inventory?.rows) || !Number.isSafeInteger(inventory?.declared?.elements) ||
    !Number.isSafeInteger(inventory?.declared?.rigids) ||
    inventory.rows.length!==inventory.declared.rigids ||
    inventory.rows.some((r,i)=>r.rigidPointer!==i+1)){
    fail('Final CII RIGID inventory is incomplete or not in serialized pointer order.');
  }
}
async function digest(textValue){
  return ciiSha256(textValue);
}
const byteLength=value=>new TextEncoder().encode(value).length;
const sourceKeys=['sourceId','fileName','minNode','maxNode'];
const recordKeys=[...sourceKeys,'byteLength','sha256'];
const sameSource=(a,b)=>Boolean(a && b && sourceKeys.every(key=>a[key]===b[key]));
const validSha=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const stagedFail=(code,sourceId)=>fail(code+': '+sourceId);

// Only metadata leaves the session. Hash the original UTF-8 text, not parsed JSON.
export async function captureModeBStagedSources(entries){
  const modeBStagedSources=await Promise.all((Array.isArray(entries)?entries:[])
    .map(async (entry)=>{
      const {sourceId,fileName,minNode,maxNode}=entry;
      const stagedJsonText=entry.stagedJsonText||'';
      return {sourceId,fileName,minNode,maxNode,byteLength:byteLength(stagedJsonText),
        sha256:await digest(stagedJsonText)};
    }));
  return {modeBStagedSources,
    modeBStagedSourcesSha256:await digest(JSON.stringify(modeBStagedSources))};
}

function verifyModeBMetadata(data,config){
  const rows=data.modeBStagedSources;
  const modeB=config.modeB;
  if(modeB===undefined && (rows===undefined || (Array.isArray(rows) && !rows.length)))return;
  if(modeB?.schema!=='xml-cii-mode-b-sources/v1' || !Array.isArray(modeB.sources) ||
    !modeB.sources.length || !Array.isArray(rows) || rows.length!==modeB.sources.length){
    fail('Mode B staged-source evidence is missing or does not cover every configured source.');
  }
  if(data.stagedJsonByteLength!==0)fail('Mode B staged data must be captured per source.');
  const ids=new Set();
  for(const [index,row] of rows.entries()){
    const source=modeB.sources[index];
    if(!row || typeof row.sourceId!=='string' || !row.sourceId.trim() || ids.has(row.sourceId) ||
      typeof row.fileName!=='string' || !row.fileName || !Number.isSafeInteger(row.minNode) ||
      !Number.isSafeInteger(row.maxNode) || row.minNode<=0 || row.maxNode<row.minNode ||
      !sameSource(row,source)){
      fail('Mode B staged-source identity or node range differs from support configuration.');
    }
    ids.add(row.sourceId);
    if(Object.keys(row).length!==recordKeys.length || !recordKeys.every(key=>Object.hasOwn(row,key)) ||
      !Number.isSafeInteger(row.byteLength) || row.byteLength<0 || !validSha(row.sha256)){
      fail('Mode B staged-source metadata is invalid or contains unexpected fields.');
    }
  }
}

async function verifyModeBSession(rows,sessionEntries){
  const entries=Array.isArray(sessionEntries)?sessionEntries:[];
  for(const row of rows||[]){
    const matches=entries.filter(entry=>entry?.sourceId===row.sourceId);
    if(!matches.length || (matches.length===1 && typeof matches[0].stagedJsonText!=='string'))
      stagedFail('MODE_B_STAGED_JSON_MISSING',row.sourceId);
    if(matches.length!==1 || !sameSource(row,matches[0]))
      stagedFail('MODE_B_STAGED_JSON_MISMATCH',row.sourceId);
    const staged=matches[0].stagedJsonText;
    // An explicit empty record is valid only when the Run recorded no bytes.
    if(staged==='' && row.byteLength>0)stagedFail('MODE_B_STAGED_JSON_MISSING',row.sourceId);
    if(byteLength(staged)!==row.byteLength || await digest(staged)!==row.sha256)
      stagedFail('MODE_B_STAGED_JSON_MISMATCH',row.sourceId);
    try { if(staged.trim())JSON.parse(staged); }
    catch { stagedFail('MODE_B_STAGED_JSON_INVALID',row.sourceId); }
  }
}

async function computeHashes(data,stagedJsonText){
  const [engineInputXmlSha256, originalCiiSha256, supportConfigSha256,
    stagedJsonSha256, effectiveOptionsSha256]=await Promise.all([
    digest(data.engineInputXml),digest(data.originalCii),
    digest(data.supportConfigJson),digest(stagedJsonText),
    digest(JSON.stringify(data.effectiveOptions)),
  ]);
  return {engineInputXmlSha256,originalCiiSha256,supportConfigSha256,
    stagedJsonSha256,effectiveOptionsSha256,
    ...(data.modeBStagedSources===undefined?{}:{
      modeBStagedSourcesSha256:await digest(JSON.stringify(data.modeBStagedSources))})};
}

export async function buildFrozenCiiRunPackage(result, inventory=null){
  const evidence=result?.finalRigidReviewEvidence;
  if(result?.ok!==true || typeof result.ciiText!=='string' ||
    !result.ciiText.length || result.ciiInputSource==='topofix' ||
    evidence?.sourceKind!=='xml'){
    fail('Requires a successful normal XML-to-CII browser conversion with frozen source evidence.');
  }
  const stagedJsonText=text(evidence.stagedJsonText??'');
  const data={
    engineInputXml:text(evidence.engineInputText),
    originalCii:result.ciiText,
    stagedJsonByteLength:stagedJsonText===null?null:byteLength(stagedJsonText),
    modeBStagedSources:Array.isArray(evidence.modeBStagedSources)
      ? evidence.modeBStagedSources.map(row=>({...row})) : evidence.modeBStagedSources,
    supportConfigJson:text(evidence.supportConfigJson),
    effectiveOptions:frozenOptions(evidence.effectiveOptions),
  };
  if(!data.engineInputXml || !data.supportConfigJson ||
    stagedJsonText===null || !evidence.effectiveSourceName ||
    !evidence.engineInputSha256 || !evidence.originalCiiSha256){
    fail('Exact effective EnrichedXML, support config, staged data or SHA custody is missing.');
  }
  verifyOptions(data.effectiveOptions);
  let parsed;
  try {
    parsed=JSON.parse(data.supportConfigJson);
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed))
      fail('Effective support config is not a JSON object.');
    if(stagedJsonText.trim())JSON.parse(stagedJsonText);
  } catch (error) {
    fail('Effective support config or staged JSON cannot be parsed: '+String(error?.message||error));
  }
  verifyModeBMetadata(data,parsed);
  const actualInventory=inventory||parseFinalCiiRigidInventory(data.originalCii);
  verifyInventory(actualInventory);
  const hash=await computeHashes(data,stagedJsonText);
  if(hash.engineInputXmlSha256!==evidence.engineInputSha256 ||
    hash.originalCiiSha256!==evidence.originalCiiSha256){
    fail('Frozen source or CII bytes differ from the recorded converter-run SHA-256.');
  }
  if((parsed.modeB!==undefined || evidence.modeBStagedSourcesSha256!==undefined) &&
    (!hash.modeBStagedSourcesSha256 || hash.modeBStagedSourcesSha256!==evidence.modeBStagedSourcesSha256)){
    fail('Mode B staged-source evidence differs from the recorded converter-run SHA-256.');
  }
  const weightScale=data.effectiveOptions.kgToNewton?10:1;
  if(Number(evidence.weightScale)!==weightScale){
    fail('Captured weight scale conflicts with effective converter options.');
  }
  return {
    schema:FROZEN_CII_RUN_SCHEMA,
    evidenceClass:'CURRENT_BROWSER_CONVERTER_BOUNDARY_NOT_HISTORICAL_REPLAY',
    status:'CURRENT_SOURCE_CII_CONFIG_HASH_VERIFIED_NO_PHYSICAL_MASS_APPROVAL',
    engineeringCaveat:'Zero XML Weight does not certify zero physical mass. This package does not approve or change masses.',
    originalRawUpload:'NOT_CAPTURED_BY_CONVERTER_BOUNDARY',
    importedMasterBinaryFiles:'NOT_CAPTURED_USE_OWNER_ORIGINALS_WITH_HASHES',
    currentRun:{
      ciiFilename:result.ciiName||evidence.originalCiiName||null,
      effectiveSourceName:evidence.effectiveSourceName,
      engineInputDigest:evidence.engineInputDigest||null,
      outputKind:'actual-original-emitted-CII',
      weightScale,
      elementCount:actualInventory.declared.elements,
      rigidCount:actualInventory.declared.rigids,
      zeroOrNegativeRigidCount:actualInventory.rows.filter(r=>r.weight<=0).length,
      ciiInputSource:result.ciiInputSource||'original',
      runParity:result.diagnostics?.runParityEvidence||null,
      runParityStats:result.diagnostics?.runParityStats||null,
    },
    hashes:hash,
    payloads:data,
  };
}

async function verifySingleStagedSession(data,config,hashes,session){
  const legacy=data.stagedJsonByteLength===undefined && typeof data.stagedJsonText==='string';
  if(!legacy && Object.hasOwn(data,'stagedJsonText'))fail('Unexpected staged JSON payload.');
  const length=legacy?byteLength(data.stagedJsonText):data.stagedJsonByteLength;
  if(!Number.isSafeInteger(length) || length<0 || !validSha(hashes.stagedJsonSha256))
    fail('Staged JSON metadata is missing or invalid.');
  // Mode B never uses the combined staged text. Its own sources are checked separately.
  const staged=config.modeB!==undefined?'':session?.stagedJsonText;
  if(typeof staged!=='string' || (staged==='' && length>0))stagedFail('STAGED_JSON_MISSING','single source');
  if(byteLength(staged)!==length || await digest(staged)!==hashes.stagedJsonSha256 ||
    (legacy && data.stagedJsonText!==staged))stagedFail('STAGED_JSON_MISMATCH','single source');
  try { if(staged.trim())JSON.parse(staged); }
  catch { stagedFail('STAGED_JSON_INVALID','single source'); }
  return staged;
}

/** Supply session-held staged text explicitly; a package is never its own staged-data oracle. */
export async function verifyFrozenCiiRunPackage(pkg,session={}){
  if(pkg?.schema!==FROZEN_CII_RUN_SCHEMA || !pkg?.payloads ||
    !pkg?.hashes || !pkg?.currentRun){
    fail('Package schema, hashes or captured payloads missing.');
  }
  const d=pkg.payloads;
  if(!text(d.engineInputXml) || !text(d.originalCii) ||
    text(d.supportConfigJson)===null)
    fail('One or more original byte payloads are missing.');
  verifyOptions(d.effectiveOptions);
  if(d.modeBStagedSources===undefined && pkg.hashes.modeBStagedSourcesSha256!==undefined){
    fail('Mode B staged-source payload is missing.');
  }
  let config;
  try {
    config=JSON.parse(d.supportConfigJson);
    if(!config || typeof config!=='object' || Array.isArray(config))
      fail('Support configuration is not an object.');
  } catch { fail('Package configuration is invalid.'); }
  const staged=await verifySingleStagedSession(d,config,pkg.hashes,session);
  const hashes=await computeHashes(d,staged);
  for(const [name,value]of Object.entries(hashes)){
    if(value!==pkg.hashes[name])fail('Package SHA-256 mismatch for '+name);
  }
  verifyModeBMetadata(d,config);
  await verifyModeBSession(d.modeBStagedSources,session?.modeBStagedSources);
  const inventory=parseFinalCiiRigidInventory(d.originalCii);
  verifyInventory(inventory);
  if(inventory.declared.elements!==pkg.currentRun.elementCount ||
    inventory.declared.rigids!==pkg.currentRun.rigidCount ||
    inventory.rows.filter(r=>r.weight<=0).length!==pkg.currentRun.zeroOrNegativeRigidCount ||
    pkg.currentRun.weightScale!==(d.effectiveOptions.kgToNewton?10:1)){
    fail('Current-run counts or weight scale differ from re-parsed CII.');
  }
  return {status:'PASS_FROZEN_CONVERTER_BOUNDARY',elements:inventory.declared.elements,
    rigids:inventory.declared.rigids,sourceSha256:hashes.engineInputXmlSha256,
    ciiSha256:hashes.originalCiiSha256};
}
