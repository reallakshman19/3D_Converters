import { createElement } from './xml-cii-adapted-dom.js';

function rows(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? ''); }

function button(action, label) {
  const el = createElement('button', label);
  el.type = 'button';
  el.dataset.action = action;
  return el;
}

function table(headers, data, emptyText) {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', 'xml-cii-weight-table');
  const head = createElement('thead');
  const hr = createElement('tr');
  for (const header of headers) hr.appendChild(createElement('th', header));
  head.appendChild(hr);
  tableEl.append(head, tableBody(headers, data));
  return tableEl;
}

function tableBody(headers, data) {
  const body = createElement('tbody');
  for (const item of data.slice(0, 50)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', text(valueFor(item, header))));
    body.appendChild(tr);
  }
  return body;
}

function valueFor(item, header) {
  const key = {
    Issue: 'issueId', Type: 'componentType', Bore: 'bore', Rating: 'rating', Length: 'length', Weight: 'currentWeight', Candidate: 'candidateId', 'Candidate Weight': 'candidateWeight', 'Bore Score': 'boreScore', 'Rating Score': 'ratingScore', 'Length Score': 'lengthScore', 'Component Score': 'componentTypeScore', Total: 'totalScore', Selected: 'selectedCandidateId', Final: 'finalizedWeight', TypeCode: 'type', Rows: 'rows', Level: 'level', Source: 'source', Message: 'message'
  }[header] || header;
  const value = item?.[key];
  return typeof value === 'object' && value ? JSON.stringify(value) : value;
}

function section(parent, title) {
  const el = createElement('section', '', 'xml-cii-weight-panel');
  el.appendChild(createElement('h3', title));
  parent.appendChild(el);
  return el;
}

function renderControls(parent, state) {
  const panel = section(parent, 'Finalize Weight Match');
  panel.append(button('build-weight-match', state.weightMatchRunning ? 'Building…' : 'Build / refresh weight match report'));
  panel.append(button('finalize-weight-match', 'Finalize weight match'));
  panel.append(createElement('span', state.weightMatchStatus || 'Weight match not finalized yet.', 'xml-cii-phase-help'));
}

function renderIssues(parent, result) {
  const panel = section(parent, 'Zero / Missing Weight Issues');
  panel.appendChild(table(['Issue', 'Type', 'Bore', 'Rating', 'Length', 'Weight'], rows(result?.issueRows), 'No zero or missing weight issues.'));
}

function renderCandidates(parent, result) {
  const panel = section(parent, 'Candidate Matches');
  panel.appendChild(table(['Issue', 'Candidate', 'Type', 'Bore', 'Rating', 'Length', 'Candidate Weight', 'Total'], rows(result?.candidateRows), 'No candidate matches yet.'));
}

function renderScoring(parent, result) {
  const panel = section(parent, 'Bore / Rating / Length Scoring');
  panel.appendChild(table(['Issue', 'Candidate', 'Bore Score', 'Rating Score', 'Length Score', 'Component Score', 'Total'], rows(result?.candidateRows), 'No scored candidates yet.'));
}

function renderOverrides(parent, state) {
  const panel = section(parent, 'Overrides');
  const input = createElement('textarea');
  input.value = state.weightMatchOverridesJson || '{}';
  input.dataset.field = 'weight-match-overrides';
  panel.append(createElement('p', 'Override JSON maps issueId to candidateId.', 'xml-cii-phase-help'), input);
}

function renderFinalized(parent, result) {
  const panel = section(parent, 'Selected / Finalized Candidate');
  panel.appendChild(table(['Issue', 'Selected', 'Final'], rows(result?.finalizedRows), 'No finalized rows yet.'));
}

function renderDiagnostics(parent, result) {
  const panel = section(parent, 'Weight Diagnostics');
  panel.appendChild(table(['Level', 'Source', 'TypeCode', 'Rows', 'Message'], rows(result?.diagnostics), 'No weight diagnostics yet.'));
}

function renderRaw(parent, result) {
  const details = createElement('details', '', 'xml-cii-weight-panel');
  details.appendChild(createElement('summary', 'Raw JSON')); 
  details.appendChild(createElement('pre', JSON.stringify(result || {}, null, 2)));
  parent.appendChild(details);
}

export function renderStandaloneWeightMatchPanel(card, state) {
  card.appendChild(createElement('p', 'Review zero/missing weight issues, score weight-master candidates, apply overrides, and finalize selections into standalone config.', 'xml-cii-phase-help'));
  renderControls(card, state);
  renderIssues(card, state.weightMatchResult);
  renderCandidates(card, state.weightMatchResult);
  renderScoring(card, state.weightMatchResult);
  renderOverrides(card, state);
  renderFinalized(card, state.weightMatchResult);
  renderDiagnostics(card, state.weightMatchResult);
  renderRaw(card, state.weightMatchResult);
}
