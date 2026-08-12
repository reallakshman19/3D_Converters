import { createAivAssessmentCsvTemplate } from '../converters/vibration/aiv/assessment-csv.js';
import { createAivSourceCsvTemplate } from '../converters/vibration/aiv/source-csv.js';
import { createAivSourceAssessmentCsvTemplate } from '../converters/vibration/aiv/source-assessment-csv.js';
import { renderAivQualificationWorkspaceHtml } from './vibration-aiv-qualification-view.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-aiv-qualification-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-aiv-qualification.css?v=aiv-qualification-3';
  link.dataset.aivQualificationStyle = 'true';
  document.head.appendChild(link);
}

function downloadText(text, fileName, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function renderAivQualificationWorkspace(container) {
  ensureStylesheet();
  const state = {
    files: { topology: null, sources: null, assessments: null, relationships: null },
    readinessEnvelope: null,
    selectedRowKey: null,
    busy: false,
    error: null,
    destroyed: false,
  };

  function render() {
    if (!state.destroyed) container.innerHTML = renderAivQualificationWorkspaceHtml(state);
  }

  function clearReadiness() {
    state.readinessEnvelope = null;
    state.selectedRowKey = null;
    state.error = null;
  }

  async function loadFile(target, file) {
    clearReadiness();
    try {
      state.files[target] = target === 'topology'
        ? { name: file.name, data: await file.arrayBuffer(), kind: 'Complete five-sheet XLSX' }
        : { name: file.name, text: await file.text(), kind: target === 'sources'
          ? 'AivSourceCsv.v2'
          : target === 'assessments' ? 'AivAssessmentCsv.v1' : 'AivSourceAssessmentCsv.v1' };
    } catch (error) {
      state.files[target] = null;
      state.error = String(error?.message || error);
    }
    render();
  }

  async function checkReadiness() {
    const required = ['topology', 'sources', 'assessments', 'relationships'];
    if (state.busy || !required.every((key) => state.files[key])) return;
    state.busy = true;
    state.error = null;
    render();
    try {
      const { AIV_TOPOLOGY_INPUT_FORMAT, buildAivReadinessFromTables } = await import(
        '../converters/vibration/aiv/aiv-readiness-tables.js?v=aiv-readiness-2'
      );
      if (state.destroyed) return;
      state.readinessEnvelope = buildAivReadinessFromTables({
        topology: {
          format: AIV_TOPOLOGY_INPUT_FORMAT.XLSX,
          data: state.files.topology.data,
          sourceFileName: state.files.topology.name,
        },
        sourceCsv: state.files.sources.text,
        assessmentCsv: state.files.assessments.text,
        sourceAssessmentCsv: state.files.relationships.text,
      });
      state.selectedRowKey = state.readinessEnvelope.readiness.rows[0]?.rowKey ?? null;
    } catch (error) {
      if (state.destroyed) return;
      state.readinessEnvelope = null;
      state.selectedRowKey = null;
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      render();
    }
  }

  function onClick(event) {
    const row = event.target.closest('[data-aiv-row]');
    if (row) {
      state.selectedRowKey = row.dataset.aivRow;
      render();
      return;
    }
    const action = event.target.closest('[data-aiv-action]')?.dataset.aivAction;
    if (action === 'source-template') downloadText(createAivSourceCsvTemplate(), 'aiv-sources-v2.csv');
    if (action === 'assessment-template') downloadText(createAivAssessmentCsvTemplate(), 'aiv-assessments-v1.csv');
    if (action === 'relationship-template') downloadText(createAivSourceAssessmentCsvTemplate(), 'aiv-source-assessment-v1.csv');
    if (action === 'check-readiness') checkReadiness();
  }

  function onChange(event) {
    const target = event.target.dataset.aivFile;
    if (!target) return;
    const file = event.target.files?.[0];
    if (file) loadFile(target, file);
  }

  container.addEventListener('click', onClick);
  container.addEventListener('change', onChange);
  render();

  return () => {
    state.destroyed = true;
    container.removeEventListener('click', onClick);
    container.removeEventListener('change', onChange);
  };
}
