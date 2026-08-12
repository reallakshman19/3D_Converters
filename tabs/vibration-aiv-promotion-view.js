import { buildAivQualificationPromotionReadiness } from '../converters/vibration/aiv/aiv-promotion-readiness.js';

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
    <div class="aivq-section-head"><div><h4>Method promotion readiness</h4><p>This is a qualification gate checklist, not an operating-case result. Verification artifacts must be SHA-256-bound; bare booleans cannot close a gate.</p></div></div>
    <div class="aivq-result-summary"><span>Prerequisites <strong>${esc(plan.counts.prerequisiteGates)}</strong></span><span>Satisfied <strong>${esc(plan.counts.satisfied)}</strong></span><span>Unsatisfied <strong>${esc(plan.counts.unsatisfied)}</strong></span><span>Invalid evidence <strong>${esc(plan.counts.invalidEvidence)}</strong></span><span>Eligible for independent authority review <strong>${esc(plan.eligibleForAuthorityReview)}</strong></span></div>
    <div class="aivq-example-table"><table><thead><tr><th>Gate</th><th>Required verification</th><th>Status</th><th>Artifact SHA-256</th><th>Issue / next evidence</th></tr></thead><tbody>${gateRows(plan)}</tbody></table></div>
    <div class="aivq-readiness-note">Even when all six prerequisites are satisfied, this planner keeps productionEquationAuthorized=false, screeningAuthority=NOT_AUTHORIZED and designAuthority=false. The independent vibration-engineer promotion review remains separate.</div>
  </section>`;
}
