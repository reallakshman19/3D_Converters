import { createElement, appendLabeledControl } from './xml-cii-adapted-dom.js';

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

function table(headers, data, emptyText) {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', 'xml-cii-resolver-table');
  const head = createElement('thead');
  const hr = createElement('tr');
  for (const header of headers) hr.appendChild(createElement('th', header));
  head.appendChild(hr);
  tableEl.append(head, tableBody(headers, data));
  return tableEl;
}

function tableBody(headers, data) {
  const body = createElement('tbody');
  for (const item of data.slice(0, 25)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', text(item[fieldFor(header)])));
    body.appendChild(tr);
  }
  return body;
}

function fieldFor(header) {
  return {
    Path: 'path', Node: 'nodeKey', PS: 'psKey', POS: 'posKey', Hits: 'hitCount', Type: 'type', Rows: 'rows',
  }[header] || header;
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
  const metrics = createElement('div', '', 'xml-cii-resolver-metrics');
  metrics.append(metric('XML nodes', stat(result, 'xmlNodeCount')), metric('Node keys', stat(result, 'nodeKeyCount')), metric('PS keys', stat(result, 'psKeyCount')), metric('POS keys', stat(result, 'posKeyCount')));
  section.appendChild(metrics);
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

function renderResolvedData(parent, result) {
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'JSON Resolved Data'));
  section.appendChild(table(['Path', 'Node', 'PS', 'POS', 'Hits'], rows(result?.resolvedFacts), 'No resolved JSON facts yet.'));
  parent.appendChild(section);
}

function renderPsTester(parent, result) {
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'PS → Node'));
  section.appendChild(createElement('p', `Matched fact count: ${rows(result?.matchedFacts).length}`, 'xml-cii-phase-help'));
  section.appendChild(table(['Path', 'PS', 'Hits'], rows(result?.matchedFacts).filter((item) => item.psKey), 'No PS matches.'));
  parent.appendChild(section);
}

function renderPosTester(parent, result) {
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'POS → Node'));
  section.appendChild(createElement('p', `Rejected fact count: ${rows(result?.rejectedFacts).length}`, 'xml-cii-phase-help'));
  section.appendChild(table(['Path', 'POS', 'Hits'], rows(result?.matchedFacts).filter((item) => item.posKey), 'No POS matches.'));
  parent.appendChild(section);
}

function renderDiagnostics(parent, result) {
  const section = createElement('section', '', 'xml-cii-resolver-panel');
  section.appendChild(createElement('h3', 'Resolver Diagnostics'));
  section.appendChild(table(['Type', 'Rows'], rows(result?.diagnostics), 'No resolver diagnostics yet.'));
  parent.appendChild(section);
}

export function renderStandaloneResolverJsonTracePanel(card, state) {
  if (state.sourceKind === 'inputxml') {
    card.appendChild(createElement('p', 'InputXML mode does not require XML resolver index or staged JSON trace workflow. This phase is optional and intentionally not applied.', 'xml-cii-phase-help'));
    return;
  }
  card.appendChild(createElement('p', 'Build XML resolver indexes and resolve staged JSON facts by Node, PS, or POS evidence.', 'xml-cii-phase-help'));
  renderResolverIndex(card, state);
  renderJsonConfig(card, state);
  renderResolvedData(card, state.resolverJsonTraceResult);
  renderPsTester(card, state.resolverJsonTraceResult);
  renderPosTester(card, state.resolverJsonTraceResult);
  renderDiagnostics(card, state.resolverJsonTraceResult);
}
