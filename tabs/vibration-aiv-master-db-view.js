import { AIV_MASTER_DB_REFERENCE } from '../converters/vibration/aiv/aiv-master-db-reference.js';

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function status(state) {
  if (state.masterLoadState === 'LOADING') return ['LOADING', 'gap'];
  if (state.masterDb) return ['PIN VERIFIED', 'ok'];
  if (state.masterLoadState === 'ERROR') return ['REJECTED', 'gap'];
  return ['NOT LOADED', 'gap'];
}
function countFacts(db) {
  if (!db) return '';
  const items = Object.entries(db.rowCounts ?? {}).map(([name, count]) => `<span>${esc(name)} <strong>${esc(count)}</strong></span>`).join('');
  return `<div class="aivq-result-summary">${items}</div>`;
}
function resolutionFacts(state) {
  const value = state.masterResolution;
  if (!value) return '<span class="aivq-empty">Master data not yet applied to the working tables.</span>';
  return `<div class="aivq-result-summary"><span>Derived fields <strong>${esc(value.resolvedFieldCount)}</strong></span><span>Discovered assessments <strong>${esc(value.discoveredAssessmentCandidateCount)}</strong></span><span>Source candidates <strong>${esc(value.sourceCandidates?.length ?? 0)}</strong></span><span>Unresolved geometry <strong>${esc(value.unresolved?.length ?? 0)}</strong></span></div>`;
}

export function renderAivMasterDbHtml(state = {}) {
  const [label, kind] = status(state);
  const disabled = !state.masterDb || state.masterLoadState === 'LOADING' ? ' disabled' : '';
  return `<section class="aivq-card aivq-master-db-card">
    <div class="aivq-section-head"><div><h4>AIV master database</h4><p>Load the DB-creator seven-file master package. Files are accepted only when their Git blob identities match the approved pinned source.</p></div><span class="aivq-status ${kind}">${label}</span></div>
    <div class="aivq-grid"><div><small>Repository</small><strong>${esc(AIV_MASTER_DB_REFERENCE.repository)}</strong><span>${esc(AIV_MASTER_DB_REFERENCE.commit)}</span></div><div><small>Master path</small><strong>${esc(AIV_MASTER_DB_REFERENCE.path)}</strong><span>Exact Git-blob verification + structural validation</span></div><div><small>Authority</small><strong>REFERENCE ENRICHMENT</strong><span>Does not confer new screening/design authority.</span></div></div>
    <div class="aivq-import-grid"><label class="aivq-file-field"><span>Load seven AIV master CSVs</span><input type="file" data-aiv-master-files="true" accept=".csv,text/csv" multiple><span>${state.masterDb ? 'Pinned package verified' : 'M_PIPE_DIMENSION + M_PIPING_CLASS + M_MATERIAL + M_COMPONENT_TYPE + M_SOURCE_DEVICE_TYPE + M_UNIT + M_DOCUMENT_SOURCE'}</span></label></div>
    ${countFacts(state.masterDb)}
    <div class="aivq-actions"><button type="button" class="engineering-console-btn primary" data-aiv-action="apply-master-data"${disabled}>Apply master data</button></div>
    ${resolutionFacts(state)}
    <div class="aivq-readiness-note"><strong>Precedence:</strong> explicit project/user values &gt; exact-pinned master values <strong>[M]</strong> &gt; visible assumptions <strong>[A]</strong>. Master resolution never invents operating case, flow, P1/P2, temperature, molecular weight, source state, applicability, simultaneous-source scenario, or physical distance from generic topology.</div>
  </section>`;
}
