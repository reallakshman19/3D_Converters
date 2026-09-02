import { esc, pill } from './engineering-calculation-console-sections.js';

/**
 * Multi-joint flange assessment surface.
 *
 * Renders the record shape the source workbook defines in its hidden `Sheet2`,
 * one row per joint and load case, with the governing case of each joint marked
 * and the moment basis stated. Rows produced under different moment bases are
 * not comparable, so a joint carrying both is flagged rather than ranked.
 */

export const FLANGE_JOINT_SURFACE = 'FLANGE_JOINT_ASSESSMENT_SURFACE';

const BASIS_LABELS = Object.freeze({
  COMPONENT_RESOLUTION: 'Resolved components',
  WORKBOOK_EQUAL_ORTHOGONAL_COMPONENT_SCENARIO: 'Workbook equal-component envelope',
  MIXED: 'Mixed bases',
});

const BASIS_KINDS = Object.freeze({
  COMPONENT_RESOLUTION: 'ok',
  WORKBOOK_EQUAL_ORTHOGONAL_COMPONENT_SCENARIO: 'warn',
  MIXED: 'bad',
});

function kPa(value) {
  return Number.isFinite(value) ? `${(value / 1000).toFixed(1)}` : '—';
}

function num(value, decimals = 1) {
  return Number.isFinite(value) ? value.toFixed(decimals) : '—';
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

function statusPill(row) {
  if (!row.ok) return pill('ERROR', 'bad');
  return row.pass ? pill('WITHIN', 'ok') : pill('EXCEEDED', 'bad');
}

function basisPill(basis) {
  return pill(BASIS_LABELS[basis] ?? basis ?? '—', BASIS_KINDS[basis] ?? 'warn');
}

function jointRow(row, governingCase) {
  if (!row.ok) {
    return `<tr class="engineering-joint-row is-error">
      <td>${esc(row.identity.jobName)}</td><td>${esc(row.identity.elementId)}</td><td>${esc(row.identity.toNode)}</td>
      <td colspan="9">${esc(row.code)} — ${esc(row.message)}</td>
      <td>${statusPill(row)}</td></tr>`;
  }

  const governing = row.loadCase === governingCase;
  const masters = row.masters.values;
  return `<tr class="engineering-joint-row ${governing ? 'is-governing' : ''}" data-joint-row="${esc(row.identity.jointKey)}/${esc(row.loadCase)}">
    <td>${esc(row.identity.jobName)}</td>
    <td>${esc(row.identity.elementId)}</td>
    <td>${esc(row.identity.toNode)}</td>
    <td>${esc(num(row.nominalSizeIn, 0))}"</td>
    <td>${esc(String(row.pressureClass))}</td>
    <td>${esc(row.loadCase)}${governing ? ' ★' : ''}</td>
    <td>${esc(num(row.faceLoads.bendingMomentNm))}</td>
    <td>${esc(num(row.faceLoads.openingAxialForceN))}</td>
    <td>${esc(num(masters.gasketReactionDiameterM * 1000, 1))}</td>
    <td>${esc(kPa(masters.ratedPressurePa))}</td>
    <td>${esc(kPa(row.designPressure.designPressurePa))}</td>
    <td>${esc(num(masters.momentFactor, 2))}</td>
    <td>${esc(percent(row.utilization))}</td>
    <td>${statusPill(row)}</td>
  </tr>`;
}

function jointSection(envelope, assessment) {
  if (!envelope.ok) {
    return `<section class="engineering-console-card"><div class="engineering-console-banner bad"><strong>Joint not assessed.</strong> ${esc(envelope.code)} — ${esc(envelope.message)}</div></section>`;
  }

  const mixedWarning = envelope.momentBasisComparable
    ? ''
    : '<div class="engineering-console-banner bad"><strong>Mixed moment bases.</strong> This joint carries rows resolved from actual components alongside rows taken from the workbook equal-component envelope. The two are not comparable, so no governing case is claimed across them.</div>';

  return `<section class="engineering-console-card" data-joint="${esc(envelope.identity.jointKey)}">
    <div class="engineering-vibration-card-head">
      <div>
        <h3>${esc(envelope.identity.jointKey)}</h3>
        <div class="engineering-console-id">${esc(num(envelope.nominalSizeIn, 0))}" class ${esc(String(envelope.pressureClass))} · ${envelope.loadCaseCount} load cases</div>
      </div>
      <div class="engineering-vibration-card-status">${basisPill(envelope.momentBasis)} ${envelope.pass === false ? pill('EXCEEDED', 'bad') : pill('WITHIN', 'ok')}</div>
    </div>
    ${mixedWarning}
    <div class="engineering-console-table-wrap"><table class="engineering-console-table"><thead><tr>
      <th>Job</th><th>Element</th><th>Node</th><th>Size</th><th>Class</th><th>Load case</th>
      <th>ME (N·m)</th><th>FE (N)</th><th>G (mm)</th><th>PR (kPa)</th><th>PD (kPa)</th><th>FM</th>
      <th>Utilization</th><th>Status</th>
    </tr></thead><tbody>${assessment.rows.map((row) => jointRow(row, envelope.governingLoadCase)).join('')}</tbody></table></div>
    <div class="engineering-vibration-meta">
      <span>Governing: ${esc(envelope.governingLoadCase ?? '—')} at ${esc(percent(envelope.governingUtilization))}</span>
      <span>Masters: ${esc(envelope.masters.resolverState)}</span>
      <span>Records: ${esc(envelope.masters.recordIds.join(', '))}</span>
    </div>
  </section>`;
}

function summary(envelope) {
  return `<div class="engineering-console-metrics">
    <div class="engineering-console-card"><small>Joints</small><strong>${envelope.jointCount}</strong></div>
    <div class="engineering-console-card"><small>Exceeded</small><strong>${envelope.failedJointCount}</strong></div>
    <div class="engineering-console-card"><small>Not assessed</small><strong>${envelope.notAssessedCount}</strong></div>
    <div class="engineering-console-card"><small>Governing joint</small><strong>${esc(envelope.governingJoint ?? '—')}</strong></div>
    <div class="engineering-console-card"><small>Governing utilization</small><strong>${esc(percent(envelope.governingUtilization))}</strong></div>
  </div>`;
}

export function renderFlangeJointAssessmentHtml({ envelope, assessments } = {}) {
  if (!envelope || !Array.isArray(assessments) || assessments.length === 0) {
    return '<div class="engineering-console-empty">No joints assessed yet.</div>';
  }

  const byKey = new Map(assessments.map((item) => [item.identity?.jointKey ?? '', item]));
  const mixedBanner = envelope.mixedBasisJointCount > 0
    ? `<div class="engineering-console-banner bad"><strong>${envelope.mixedBasisJointCount} joints mix moment bases.</strong> Component-resolved and workbook-envelope rows are not directly comparable.</div>`
    : '';

  return `<section class="engineering-flange-joint-assessment">
    <div class="engineering-console-banner warn"><strong>Authority boundary.</strong> Every row is the UG-44(b) reference relation evaluated with ENGINEERING_SANDBOX master records. Nothing here is Code compliance, design authority or governing eligibility, and a governing load case is the worst of those supplied, not a complete load set.</div>
    ${mixedBanner}
    ${summary(envelope)}
    ${envelope.joints.map((item) => jointSection(item, byKey.get(item.identity?.jointKey ?? '') ?? { rows: [] })).join('')}
  </section>`;
}
