// P3-A Preview-only actual-button adapter. Engineering resolution stays in
// the P2.2 Worker; old table remains the presentation/editor authority.
import {createPreviewBasis} from './xml-cii-adapted-preview-facts-basis.js';
import {openActualPreviewSourceFactPages,installActualPreviewSourceFactPanel}
  from './xml-cii-adapted-preview-facts-browser-read.js';
import {createXmlCiiPreviewJobController} from './xml-cii-adapted-preview-facts-job-controller.js';
import {startAttestedModeBPreviewWorkerSession}
  from './xml-cii-adapted-preview-facts-modeb-session.js';
import {assertBasisDigest,assertContentDigest,digestUtf8,digestCanonical,canonicalJson}
  from '../../../contracts/gc-pw-v1/contract.mjs';

const jobs=new WeakMap();
const esc=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fail=(code,message)=>Object.assign(new Error(message),{code});
const cryptoSha256=async(text)=>{
  if(!globalThis.crypto?.subtle)throw fail('CRYPTO_UNAVAILABLE','SHA-256 is required');
  const raw=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(raw)].map(n=>n.toString(16).padStart(2,'0')).join('');
};
function masterRows(input){return Array.isArray(input)?input:[];}
function master(name,section,rows,mapping={}) {
  return {datasetId:String(section?.datasetId||name),
    revision:section?.revision??'source-session-v1',
    rowCount:rows.length,rows,mapping};
}
/** Bind actual full source + mapped masters + runtime override contents. */
export async function createPreviewButtonBasis({xmlText,config,stagedJsonText,sourceId}) {
  if(typeof sourceId!=='string'||!sourceId.trim())throw fail('SOURCE_ID_REQUIRED','Loaded XML source identity is missing');
  if(typeof xmlText!=='string'||!xmlText.trim())throw fail('XML_REQUIRED','XML source text missing');
  if(!config||typeof config!=='object'||Array.isArray(config))throw fail('CONFIG_REQUIRED','Preview config missing');
  const line=masterRows(config.linelist?.masterRows);
  const piping=masterRows(config.pipingClass?.masterRows);
  const material=masterRows(config.material?.mapRows);
  const weight=masterRows(config.weight?.masterRows);
  return createPreviewBasis({
    domainId:'xml-cii/2019',
    sources:[{sourceId,mediaType:'application/xml',text:xmlText}],
    selection:[{sourceId,selectionRef:'ALL'}],
    stagedSource:stagedJsonText||null,
    masters:{
      linelist:master('linelist',config.linelist,line,config.linelist?.fieldMap||{}),
      pipingClass:master('pipingClass',config.pipingClass,piping,config.pipingClass?.fieldMap||{}),
      material:master('material',config.material,material,config.material?.fieldMap||{}),
      weight:master('weight',config.weight,weight,config.weight?.fieldMap||{}),
    },
    config,overrides:config.overrides||{},sha256:cryptoSha256,
  });
}
async function resolveStaged(options,config) {
  const supplied=typeof options.resolveStagedJsonText==='function'
    ? await options.resolveStagedJsonText(config) : options.stagedJsonText;
  if(supplied&&typeof supplied==='object')
    return {text:String(supplied.text??supplied.stagedJsonText??''),
      label:String(supplied.label??supplied.sourceLabel??'')};
  return {text:String(supplied??''),label:String(options.stagedSourceLabel??'')};
}
/**
 * A selected LFJ Owner/zone is NOT equivalent to a GC-PW content hash.
 * Until B1 consumes the A3 verified original-root manifest and dispatches
 * only selected engineering sources to its Worker, never silently run ALL.
 * The absent/default ALL case preserves the established Mode A behaviour.
 */
function requestedOriginalScope(options) {
  const keys=['selectedScopeId','requestedOwnerZoneScopeId','jsonTraceScopeId'];
  const supplied=[];
  for(const key of keys) {
    if(!Object.prototype.hasOwnProperty.call(options||{},key))continue;
    const value=options[key];
    if(typeof value!=='string'||!value.trim())
      throw fail('PREVIEW_SCOPE_INVALID','Requested original Owner/zone scope '+key+' must be a nonempty string');
    supplied.push(value.trim()==='ALL'?'__ALL__':value.trim());
  }
  if(new Set(supplied).size>1)
    throw fail('PREVIEW_SCOPE_CONFLICT','Multiple original Owner/zone selection claims disagree');
  return supplied[0]||'__ALL__';
}

