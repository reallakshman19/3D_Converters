import { createElement } from './xml-cii-adapted-dom.js';
import { currentResolverTraceRevision, updateWorkflowState } from './xml-cii-adapted-state.js';
import { beginLatestOperation } from './xml-cii-adapted-latest-operation.js';
import { cancelIndexedBuild } from './xml-cii-adapted-lfj-build-lifecycle.js';
import { discoverIndexedOriginalScopes } from './xml-cii-adapted-lfj-original-scope-discovery.js';
import {
  ALL_SCOPE_ID,
  buildJsonHierarchyScopeIndex,
  jsonHierarchyScopeOptions,
} from '../xml-cii-json-hierarchy-scope.js';

const activeDiscovery=new WeakMap();
export function cancelIndexedScopeDiscovery(stateRef){
  activeDiscovery.get(stateRef)?.abort();
  activeDiscovery.delete(stateRef);
  if(stateRef)beginLatestOperation(stateRef,'indexed-scope-discovery');
}

// Source-only scan is on-demand: no original full JSON goes through stagedJsonText.
// Result binds only to this exact File object and is not a Build/CSV permission.
export async function discoverIndexedScopeChoicesFromUi(stateRef,render=()=>{},
    discover=discoverIndexedOriginalScopes){
  const state=stateRef?.current;
  if(state?.resolverSourceMode!=='lfj-indexed-preview'||
     !(state.stagedJsonFile instanceof Blob))return null;
  cancelIndexedScopeDiscovery(stateRef);
  const file=state.stagedJsonFile;
  const latest=beginLatestOperation(stateRef,'indexed-scope-discovery');
  const controller=new AbortController();
  activeDiscovery.set(stateRef,controller);
  const isCurrent=()=>latest()&&!controller.signal.aborted&&
    stateRef.current.stagedJsonFile===file&&
    stateRef.current.resolverSourceMode==='lfj-indexed-preview';
  stateRef.current=updateWorkflowState(stateRef.current,{
    lfjIndexedOriginalScopeChoices:null,
    lfjIndexedScopeDiscoveryStatus:'Discovering original owner zones off-thread…'
  });
  render();
  try{
    const result=await discover(file,{
      signal:controller.signal,isCurrent
    });
    if(!isCurrent())return null;
    // The native Worker returns a complete bounded full-source and direct-root
    // attested catalogue, never a guessed UI label or export grant.
    if(result?.schema!=='LFJ.A3.OriginalScopeChoices.v1'||
       result.sourceOnly!==true||result.downloadAuthorized!==false||
       !Array.isArray(result.choices))
      throw new Error('Unverified native original owner catalogue');
    stateRef.current=updateWorkflowState(stateRef.current,{
      lfjIndexedOriginalScopeChoices:{sourceFile:file,...result},
      lfjIndexedScopeDiscoveryStatus:
        result.choices.length+' source-verified owner choice(s); Build still reattests the original File.'
    });
    render();
    return result;
  }catch(error){
    if(!isCurrent())return null;
    stateRef.current=updateWorkflowState(stateRef.current,{
      lfjIndexedOriginalScopeChoices:null,
      lfjIndexedScopeDiscoveryStatus:'Original owner discovery failed: '+
        String(error?.message||error).slice(0,180)
    });
    render();
    return null;
  }finally{
    if(activeDiscovery.get(stateRef)===controller)
      activeDiscovery.delete(stateRef);
  }
}

function text(value) {
  return String(value ?? '');
}

function sourceKey(value) {
  const source = text(value);
  const length = source.length;
  const middle = Math.floor(length / 2);
  return [
    length,
    source.slice(0, 96),
    source.slice(Math.max(0, middle - 48), middle + 48),
    source.slice(Math.max(0, length - 96)),
  ].join('|');
}

function validScopeId(index, requested) {
  if (requested === ALL_SCOPE_ID) return requested;
  if ((index?.scopes || []).some((scope) => scope.id === requested)) return requested;
  return index?.indexable ? index.defaultScopeId : ALL_SCOPE_ID;
}

