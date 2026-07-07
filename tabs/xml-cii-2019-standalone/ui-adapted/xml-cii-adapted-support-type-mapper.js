import { parseSupportTypeMapperConfig } from '../xml-cii-support-type-mapper.js';
import { createElement } from './xml-cii-adapted-dom.js';

const KINDS = Object.freeze(['REST', 'GUIDE', 'LINESTOP', 'ANCHOR']);

function rows(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? ''); }

function button(action, label) {
  const el = createElement('button', label);
  el.type = 'button';
  el.dataset.action = action;
  return el;
}

function section(parent, title) {
  const el = createElement('section', '', 'xml-cii-weight-panel');
  el.appendChild(createElement('h3', title));
  parent.appendChild(el);
  return el;
}

function table(headers, data, emptyText) {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const el = createElement('table', '', 'xml-cii-weight-table');
  const head = createElement('thead');
  const hr = createElement('tr');
  for (const header of headers) hr.appendChild(createElement('th', header));
  head.appendChild(hr);
  el.append(head, tableBody(headers, data));
  return el;
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
  const key = { Evidence: 'evidenceText', Source: 'source', Kind: 'supportKind', CII: 'ciiKind', Preview: 'ciiPreview', Status: 'status', Level: 'level', Type: 'type', Message: 'message', Aliases: 'matchedAliases' }[header] || header;
  const value = item?.[key];
  return Array.isArray(value) ? value.join(', ') : value;
}

function mapperRows(state) {
  if (rows(state.supportTypeMapperConfig).length) return state.supportTypeMapperConfig;
  return parseSupportTypeMapperConfig({ supportConfigJson: state.supportConfigJson }).mapperRows;
}

function rowForKind(state, kind) {
  return mapperRows(state).find((row) => row.kind === kind) || { kind, aliases: [], ciiKind: '', ciiPreview: '' };
}

function renderMapperSection(parent, state, kind) {
  const row = rowForKind(state, kind);
  const panel = section(parent, `${kind} mapper section`);
  panel.appendChild(createElement('p', row.ciiPreview || 'No CII preview configured.', 'xml-cii-phase-help'));
  panel.appendChild(textarea(`support-mapper-aliases-${kind}`, 'aliases / detection text', rows(row.aliases).join('\n')));
  panel.appendChild(input(`support-mapper-cii-${kind}`, 'CII output kind preview', row.ciiKind));
}

function textarea(field, label, value) {
  const wrap = createElement('label', label);
  const control = createElement('textarea');
  control.dataset.field = field;
  control.value = value;
  wrap.appendChild(control);
  return wrap;
}

function input(field, label, value) {
  const wrap = createElement('label', label);
  const control = createElement('input');
  control.dataset.field = field;
  control.value = value;
  wrap.appendChild(control);
  return wrap;
}

function renderControls(parent, state) {
  const panel = section(parent, 'Test Input / Save to Config');
  panel.appendChild(textarea('support-mapper-test-input', 'support / restraint evidence text', state.supportTypeMapperTestInput || ''));
  panel.append(button('build-support-mapper', state.supportTypeMapperRunning ? 'Testing…' : 'Test support mapper'));
  panel.append(button('save-support-mapper', 'Save to Config'));
  panel.append(createElement('span', state.supportTypeMapperStatus || 'Support mapper not saved yet.', 'xml-cii-phase-help'));
}

function renderPreview(parent, result) {
  const panel = section(parent, 'CII Support Kind Preview');
  panel.appendChild(table(['Evidence', 'Source', 'Kind', 'CII', 'Preview', 'Status', 'Aliases'], rows(result?.previewRows), 'No support mapper preview yet.'));
}

function renderDiagnostics(parent, result) {
  const panel = section(parent, 'Mapper Diagnostics');
  panel.appendChild(table(['Level', 'Type', 'Message', 'Evidence'], rows(result?.diagnostics), 'No mapper diagnostics yet.'));
}

function renderRaw(parent, result) {
  const details = createElement('details', '', 'xml-cii-weight-panel');
  details.appendChild(createElement('summary', 'Raw JSON advanced/debug'));
  details.appendChild(createElement('pre', JSON.stringify(result || {}, null, 2)));
  parent.appendChild(details);
}

export function renderStandaloneSupportTypeMapperPanel(card, state) {
  card.appendChild(createElement('p', 'Edit REST/GUIDE/LINESTOP/ANCHOR detection rows, test support evidence, preview CII support kind, and save mapper rows into standalone config.', 'xml-cii-phase-help'));
  for (const kind of KINDS) renderMapperSection(card, state, kind);
  renderControls(card, state);
  renderPreview(card, state.supportTypeMapperResult);
  renderDiagnostics(card, state.supportTypeMapperResult);
  renderRaw(card, state.supportTypeMapperResult);
}