function sourceScope(host,config,options) {
  const sourceId=String(options?.sourceId||host?.dataset?.mcPreviewSourceId||'').trim();
  const manifest=options?.modeBManifest||options?.sourceOrderManifest||config?.modeBManifest||null;
  const advertised=String(options?.previewSourceMode||options?.sourceMode||config?.sourceMode||'').toUpperCase();
  const explicitB=advertised==='B'||config?.modeB?.enabled===true||config?.modeB===true;
  const mode=explicitB||manifest?'B':'A';
  const requestedScopeId=requestedOriginalScope(options);
  if(requestedScopeId!=='__ALL__') {
    throw fail('PREVIEW_SELECTED_SCOPE_NOT_INTEGRATED',
      'Original Owner/zone '+requestedScopeId+' is selected, but this Preview Worker is not bound to an A3 verified selected-source manifest. Select All to run unfiltered Preview, or complete the authenticated selected Preview integration.');
  }
  if(mode==='B'&&!manifest)throw fail('MODE_B_MANIFEST_REQUIRED','Mode B source order/offset manifest required');
  // Mode B requires all original XML files, authenticated original->combined
  // mapping and content digests. Only the B3A+B3B1 attested Worker path can run.
  if(mode==='B')return {mode:'B',sourceId,manifest,selection:null};
  return {mode:'A',sourceId,manifest:null,selection:null};
}
function notice(host,{title,message='',code='',progress=null,showCancel=false,retry=null,cancel=null}) {
  host.innerHTML=`<div role="status" data-mc-preview-job-state class="model-converters-workflow-detail-note" style="padding:15px;border:1px solid #64748b;">
    <strong>${esc(title)}</strong>${code?` <code>${esc(code)}</code>`:''}
    ${message?`<div style="margin-top:6px;">${esc(message)}</div>`:''}
    ${progress?`<div data-mc-preview-job-progress style="margin-top:6px;">${esc(progress)}</div>`:''}
    <div style="display:flex;gap:8px;margin-top:10px;">
    ${showCancel?'<button type="button" data-mc-preview-job-cancel>Cancel</button>':''}
    ${retry?'<button type="button" data-mc-preview-job-retry>Retry Preview</button>':''}
    </div></div>`;
  if(cancel)host.querySelector('[data-mc-preview-job-cancel]')?.addEventListener('click',cancel,{once:true});
  if(retry)host.querySelector('[data-mc-preview-job-retry]')?.addEventListener('click',retry,{once:true});
}
/**
 * Actual Build/Rebuild Preview callback: never fire-and-forget. Cancellation
 * also fences an unresolved staged-source provider promise.
 */
