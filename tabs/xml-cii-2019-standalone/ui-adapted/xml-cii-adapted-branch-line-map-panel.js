/**
 * Dedicated Bulk Branch → Line Number Mapping Panel.
 * Provides inline autocomplete editing, auto-suggest, and pattern rule apply.
 */

function _esc(val) {
  return String(val ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function _createHeaderHtml(mappedCount, unmappedCount) {
  return `
    <div class="bulk-map-header" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:linear-gradient(135deg,rgba(30,41,59,0.9) 0%,rgba(15,23,42,0.95) 100%);border:1px solid rgba(99,102,241,0.35);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.25);transition:all 0.2s ease;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:16px;">🔗</span>
        <span style="font-weight:700;font-size:14px;color:#f8fafc;letter-spacing:0.02em;">Bulk Branch → Line Number Mapping Panel</span>
        <span class="bulk-badge-mapped" style="font-size:11px;padding:2px 8px;border-radius:12px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);">✓ Mapped: ${mappedCount}</span>
        <span class="bulk-badge-unmapped" style="font-size:11px;padding:2px 8px;border-radius:12px;background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);">⚠ Unmapped: ${unmappedCount}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="bulk-toggle-hint" style="font-size:12px;color:#94a3b8;">Click to expand</span>
        <span class="bulk-chevron" style="font-size:14px;color:#a5b4fc;transition:transform 0.2s ease;">▼</span>
      </div>
    </div>`;
}

function _createControlsHtml() {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 10px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:260px;">
        <input type="text" class="bulk-search-input" placeholder="🔍 Filter branch name or mapped line key..." style="flex:1;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:7px 12px;font-size:12px;outline:none;">
        <select class="bulk-status-filter" style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;">
          <option value="all">All Branches</option>
          <option value="unmapped">Unmapped Only</option>
          <option value="mapped">Mapped Only</option>
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="bulk-autosuggest-btn" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.35);">✨ Auto-Suggest Unmapped</button>
        <button type="button" class="bulk-save-btn" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(16,185,129,0.35);">💾 Save & Apply Mappings</button>
      </div>
    </div>`;
}

function _createPatternCardHtml() {
  return `
    <div style="margin-top:14px;padding:12px 16px;background:rgba(15,23,42,0.6);border:1px dashed rgba(148,163,184,0.25);border-radius:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:12px;font-weight:600;color:#e2e8f0;">⚡ Bulk Pattern Rules (Unmapped Only)</span>
        <span style="font-size:11px;color:#94a3b8;">Apply a regular expression transformation to assign line keys without overwriting existing mappings.</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input type="text" class="bulk-pattern-regex" placeholder="Regex (e.g. ^/GLRD-(\\d+).*$)" style="width:190px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:6px 10px;font-size:12px;font-family:monospace;">
        <span style="color:#94a3b8;font-weight:bold;">→</span>
        <input type="text" class="bulk-pattern-replace" placeholder="Replace (e.g. GLRD-$1)" style="width:150px;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:6px 10px;font-size:12px;font-family:monospace;">
        <button type="button" class="bulk-apply-pattern-btn" style="background:#4338ca;color:#f8fafc;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;">Apply Pattern</button>
      </div>
    </div>`;
}

function _createTableRows(branches, map, datalistId) {
  return branches.map(b => {
    const name = b.branchName || '';
    const mapped = map[name] || '';
    const isMapped = Boolean(mapped);
    const badgeHtml = isMapped
      ? '<span class="bulk-row-status" style="color:#34d399;font-weight:600;font-size:11px;">✓ Mapped</span>'
      : '<span class="bulk-row-status" style="color:#fbbf24;font-weight:500;font-size:11px;">⚠ Unmapped</span>';
    return `
      <tr class="bulk-map-tr" data-branch="${_esc(name)}" data-status="${isMapped ? 'mapped' : 'unmapped'}" style="border-bottom:1px solid rgba(148,163,184,0.1);background:transparent;transition:background 0.15s ease;">
        <td style="padding:8px 12px;font-family:monospace;font-size:12px;color:#e2e8f0;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${_esc(name)}">${_esc(name)}</td>
        <td style="padding:6px 12px;">
          <input type="text" list="${_esc(datalistId)}" class="bulk-line-input" data-branch="${_esc(name)}" value="${_esc(mapped)}" placeholder="Type or select line list key..." style="width:100%;max-width:320px;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:5px;padding:5px 10px;font-size:12px;outline:none;">
        </td>
        <td style="padding:8px 12px;text-align:center;">${badgeHtml}</td>
      </tr>`;
  }).join('');
}

function _filterRows(tableBody, searchVal, statusVal) {
  const query = searchVal.trim().toLowerCase();
  tableBody.querySelectorAll('.bulk-map-tr').forEach(tr => {
    const branch = tr.getAttribute('data-branch') || '';
    const input = tr.querySelector('.bulk-line-input');
    const assigned = (input?.value || '').trim();
    const isMapped = Boolean(assigned);
    const statusMatch = statusVal === 'all' || (statusVal === 'mapped' && isMapped) || (statusVal === 'unmapped' && !isMapped);
    const textMatch = !query || branch.toLowerCase().includes(query) || assigned.toLowerCase().includes(query);
    tr.style.display = statusMatch && textMatch ? '' : 'none';
  });
}

function _bindSearchFilters(container) {
  const tableBody = container.querySelector('.bulk-map-tbody');
  const searchInput = container.querySelector('.bulk-search-input');
  const statusSelect = container.querySelector('.bulk-status-filter');
  const doFilter = () => _filterRows(tableBody, searchInput?.value || '', statusSelect?.value || 'all');
  searchInput?.addEventListener('input', doFilter);
  statusSelect?.addEventListener('change', doFilter);
}

function _bindPatternApply(container) {
  const applyBtn = container.querySelector('.bulk-apply-pattern-btn');
  applyBtn?.addEventListener('click', () => {
    const regexText = container.querySelector('.bulk-pattern-regex')?.value?.trim();
    const replaceText = container.querySelector('.bulk-pattern-replace')?.value || '';
    if (!regexText) return alert('Please provide a valid Regular Expression pattern.');
    let re;
    try { re = new RegExp(regexText); } catch (e) { return alert(`Invalid regex syntax: ${e.message}`); }
    let count = 0;
    container.querySelectorAll('.bulk-map-tr').forEach(tr => {
      const input = tr.querySelector('.bulk-line-input');
      if (!input || input.value.trim()) return;
      const branch = tr.getAttribute('data-branch') || '';
      if (re.test(branch)) {
        input.value = branch.replace(re, replaceText).trim();
        input.style.borderColor = '#3b82f6';
        input.style.backgroundColor = 'rgba(59,130,246,0.1)';
        const statusEl = tr.querySelector('.bulk-row-status');
        if (statusEl) { statusEl.innerHTML = '✏ Modified'; statusEl.style.color = '#60a5fa'; }
        count++;
      }
    });
    alert(count ? `Applied pattern rule to ${count} unmapped branch${count === 1 ? '' : 'es'}. Click Save & Apply Mappings to save.` : 'No unmapped branches matched the pattern.');
  });
}

function _bindAutoSuggest(container, lineListKeys) {
  const suggestBtn = container.querySelector('.bulk-autosuggest-btn');
  suggestBtn?.addEventListener('click', () => {
    if (!Array.isArray(lineListKeys) || !lineListKeys.length) return alert('No master Line List keys loaded.');
    let count = 0;
    container.querySelectorAll('.bulk-map-tr').forEach(tr => {
      const input = tr.querySelector('.bulk-line-input');
      if (!input || input.value.trim()) return;
      const branch = (tr.getAttribute('data-branch') || '').toUpperCase();
      const match = lineListKeys.find(k => k && branch.includes(String(k).toUpperCase().replace(/[^A-Z0-9-]/g, '')));
      if (match) {
        input.value = match;
        input.style.borderColor = '#3b82f6';
        input.style.backgroundColor = 'rgba(59,130,246,0.1)';
        const statusEl = tr.querySelector('.bulk-row-status');
        if (statusEl) { statusEl.innerHTML = '✨ Suggested'; statusEl.style.color = '#60a5fa'; }
        count++;
      }
    });
    alert(count ? `Auto-suggested line keys for ${count} unmapped branch${count === 1 ? '' : 'es'}. Verify and click Save.` : 'Could not auto-suggest keys for remaining unmapped branches.');
  });
}

function _bindSaveAction(container, config, onSaveConfig, onRebuildPreview) {
  const saveBtn = container.querySelector('.bulk-save-btn');
  saveBtn?.addEventListener('click', () => {
    if (!config.linelist) config.linelist = {};
    const newMap = { ...(config.linelist.branchLineKeyMap || {}) };
    let savedCount = 0;
    container.querySelectorAll('.bulk-line-input').forEach(input => {
      const branch = input.getAttribute('data-branch');
      const val = (input.value || '').trim();
      if (!branch) return;
      if (val) { newMap[branch] = val; savedCount++; }
      else delete newMap[branch];
      input.style.borderColor = '#334155';
      input.style.backgroundColor = '#0f172a';
      const tr = input.closest('tr');
      const statusEl = tr?.querySelector('.bulk-row-status');
      if (statusEl) {
        statusEl.innerHTML = val ? '✓ Mapped' : '⚠ Unmapped';
        statusEl.style.color = val ? '#34d399' : '#fbbf24';
      }
    });
    config.linelist.branchLineKeyMap = newMap;
    if (typeof onSaveConfig === 'function') onSaveConfig(config);
    if (typeof onRebuildPreview === 'function') onRebuildPreview();
  });
}

function _bindHeaderToggle(header, body, chevron, hint) {
  let expanded = false;
  header.addEventListener('click', () => {
    expanded = !expanded;
    body.style.display = expanded ? 'block' : 'none';
    chevron.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
    hint.textContent = expanded ? 'Click to collapse' : 'Click to expand';
  });
}

export function renderBranchLineMapPanel(container, { branchRows = [], lineListKeys = [], config = {}, onSaveConfig, onRebuildPreview }) {
  if (!container || !Array.isArray(branchRows) || !branchRows.length) return;
  const currentMap = config.linelist?.branchLineKeyMap || {};
  let mappedCount = 0, unmappedCount = 0;
  for (const r of branchRows) {
    if (currentMap[r.branchName] || (r.lineKey && !r.lineMiss && r.lineKey !== r.branchName)) mappedCount++;
    else unmappedCount++;
  }
  const datalistId = `bulk-ll-keys-${Math.random().toString(36).slice(2, 8)}`;
  const datalistHtml = `<datalist id="${datalistId}">${(lineListKeys || []).map(k => `<option value="${_esc(k)}"></option>`).join('')}</datalist>`;
  const rowsHtml = _createTableRows(branchRows, currentMap, datalistId);

  container.innerHTML = `
    <div class="bulk-branch-mapping-wrapper" style="margin:0 0 16px;font-family:inherit;">
      ${_createHeaderHtml(mappedCount, unmappedCount)}
      <div class="bulk-map-body" style="display:none;margin-top:8px;padding:16px;background:rgba(15,23,36,0.85);border:1px solid #1e293b;border-radius:8px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.2);">
        ${_createControlsHtml()}
        ${datalistHtml}
        <div style="max-height:360px;overflow-y:auto;border:1px solid rgba(148,163,184,0.15);border-radius:6px;background:#090d16;">
          <table style="width:100%;border-collapse:collapse;text-align:left;">
            <thead style="position:sticky;top:0;background:#182235;z-index:2;border-bottom:1px solid rgba(148,163,184,0.2);">
              <tr>
                <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:0.04em;">Branch Name</th>
                <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:0.04em;">Assigned Line List Key</th>
                <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;text-align:center;letter-spacing:0.04em;">Status</th>
              </tr>
            </thead>
            <tbody class="bulk-map-tbody">${rowsHtml}</tbody>
          </table>
        </div>
        ${_createPatternCardHtml()}
      </div>
    </div>`;

  const header = container.querySelector('.bulk-map-header');
  const body = container.querySelector('.bulk-map-body');
  const chevron = container.querySelector('.bulk-chevron');
  const hint = container.querySelector('.bulk-toggle-hint');
  _bindHeaderToggle(header, body, chevron, hint);
  _bindSearchFilters(container);
  _bindPatternApply(container);
  _bindAutoSuggest(container, lineListKeys);
  _bindSaveAction(container, config, onSaveConfig, onRebuildPreview);
}
