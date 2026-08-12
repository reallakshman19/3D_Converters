function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function empty(value) {
  return value === null || value === undefined || value === ''
    ? '<span class="aivq-empty">NOT_CALCULATED</span>'
    : esc(value);
}

function sourceRows(resultSet) {
  const rows = resultSet?.sourceResults ?? [];
  if (!rows.length) return '<tr><td colspan="10" class="aivq-empty-row">No Source Result shells available. Check readiness after loading working inputs.</td></tr>';
  return rows.map((row) => `<tr>
    <td><code>${esc(row.sourceCanonicalId)}</code></td>
    <td>${esc(row.caseId)}</td>
    <td>${esc(row.sourceDeviceType)}</td>
    <td>${empty(row.rawSourcePwlDb)}</td>
    <td>${empty(row.sonicFlowFactorDb)}</td>
    <td>${empty(row.trimReductionDb)}</td>
    <td>${empty(row.effectiveSourcePwlDb)}</td>
    <td>${empty(row.thresholdBranch)}</td>
    <td><span class="aivq-status gap">${esc(row.status)}</span></td>
    <td>${esc(row.readiness.relationshipCount)}</td>
  </tr>`).join('');
}

function assessmentRows(resultSet) {
  const rows = resultSet?.assessmentResults ?? [];
  if (!rows.length) return '<tr><td colspan="10" class="aivq-empty-row">No Assessment Result shells available. Assessment results require at least one Source → Assessment relationship.</td></tr>';
  return rows.map((row) => `<tr>
    <td><code>${esc(row.assessmentCanonicalId)}</code></td>
    <td>${esc(row.line ?? '—')}</td>
    <td>${esc(row.caseId)}</td>
    <td>${esc(row.assessmentType ?? '—')}</td>
    <td>${esc(row.contributingSourceCanonicalIds.join(', '))}</td>
    <td>${empty(row.combinedPointPwlDb)}</td>
    <td>${row.t26Intermediates === null ? '<span class="aivq-empty">NOT_CALCULATED</span>' : esc('AVAILABLE')}</td>
    <td>${empty(row.lof)}</td>
    <td><span class="aivq-status gap">${esc(row.status)}</span></td>
    <td>${esc(row.readiness.statuses.join(', ') || '—')}</td>
  </tr>`).join('');
}

function lineRows(resultSet) {
  const rows = resultSet?.lineCaseSummaries ?? [];
  if (!rows.length) return '<tr><td colspan="9" class="aivq-empty-row">No Line / Case Summary shells available.</td></tr>';
  return rows.map((row) => `<tr>
    <td>${esc(row.line ?? '—')}</td>
    <td>${esc(row.caseId)}</td>
    <td>${esc(row.assessmentCount)}</td>
    <td>${esc(row.assessmentCanonicalIds.join(', '))}</td>
    <td>${esc(row.sourceCanonicalIds.join(', '))}</td>
    <td>${empty(row.lof)}</td>
    <td>${empty(row.controllingAssessmentCanonicalId)}</td>
    <td>${row.controllingSourceCanonicalIds.length ? esc(row.controllingSourceCanonicalIds.join(', ')) : '<span class="aivq-empty">NOT_CALCULATED</span>'}</td>
    <td><span class="aivq-status gap">${esc(row.status)}</span></td>
  </tr>`).join('');
}

export function renderAivResultShellsHtml(state = {}) {
  const resultSet = state.resultSet ?? null;
  const summary = resultSet
    ? `<div class="aivq-result-summary"><span>Source shells <strong>${esc(resultSet.counts.sources)}</strong></span><span>Assessment shells <strong>${esc(resultSet.counts.assessments)}</strong></span><span>Line/case shells <strong>${esc(resultSet.counts.lineCaseSummaries)}</strong></span><span>Engineering authority <strong>${esc(resultSet.authority.engineeringAuthority)}</strong></span></div>`
    : '<div class="aivq-readiness-note">Check AIV readiness to instantiate the frozen result scopes from the current visible working inputs.</div>';
  return `<section class="aivq-card aivq-results-card">
    <div class="aivq-section-head"><div><h4>Frozen AIV result scopes</h4><p>Source Result, Assessment Result and Line / Case Summary are separate contracts. While authority is BLOCKED every numerical field is explicitly NOT_CALCULATED—not zero, pass, safe, or screening output.</p></div></div>
    ${summary}
    <h5>Source Results · <code>AivSourceResult.v1</code></h5>
    <div class="aivq-example-table"><table><thead><tr><th>Source</th><th>Case</th><th>Device</th><th>Raw source PWL</th><th>SFF</th><th>Trim</th><th>Effective source PWL</th><th>Threshold branch</th><th>Status</th><th>Relationships</th></tr></thead><tbody>${sourceRows(resultSet)}</tbody></table></div>
    <h5>Assessment Results · <code>AivAssessmentResult.v1</code></h5>
    <div class="aivq-example-table"><table><thead><tr><th>Assessment</th><th>Line</th><th>Case</th><th>Type</th><th>Contributing sources</th><th>Combined point PWL</th><th>T2-6</th><th>LOF</th><th>Status</th><th>Readiness</th></tr></thead><tbody>${assessmentRows(resultSet)}</tbody></table></div>
    <h5>Line / Case Summary · <code>AivLineCaseSummary.v1</code></h5>
    <div class="aivq-example-table"><table><thead><tr><th>Line</th><th>Case</th><th>Assessments</th><th>Assessment IDs</th><th>Source IDs</th><th>Line LOF</th><th>Controlling assessment</th><th>Controlling sources</th><th>Status</th></tr></thead><tbody>${lineRows(resultSet)}</tbody></table></div>
  </section>`;
}
