import { createElement } from './xml-cii-adapted-dom.js';
import {
  ALL_SCOPE_ID,
  buildJsonHierarchyScopeIndex,
  jsonHierarchyScopeOptions,
} from '../xml-cii-json-hierarchy-scope.js';

function text(value) {
  return String(value ?? '');
}
const STALE_SCOPE_ID = '__STALE_SOURCE_SCOPE__';

function validScopeId(index, requested) {
  if (requested === ALL_SCOPE_ID || requested === STALE_SCOPE_ID) return requested;
  if (!requested) return index?.indexable ? index.defaultScopeId : ALL_SCOPE_ID;
  if ((index?.scopes || []).some((scope) => scope.id === requested)) return requested;
  // An unknown saved choice cannot silently fall back to ALL/default.
  return STALE_SCOPE_ID;
}

export function ensureResolverHierarchyScope(state = {}, stateRef = null) {
  const source = text(state.stagedJsonText);
  if (!source) return { index: null, selectedScopeId: ALL_SCOPE_ID };
  // Compare the *entire* source value. Sampled string slices collide for
  // equal-length interior edits and can reuse a superseded owner/scope index.
  // The cache retains the existing immutable JS string; it is not a second
  // parsed hierarchy or a generated substitute for R03 byte custody.
  const cached = state.resolverJsonTraceUiScopeCache;
  const index = cached?.source === source
    ? cached.index
    : buildJsonHierarchyScopeIndex(source);
  const sourceSuperseded = Boolean(cached && cached.source !== source);
  const requested = text(state.jsonTraceScopeId);
  const selectedScopeId = sourceSuperseded && requested
    ? STALE_SCOPE_ID
    : validScopeId(index, requested);
  if (stateRef?.current) {
    stateRef.current = {
      ...stateRef.current,
      jsonTraceScopeId: selectedScopeId,
      ...(sourceSuperseded ? {
        resolverJsonTraceResult: null,
        resolverJsonTraceJsonResult: null,
        resolverJsonTraceExportStatus: '',
      } : {}),
      resolverJsonTraceUiScopeCache: { source, index },
    };
  }
  return { index, selectedScopeId, sourceSuperseded };
}

function scopeNote(scopeState) {
  const index = scopeState?.index;
  if (!index) return 'Load staged JSON to discover hierarchy scopes.';
  if (scopeState.selectedScopeId === STALE_SCOPE_ID)
    return 'Source or scope changed — explicitly reselect a scope before resolving.';
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
  const options = scopeState?.index
    ? jsonHierarchyScopeOptions(scopeState.index)
    : [{ id: ALL_SCOPE_ID, label: 'All scopes', itemCount: 0 }];
  if (scopeState?.selectedScopeId === STALE_SCOPE_ID)
    options.unshift({ id: STALE_SCOPE_ID, label: 'Source changed — choose scope', itemCount: 0 });
  for (const item of options) {
    const option = createElement('option', item.label + ' (' + item.itemCount + ')');
    option.value = item.id;
    option.selected = item.id === scopeState.selectedScopeId;
    select.appendChild(option);
  }
  select.disabled = !scopeState?.index;
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
    stateRef.current = {
      ...stateRef.current,
      jsonTraceScopeId: event.target.value,
      resolverJsonTraceResult: null,
      resolverJsonTraceJsonResult: null,
      resolverJsonTraceExportStatus: '',
    };
    render?.();
  });
  bar.appendChild(select);
  const note = createElement('span', scopeNote(scopeState), 'xml-cii-phase-help');
  if (note.style) note.style.fontSize = '11px';
  bar.appendChild(note);
  parent.appendChild(bar);
}

export { ALL_SCOPE_ID };
