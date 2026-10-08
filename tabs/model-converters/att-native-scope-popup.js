import { indexAttNativeHierarchy } from './att-native-hierarchy-index.js';
import { ATT_TREE_ROW_LIMIT, projectAttNativeTree, expandAttNativeAncestors, findAttNativeVisibleOffset } from './att-native-tree-projection.js';
import { createAttScopeSelection, setAttScopeRule, attScopeNodeState, resolveAttScopeSelection, attScopePartiallyExcludedBranches } from './att-native-scope-selection.js';
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);

/** Show native Site→Zone source hierarchy; return canonical branch scope. */
export async function openAttNativeScopePopup(name, bytes) {
  if (typeof document === 'undefined') throw new Error('Native scope browser requires a document.');
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:12px;';
  const card = document.createElement('section');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Native ATT Site and Zone scope');
  card.style.cssText = 'width:min(960px,98vw);height:min(92vh,880px);display:flex;flex-direction:column;background:#152030;color:#f0f5ff;border:1px solid #5c6b80;border-radius:12px;overflow:hidden;';
  card.innerHTML = [
    '<header style="padding:12px;border-bottom:1px solid #4a5568;"><strong>Native Site / Zone / descendant selection</strong>',
    '<div style="font-size:12px;color:#b6c5dc;">', safe(name),
    ' — selecting parents includes hidden descendants.</div>',
    '<div data-native-stats aria-live="polite"></div></header>',
    '<div style="padding:8px;display:flex;gap:8px;flex-wrap:wrap;">',
    '<input type="search" data-native-search placeholder="Find any native name or type" aria-label="Search complete ATT source" style="flex:1;min-width:200px;">',
    '<span data-native-page></span><button data-native-prev>Previous</button><button data-native-next>Next</button></div>',
    '<div data-native-rows role="tree" aria-label="Native source hierarchy" style="flex:1;overflow:auto;padding:8px;"></div>',
    '<div data-native-selection aria-live="polite" style="padding:8px;border-top:1px solid #45516b;"></div>',
    '<footer style="padding:10px;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;">',
    '<button data-native-clear>Clear</button><button data-native-cancel>Cancel</button>',
    '<button data-native-full>Convert full file</button>',
    '<button data-native-confirm disabled>Convert selected scope</button></footer>',
  ].join('');
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const el = s => card.querySelector(s);
  const stats = el('[data-native-stats]');
  const rows = el('[data-native-rows]');
  const summary = el('[data-native-selection]');
  let index;
  try {
    stats.textContent = 'Indexing all source records, sites, zones…';
    index = await indexAttNativeHierarchy(new Blob([bytes]).stream(), {
      onProgress(count) { stats.textContent = 'Indexed ' + count.typed + ' native records…'; },
    });
  } catch (error) { overlay.remove(); throw error; }
  const expanded = new Set();
  let selection = createAttScopeSelection();
  let offset = 0, search = '', timer = null;

  function render() {
    const page = projectAttNativeTree(index, { expanded, offset, search, limit: ATT_TREE_ROW_LIMIT });
    rows.innerHTML = page.rows.map(r => {
      const state = attScopeNodeState(index, selection, r.id);
      const toggle = r.childCount
        ? '<button type="button" data-expand="' + safe(r.id) + '" aria-label="Expand or collapse ' + safe(r.name) + '">' + (expanded.has(r.id) ? '−' : '+') + '</button>'
        : '<span aria-hidden="true" style="display:inline-block;width:22px;"></span>';
      const reveal = search ? '<button type="button" data-reveal="' + safe(r.id) + '">Reveal</button>' : '';
      return '<div role="treeitem" aria-level="' + (r.depth + 1)
        + '" style="display:flex;align-items:center;gap:8px;padding:3px;min-width:max-content;margin-left:' + (search ? 0 : Math.min(r.depth, 24) * 13) + 'px;">'
        + toggle + '<input type="checkbox" data-check="' + safe(r.id) + '" aria-label="Select ' + safe(r.name) + '"'
        + (state === 'checked' ? ' checked' : '') + ' data-mixed="' + (state === 'mixed') + '">'
        + '<small style="color:#9fc6ff;min-width:44px;">' + safe(r.type) + '</small>'
        + '<span>' + safe(r.name) + '</span><small>' + (r.childCount ? '(' + r.childCount + ')' : '') + '</small>'
        + reveal + '</div>';
    }).join('');
    rows.querySelectorAll('[data-mixed="true"]').forEach(input => { input.indeterminate = true; });
    el('[data-native-page]').textContent = (page.visibleTotal ? offset + 1 : 0) + '–'
      + Math.min(page.visibleTotal, offset + page.rows.length) + '/' + page.visibleTotal
      + (search ? ' matches' : ' visible');
    el('[data-native-prev]').disabled = !page.canPrevious;
    el('[data-native-next]').disabled = !page.canNext;
    stats.textContent = index.counts.typed.toLocaleString() + ' indexed · ' + index.counts.sites
      + ' Sites · ' + index.counts.zones + ' Zones · ' + page.rows.length
      + ' rendered · ' + page.unresolvedTotal + ' unresolved';
    const resolved = resolveAttScopeSelection(index, selection);
    summary.textContent = resolved.selectedNativeCount.toLocaleString() + ' native records selected; '
      + resolved.selectedBranchIds.length + ' piping branches eligible for XML/JSON.';
    el('[data-native-confirm]').disabled = !resolved.explicitSelection || !resolved.selectedNativeCount;
  }
  return new Promise(resolve => {
    const done = result => { if (timer) clearTimeout(timer); overlay.remove(); resolve(result); };
    rows.addEventListener('click', event => {
      const btn = event.target.closest('[data-expand], [data-reveal]');
      if (!btn) return;
      const expandId = btn.getAttribute('data-expand');
      if (expandId) {
        if (expanded.has(expandId)) expanded.delete(expandId);
        else expanded.add(expandId);
        offset = 0;
      } else {
        const id = btn.getAttribute('data-reveal');
        const updated = expandAttNativeAncestors(index, id, expanded);
        expanded.clear(); for (const value of updated) expanded.add(value);
        search = ''; el('[data-native-search]').value = '';
        const location = findAttNativeVisibleOffset(index, id, expanded);
        offset = Math.floor(Math.max(0, location) / ATT_TREE_ROW_LIMIT) * ATT_TREE_ROW_LIMIT;
      }
      render();
    });
    rows.addEventListener('change', event => {
      const input = event.target.closest('[data-check]');
      if (!input) return;
      selection = setAttScopeRule(index, selection, input.getAttribute('data-check'), input.checked);
      render();
    });
    el('[data-native-search]').addEventListener('input', event => {
      const value = event.target.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { search = value; offset = 0; render(); }, 120);
    });
    el('[data-native-prev]').addEventListener('click', () => { offset = Math.max(0, offset - ATT_TREE_ROW_LIMIT); render(); });
    el('[data-native-next]').addEventListener('click', () => { offset += ATT_TREE_ROW_LIMIT; render(); });
    el('[data-native-clear]').addEventListener('click', () => { selection = createAttScopeSelection(); render(); });
    el('[data-native-cancel]').addEventListener('click', () => done({ cancelled: true }));
    el('[data-native-full]').addEventListener('click', () => done({
      cancelled: false, wildcard: '', selectedIds: [], nativeScope: { mode: 'FULL' },
    }));
    el('[data-native-confirm]').addEventListener('click', () => {
      const resolved = resolveAttScopeSelection(index, selection);
      if (!resolved.explicitSelection || !resolved.selectedNativeCount) return;
      if (!resolved.selectedBranchIds.length) {
        summary.textContent = 'Selected source contains no convertible piping BRAN. Refusing an unfiltered or silently empty XML/JSON output.';
        return;
      }
      const partial = attScopePartiallyExcludedBranches(index, selection);
      if (partial.length) {
        summary.textContent = 'Conversion blocked: ' + partial.length
          + ' selected piping branch(es) have explicitly excluded components. Whole-branch export would leak unchecked geometry.';
        return;
      }
      done({
        cancelled: false, wildcard: '', selectedIds: [...resolved.selectedBranchIds],
        nativeScope: {
          mode: 'SELECTED', rules: [...selection.rules.entries()],
          indexed: index.counts.typed, selectedNativeCount: resolved.selectedNativeCount,
          selectedPipingBranches: resolved.selectedBranchIds.length,
          selectedByType: resolved.byType,
        },
      });
    });
    render();
  });
}
