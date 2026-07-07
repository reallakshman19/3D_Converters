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
  const head = createElement('thead');
  const hr = createElement('tr');
  for (const header of headers) hr.appendChild(createElement('th', header));
  head.appendChild(hr);
  tableEl.append(head, tableBody(headers, data));
  
  const wrapper = createElement('div');
  if (wrapper.style) Object.assign(wrapper.style, { maxHeight: '380px', overflowY: 'auto', border: '1px solid rgba(148,163,184,0.08)', borderRadius: '4px' });
  wrapper.appendChild(tableEl);
  return wrapper;
}

function tableBody(headers, data) {
  const body = createElement('tbody');
  for (const item of data.slice(0, 1000)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', text(item[fieldFor(header)])));
    body.appendChild(tr);
  }
  return body;
}

function fieldFor(header) {
  return {
    Path: 'path', Node: 'nodeKey', PS: 'psKey', POS: 'posKey', Hits: 'hitCount', Type: 'type', Rows: 'rows',
    'XML Node': 'xmlNode', 'XML Branch': 'xmlBranch', 'Type': 'componentType', 'JsonNodeNo': 'jsonNodeNo',
    'Match Type': 'matchType', 'DTXR_POS Value': 'dtxrPosValue', 'DTXR_PS Value': 'dtxrPsValue', 'Status': 'status'
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
  if (toggleLabel.style) toggleLabel.style.display = 'flex';
  if (toggleLabel.style) toggleLabel.style.alignItems = 'center';
  if (toggleLabel.style) toggleLabel.style.gap = '4px';
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

  parent.appendChild(bar);
}

function renderResolverIndex(parent, state) {
  const result = state.resolverJsonTraceResult;
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'Resolver Index'));
  
  const actions = createElement('div', '', 'xml-cii-resolver-actions');
  actions.append(actionButton('build-resolver-index', state.resolverJsonTraceRunning ? 'Building…' : 'Build / refresh resolver index'));
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
  const traceRows = result?.resolvedFacts || [];
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
  if (container.style) {
    Object.assign(container.style, {
      maxHeight: '400px',
      overflowY: 'auto',
      backgroundColor: '#0b1329',
      border: '1px solid rgba(148,163,184,0.12)',
      borderRadius: '8px',
      padding: '12px'
    });
  }
  
  const renderGroup = (g) => {
    const rowsHtml = g.rows.map(r => {
      const raw = r.raw || {};
      const attrs = raw.attributes || raw;
      const typeVal = raw.type || attrs.TYPE || attrs.type || '';
      
      const val1 = String(typeVal).trim();
      const val2 = String(attrs.DTXR && attrs.DTXR !== '---' ? attrs.DTXR : (attrs.ISONOTE || attrs.DESCRIPTION || '')).trim();
      const valConcat = [val1, val2].filter(Boolean).join('|');
      
      const parts = [];
      if (r.posKey) parts.push(`DTXR POS (${r.posKey})`);
      else if (r.psKey) parts.push(`DTXR PS (${r.psKey})`);
      else parts.push('unresolved');
      
      if (valConcat) parts.push(valConcat);
      const concatKey = parts.join('|');
      
      return `
        <div style="margin-left: 18px; font-size: 0.74rem; color: #94a3b8; font-family: monospace; border-left: 2px solid rgba(148,163,184,0.15); padding-left: 6px; margin-top: 2px;">
          #${r.path.match(/\[(\d+)\]/)?.[1] || '0'} key=${concatKey} path=${r.path}
        </div>
      `;
    }).join('');
    return `
      <details style="margin-left: 12px; margin-top: 4px;">
        <summary style="font-size: 0.78rem; color: #fbbf24; cursor: pointer; list-style-type: '📍 ';">Key: ${g.label} (${g.count} rows)</summary>
        ${rowsHtml}
      </details>
    `;
  };
  
  const renderCategory = (c) => {
    const labelColor = c.cat === 'dtxr_pos' ? '#38bdf8' : '#34d399';
    return `
      <details style="margin-left: 12px; margin-top: 4px;">
        <summary style="font-size: 0.8rem; color: ${labelColor}; font-weight: bold; cursor: pointer; list-style-type: '📁 ';">${c.cat} (${c.count} items)</summary>
        ${c.groups.map(renderGroup).join('')}
      </details>
    `;
  };
  
  const renderSize = (s) => `
    <details style="margin-left: 12px; margin-top: 4px;">
      <summary style="font-size: 0.84rem; color: #e2e8f0; font-weight: bold; cursor: pointer; list-style-type: '🪈 ';">Size: ${s.size} (${s.count} items)</summary>
      ${s.categories.map(renderCategory).join('')}
    </details>
  `;
  
  const renderBranch = (b) => `
    <details style="margin-top: 6px; border-bottom: 1px solid rgba(148,163,184,0.06); padding-bottom: 6px;">
      <summary style="font-size: 0.88rem; color: #38bdf8; font-weight: bold; cursor: pointer; list-style-type: '🌿 ';">Branch: ${b.branchName} (${b.count} rows)</summary>
      ${b.sizes.map(renderSize).join('')}
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
  
  const normKey = (v) => String(v ?? '').toUpperCase().replace(/\s+/g, '').replace(/[()]/g, '');
  
  // Map facts to XML node indexes via all three indexes
  const factsByXmlIndex = new Map();
  for (const fact of resolvedFacts) {
    const nodeHits = result.nodeIndex[normKey(fact.nodeKey)] || [];
    const psHits = result.psIndex[normKey(fact.psKey)] || [];
    const posHits = result.posIndex[normKey(fact.posKey)] || [];
    
    const uniqueXmlIndexes = new Set([
      ...nodeHits.map(n => n.xmlIndex),
      ...psHits.map(n => n.xmlIndex),
      ...posHits.map(n => n.xmlIndex)
    ]);
    
    for (const xmlIdx of uniqueXmlIndexes) {
      if (!factsByXmlIndex.has(xmlIdx)) factsByXmlIndex.set(xmlIdx, []);
      factsByXmlIndex.get(xmlIdx).push(fact);
    }
  }
  
  const nodeWiseRows = nodes.map((node) => {
    const matchingFacts = factsByXmlIndex.get(node.xmlIndex) || [];
    // Pull DTXR_POS from matched JSON facts' posKey (not the XML node's posKey which is raw coords)
    const posVals = matchingFacts.map(f => f.posKey).filter(Boolean);
    // Pull DTXR_PS from matched JSON facts' psKey
    const psVals = matchingFacts.map(f => f.psKey).filter(Boolean);
    // Fall back to XML node's own values if no facts matched
    const dtxrPosValue = posVals.length ? joinValues(posVals, cfg) : (node.posKey || '(none)');
    const dtxrPsValue = psVals.length ? joinValues(psVals, cfg) : (node.psKey || '(none)');
    return {
      xmlNode: node.nodeKeys[0] || `Node ${node.xmlIndex}`,
      xmlBranch: node.branchName || node.nodeKeys.join(', '),
      componentType: node.tagName,
      dtxrPosValue,
      dtxrPsValue,
      jsonNodeNo: matchingFacts.map(f => f.path.match(/\[(\d+)\]/)?.[1] || '').filter(Boolean).join(', ') || '(none)',
      matchType: matchingFacts.flatMap(f => f.matchedBy).filter((v, i, a) => a.indexOf(v) === i).join('+') || 'none',
      status: matchingFacts.length ? 'RESOLVED' : 'UNRESOLVED'
    };
  });

  
  const filterInput = createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = '🔍 Filter node trace...';
  if (filterInput.style) {
    Object.assign(filterInput.style, {
      width: '100%',
      padding: '8px 12px',
      marginBottom: '10px',
      borderRadius: '4px',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      background: 'rgba(15, 23, 42, 0.3)',
      color: '#fff',
      fontSize: '0.88rem'
    });
  }
  
  section.appendChild(filterInput);
  
  const tableEl = table(
    ['XML Node', 'XML Branch', 'Type', 'JsonNodeNo', 'Match Type', 'DTXR_POS Value', 'DTXR_PS Value', 'Status'],
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
  
  for (const sub of subTabs) {
    const btn = createElement('button', sub.label, 'xml-cii-sub-phase-pill');
    btn.type = 'button';
    btn.dataset.jsonTraceSubTab = sub.id;
    btn.classList.toggle('is-active', subTabId === sub.id);
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