export async function runPreviewButtonSession({
  host,rootEl,xmlText,config,options={},renderResult,
}={}) {
  if(!host||typeof renderResult!=='function')throw fail('INVALID_PREVIEW_HOST','Preview renderer port missing');
  const previous=jobs.get(host);
  if(previous){previous.cancelled=true;previous.controller?.cancel('Superseded Preview request');}
  const session={cancelled:false,controller:null};
  jobs.set(host,session);
  const current=()=>!session.cancelled&&jobs.get(host)===session&&rootEl?.querySelector('#mc-preview-table-host')===host;
  const cancel=()=>{
    session.cancelled=true;
    session.controller?.cancel('User cancelled');
    if(jobs.get(host)===session)notice(host,{title:'Preview cancelled',code:'CANCELLED',
      message:'Inputs and overrides remain unchanged.',retry:()=>void runPreviewButtonSession({
        host,rootEl,xmlText,config,options,renderResult})});
  };
  const retry=()=>void runPreviewButtonSession({host,rootEl,xmlText,config,options,renderResult});
  const begun=Date.now();
  try {
    // Verify explicit selected scope BEFORE reading a large staged JSON File
    // or starting the GC-PW Worker; unsupported non-ALL is never expanded to ALL.
    const scope=sourceScope(host,config,options);
    notice(host,{title:'Resolving staged source…',showCancel:true,cancel});
    let staged;
    try{staged=await resolveStaged(options,config);}
    catch(error){throw fail('STAGED_SOURCE_FAILED',String(error?.message||error));}
    if(!current())return null;
    if(scope.mode==='B'){
      notice(host,{title:'Authenticating original Mode B XML files…',
        message:'Checking every original file, combined XML, source order and master revision.',
        showCancel:true,cancel});
      // Original files must come from the authenticated importer/caller. Do not
      // infer lineage from the combined XML, filenames or duplicated branch names.
      const originals=typeof options.resolveModeBOriginalSources==='function'
        ? await options.resolveModeBOriginalSources(config,scope)
        : options.modeBOriginalSources;
      if(!current())return null;
      if(!Array.isArray(originals)||originals.length<2)
        throw fail('MODE_B_ORIGINAL_SOURCES_REQUIRED',
          'Mode B Preview needs all original XML files. Re-import originals, then retry.');
      const ports={assertBasisDigest,assertContentDigest,digestUtf8,digestCanonical,canonicalJson};
      const sessionJob=await startAttestedModeBPreviewWorkerSession({
        originalSources:originals,
        combinedSource:{sourceId:scope.sourceId,xmlText},
        manifest:scope.manifest,config,stagedJsonText:staged.text,
        ports,requestId:`modeb-preview-${begun}-${crypto.randomUUID?.()||'local'}`,
        onProgress:(state)=>{
          if(!current())return;
          notice(host,{title:state.state==='queued'?'Mode B Preview queued…':
            state.state==='running'?'Building Mode B Preview in Worker…':'Mode B Preview…',
            progress:`${state.stage||'source-custody'} · ${state.completed}/${state.total}`,
            message:'Original source identity remains separately attested.',
            showCancel:true,cancel});
        },
      });
      if(!current()){sessionJob.cancel();return null;}
      session.controller=sessionJob;
      const committed=await sessionJob.promise;
      if(!current())return null;
      const rendered=await renderResult(committed.result,staged);
      if(!current())return null;
      installActualPreviewSourceFactPanel(host,committed.sourcePages);
      host.__xmlCiiPreviewOriginalOccurrences=committed.result.sourceOccurrences;
      host.dataset.mcPreviewBasisId=committed.basis.basisId;
      host.dataset.mcPreviewSourceMode='B';
      return rendered;
    }
    notice(host,{title:'Checking input and master revisions…',showCancel:true,cancel});
    const basis=await createPreviewButtonBasis({
      xmlText,config,stagedJsonText:staged.text,sourceId:scope.sourceId});
    if(!current())return null;
    const controller=createXmlCiiPreviewJobController({
      verifyBasis:async(currentBasis,spec)=>{
        const actual=await createPreviewButtonBasis({
          xmlText:spec.input.xmlText,config:spec.input.config,
          stagedJsonText:spec.input.stagedJsonText,sourceId:spec.input.scope.sourceId});
        return actual.basisId===currentBasis.basisId;
      },
    });
    session.controller=controller;
    controller.subscribe(state=>{
      if(!current()||!['queued','running'].includes(state.state))return;
      notice(host,{title:state.state==='queued'?'Preview queued…':'Building preview in Worker…',
        progress:`${state.stage||'preparing'} · ${state.completed}/${state.total}`,
        showCancel:true,cancel});
    });
    const input={xmlText,config,stagedJsonText:staged.text,scope};
    const handle=controller.start({requestId:`preview-${begun}-${basis.basisId.slice(0,12)}`,
      basis,input});
    const result=await handle.promise;
    if(!current())return null;
    // A user edit made during worker execution must never be hidden by a stale result.
    const liveBasis=await createPreviewButtonBasis({
      xmlText,config,stagedJsonText:staged.text,sourceId:scope.sourceId});
    if(liveBasis.basisId!==basis.basisId)throw fail('STALE_INPUT_BASIS',
      'Source/master/overrides changed while Preview was computing. Retry with current inputs.');
    if(!current())return null;
    const sourcePages=await openActualPreviewSourceFactPages({
      basis,xmlText,sourceId:scope.sourceId,sourceOccurrences:result.sourceOccurrences,mode:scope.mode});
    if(!current())return null;
    const rendered=await renderResult(result,staged);
    if(!current())return null;
    installActualPreviewSourceFactPanel(host,sourcePages);
    host.__xmlCiiPreviewOriginalOccurrences=result.sourceOccurrences;
    host.dataset.mcPreviewBasisId=basis.basisId;
    return rendered;
  }catch(error) {
    if(!current())return null;
    const code=String(error?.code||'PREVIEW_BUILD_FAILED');
    notice(host,{title:'Preview failed',code,
      message:String(error?.message||error),retry});
    return null;
  }
}
