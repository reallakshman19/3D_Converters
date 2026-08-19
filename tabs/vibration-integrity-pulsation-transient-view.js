import { renderVibrationPulsationDecisionEvidencePanel } from './vibration-integrity-pulsation-decision-evidence-view.js?v=20260819-vib-t24-t25-evidence-1';
import {
  VIBRATION_DYNAMIC_WORK_ITEM_MODES,
  buildVibrationDynamicWorkbenchProjection,
} from './vibration-integrity-pulsation-transient-model.js?v=20260819-vib-pulsation-transient-workbench-1';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function option(value, selected, label = value) {
  return `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
}

function fieldControl(item, field) {
  if (field.kind === 'ENUM') {
    return `<select class="vi-cell-input" data-vi-dynamic-value="${esc(field.key)}" data-vi-dynamic-item="${esc(item.workItemId)}">
      <option value="">Select explicitly</option>${field.options.map((value) => option(value, field.rawValue)).join('')}
    </select>`;
  }
  return `<input class="vi-cell-input" data-vi-dynamic-value="${esc(field.key)}" data-vi-dynamic-item="${esc(item.workItemId)}" value="${esc(field.rawValue)}" inputmode="decimal" placeholder="Enter explicit project value">`;
}

function fieldRows(item) {
  return item.fields.map((field) => `<tr>
    <td><strong>${esc(field.label)}</strong><small class="vi-mono">${esc(field.key)}</small></td>
    <td>${fieldControl(item, field)}</td>
    <td>${field.unit ? `<span class="vi-mono">${esc(field.unit)}</span>` : '<span class="vi-empty">—</span>'}</td>
    <td><input class="vi-cell-input" data-vi-dynamic-evidence="${esc(field.key)}" data-vi-dynamic-item="${esc(item.workItemId)}" value="${esc(field.evidenceRef)}" placeholder="PFD/P&ID, process sheet, datasheet, calculation record"></td>
    <td><strong>${esc(field.state)}</strong>${field.parsed.error ? `<small class="vi-mono">${esc(field.parsed.error)}</small>` : ''}</td>
  </tr>`).join('');
}

function resultMetrics(item) {
  if (!item.result) return '<div class="vi-banner"><strong>UNRUN</strong><span>Complete the project inputs and evidence references, then execute the bounded benchmark-only calculation.</span></div>';
  const payload = item.result.payload ?? {};
  const stale = item.resultState === 'STALE_RESULT';
  const values = item.mode === VIBRATION_DYNAMIC_WORK_ITEM_MODES.DEADLEG_STANDARD
    ? [
      ['LOF', payload.lof],
      ['Excitation frequency', payload.excitationFrequencyHz == null ? 'N/A · diameter gate' : `${payload.excitationFrequencyHz} Hz`],
      ['Acoustic natural frequency', payload.acousticNaturalFrequencyHz == null ? 'N/A · diameter gate' : `${payload.acousticNaturalFrequencyHz} Hz`],
      ['Frequency ratio', payload.frequencyRatio ?? 'N/A · diameter gate'],
    ]
    : [
      ['LOF', payload.lof],
      ['Peak force', `${payload.peakForceKn} kN`],
      ['Limit force', `${payload.limitForceKn} kN`],
      ['Support factor', payload.supportFactor],
    ];
  return `<div class="vi-banner${stale ? ' warn' : ''}"><strong>${esc(item.resultState)}</strong><span>${stale ? 'Inputs/evidence changed after this calculation. Re-evaluate before treating it as the current benchmark-only result.' : 'Current for this work-item revision; still not Screening or governing authority.'}</span></div>
    <div class="vi-summary">${values.map(([label, value]) => `<div class="vi-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}

function gapList(item) {
  const values = [
    ...item.missing.map((value) => `MISSING INPUT: ${value}`),
    ...item.invalid.map((value) => `INVALID INPUT: ${value}`),
    ...item.missingEvidence.map((value) => `MISSING EVIDENCE: ${value}`),
    ...item.reasons.filter((value) => value === 'EXACT_WORK_ITEM_SCOPE_REQUIRED'),
  ];
  return values.length ? `<ul>${values.map((value) => `<li>${esc(value)}</li>`).join('')}</ul>` : '<span class="vi-empty">No project-input readiness gaps.</span>';
}

function itemCard(item) {
  return `<section class="vi-card">
    <div class="vi-section-head"><div><h3>${esc(item.label)}</h3><p class="vi-mono">${esc(item.workItemId)} · ${esc(item.methodId)}</p></div>
      <div class="vi-authority"><strong>BENCHMARK ONLY</strong><span>NOT SCREENING · NOT GOVERNING · DESIGN AUTHORITY FALSE</span></div></div>
    <div class="vi-import-facts"><span>Assessment unit: <strong>${esc(item.assessmentUnitType)}</strong></span><span>Revision: <strong>${esc(item.revision)}</strong></span><span>Result: <strong>${esc(item.resultState)}</strong></span></div>
    <div class="vi-filterbar"><label>Exact work-item scope / assessment ID<input class="vi-cell-input" data-vi-dynamic-scope data-vi-dynamic-item="${esc(item.workItemId)}" value="${esc(item.scopeId)}" placeholder="e.g. DL-101 / startup event path"></label></div>
    <div class="vi-table-wrap"><table class="vi-table"><thead><tr><th>Engineering input</th><th>Project value</th><th>Unit</th><th>Project evidence reference</th><th>State</th></tr></thead><tbody>${fieldRows(item)}</tbody></table></div>
    <div class="vi-detail-grid"><div><h4>Readiness gaps</h4>${gapList(item)}</div><div><h4>Authority boundary</h4><ul>
      <li>Calculation is bounded benchmark-only evidence.</li>
      <li>It does not contribute to EI main-line governing LOF.</li>
      <li>Project source references are not controlled master authority.</li>
      <li>Any edit makes an existing result stale until re-evaluated.</li>
    </ul></div></div>
    ${resultMetrics(item)}
    <div class="vi-actions"><button type="button" class="vi-btn primary" data-vi-dynamic-evaluate="${esc(item.workItemId)}"${item.readyToEvaluate ? '' : ' disabled'}>Evaluate benchmark-only</button>
      <button type="button" class="vi-btn vi-row-delete" data-vi-dynamic-delete="${esc(item.workItemId)}">Delete work item</button></div>
  </section>`;
}

function remainingSourceBlockedPanel() {
  return `<section class="vi-card">
    <div class="vi-section-head"><div><h3>Other pending source-qualified branches</h3><p>T2.4 / T2.5 project evidence is captured above, but their controlled decision content remains non-executable.</p></div></div>
    <div class="vi-detail-grid">
      <div class="vi-metric"><small>T2.6 advanced deadleg</small><strong>BLOCKED SOURCE</strong><small>The current workbench executes only the already-landed standard bounded method.</small></div>
      <div class="vi-metric"><small>T2.8 liquid / multiphase closure</small><strong>SEPARATE CANDIDATE</strong><small>PR471 remains the source-reconciliation neighbor and is not consumed here.</small></div>
    </div>
  </section>`;
}

export function renderVibrationPulsationTransientWorkspace(state) {
  const projection = buildVibrationDynamicWorkbenchProjection(state.vibrationDynamicWorkItems);
  return `<div class="vi-root">
    <header class="vi-header"><div><h2>Pulsation & Transients</h2><p>Mechanism-specific work items for bounded vibration calculations and source-gated continuations.</p></div><div class="vi-authority"><strong>BOUNDED WORKBENCH</strong><span>SCREENING NOT AUTHORIZED · DESIGN AUTHORITY FALSE</span></div></header>
    ${state.error ? `<div class="vi-banner bad"><strong>Work item not applied.</strong><span>${esc(state.error)}</span></div>` : ''}
    <div class="vi-banner warn"><strong>Assessment-unit boundary.</strong><span>Deadlegs are DEADLEG_BRANCH work items and valve events are TRANSIENT_EVENT_PATH work items. T2.4/T2.5 evidence records use exact line/case/canonical scope but remain non-numerical until controlled-source reconciliation.</span></div>
    ${renderVibrationPulsationDecisionEvidencePanel(state)}
    <section class="vi-card"><div class="vi-section-head"><div><h3>Add bounded executable work item</h3><p>Only existing merged production kernels are executable in this release.</p></div><div class="vi-actions">
      <button type="button" class="vi-btn primary" data-vi-dynamic-add="DEADLEG_STANDARD">Add Deadleg T2.6</button>
      <button type="button" class="vi-btn primary" data-vi-dynamic-add="T28_DRY_GAS_RAPID_OPENING">Add dry-gas T2.8 event</button>
    </div></div></section>
    ${projection.items.length ? projection.items.map(itemCard).join('') : '<section class="vi-card vi-empty-state"><h3>No executable work items yet</h3><p>Add a Deadleg branch or dry-gas rapid-opening event above.</p></section>'}
    ${remainingSourceBlockedPanel()}
  </div>`;
}
