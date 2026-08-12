import { AIV_DEFAULT_ASSUMPTION_PROFILE, validateAivAssumptionProfile } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { buildAivAutoStagePlan } from '../converters/vibration/aiv/aiv-auto-stage-plan.js';
import { buildAivPostDiscontinuityEvidenceGate } from '../converters/vibration/aiv/aiv-post-discontinuity-evidence-gate.js';
import { buildAivDiscontinuityStage8EvidenceGate } from '../converters/vibration/aiv/aiv-stage8-evidence-gate.js';
import { AIV_D23_PRODUCT_PATH_VALIDATION } from './vibration-aiv-validation-records.js';

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
  const autoPlan = buildAivAutoStagePlan({
    assumptionProfile: profile,
    productPathBenchmarkParity: AIV_D23_PRODUCT_PATH_VALIDATION,
  });

  return `<section class="aivq-card aivq-promotion-card">
    <div class="aivq-section-head"><div><h4>AUTO benchmark release progression</h4><p>Upcoming AIV stages advance from machine benchmark state and the visible assumption profile. Human verification files are not prerequisites.</p></div></div>
    <div class="aivq-result-summary">
      <span>Mode <strong>${esc(autoPlan.mode)}</strong></span>
      <span>Assumption profile <strong>${esc(profileValidation.status)}</strong></span>
      <span>Stages 8–10 <strong>${esc(implementationReady ? 'IMPLEMENTED' : 'BLOCKED')}</strong></span>
      <span>D.2.3 product path <strong>${esc(AIV_D23_PRODUCT_PATH_VALIDATION.status)}</strong></span>
      <span>Validation checks <strong>${esc(AIV_D23_PRODUCT_PATH_VALIDATION.counts.passed)}/${esc(AIV_D23_PRODUCT_PATH_VALIDATION.counts.checks)}</strong></span>
      <span>Human evidence required <strong>false</strong></span>
      <span>Next stage <strong>${esc(autoPlan.nextStageId ?? '—')}</strong></span>
      <span>Next action <strong>${esc(autoPlan.nextAction ?? '—')}</strong></span>
    </div>
    <div class="aivq-example-table"><table><thead><tr><th>Stage</th><th>Upcoming work</th><th>AUTO status</th><th>AUTO action</th></tr></thead><tbody>${autoStageRows(autoPlan)}</tbody></table></div>
    <div class="aivq-example-table"><table><thead><tr><th>Release item</th><th>Status</th><th>Basis</th></tr></thead><tbody>
      <tr><td>Missing-data resolution</td><td><span class="aivq-status ${statusKind(profileValidation.status)}">${esc(profileValidation.status)}</span></td><td>User-configurable <code>AivAssumptionProfile.v1</code>; explicit table values override assumptions.</td></tr>
      <tr><td>Source / attenuation / simultaneous-source benchmark parity</td><td><span class="aivq-status ok">MACHINE_PARITY</span></td><td><code>AivKernelCandidateParity.v1</code> against D.2.3 + independent benchmark vectors.</td></tr>
      <tr><td>Discontinuity stage 8 configuration</td><td><span class="aivq-status ${statusKind(stage8.status)}">${esc(stage8.status)}</span></td><td>A/S/B and FLM1 behavior are visible benchmark assumptions; downstream T2-6 chain is calculated.</td></tr>
      <tr><td>Line / assessment scope</td><td><span class="aivq-status ${statusKind(post.status)}">${esc(post.status)}</span></td><td>D.2.3 assessment LOF and worked-example line LOF remain distinct result objects.</td></tr>
      <tr><td>Complete 10-stage D.2.3 product path</td><td><span class="aivq-status ok">PASS</span></td><td><code>${esc(AIV_D23_PRODUCT_PATH_VALIDATION.path)}</code> · blob <code>${esc(AIV_D23_PRODUCT_PATH_VALIDATION.gitBlob)}</code> · ${esc(AIV_D23_PRODUCT_PATH_VALIDATION.counts.passed)}/${esc(AIV_D23_PRODUCT_PATH_VALIDATION.counts.checks)} checks.</td></tr>
      <tr><td>Result detail / assumptions / export</td><td><span class="aivq-status gap">NEXT</span></td><td>Wire validated candidate results into the benchmark operator view and downloadable validation package.</td></tr>
      <tr><td>Exact-head node + browser validation</td><td><span class="aivq-status gap">PENDING_EXECUTION</span></td><td>Real runner/local controlled checkout; Actions jobs that never start do not count.</td></tr>
    </tbody></table></div>
    <div class="aivq-readiness-note">AUTO has completed stages 16B.1–17. Stage 18 is next. Release target remains <strong>BENCHMARK_ONLY</strong> first; SCREENING follows as a later machine-qualification phase. <code>designAuthority=false</code>.</div>
  </section>`;
}
