import { prepareXmlCiiModeBRuntimeSource } from '../../../converters/xml-cii2019-core/topology/xml-cii-mode-b-runtime.js?v=20260930-modeb05-ui-1';
import { createElement } from './xml-cii-adapted-dom.js?v=20260813-mode-a-full-propagation-2';

export const XML_CII_EXECUTION_MODE_A = 'mode-a';
export const XML_CII_EXECUTION_MODE_B = 'mode-b';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function xmlCiiExecutionMode(state = {}) {
  return state.multiSourceExecutionMode === XML_CII_EXECUTION_MODE_B
    ? XML_CII_EXECUTION_MODE_B
    : XML_CII_EXECUTION_MODE_A;
}

export function enabledModeBSources(state = {}) {
  return (Array.isArray(state.sourceBatch?.sources) ? state.sourceBatch.sources : [])
    .filter((source) => source?.enabled !== false && text(source?.sourceText))
    .map((source) => ({
      sourceId: text(source.sourceId),
      fileName: text(source.fileName || source.sourceFile?.name || 'source.xml'),
      sourceDigest: text(source.sourceDigest),
      sourceText: String(source.sourceText || ''),
    }));
}

export function inspectXmlCiiModeBPreparation(state = {}) {
  const sources = enabledModeBSources(state);
  if (xmlCiiExecutionMode(state) !== XML_CII_EXECUTION_MODE_B) {
    return { status: 'INACTIVE', ready: false, sources, message: 'Mode A is selected.' };
  }
  if (sources.length < 2) {
    return {
      status: 'BLOCKED',
      ready: false,
      sources,
      code: 'MODEB_NEEDS_TWO_SOURCES',
      message: 'Mode B requires at least two enabled PSI116 XML sources.',
    };
  }
  try {
    const prepared = prepareXmlCiiModeBRuntimeSource({
      splitDocuments: sources.map((source) => ({ fileName: source.fileName, xmlText: source.sourceText })),
      sourceName: 'mode-b-composite.xml',
    });
    const ambiguous = Number(prepared.evidence?.ambiguousCandidateCount || 0);
    const ready = ambiguous === 0;
    return {
      status: ready ? 'READY' : 'BLOCKED',
      ready,
      sources,
      prepared,
      code: ready ? '' : 'MODEB_AMBIGUOUS_TOPOLOGY',
      message: ready
        ? 'Mode B topology preparation is deterministic. Source-local parity freeze is still required before Run.'
        : `${ambiguous} ambiguous topology candidate(s) block Mode B preparation.`,
      sourceOrder: (prepared.documents || []).map((row, index) => ({
        order: index + 1,
        documentId: text(row.documentId),
        fileName: text(row.fileName),
        contentFingerprint: text(row.contentFingerprint),
      })),
      topology: {
        sourceDocumentCount: Number(prepared.evidence?.sourceDocumentCount || 0),
        acceptedCrossDocumentEdgeCount: Number(prepared.evidence?.acceptedCrossDocumentEdgeCount || 0),
        insufficientEvidenceCandidateCount: Number(prepared.evidence?.insufficientEvidenceCandidateCount || 0),
        ambiguousCandidateCount: ambiguous,
        sourceJunctionGroupCount: Number(prepared.evidence?.sourceJunctionAliasGroupCount || 0),
        sourceJunctionOccurrenceCount: Number(prepared.evidence?.sourceJunctionAliasCount || 0),
        crossDocumentAliasCount: Number(prepared.evidence?.junctionAliasCount || 0),
        materializedNodeCount: Number(prepared.evidence?.materializedNodeCount || 0),
        sourceDigest: text(prepared.evidence?.sourceDigest),
      },
      aliases: Array.isArray(prepared.aliases) ? prepared.aliases.map((alias) => ({ ...alias })) : [],
    };
  } catch (error) {
    return {
      status: 'BLOCKED',
      ready: false,
      sources,
      code: 'MODEB_PREPARATION_FAILED',
      message: error?.message || String(error),
      error,
    };
  }
}

function button(label, selected) {
  const control = createElement('button', label);
  control.type = 'button';
  Object.assign(control.style || {}, {
    padding: '7px 11px',
    borderRadius: '6px',
    border: selected ? '1px solid #60a5fa' : '1px solid #475569',
    background: selected ? '#1d4ed8' : '#172033',
    color: selected ? '#eff6ff' : '#cbd5e1',
    cursor: 'pointer',
    fontWeight: selected ? '700' : '600',
    fontSize: '11px',
  });
  return control;
}

function statusBadge(value, good) {
  const badge = createElement('span', value);
  Object.assign(badge.style || {}, {
    border: `1px solid ${good ? '#16a34a' : '#f59e0b'}`,
    background: good ? '#052e16' : '#422006',
    color: good ? '#bbf7d0' : '#fde68a',
    borderRadius: '999px',
    padding: '2px 7px',
    fontSize: '10px',
    fontWeight: '700',
  });
  return badge;
}

