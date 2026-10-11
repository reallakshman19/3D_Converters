import { createElement } from './xml-cii-adapted-dom.js';
import { currentResolverTraceRevision, updateWorkflowState } from './xml-cii-adapted-state.js';
import { beginLatestOperation } from './xml-cii-adapted-latest-operation.js';
import { cancelIndexedBuild } from './xml-cii-adapted-lfj-build-lifecycle.js';
import {
  discoverIndexedOriginalFileScopes,isIndexedFileScopeDiscovery
} from './xml-cii-adapted-lfj-scope-discovery.js';
import {
  ALL_SCOPE_ID,
  buildJsonHierarchyScopeIndex,
  jsonHierarchyScopeOptions,
} from '../xml-cii-json-hierarchy-scope.js';

const activeDiscovery=new WeakMap();
export function cancelIndexedScopeDiscovery(stateRef){
  const prior=activeDiscovery.get(stateRef);
  if(!prior)return false;
  activeDiscovery.delete(stateRef);
  prior.abort();
  return true;
}
export async function discoverResolverHierarchyScopes(stateRef,render){
  const current=stateRef?.current;
  const blob=current?.stagedJsonFile;
  if(current?.resolverSourceMode!=='lfj-indexed-preview'||
     !(blob instanceof Blob))return null;
  cancelIndexedScopeDiscovery(stateRef);
  const controller=new AbortController();
  activeDiscovery.set(stateRef,controller);
  const revision=currentResolverTraceRevision(current);
  const isCurrent=()=>activeDiscovery.get(stateRef)===controller &&
    !controller.signal.aborted &&
    stateRef.current.stagedJsonFile===blob &&
    stateRef.current.resolverSourceMode==='lfj-indexed-preview' &&
    currentResolverTraceRevision(stateRef.current)===revision;
  stateRef.current={...stateRef.current,
    lfjIndexedScopeDiscoveryStatus:'Scanning original File in native Worker…'};
  render?.();
  try{
    const discovery=await discoverIndexedOriginalFileScopes({
      blob,signal:controller.signal,isCurrent
    });
    if(!isCurrent())return null;
    stateRef.current={...stateRef.current,
      lfjIndexedScopeDiscovery:discovery,
      lfjIndexedScopeDiscoveryStatus:
        'Verified '+discovery.result.scopes.length+' original source scope(s).'};
    render?.();
    return discovery;
  }catch(error){
    if(isCurrent()){
      stateRef.current={...stateRef.current,
        lfjIndexedScopeDiscovery:null,
        lfjIndexedScopeDiscoveryStatus:'Original scope scan blocked: '+
          String(error?.message||error).slice(0,170)};
      render?.();
    }
    return null;
  }finally{
    if(activeDiscovery.get(stateRef)===controller)activeDiscovery.delete(stateRef);
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
  // Preserve an explicitly selected unsupported owner/zone as an invalid
  // selection. The real Build must reject it; never choose another owner or ALL.
  return requested || index?.defaultScopeId || ALL_SCOPE_ID;
}

// The scope is a Build input, not view-only UI state. Invalidate its product
// receipt immediately and supersede an in-flight indexed Worker on selection.
export function selectResolverHierarchyScope(stateRef, selectedScopeId) {
  if (!stateRef?.current) return false;
  const before = stateRef.current;
  const next = updateWorkflowState(before, { jsonTraceScopeId: selectedScopeId });
  if (currentResolverTraceRevision(before) !== currentResolverTraceRevision(next)) {
    cancelIndexedBuild(stateRef);
    cancelIndexedScopeDiscovery(stateRef);
    beginLatestOperation(stateRef, 'resolver-build');
  }
  stateRef.current = next;
  return currentResolverTraceRevision(before) !== currentResolverTraceRevision(next);
}

export function ensureResolverHierarchyScope(state = {}, stateRef = null) {
  const source = text(state.stagedJsonText);
  if (!source) {
    // Never materialize original File as a foreground JSON string.
    // Only an independently source-hashed native Worker catalogue can list
    // original scopes; this is view metadata, not a matching/export receipt.
    const discovery=state.lfjIndexedScopeDiscovery;
    const indexed=state.resolverSourceMode==='lfj-indexed-preview' &&
      isIndexedFileScopeDiscovery(discovery,state.stagedJsonFile);
    const index=indexed ? {
      schema:'xml-cii-json-hierarchy-scope/v1',indexable:true,
      strategy:'original-blob-catalog',itemCount:discovery.result.originalRootCount,
      byteLength:discovery.result.originalBytes,
      scopes:discovery.result.scopes,defaultScopeId:ALL_SCOPE_ID
    } : null;
    return {index,selectedScopeId:text(state.jsonTraceScopeId)||ALL_SCOPE_ID};
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
    return scopeState?.selectedScopeId !== ALL_SCOPE_ID
      ? 'Previously selected hierarchy is not supported by indexed Build. Select All scopes before Building.'
      : 'Only All scopes is available for original-File indexed Build until native hierarchy selection is implemented.';
  }
  if (!index.indexable) {
    return 'This JSON shape cannot be indexed. Select All scopes explicitly; a selected owner/zone will be rejected.';
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
  const options = scopeState?.index
    ? jsonHierarchyScopeOptions(scopeState.index)
    : [
      { id: ALL_SCOPE_ID, label: 'All scopes', itemCount: 0 },
      ...(scopeState?.selectedScopeId && scopeState.selectedScopeId !== ALL_SCOPE_ID
        ? [{ id: scopeState.selectedScopeId, label: 'Previous selection (unsupported)', itemCount: 0 }]
        : []),
    ];
  if(scopeState?.index&&scopeState.selectedScopeId!==ALL_SCOPE_ID&&
      !options.some(item=>item.id===scopeState.selectedScopeId))
    options.push({id:scopeState.selectedScopeId,
      label:'Previous selection (unsupported)',itemCount:0});
  for (const item of options) {
    const option = createElement('option', item.label + ' (' + item.itemCount + ')');
    option.value = item.id;
    option.selected = item.id === scopeState.selectedScopeId;
    select.appendChild(option);
  }
  // The explicit All reset is always available. Only a verified original
  // native catalogue can provide other selectable original File scopes.
  select.disabled = !scopeState?.index && scopeState?.selectedScopeId === ALL_SCOPE_ID;
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
    selectResolverHierarchyScope(stateRef, event.target.value);
    render?.();
  });
  bar.appendChild(select);
  if(stateRef?.current?.resolverSourceMode==='lfj-indexed-preview' &&
     stateRef.current.stagedJsonFile instanceof Blob){
    const scan=createElement('button','Scan original File scopes');
    scan.type='button';scan.dataset.action='discover-indexed-scopes';
    scan.addEventListener('click',()=>void discoverResolverHierarchyScopes(
      stateRef,render));
    bar.appendChild(scan);
  }
  const note = createElement('span',
    scopeNote(scopeState)+
    (stateRef?.current?.lfjIndexedScopeDiscoveryStatus ?
      ' '+stateRef.current.lfjIndexedScopeDiscoveryStatus : ''),
    'xml-cii-phase-help');
  if (note.style) note.style.fontSize = '11px';
  bar.appendChild(note);
  parent.appendChild(bar);
}

export { ALL_SCOPE_ID };
