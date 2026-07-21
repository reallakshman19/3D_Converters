import { createElement, downloadTextFile } from './xml-cii-adapted-dom.js';
import { updateWorkflowState } from './xml-cii-adapted-state.js';
import {
  autoMapTraceTableFields,
  headersFromTraceRows,
  rowsToTraceTableText,
} from '../xml-cii-table-trace-source.js';
import { activeProfileFor, normalizeTraceTableConfig } from '../xml-cii-table-trace-config.js';
import {
  buildSupportFamilyDiagnosticsCsv,
  buildSupportFamilyMembersCsv,
  buildSupportFamilyReport,
  buildSupportFamilySummaryCsv,
} from '../xml-cii-support-family-report.js';

function rows(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }

function button(label, action, disabled = false) {
  const element = createElement('button', label);
  element.type = 'button';
  element.dataset.supportFamilyAction = action;
  element.disabled = disabled;
  if (disabled && element.style) Object.assign(element.style, { opacity: '0.45', cursor: 'not-allowed' });
  return element;
}

function metric(label, value) {
  const item = createElement('div', '', 'xml-cii-resolver-metric');
  item.append(createElement('span', label), createElement('strong', String(value ?? 0)));
  return item;
}

function table(headers, data, emptyText) {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableElement = createElement('table', '', 'xml-cii-resolver-table');
  if (tableElement.style) Object.assign(tableElement.style, { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#cbd5e1', background: '#0f172a' });
  const head = createElement('thead');
  const headRow = createElement('tr');
  for (const header of headers) {
    const cell = createElement('th', header);
    if (cell.style) Object.assign(cell.style, { padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap', color: '#94a3b8', background: '#1e293b' });
    headRow.appendChild(cell);
  }
  head.appendChild(headRow);
  const body = createElement('tbody');
  for (const row of data.slice(0, 1000)) {
    const bodyRow = createElement('tr');
    for (const header of headers) {
      const cell = createElement('td', text(row?.[header]));
      if (cell.style) Object.assign(cell.style, { padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.08)', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' });
      bodyRow.appendChild(cell);
    }
    body.appendChild(bodyRow);
  }
  tableElement.append(head, body);
  const wrapper = createElement('div');
  if (wrapper.style) Object.assign(wrapper.style, { maxHeight: '380px', overflow: 'auto', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '8px' });
  wrapper.appendChild(tableElement);
  return wrapper;
}

function filteredTable(headers, data, emptyText, placeholder) {
  const section = createElement('div');
  const filter = createElement('input');
  filter.type = 'search';
  filter.placeholder = placeholder;
  if (filter.style) Object.assign(filter.style, { width: '100%', padding: '8px 10px', marginBottom: '8px', borderRadius: '6px', border: '1px solid rgba(148,163,184,0.2)', background: '#0f172a', color: '#e2e8f0' });
  const rendered = table(headers, data, emptyText);
  filter.addEventListener('input', () => {
    const query = filter.value.toLowerCase().trim();
    rendered.querySelectorAll?.('tbody tr').forEach((row) => { row.style.display = !query || row.textContent.toLowerCase().includes(query) ? '' : 'none'; });
  });
  section.append(filter, rendered);
  return section;
}

function jsonResolverResult(state) {
  if (state.resolverJsonTraceJsonResult) return state.resolverJsonTraceJsonResult;
  return state.resolverJsonTraceResult?.sourceKind === 'table' ? null : state.resolverJsonTraceResult;
}

function loadMembersIntoTraceState(state, report) {
  const rawRows = rows(report?.members).map((row, index) => ({ _rowIndex: index + 2, ...row }));
  const traceConfig = normalizeTraceTableConfig(state.jsonTraceTableConfig);
  const headers = headersFromTraceRows(rawRows);
  const profile = activeProfileFor(headers, traceConfig);
  return updateWorkflowState(state, {
    jsonTraceTableRows: rawRows,
    jsonTraceTableText: rowsToTraceTableText(rawRows),
    jsonTraceTableFieldMap: autoMapTraceTableFields(headers, rawRows, traceConfig),
    jsonTraceTableConfig: traceConfig,
    jsonTraceTableSourceName: 'SupportFamilyMembers.csv',
    jsonTraceTableSheetNames: [],
    jsonTraceTableActiveSheet: '',
    jsonTraceTableWorkbookData: null,
    jsonTraceTableStatus: `Loaded ${rawRows.length} Support Family member row(s). Profile ${profile.label} (${profile.confidence}%). Review mapping, then build table trace.`,
    supportFamilyReportStatus: `Loaded ${rawRows.length} member row(s) into CSV/XLS Trace without replacing the JSON resolver result.`,
    jsonTraceActiveSubTabId: 'tableImport',
  });
}

function downloadReport(kind, report) {
  const config = {
    members: ['SupportFamilyMembers.csv', buildSupportFamilyMembersCsv],
    summary: ['SupportFamilySummary.csv', buildSupportFamilySummaryCsv],
    diagnostics: ['SupportFamilyDiagnostics.csv', buildSupportFamilyDiagnosticsCsv],
  }[kind];
  if (!config) return;
  downloadTextFile(config[0], config[1](report), 'text/csv;charset=utf-8');
}

function bindActions(container, report, stateRef, render) {
  container.querySelector('[data-support-family-action="refresh"]')?.addEventListener('click', () => {
    stateRef.current = updateWorkflowState(stateRef.current, { supportFamilyReportStatus: `Refreshed from resolver ledger: ${report.members.length} member row(s), ${report.summaries.length} family row(s), ${report.diagnostics.length} diagnostic row(s).` });
    render();
  });
  container.querySelector('[data-support-family-action="load"]')?.addEventListener('click', () => {
    stateRef.current = loadMembersIntoTraceState(stateRef.current, report);
    render();
  });
  for (const kind of ['members', 'summary', 'diagnostics']) {
    container.querySelector(`[data-support-family-action="download-${kind}"]`)?.addEventListener('click', () => downloadReport(kind, report));
  }
}

function sectionTitle(title, count) {
  const bar = createElement('div');
  if (bar.style) Object.assign(bar.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' });
  bar.append(createElement('h3', title), createElement('span', `${count} row(s)`, 'xml-cii-phase-help'));
  return bar;
}

export function renderStandaloneSupportFamilyReport(parent, state, stateRef, render) {
  const source = jsonResolverResult(state);
  const report = buildSupportFamilyReport(source);
  const panel = createElement('section', '', 'xml-cii-resolver-panel');
  panel.appendChild(createElement('h3', 'Support Family Report'));
  panel.appendChild(createElement('p', 'Derived only from the authoritative resolver position groups. It does not parse staged JSON, change resolver precedence, or mutate XML/InputXML/CII artifacts.', 'xml-cii-phase-help'));
  if (!source) panel.appendChild(createElement('p', 'Build the JSON resolver index before using this report.', 'xml-cii-phase-help'));
  if (report.limitations.length) panel.appendChild(createElement('p', report.limitations.join(' '), 'xml-cii-phase-help'));

  const actions = createElement('div', '', 'xml-cii-resolver-actions');
  if (actions.style) Object.assign(actions.style, { display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '10px 0' });
  const disabled = report.members.length === 0;
  actions.append(
    button('Refresh from Resolver Ledger', 'refresh', !source),
    button('Load Members into CSV/XLS Trace', 'load', disabled),
    button('Download Members CSV', 'download-members', disabled),
    button('Download Summary CSV', 'download-summary', report.summaries.length === 0),
    button('Download Diagnostics CSV', 'download-diagnostics', report.diagnostics.length === 0),
  );
  panel.appendChild(actions);
  if (state.supportFamilyReportStatus) panel.appendChild(createElement('p', state.supportFamilyReportStatus, 'xml-cii-phase-help'));

  const metrics = createElement('div', '', 'xml-cii-resolver-metrics');
  metrics.append(
    metric('Ledger entries', report.counts.stagedEntries),
    metric('Support identities', report.counts.supportIdentities),
    metric('Support families', report.counts.supportFamilies),
    metric('Positioned entries', report.counts.positionedEntries),
    metric('DTXR entries', report.counts.dtxrEntries),
    metric('Diagnostics', report.counts.diagnostics),
  );
  panel.appendChild(metrics);

  panel.appendChild(sectionTitle('Family Summary', report.summaries.length));
  panel.appendChild(filteredTable(['Support Family Key', 'Member Count', 'Member Identities', 'DTXR Fallback Count', 'Family Status'], report.summaries, 'No branch-qualified support families are available.', 'Filter support family summary...'));
  panel.appendChild(sectionTitle('Family Members', report.members.length));
  panel.appendChild(filteredTable(['Support Family Key', 'Name of the element', 'TYPE', 'PIPE', 'Position', 'BORE', 'DTXR', 'DTXR_POS', 'DTXR_PS', 'DTXR_SOURCE', 'DTXR_STATUS', 'JsonNodeNo', 'JSON Path', 'Resolution Status', 'Diagnostics'], report.members, 'No normalized resolver-ledger members are available.', 'Filter support family members...'));
  panel.appendChild(sectionTitle('Diagnostics', report.diagnostics.length));
  panel.appendChild(filteredTable(['Severity', 'Code', 'Support Family', 'Support Identity', 'PIPE', 'JsonNodeNo', 'JSON Path', 'Message'], report.diagnostics, 'No support-family diagnostics were generated.', 'Filter support family diagnostics...'));
  parent.appendChild(panel);
  bindActions(panel, report, stateRef, render);
}

export function enhanceStandaloneResolverSupportFamilyReport(card, state, stateRef, render) {
  const container = card.querySelector?.('.xml-cii-sub-tabs-layout');
  const rail = container?.querySelector?.('.xml-cii-sub-nav-rail');
  const workspace = container?.querySelector?.('.xml-cii-sub-workspace');
  if (!rail || !workspace) return;
  const active = state.jsonTraceActiveSubTabId === 'supportFamily';
  const source = jsonResolverResult(state);
  const report = buildSupportFamilyReport(source);
  const tab = createElement('button', '🧩 Support Family Report', 'xml-cii-sub-phase-pill');
  tab.type = 'button';
  tab.dataset.jsonTraceSubTab = 'supportFamily';
  tab.classList.toggle('is-active', active);
  if (report.members.length && tab.style) {
    Object.assign(tab.style, { color: '#8be28b', border: '1px solid #2f855a' });
    tab.title = `${report.members.length} support-family member row(s) are available.`;
  }
  rail.insertBefore(tab, rail.children?.[2] || null);
  if (active) renderStandaloneSupportFamilyReport(workspace, state, stateRef, render);
}