function decorateInventory(root, mode) {
  const panel = root.querySelector?.('[data-mode-a-panel="source-inventory"]');
  if (!panel) return;
  const heading = panel.querySelector?.('.model-converters-workflow-section-title');
  const note = panel.querySelector?.('.model-converters-workflow-detail-note');
  if (mode === XML_CII_EXECUTION_MODE_B) {
    if (heading) heading.textContent = 'Multiple XML — Composite Model (Mode B)';
    if (note) note.textContent = 'Enabled XML files retain collision-safe source identity and source-local review state. Topology is composed only by the qualified Mode B authority; duplicate engineering labels are not global identity.';
  } else {
    if (heading) heading.textContent = 'Multiple XML — Separate Models (Mode A)';
    if (note) note.textContent = 'Each enabled XML is processed independently. Repeated Branchname text is isolated by branch occurrence; original engineering names are preserved.';
  }
  const input = root.querySelector?.('[data-field="source-file"]');
  if (input) input.title = mode === XML_CII_EXECUTION_MODE_B
    ? 'Select two or more PSI116 XML files for semantic Mode B composition. Mode A remains the default.'
    : 'Select one or more PSI116 XML files. Each file remains a separate model.';
}

function renderPreparation(panel, report) {
  const status = createElement('div', '', 'model-converters-workflow-detail-note');
  status.append(statusBadge(report.status, report.ready), document.createTextNode(` ${report.message}`));
  panel.appendChild(status);
  if (!report.ready || !report.prepared) return;

  const order = createElement('div', '', 'model-converters-workflow-master-card');
  Object.assign(order.style || {}, { marginTop: '8px', padding: '8px 10px' });
  order.appendChild(createElement('strong', 'Deterministic runtime source order'));
  const list = createElement('ol');
  for (const row of report.sourceOrder || []) {
    const item = createElement('li', `${row.fileName} · ${row.documentId} · ${row.contentFingerprint}`);
    item.style.fontSize = '11px';
    list.appendChild(item);
  }
  order.appendChild(list);
  panel.appendChild(order);

  const t = report.topology || {};
  panel.appendChild(createElement(
    'div',
    `Topology preview: ${t.sourceDocumentCount} sources · ${t.materializedNodeCount} vertices · ${t.acceptedCrossDocumentEdgeCount} accepted cross-document join(s) · ${t.insufficientEvidenceCandidateCount} insufficient candidate(s) · ${t.ambiguousCandidateCount} ambiguous · ${t.sourceJunctionGroupCount} same-source junction group(s) / ${t.sourceJunctionOccurrenceCount} governed occurrence(s) · digest ${t.sourceDigest || 'n/a'}.`,
    'xml-cii-phase-help',
  ));

  if (report.aliases?.length) {
    const trace = createElement('details');
    const summary = createElement('summary', `Accepted runtime bridge trace (${report.aliases.length})`);
    summary.style.cursor = 'pointer';
    trace.appendChild(summary);
    for (const alias of report.aliases) {
      trace.appendChild(createElement(
        'div',
        `${alias.upstreamSourceIdentity || '?'} → ${alias.downstreamSourceIdentity || '?'} · rendered Node ${alias.renderedNodeNumber ?? '?'}`,
        'xml-cii-phase-help',
      ));
    }
    panel.appendChild(trace);
  }
}

export function renderXmlCiiExecutionModePanel(root, stateRef, render) {
  const mode = xmlCiiExecutionMode(stateRef.current);
  const panel = createElement('section', '', 'model-converters-workflow-master-card');
  panel.dataset.xmlCiiExecutionModePanel = 'true';
  Object.assign(panel.style || {}, {
    marginBottom: '12px',
    padding: '10px 12px',
    border: '1px solid #334155',
    borderRadius: '8px',
  });
  panel.appendChild(createElement('div', 'Multi-XML execution mode', 'model-converters-workflow-section-title'));
  const controls = createElement('div');
  Object.assign(controls.style || {}, { display: 'flex', gap: '8px', margin: '8px 0' });
  const modeA = button('Mode A — Separate Models', mode === XML_CII_EXECUTION_MODE_A);
  const modeB = button('Mode B — Composite Model', mode === XML_CII_EXECUTION_MODE_B);
  modeA.dataset.xmlCiiExecutionMode = XML_CII_EXECUTION_MODE_A;
  modeB.dataset.xmlCiiExecutionMode = XML_CII_EXECUTION_MODE_B;
  controls.append(modeA, modeB);
  panel.appendChild(controls);
  panel.appendChild(createElement(
    'div',
    mode === XML_CII_EXECUTION_MODE_B
      ? 'Mode B is explicit, non-default, and not production-authorized. Topology preparation is shown before any composite Run can be released.'
      : 'Mode A is the default: every enabled XML remains an independent model and keeps its existing workflow behavior.',
    'xml-cii-phase-help',
  ));

  const select = (nextMode) => {
    if (nextMode === xmlCiiExecutionMode(stateRef.current)) return;
    stateRef.current = {
      ...stateRef.current,
      multiSourceExecutionMode: nextMode,
      modeBRunStatus: '',
      modeBRunResult: null,
    };
    render?.();
  };
  modeA.addEventListener('click', () => select(XML_CII_EXECUTION_MODE_A));
  modeB.addEventListener('click', () => select(XML_CII_EXECUTION_MODE_B));

  if (mode === XML_CII_EXECUTION_MODE_B) renderPreparation(panel, inspectXmlCiiModeBPreparation(stateRef.current));
  root.prepend(panel);
  decorateInventory(root, mode);
  return panel;
}
