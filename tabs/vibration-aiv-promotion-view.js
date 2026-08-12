import { buildAivQualificationPromotionReadiness } from '../converters/vibration/aiv/aiv-promotion-readiness.js';

const ARTIFACT_INPUTS = Object.freeze([
  Object.freeze({ key: 't27Reconciliation', label: 'T2.7 reconciliation verification', schema: 'AivT27ReconciliationVerification.v1' }),
  Object.freeze({ key: 'd23Flm1Reconciliation', label: 'D.2.3 FLM1 verification', schema: 'AivD23Flm1ReconciliationVerification.v1' }),
  Object.freeze({ key: 'workedExampleResultScope', label: 'Worked-example result-scope verification', schema: 'AivWorkedExampleResultScopeReviewVerification.v1' }),
  Object.freeze({ key: 'independentBenchmarks', label: 'Independent benchmark verification', schema: 'AivIndependentBenchmarkReviewVerification.v1' }),
  Object.freeze({ key: 'workbookReconciliation', label: 'Retained workbook verification', schema: 'AivWorkbookReconciliationVerification.v1' }),
]);

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusKind(status) {
  if (status === 'SATISFIED') return 'ok';
  if (status === 'INVALID_EVIDENCE') return 'bad';
  return 'gap';
}

function artifactInputs(state) {
  return ARTIFACT_INPUTS.map((item) => {
    const loaded = state.promotionArtifacts?.[item.key];
    return `<label class="aivq-file-field"><span>${esc(item.label)}</span><input type="file" data-aiv-promotion-file="${esc(item.key)}" accept=".json,application/json"><span>${loaded
      ? `<strong>${esc(loaded.fileName || 'Loaded JSON')}</strong><small>${esc(loaded.byteLength)} bytes · ${esc(loaded.artifactSha256)}</small><small>${esc(loaded.verification?.schema ?? 'Unknown schema')}</small>`
      : `<span class="aivq-empty">${esc(item.schema)} JSON</span>`}</span></label>`;
  }).join('');
}

function gateRows(plan) {
  return plan.gates.map((gate) => `<tr>
    <td><code>${esc(gate.gateId)}</code></td>
    <td>${esc(gate.verificationSchema)}</td>
    <td><span class="aivq-status ${statusKind(gate.status)}">${esc(gate.status)}</span></td>
    <td>${gate.evidenceSha256 ? `<code>${esc(gate.evidenceSha256)}</code>` : '<span class="aivq-empty">—</span>'}</td>
    <td>${gate.issue ? esc(gate.issue.message) : '<span class="aivq-empty">—</span>'}</td>
  </tr>`).join('');
}

export function renderAivPromotionReadinessHtml(state = {}) {
  const plan = state.promotionReadiness ?? buildAivQualificationPromotionReadiness({});
  return `<section class="aivq-card aivq-promotion-card">
    <div class="aivq-section-head"><div><h4>Method promotion readiness</h4><p>This is a qualification gate checklist, not an operating-case result. Load completed verification JSON artifacts; the browser hashes the actual file bytes with SHA-256 before the planner evaluates them.</p></div></div>
    <div class="aivq-import-grid aivq-promotion-imports">${artifactInputs(state)}</div>
    ${state.promotionError ? `<div class="aivq-error"><strong>Promotion artifact load failed.</strong><span>${esc(state.promotionError)}</span></div>` : ''}
    <div class="aivq-result-summary"><span>Prerequisites <strong>${esc(plan.counts.prerequisiteGates)}</strong></span><span>Satisfied <strong>${esc(plan.counts.satisfied)}</strong></span><span>Unsatisfied <strong>${esc(plan.counts.unsatisfied)}</strong></span><span>Invalid evidence <strong>${esc(plan.counts.invalidEvidence)}</strong></span><span>Eligible for independent authority review <strong>${esc(plan.eligibleForAuthorityReview)}</strong></span></div>
    <div class="aivq-example-table"><table><thead><tr><th>Gate</th><th>Required verification</th><th>Status</th><th>Artifact SHA-256</th><th>Issue / next evidence</th></tr></thead><tbody>${gateRows(plan)}</tbody></table></div>
    <div class="aivq-readiness-note">The final independent vibration-engineer promotion decision is deliberately not uploadable here. Even when all six prerequisites are satisfied, this planner keeps productionEquationAuthorized=false, screeningAuthority=NOT_AUTHORIZED, designAuthority=false and authorityPromotionAuthorized=false.</div>
  </section>`;
}
