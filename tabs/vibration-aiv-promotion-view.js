import { AIV_DEFAULT_ASSUMPTION_PROFILE, validateAivAssumptionProfile } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { buildAivAutoStagePlan } from '../converters/vibration/aiv/aiv-auto-stage-plan.js';
import { buildAivPostDiscontinuityEvidenceGate } from '../converters/vibration/aiv/aiv-post-discontinuity-evidence-gate.js';
import { buildAivDiscontinuityStage8EvidenceGate } from '../converters/vibration/aiv/aiv-stage8-evidence-gate.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusKind(status) {
  if (/PASS|READY|COMPLETE/u.test(status)) return 'ok';
  if (/INVALID|FAIL/u.test(status)) return 'bad';
  return 'gap';
}

function autoStageRows(plan) {
  return plan.stages.map((stage) => `<tr>
    <td><code>${esc(stage.stageId)}</code></td>
    <td>${esc(stage.label)}</td>
    <td><span class="aivq-status ${statusKind(stage.status)}">${esc(stage.status)}</span></td>
    <td><code>${esc(stage.autoAction)}</code></td>
  </tr>`).join('');
}

export function renderAivPromotionReadinessHtml(state = {}) {
  const profile = state.assumptionProfile ?? AIV_DEFAULT_ASSUMPTION_PROFILE;
  const profileValidation = validateAivAssumptionProfile(profile);
  const stage8 = buildAivDiscontinuityStage8EvidenceGate({ assumptionProfile: profile });
  const post = buildAivPostDiscontinuityEvidenceGate({ assumptionProfile: profile });
  const implementationReady = profileValidation.valid
    && stage8.readyForCandidateImplementation
    && post.readyForCandidateImplementation;
  const autoPlan = buildAivAutoStagePlan({ assumptionProfile: profile });

  return `<section class="aivq-card aivq-promotion-card">
    <div class="aivq-section-head"><div><h4>AUTO benchmark release progression</h4><p>Upcoming AIV stages advance from machine benchmark state and the visible assumption profile. Human verification files are not prerequisites.</p></div></div>
    <div class="aivq-result-summary">
      <span>Mode <strong>${esc(autoPlan.mode)}</strong></span>
      <span>Assumption profile <strong>${esc(profileValidation.status)}</strong></span>
      <span>Stage 8 <strong>${esc(stage8.status)}</strong></span>
      <span>Stages 9–10 <strong>${esc(post.status)}</strong></span>
      <span>Human evidence required <strong>false</strong></span>
      <span>Next stage <strong>${esc(autoPlan.nextStageId ?? '—')}</strong></span>
      <span>Next action <strong>${esc(autoPlan.nextAction ?? '—')}</strong></span>
    </div>
    <div class="aivq-example-table"><table><thead><tr><th>Stage</th><th>Upcoming work</th><th>AUTO status</th><th>AUTO action</th></tr></thead><tbody>${autoStageRows(autoPlan)}</tbody></table></div>
    <div class="aivq-example-table"><table><thead><tr><th>Release item</th><th>Status</th><th>Basis</th></tr></thead><tbody>
      <tr><td>Missing-data resolution</td><td><span class="aivq-status ${statusKind(profileValidation.status)}">${esc(profileValidation.status)}</span></td><td>User-configurable <code>AivAssumptionProfile.v1</code>; explicit table values override assumptions.</td></tr>
      <tr><td>Source / attenuation / simultaneous-source benchmark parity</td><td><span class="aivq-status gap">EXACT_HEAD_ARTIFACT_REQUIRED</span></td><td><code>AivKernelCandidateParity.v1</code> against D.2.3 + independent benchmark vectors.</td></tr>
      <tr><td>Discontinuity stage 8 configuration</td><td><span class="aivq-status ${statusKind(stage8.status)}">${esc(stage8.status)}</span></td><td>A/S/B, FLM1 mode/value/tolerance, FLM2 and loss factor are configurable benchmark assumptions.</td></tr>
      <tr><td>Line / assessment scope</td><td><span class="aivq-status ${statusKind(post.status)}">${esc(post.status)}</span></td><td>D.2.3 assessment LOF and worked-example line LOF stay separate configurable benchmark references.</td></tr>
      <tr><td>Stages 8–10 implementation readiness</td><td><span class="aivq-status ${implementationReady ? 'ok' : 'bad'}">${esc(implementationReady ? 'READY' : 'BLOCKED_INVALID_CONFIGURATION')}</span></td><td>No reviewer artifact; AUTO proceeds when configuration is valid.</td></tr>
      <tr><td>Complete product-path parity</td><td><span class="aivq-status gap">PENDING_IMPLEMENTATION</span></td><td>All 10 stages must run through SourceResult / AssessmentResult / LineCaseSummary before BENCHMARK_ONLY release.</td></tr>
      <tr><td>Exact-head node + browser validation</td><td><span class="aivq-status gap">PENDING_EXECUTION</span></td><td>Real runner/local controlled checkout; Actions jobs that never start do not count.</td></tr>
    </tbody></table></div>
    <div class="aivq-readiness-note">AUTO stops only on invalid assumptions, machine benchmark parity failure, product-path parity failure, or exact-head validation failure. Release target remains <strong>BENCHMARK_ONLY</strong> first; SCREENING follows as a later machine-qualification phase. <code>designAuthority=false</code>.</div>
  </section>`;
}
