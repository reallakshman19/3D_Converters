import { createElement, appendLabeledControl } from './xml-cii-adapted-dom.js';
import { runStandaloneResolverJsonTrace } from '../xml-cii-resolver-json-trace.js';
import { buildAdaptedJsonTraceTree } from './xml-cii-adapted-regex-results.js';

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function rows(value) {
  return Array.isArray(value) ? value : [];
}

function stat(result, key) {
  return Number(result?.indexStats?.[key] || 0);
}

function actionButton(action, label) {
  const button = createElement('button', label);
  button.type = 'button';
  button.dataset.action = action;
  return button;
}

function metric(label, value) {
  const item = createElement('div', '', 'xml-cii-resolver-metric');
  item.append(createElement('span', label), createElement('strong', String(value ?? 0)));
  return item;
}

function table(headers, data, emptyText, idClass = 'xml-cii-resolver-table') {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', idClass);
  if (tableEl.style) Object.assign(tableEl.style, { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: '#cbd5e1', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' });
  const head = createElement('thead');
  const hr = createElement('tr');
  if (hr.style) Object.assign(hr.style, { background: '#1e293b', borderBottom: '2px solid rgba(148, 163, 184, 0.12)' });
  for (const header of headers) {
    const th = createElement('th', header);
    if (th.style) Object.assign(th.style, { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' });
    hr.appendChild(th);
  }
  head.appendChild(hr);
  tableEl.append(head, tableBody(headers, data));
  const wrapper = createElement('div');
  if (wrapper.style) Object.assign(wrapper.style, { maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' });
  wrapper.appendChild(tableEl);
  return wrapper;
}

function tableBody(headers, data) {
  const body = createElement('tbody');
  let isEven = false;
  for (const item of data.slice(0, 1000)) {
    const tr = createElement('tr');
    if (tr.style) {
      Object.assign(tr.style, { borderBottom: '1px solid rgba(148, 163, 184, 0.06)', background: isEven ? 'rgba(30, 41, 59, 0.15)' : 'transparent', transition: 'background-color 0.15s ease' });
      const currentEven = isEven;
      tr.addEventListener('mouseenter', () => { tr.style.backgroundColor = 'rgba(30, 41, 59, 0.4)'; });
      tr.addEventListener('mouseleave', () => { tr.style.backgroundColor = currentEven ? 'rgba(30, 41, 59, 0.15)' : 'transparent'; });
    }
    isEven = !isEven;
    for (const header of headers) {
      const val = text(item[fieldFor(header)]);
      const td = createElement('td');
      if (td.style) Object.assign(td.style, { padding: '10px 12px', verticalAlign: 'middle', color: '#cbd5e1' });
      if (header === 'DTXR_POS Value' || header === 'DTXR_PS Value') {
        const valDiv = createElement('div', val, 'xml-cii-table-scroll-cell');
        if (valDiv.style) Object.assign(valDiv.style, { maxHeight: '68px', overflowY: 'auto', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '11px', fontFamily: 'monospace', paddingRight: '6px', lineHeight: '1.4', color: val && val !== '(none)' ? '#fbbf24' : '#64748b' });
        td.appendChild(valDiv);
      } else if (header === 'Status') {
        const isResolved = val === 'RESOLVED';
        const badge = createElement('span', val, isResolved ? 'xml-cii-badge-resolved' : 'xml-cii-badge-unresolved');
        if (badge.style) Object.assign(badge.style, { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', color: isResolved ? '#34d399' : '#f87171', backgroundColor: isResolved ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', border: isResolved ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(248, 113, 113, 0.2)' });
        td.appendChild(badge);
      } else if (header === 'POS Basis') {
        if (td.style) Object.assign(td.style, { fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8' });
        td.textContent = val;
      } else if (header === 'XML Node' || header === 'JsonNodeNo') {
        if (td.style) Object.assign(td.style, { fontFamily: 'monospace', fontSize: '11px' });
        td.textContent = val;
      } else {
        td.textContent = val;
      }
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  return body;
}

function fieldFor(header) {
  return {
    Path: 'path', Node: 'nodeKey', PS: 'psKey', POS: 'posKey', Hits: 'hitCount', Type: 'type', Rows: 'rows',
    'XML Node': 'xmlNode', 'XML Branch': 'xmlBranch', 'Type': 'componentType', 'JsonNodeNo': 'jsonNodeNo',
    'Match Type': 'matchType', 'POS Basis': 'posBasis', 'DTXR_POS Value': 'dtxrPosValue', 'DTXR_PS Value': 'dtxrPsValue', 'Status': 'status'
  }[header] || header;
}

function fileStatusBadge(label, loaded) {
  const badge = createElement('span', loaded ? `✅ ${label}: Loaded` : `⚠️ ${label}: Not loaded`, 'xml-cii-phase-help');
  if (badge.style) badge.style.color = loaded ? '#8be28b' : '#fbbf24';
  return badge;
}

function renderDelimiterControls(parent, state) {
  const cfg = state.resolverJsonTraceConfig || {};
  const on = cfg.useDelimiter === true;
  const delim = cfg.delimiter || '|';
  const mode = cfg.joinMode || 'unique';

  const bar = createElement('div');
  if (bar.style) Object.assign(bar.style, { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '10px', padding: '8px 12px', background: 'rgba(15,23,42,0.5)', borderRadius: '6px', border: '1px solid rgba(148,163,184,0.1)' });
  bar.appendChild(createElement('strong', 'DTXR Value Joining:'));

  const toggleLabel = createElement('label');
  if (toggleLabel.style) Object.assign(toggleLabel.style, { display: 'flex', alignItems: 'center', gap: '4px' });
  const toggleInput = createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.dataset.field = 'resolver-use-delimiter';
  if (on) toggleInput.setAttribute('checked', '');
  toggleInput.checked = on;
  toggleLabel.append(toggleInput, createElement('span', ' Use delimiter joining'));
  bar.appendChild(toggleLabel);

  const delimLabel = createElement('label');
  if (delimLabel.style) Object.assign(delimLabel.style, { display: 'flex', alignItems: 'center', gap: '4px', opacity: on ? '1' : '0.4' });
  delimLabel.appendChild(createElement('span', 'Delimiter:'));
  const delimInput = createElement('input');
  delimInput.type = 'text';
  delimInput.dataset.field = 'resolver-delimiter';
  delimInput.value = delim;
  delimInput.maxLength = 8;
  if (!on) delimInput.disabled = true;
  if (delimInput.style) Object.assign(delimInput.style, { width: '42px', padding: '2px 6px', fontFamily: 'monospace', fontSize: '12px', background: '#1a2840', color: '#d7e6ff', border: '1px solid #2a3f5f', borderRadius: '4px' });
  delimLabel.appendChild(delimInput);
  bar.appendChild(delimLabel);

  const modeLabel = createElement('label');
  if (modeLabel.style) Object.assign(modeLabel.style, { display: 'flex', alignItems: 'center', gap: '4px', opacity: on ? '1' : '0.4' });
  modeLabel.appendChild(createElement('span', 'Join mode:'));

  const modeSelect = createElement('select');
  modeSelect.dataset.field = 'resolver-join-mode';
  if (!on) modeSelect.disabled = true;
  if (modeSelect.style) Object.assign(modeSelect.style, { padding: '2px 4px', fontSize: '12px', background: '#1a2840', color: '#d7e6ff', border: '1px solid #2a3f5f', borderRadius: '4px' });
  for (const [val, lbl] of [['unique', 'All unique values'], ['first', 'First value only'], ['all', 'All values (incl. duplicates)']]) {
    const opt = createElement('option', lbl);
    opt.value = val;
    if (mode === val) opt.selected = true;
    modeSelect.appendChild(opt);
  }
  modeLabel.appendChild(modeSelect);
  bar.appendChild(modeLabel);

  const note = createElement('span', on ? 'Unique values joined → written into DTXR_POS / DTXR_PS' : 'OFF — each DTXR row matched individually', 'xml-cii-phase-help');
  if (note.style) note.style.fontSize = '11px';
  bar.appendChild(note);

  const tolLabel = createElement('label');
  if (tolLabel.style) Object.assign(tolLabel.style, { display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px', borderLeft: '1px solid rgba(148,163,184,0.15)', paddingLeft: '10px' });
  tolLabel.appendChild(createElement('span', '📏 Coord tolerance (mm):'));
  const tolInput = createElement('input');
  tolInput.type = 'number';
  tolInput.dataset.field = 'resolver-coordinate-tolerance';
  tolInput.min = '0';
  tolInput.max = '50';
  tolInput.step = '0.5';
  tolInput.value = String(cfg.coordinateTolerance ?? 6.0);
  tolInput.title = 'Maximum Euclidean distance (mm) between XML <Position> and staged JSON POSI to count as a coordinate match. Default: 6mm.';
  if (tolInput.style) Object.assign(tolInput.style, { width: '58px', padding: '2px 6px', fontFamily: 'monospace', fontSize: '12px', background: '#1a2840', color: '#d7e6ff', border: '1px solid #2a3f5f', borderRadius: '4px' });
  tolLabel.appendChild(tolInput);
  bar.appendChild(tolLabel);

  parent.appendChild(bar);
}

function renderResolverIndex(parent, state) {
  const result = state.resolverJsonTraceResult;
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'Resolver Index'));
  
  const actions = createElement('div', '', 'xml-cii-resolver-actions');
  const buildBtn = actionButton('build-resolver-index', state.resolverJsonTraceRunning ? 'Building…' : 'Build / refresh resolver index');
  // Red until the resolver index has actually been built for this visit.
  if (buildBtn.style && !state.resolverJsonTraceRunning && !state.resolverJsonTraceResult) {
    Object.assign(buildBtn.style, { background: '#7f1d1d', border: '1px solid #ef4444', color: '#fecaca', fontWeight: '700' });
    buildBtn.title = 'Resolver index has not been built yet — click to build.';
  }
  actions.append(buildBtn);
  actions.append(actionButton('save-resolver-json-config', 'Save to config'));
  actions.append(createElement('span', state.resolverJsonTraceWriteBackStatus || 'Resolver config not saved yet.', 'xml-cii-phase-help'));
  section.appendChild(actions);

  renderDelimiterControls(section, state);
  
  const metrics = createElement('div', '', 'xml-cii-resolver-metrics');
  metrics.append(
    metric('XML nodes', stat(result, 'xmlNodeCount')),
    metric('Node keys', stat(result, 'nodeKeyCount')),
    metric('PS keys', stat(result, 'psKeyCount')),
    metric('POS keys', stat(result, 'posKeyCount'))
  );
  section.appendChild(metrics);
  
  const diagnostics = result?.diagnostics || [];
  if (diagnostics.length) {
    const diagSection = createElement('div', '', 'xml-cii-resolver-diagnostics-container');
    if (diagSection.style) Object.assign(diagSection.style, { marginTop: '16px', borderTop: '1px solid rgba(148, 163, 184, 0.08)', paddingTop: '16px' });
    diagSection.appendChild(createElement('h4', 'Resolver Diagnostics', 'xml-cii-section-subtitle'));
    const diagData = diagnostics.map(d => ({
      type: d.type,
      rows: d.rows !== undefined ? d.rows : (d.sourceKind !== undefined ? d.sourceKind : (d.xmlNodeCount !== undefined ? d.xmlNodeCount : ''))
    }));
    diagSection.appendChild(table(['Type', 'Rows'], diagData, 'No diagnostics available.'));
    section.appendChild(diagSection);
  }
  
  parent.appendChild(section);
}


function renderJsonConfig(parent, state) {
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'JSON Config'));
  const config = appendLabeledControl(section, 'Alias/config JSON:', createElement('textarea'));
  config.value = JSON.stringify(state.resolverJsonTraceConfig || {}, null, 2);
  config.dataset.field = 'resolver-json-config';
  parent.appendChild(section);
}

function renderTraceTreeHtml(parent, state) {
  const result = state.resolverJsonTraceResult;
  const traceRows = result?.matchedFacts || [];
  const delimiter = state.regexTesterConfig?.tokenDelimiter || '-';
  const treeData = buildAdaptedJsonTraceTree(traceRows, delimiter);
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'Evidence Trace Tree (Collapsible)'));
  if (!treeData.length) {
    section.appendChild(createElement('div', 'No JSON evidence matched to branch names. Build resolver index or upload staged JSON.', 'xml-cii-phase-help'));
    parent.appendChild(section);
    return;
  }
  const container = createElement('div', '', 'xml-cii-tree-container');
  if (container.style) Object.assign(container.style, { maxHeight: '400px', overflowY: 'auto', backgroundColor: '#0b1329', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '8px', padding: '12px' });
  const renderPosition = (p) => `
    <details style="margin-left: 12px; margin-top: 4px;">
      <summary style="font-size: 0.78rem; color: #fbbf24; cursor: pointer; list-style-type: '📍 ';">${p.label} (${p.count} items)</summary>
      <div style="margin-left: 18px; font-size: 0.74rem; color: #94a3b8; font-family: monospace; border-left: 2px solid rgba(148,163,184,0.15); padding-left: 6px; margin-top: 2px; white-space: pre-wrap; word-break: break-all;">
        ${p.concatenated}
      </div>
    </details>
  `;
  const renderBore = (s) => `
    <details style="margin-left: 12px; margin-top: 4px;">
      <summary style="font-size: 0.84rem; color: #e2e8f0; font-weight: bold; cursor: pointer; list-style-type: '🪈 ';">Bore: ${s.bore} (${s.count} items)</summary>
      ${s.positions.map(renderPosition).join('')}
    </details>
  `;
  const renderBranch = (b) => `
    <details style="margin-top: 6px; border-bottom: 1px solid rgba(148,163,184,0.06); padding-bottom: 6px;">
      <summary style="font-size: 0.88rem; color: #38bdf8; font-weight: bold; cursor: pointer; list-style-type: '🌿 ';">Branch: ${b.branchName} (${b.count} rows)</summary>
      ${b.bores.map(renderBore).join('')}
    </details>
  `;
  container.innerHTML = treeData.map(renderBranch).join('');
  section.appendChild(container);
  parent.appendChild(section);
}

function joinValues(values, cfg) {
  const unique = [...new Set(values.map(v => String(v ?? '').trim()).filter(Boolean))];
  if (!unique.length) return '(none)';
  if (!cfg || cfg.useDelimiter !== true) return unique[0];
  if (cfg.joinMode === 'all') return values.map(v => String(v ?? '').trim()).filter(Boolean).join(cfg.delimiter || '|');
  return unique.join(cfg.delimiter || '|');
}

function formatFactForTab(f) {
  const raw = f.raw || {};
  const attrs = raw.attributes || raw || {};
  const dtxr = String(attrs.DTXR || attrs.ISONOTE || attrs.DESCRIPTION || raw.type || '').trim();
  const name = String(attrs.NAME || '').trim();
  const gap = String(attrs.CMPSUPGAP || '').trim();
  
  let suffix = '';
  const parts = [];
  if (name) parts.push(`NAME=${name}`);
  if (gap) parts.push(`CMPSUPGAP=${gap}`);
  if (parts.length) {
    suffix = `(${parts.join(',')})`;
  }
  return dtxr + suffix;
}

function renderXmlNodeWiseTraceTable(parent, state) {
  const result = state.resolverJsonTraceResult;
  const nodes = result?.nodes || [];
  const resolvedFacts = result?.resolvedFacts || [];
  const cfg = state.resolverJsonTraceConfig || {};
  
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'XML Node Wise Trace builder'));
  
  if (!nodes.length) {
    section.appendChild(createElement('div', 'No XML nodes parsed. Make sure you load the source XML and rebuild index.', 'xml-cii-phase-help'));
    parent.appendChild(section);
    return;
  }
  
  const posToNodeKey = new Map();
  for (const fact of resolvedFacts) {
    const nk = fact.nodeKeys?.[0] || '';
    if (nk && nk !== '-1' && fact.posKey && fact.posKey !== '(none)') {
      posToNodeKey.set(fact.posKey, nk);
    }
  }
  
  const nodeWiseRows = resolvedFacts.map(fact => {
    let xmlNodeVal = fact.nodeKeys?.[0] || '';
    if ((!xmlNodeVal || xmlNodeVal === '-1') && fact.posKey && posToNodeKey.has(fact.posKey)) {
      xmlNodeVal = posToNodeKey.get(fact.posKey);
    }
    return {
      xmlNode: xmlNodeVal || `Node ${fact.xmlIndex}`,
      xmlBranch: fact.branchName || '',
      componentType: fact.tagName || 'Node',
      posBasis: fact.posKey || '(none)',
      dtxrPosValue: fact.dtxrPosValue || '(none)',
      dtxrPsValue: fact.dtxrPsValue || '(none)',
      jsonNodeNo: String(fact.xmlIndex || ''),
      matchType: fact.matchedBy?.join('+') || 'none',
      status: fact.hitCount > 0 ? 'RESOLVED' : 'UNRESOLVED'
    };
  });

  
  const filterInput = createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = '🔍 Filter node trace...';
  if (filterInput.style) Object.assign(filterInput.style, { width: '100%', padding: '8px 12px', marginBottom: '10px', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.3)', color: '#fff', fontSize: '0.88rem' });
  
  section.appendChild(filterInput);
  
  const tableEl = table(
    ['XML Node', 'XML Branch', 'Type', 'JsonNodeNo', 'Match Type', 'POS Basis', 'DTXR_POS Value', 'DTXR_PS Value', 'Status'],
    nodeWiseRows,
    'No trace rows matched.',
    'xml-cii-node-wise-table'
  );
  
  filterInput.addEventListener('input', () => {
    const q = filterInput.value.toLowerCase().trim();
    const trs = tableEl.querySelectorAll('tbody tr');
    trs.forEach((tr) => {
      tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  
  section.appendChild(tableEl);
  parent.appendChild(section);
}

function renderDtxrPosTree(parent, result) {
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'JSON Trace Tree (Branch → Bore → DTXR_POS)'));
  section.appendChild(createElement('p', 'Support/component JSON rows are grouped by OWNER branch, actual bore fields, and POSI/POS; DTXR leaves include NAME and CMPSUPGAP so the same text can be used by preview, node trace, weight review, and restraint gap mapping.', 'xml-cii-phase-help'));
  
  const filterInput = createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = '🔍 Filter trace tree...';
  if (filterInput.style) Object.assign(filterInput.style, { width: '100%', padding: '8px 12px', marginBottom: '10px', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.3)', color: '#fff', fontSize: '0.88rem' });
  section.appendChild(filterInput);

  const tableEl = table(['Branch', 'Bore', 'POS', 'DTXR_POS'], rows(result?.traceRows), 'No branch/bore/POS DTXR groups found in staged JSON.', 'xml-cii-json-trace-table');
  
  filterInput.addEventListener('input', () => {
    const q = filterInput.value.toLowerCase().trim();
    const trs = tableEl.querySelectorAll('tbody tr');
    trs.forEach((tr) => {
      tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  
  section.appendChild(tableEl);
  parent.appendChild(section);
}

export function renderStandaloneResolverJsonTracePanel(card, state, stateRef, render) {
  if (state.sourceKind === 'inputxml') {
    card.appendChild(createElement('p', 'InputXML mode does not require XML resolver index or staged JSON trace workflow. This phase is optional and intentionally not applied.', 'xml-cii-phase-help'));
    return;
  }
  
  const subTabId = state.jsonTraceActiveSubTabId || 'index';
  
  let result = state.resolverJsonTraceResult;
  if (!result && state.sourceText && state.stagedJsonText) {
    result = runStandaloneResolverJsonTrace({
      sourceText: state.sourceText,
      stagedJsonText: state.stagedJsonText,
      jsonConfig: state.resolverJsonTraceConfig,
      supportConfigJson: state.supportConfigJson
    });
    stateRef.current.resolverJsonTraceResult = result;
  }
  
  const container = createElement('div', '', 'xml-cii-sub-tabs-layout');
  
  const rail = createElement('nav', '', 'xml-cii-sub-nav-rail');
  rail.setAttribute('aria-label', 'Resolver sub-tabs');
  
  const subTabs = [
    { id: 'index', label: '⚙️ Config & Index' },
    { id: 'tree', label: '🌿 Evidence Tree' },
    { id: 'nodeTrace', label: '📋 XML Node Wise Trace' },
    { id: 'matched', label: '✅ Matched Facts' },
    { id: 'rejected', label: '❌ Rejected Facts' }
  ];
  
  const subTabHasData = {
    tree: rows(result?.matchedFacts).length > 0,
    nodeTrace: rows(result?.nodes).length > 0 && rows(result?.resolvedFacts).length > 0,
    matched: rows(result?.matchedFacts).length > 0,
    rejected: rows(result?.rejectedFacts).length > 0,
  };

  for (const sub of subTabs) {
    const btn = createElement('button', sub.label, 'xml-cii-sub-phase-pill');
    btn.type = 'button';
    btn.dataset.jsonTraceSubTab = sub.id;
    btn.classList.toggle('is-active', subTabId === sub.id);
    if (subTabHasData[sub.id] && btn.style) {
      Object.assign(btn.style, { color: '#8be28b', border: '1px solid #2f855a' });
      btn.title = 'Data is available in this sub-tab.';
    }
    rail.appendChild(btn);
  }
  
  container.appendChild(rail);
  
  const workspace = createElement('div', '', 'xml-cii-sub-workspace');
  
  if (subTabId === 'index') {
    renderResolverIndex(workspace, state);
    renderJsonConfig(workspace, state);
  } else if (subTabId === 'tree') {
    renderTraceTreeHtml(workspace, state);
  } else if (subTabId === 'nodeTrace') {
    renderXmlNodeWiseTraceTable(workspace, state);
  } else if (subTabId === 'matched') {
    const matchedList = result?.matchedFacts || [];
    workspace.appendChild(table(['Path', 'Node', 'PS', 'POS', 'Hits'], matchedList, 'No matched JSON facts yet.'));
  } else if (subTabId === 'rejected') {
    const rejectedList = result?.rejectedFacts || [];
    workspace.appendChild(table(['Path', 'Node', 'PS', 'POS', 'Hits'], rejectedList, 'No rejected JSON facts.'));
  }
  
  container.appendChild(workspace);
  card.appendChild(container);
}
