import { createElement, appendLabeledControl } from './xml-cii-adapted-dom.js';

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function rowsOf(result, key) {
  return Array.isArray(result?.[key]) ? result[key] : [];
}

function rule(state, key) {
  return state.regexTesterConfig?.[key] || {};
}

function appendInput(parent, label, field, value, type = 'text') {
  const input = appendLabeledControl(parent, label, createElement('input'));
  input.type = type;
  input.value = value ?? '';
  input.dataset.field = field;
  return input;
}

function appendRuleInputs(parent, title, key, cfg) {
  const section = createElement('section', '', 'xml-cii-regex-rule-card');
  section.appendChild(createElement('h4', title));
  appendInput(section, 'Regex:', `regex-${key}-regex`, cfg.regex || '');
  appendInput(section, 'Group:', `regex-${key}-group`, cfg.group || 1, 'number');
  appendInput(section, 'Token position:', `regex-${key}-token`, cfg.tokenPosition || '', 'number');
  parent.appendChild(section);
}

function table(headers, rows, emptyText) {
  if (!rows.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', 'xml-cii-regex-table');
  const headRow = createElement('tr');
  for (const header of headers) headRow.appendChild(createElement('th', header));
  const thead = createElement('thead');
  thead.appendChild(headRow);
  tableEl.append(thead, tableBody(headers, rows));
  return tableEl;
}

function tableBody(headers, rows) {
  const body = createElement('tbody');
  for (const row of rows.slice(0, 50)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', text(row[fieldFor(header)])));
    body.appendChild(tr);
  }
  return body;
}

function fieldFor(header) {
  return {
    '#': 'sampleIndex',
    Source: 'source',
    Branchname: 'branchName',
    'Line Key': 'lineKey',
    Class: 'pipingClass',
    Rating: 'rating',
    Bore: 'bore',
    Status: 'status',
  }[header] || header;
}

function renderBranchSamples(parent, result) {
  const section = createElement('section', '', 'xml-cii-regex-panel');
  section.appendChild(createElement('h3', 'Branch Samples'));
  section.appendChild(table(['#', 'Source', 'Branchname'], rowsOf(result, 'branchSamples'), 'No XML branch samples loaded.'));
  parent.appendChild(section);
}

function renderLineKey(parent, state) {
  const section = createElement('section', '', 'xml-cii-regex-panel');
  section.appendChild(createElement('h3', 'Line Key Extraction'));
  appendRuleInputs(section, 'Line key rule', 'line-key', rule(state, 'lineKey'));
  parent.appendChild(section);
}

function renderClassRatingBore(parent, state) {
  const section = createElement('section', '', 'xml-cii-regex-panel');
  section.appendChild(createElement('h3', 'Piping Class / Rating / Bore'));
  appendRuleInputs(section, 'Piping class rule', 'piping-class', rule(state, 'pipingClass'));
  appendRuleInputs(section, 'Rating rule', 'rating', rule(state, 'rating'));
  appendRuleInputs(section, 'Bore / size rule', 'bore', rule(state, 'bore'));
  parent.appendChild(section);
}

function renderRegexRules(parent, state) {
  const section = createElement('section', '', 'xml-cii-regex-panel');
  section.appendChild(createElement('h3', 'Regex Rules'));
  appendInput(section, 'Token delimiter fallback:', 'regex-token-delimiter', state.regexTesterConfig?.tokenDelimiter || '-');
  const actions = createElement('div', '', 'xml-cii-regex-actions');
  actions.append(actionButton('test-regex', state.regexTesterRunning ? 'Testing…' : 'Test extraction'));
  actions.append(actionButton('save-regex-config', 'Save to config'));
  actions.append(createElement('span', state.regexTesterWriteBackStatus || 'Rules not saved yet.', 'xml-cii-phase-help'));
  section.appendChild(actions);
  parent.appendChild(section);
}

function actionButton(action, label) {
  const button = createElement('button', label);
  button.type = 'button';
  button.dataset.action = action;
  return button;
}

function renderMatched(parent, result) {
  const section = createElement('section', '', 'xml-cii-regex-panel');
  section.appendChild(createElement('h3', 'Matched Result Table'));
  section.appendChild(table(['#', 'Branchname', 'Line Key', 'Class', 'Rating', 'Bore', 'Status'], rowsOf(result, 'matchedRows'), 'No matched rows yet.'));
  parent.appendChild(section);
}

function renderRejected(parent, result) {
  const section = createElement('section', '', 'xml-cii-regex-panel');
  section.appendChild(createElement('h3', 'Rejected Samples'));
  section.appendChild(table(['#', 'Branchname', 'Line Key', 'Class', 'Rating', 'Bore', 'Status'], rowsOf(result, 'rejectedRows'), 'No rejected rows.'));
  parent.appendChild(section);
}

function renderDiagnostics(parent, result) {
  const details = createElement('details', '', 'xml-cii-regex-panel');
  details.appendChild(createElement('summary', 'Diagnostics'));
  details.appendChild(createElement('pre', JSON.stringify(result?.diagnostics || [], null, 2)));
  parent.appendChild(details);
}

export function renderStandaloneRegexTesterPanel(card, state) {
  if (state.sourceKind === 'inputxml') {
    card.appendChild(createElement('p', 'InputXML mode does not require XML Branchname regex extraction. This phase is intentionally not applied to InputXML.', 'xml-cii-phase-help'));
    return;
  }
  card.appendChild(createElement('p', 'Test branch-name regex and token fallback extraction before saving rules into standalone config.', 'xml-cii-phase-help'));
  renderRegexRules(card, state);
  renderLineKey(card, state);
  renderClassRatingBore(card, state);
  renderBranchSamples(card, state.regexTesterResult);
  renderMatched(card, state.regexTesterResult);
  renderRejected(card, state.regexTesterResult);
  renderDiagnostics(card, state.regexTesterResult);
}