// The scope is a Build input, not view-only UI state. Invalidate its product
// receipt immediately and supersede an in-flight indexed Worker on selection.
export function selectResolverHierarchyScope(stateRef, selectedScopeId) {
  if (!stateRef?.current) return false;
  const before = stateRef.current;
  const next = updateWorkflowState(before, { jsonTraceScopeId: selectedScopeId });
  if (currentResolverTraceRevision(before) !== currentResolverTraceRevision(next)) {
    cancelIndexedBuild(stateRef);
    beginLatestOperation(stateRef, 'resolver-build');
  }
  stateRef.current = next;
  return currentResolverTraceRevision(before) !== currentResolverTraceRevision(next);
}

// An exact manually typed owner zone is a request, never a verified catalogue
// choice. The matching Worker must independently attest it from the ORIGINAL
// File's direct BRANCH ownership and immutable source generation.
export function selectIndexedOriginalScope(stateRef, rawValue) {
  if (!stateRef?.current || !(stateRef.current.stagedJsonFile instanceof Blob) ||
      stateRef.current.resolverSourceMode !== 'lfj-indexed-preview')
    return false;
  const value=String(rawValue ?? '').trim();
  const selected=value && value!==ALL_SCOPE_ID ? value : ALL_SCOPE_ID;
  const changed=selectResolverHierarchyScope(stateRef,selected);
  stateRef.current=updateWorkflowState(stateRef.current,{
    lfjIndexedManualScopeFile:selected===ALL_SCOPE_ID?null:stateRef.current.stagedJsonFile
  });
  return changed;
}

export function ensureResolverHierarchyScope(state = {}, stateRef = null) {
  const source = text(state.stagedJsonText);
  if (!source) {
    // Old selections never become All automatically. Discovery is bound to
    // the actual original Blob and only direct top-level owner evidence.
    const found=state.lfjIndexedOriginalScopeChoices;
    return {index:null,
      scopeChoices:found?.sourceFile===state.stagedJsonFile?found:null,
      selectedScopeId:text(state.jsonTraceScopeId)||ALL_SCOPE_ID};
  }
  const key = sourceKey(source);
  const cached = state.resolverJsonTraceUiScopeCache;
  const index = cached?.key === key
    ? cached.index
    : buildJsonHierarchyScopeIndex(source);
  const selectedScopeId = validScopeId(
    index,
    text(state.jsonTraceScopeId) || index.defaultScopeId,
  );
  if (stateRef?.current) {
    if (text(stateRef.current.jsonTraceScopeId) !== selectedScopeId)
      selectResolverHierarchyScope(stateRef, selectedScopeId);
    stateRef.current = {
      ...stateRef.current,
      resolverJsonTraceUiScopeCache: { key, index },
    };
  }
  return { index, selectedScopeId };
}

function scopeNote(scopeState) {
  const index = scopeState?.index;
  if (!index) {
    return scopeState?.scopeChoices
      ? 'These zone/site IDs were discovered from the complete original File catalogue. '
        + 'Selected Build and each CSV click independently reverify original source and revision.'
      : 'Discover real owner zones from the original File, or enter an exact zone manually. '
        + 'Manual labels are NOT verified until Build; unsupported zones fail closed.';
  }
  if (!index.indexable) {
    return 'This JSON shape cannot be bounded by the current hierarchy index. Resolver will use explicit All scopes.';
  }
  const selected = (index.scopes || []).find((scope) => scope.id === scopeState.selectedScopeId);
  if (scopeState.selectedScopeId === ALL_SCOPE_ID) {
    return 'All scopes selected — full semantic resolution is intentionally enabled and may be expensive on large JSON.';
  }
  return 'Bounded scope: ' + (selected?.itemCount || 0)
    + ' top-level item(s) from ' + index.itemCount + ' indexed item(s).';
}

