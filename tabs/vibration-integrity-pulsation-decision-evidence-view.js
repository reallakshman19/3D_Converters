import { buildVibrationPulsationDecisionEvidenceWorkspace } from './vibration-integrity-pulsation-decision-evidence-model.js?v=20260819-vib-t24-t25-evidence-1';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function option(value, selected, label = value) {
  return `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
}

function scopeFields(record) {
  return `<div class="vi-filterbar">
    <label>Line<input class="vi-cell-input" data-vi-puls-decision-scope="line" data-vi-puls-decision-record="${esc(record.recordId)}" value="${esc(record.scope.line)}" placeholder="Exact line"></label>
    <label>Case<input class="vi-cell-input" data-vi-puls-decision-scope="caseId" data-vi-puls-decision-record="${esc(record.recordId)}" value="${esc(record.scope.caseId)}" placeholder="Operating case"></label>
    <label>Canonical facility ID<input class="vi-cell-input" data-vi-puls-decision-scope="canonicalId" data-vi-puls-decision-record="${esc(record.recordId)}" value="${esc(record.scope.canonicalId)}" placeholder="Exact canonical facility"></label>
    <label>Applicability<select class="vi-cell-input" data-vi-puls-decision-applicability data-vi-puls-decision-record="${esc(record.recordId)}">
      ${option('UNRESOLVED', record.applicabilityDisposition, 'Unresolved')}
      ${option('APPLICABLE', record.applicabilityDisposition, 'Applicable · project evidence')}
      ${option('NOT_APPLICABLE', record.applicabilityDisposition, 'Not applicable · evidenced')}
    </select></label>
  </div>`;
}

function evidenceRows(record) {
  return record.fields.map((field) => `<tr>
    <td><strong>${esc(field.label)}</strong><small class="vi-mono">${esc(field.key)}</small></td>
    <td><strong>${field.required ? 'REQUIRED' : 'NOT REQUIRED FOR CURRENT DISPOSITION'}</strong></td>
    <td><input class="vi-cell-input" data-vi-puls-decision-evidence="${esc(field.key)}" data-vi-puls-decision-record="${esc(record.recordId)}" value="${esc(field.evidenceRef)}" placeholder="Project / OEM / study / review record"></td>
    <td><strong>${field.evidenceRef ? 'PRESENT' : field.required ? 'MISSING' : '—'}</strong></td>
  </tr>`).join('');
}

function gapList(record) {
  const gaps = [
    ...record.missingScope.map((field) => `MISSING SCOPE: ${field}`),
    ...(record.applicabilityDisposition === 'UNRESOLVED' ? ['APPLICABILITY: explicit evidenced disposition required'] : []),
    ...record.missingEvidence.map((field) => `MISSING PROJECT EVIDENCE: ${field}`),
  ];
  return gaps.length ? `<ul>${gaps.map((gap) => `<li>${esc(gap)}</li>`).join('')}</ul>` : '<span class="vi-empty">Project evidence envelope complete for the selected disposition.</span>';
}

function reviewPanel(record) {
  const reviewStatus = record.review.current ? 'CURRENT PROJECT REVIEW' : record.review.reviewRecordRef ? 'STALE PROJECT REVIEW' : 'UNREVIEWED';
  return `<div>
    <h4>Project review custody</h4>
    <p><strong>${esc(reviewStatus)}</strong></p>
    ${record.review.reviewRecordRef ? `<p class="vi-mono">${esc(record.review.reviewerName)} · ${esc(record.review.reviewRecordRef)} · reviewed revision ${esc(record.review.reviewedRevision)}</p>` : ''}
    <div class="vi-filterbar">
      <label>Reviewer name<input class="vi-cell-input" data-vi-puls-reviewer placeholder="Named project engineer"></label>
      <label>Review record reference<input class="vi-cell-input" data-vi-puls-review-record placeholder="Review minute / calculation note / approval record"></label>
      <button type="button" class="vi-btn" data-vi-puls-decision-review="${esc(record.recordId)}"${record.projectEvidenceComplete ? '' : ' disabled'}>Record project review</button>
    </div>
    <small>This review records project evidence custody only. It does not reconcile the controlled EI flowchart or authorize Screening/design use.</small>
  </div>`;
}

function evidenceCard(record) {
  const source = record.sourceBinding;
  return `<section class="vi-card" data-vi-puls-decision-card="${esc(record.recordId)}">
    <div class="vi-section-head"><div><h3>${esc(record.label)}</h3><p class="vi-mono">${esc(record.recordId)} · ${esc(record.sourceMasterId)}</p></div>
      <div class="vi-authority"><strong>PROJECT EVIDENCE ONLY</strong><span>NO NUMERICAL RULES · SCREENING NOT AUTHORIZED</span></div></div>
    <div class="vi-banner warn"><strong>${esc(record.status)}</strong><span>${esc(source.displayLabel)}. Controlled rule content has not been executed in this environment.</span></div>
    <div class="vi-import-facts">
      <span>Mechanism: <strong class="vi-mono">${esc(record.mechanismId)}</strong></span>
      <span>Source binding: <strong>${esc(source.status)}</strong></span>
      <span>Revision: <strong>${esc(record.revision)}</strong></span>
      <span>Numerical execution: <strong>BLOCKED</strong></span>
    </div>
    ${scopeFields(record)}
    <div class="vi-table-wrap"><table class="vi-table"><thead><tr><th>Project evidence category</th><th>Requirement</th><th>Evidence reference</th><th>State</th></tr></thead><tbody>${evidenceRows(record)}</tbody></table></div>
    <div class="vi-detail-grid"><div><h4>Evidence gaps</h4>${gapList(record)}</div>${reviewPanel(record)}</div>
    <div class="vi-actions"><button type="button" class="vi-btn vi-row-delete" data-vi-puls-decision-delete="${esc(record.recordId)}">Delete evidence record</button></div>
  </section>`;
}

export function renderVibrationPulsationDecisionEvidencePanel(state) {
  const projection = buildVibrationPulsationDecisionEvidenceWorkspace(state.vibrationPulsationDecisionEvidence);
  return `<section class="vi-card">
    <div class="vi-section-head"><div><h3>T2.4 / T2.5 decision-evidence custody</h3><p>Capture project/OEM evidence now while the controlled EI decision content remains source-reconciliation blocked.</p></div><div class="vi-actions">
      <button type="button" class="vi-btn" data-vi-puls-decision-add="reciprocatingPulsation">Add T2.4 Recip/PD evidence</button>
      <button type="button" class="vi-btn" data-vi-puls-decision-add="rotatingStall">Add T2.5 rotating-stall evidence</button>
    </div></div>
    <div class="vi-banner warn"><strong>No automatic applicability.</strong><span>Applicability is an explicit, evidenced project disposition. OEM data and project studies remain project evidence; they are not universal EI master data.</span></div>
  </section>
  ${projection.records.length ? projection.records.map(evidenceCard).join('') : '<section class="vi-card vi-empty-state"><h3>No T2.4 / T2.5 evidence records yet</h3><p>Add an evidence record when a project scope requires Recip/PD or rotating-stall disposition.</p></section>'}`;
}