function selectControl(scopeState) {
  const select = createElement('select');
  select.dataset.field = 'resolver-hierarchy-scope';
  const choices=scopeState?.scopeChoices?.choices;
  const options = scopeState?.index
    ? jsonHierarchyScopeOptions(scopeState.index)
    : Array.isArray(choices) ? [
      {id:ALL_SCOPE_ID,label:'All scopes',itemCount:scopeState.scopeChoices.originalRootCount},
      ...choices.map(c=>({id:c.id,label:c.id,itemCount:c.rootCount})),
      ...(scopeState?.selectedScopeId!==ALL_SCOPE_ID &&
          !choices.some(c=>c.id===scopeState.selectedScopeId)
         ?[{id:scopeState.selectedScopeId,label:'Previous selection (unverified)',itemCount:0}]
         :[])
    ] : [
      { id: ALL_SCOPE_ID, label: 'All scopes', itemCount: 0 },
      ...(scopeState?.selectedScopeId && scopeState.selectedScopeId !== ALL_SCOPE_ID
        ? [{ id: scopeState.selectedScopeId, label: 'Previous selection (unsupported)', itemCount: 0 }]
        : []),
    ];
  for (const item of options) {
    const option = createElement('option', item.label + ' (' + item.itemCount + ')');
    option.value = item.id;
    option.selected = item.id === scopeState.selectedScopeId;
    select.appendChild(option);
  }
  // Let a user clear an old non-ALL selection even without materializing the
  // original JSON into stagedJsonText (which indexed mode intentionally avoids).
  select.disabled = !scopeState?.index && !scopeState?.scopeChoices &&
    scopeState?.selectedScopeId === ALL_SCOPE_ID;
  return select;
}

export function renderResolverHierarchyScopeControl(parent, stateRef, render, scopeState) {
  const bar = createElement('div', '', 'xml-cii-resolver-scope-control');
  if (bar.style) {
    Object.assign(bar.style, {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap',
      margin: '8px 0 12px',
      padding: '8px 10px',
      border: '1px solid rgba(56,189,248,0.22)',
      borderRadius: '6px',
      background: 'rgba(14,116,144,0.08)',
    });
  }
  bar.appendChild(createElement('strong', 'Hierarchy / Zone scope:'));
  const select = selectControl(scopeState);
  select.addEventListener('change', (event) => {
    if (!stateRef?.current) return;
    const selected=event.target.value;
    if(scopeState?.scopeChoices && selected!==ALL_SCOPE_ID) {
      if(!scopeState.scopeChoices.choices.some(c=>c.id===selected))return;
      selectIndexedOriginalScope(stateRef,selected);
    }else if(selected===ALL_SCOPE_ID && stateRef.current.resolverSourceMode==='lfj-indexed-preview'){
      selectIndexedOriginalScope(stateRef,ALL_SCOPE_ID);
    }else{
      selectResolverHierarchyScope(stateRef,selected);
    }
    render?.();
  });
  bar.appendChild(select);
  const state=stateRef?.current;
  if (state?.resolverSourceMode==='lfj-indexed-preview' &&
      state.stagedJsonFile instanceof Blob) {
    const discover=createElement('button','Discover zones from original File');
    discover.type='button';
    discover.dataset.action='discover-indexed-original-scopes';
    discover.addEventListener('click',()=>{
      void discoverIndexedScopeChoicesFromUi(stateRef,render);
    });
    bar.appendChild(discover);
    if(state.lfjIndexedScopeDiscoveryStatus)
      bar.appendChild(createElement('span',
        state.lfjIndexedScopeDiscoveryStatus,'xml-cii-phase-help'));
    const label=createElement('label','Exact original owner zone/site ID (manual; verified only on Build):');
    const input=createElement('input');
    input.dataset.field='resolver-indexed-original-scope';
    input.type='text';
    input.placeholder='e.g. an exact direct OWNER_SITE value';
    input.value=scopeState?.selectedScopeId===ALL_SCOPE_ID?'':scopeState?.selectedScopeId||'';
    input.addEventListener('change',event=>{
      selectIndexedOriginalScope(stateRef,event.target.value);
      render?.();
    });
    label.appendChild(input);
    bar.appendChild(label);
  }
  const note = createElement('span', scopeNote(scopeState), 'xml-cii-phase-help');
  if (note.style) note.style.fontSize = '11px';
  bar.appendChild(note);
  parent.appendChild(bar);
}

export { ALL_SCOPE_ID };
