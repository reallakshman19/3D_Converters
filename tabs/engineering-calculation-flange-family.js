import { isEngineeringCalculationExecutable } from './engineering-calculation-console-model.js';
import { definitionState, esc, pill } from './engineering-calculation-console-sections.js';

const FLANGE_FAMILY_ID = 'FLANGE';
const UG44_ID = 'FLANGE.RATED_LOAD.UG44B';
const UG44_PRODUCT_SURFACE = 'FLANGE_UG44_ASSESSMENT_SURFACE';

/**
 * Landing for the Flanges & Joints family.
 *
 * The family holds calculations in materially different qualification states:
 * executable bolt reference kernels, a benchmark-only flange assessment, and
 * blocked assessments with no kernel at all. Grouping them under one family name
 * must not let them read as one family state, so the landing groups by state and
 * labels each group with what that state does and does not permit.
 */

const STATE_ORDER = Object.freeze(['IMPLEMENTED', 'BENCHMARK_ONLY', 'BLOCKED']);

const STATE_GUIDANCE = Object.freeze({
  IMPLEMENTED: {
    heading: 'Executable reference kernels',
    note: 'Arithmetic is implemented and regression-bound to committed sources. Reference use only — no Code compliance and no design authority.',
    kind: 'ok',
  },
  BENCHMARK_ONLY: {
    heading: 'Benchmark only',
    note: 'Executable and cross-solver benchmarked, but the primary Code source qualification is still open. A satisfied relation is not a Code or design disposition.',
    kind: 'warn',
  },
  BLOCKED: {
    heading: 'Blocked — not executable',
    note: 'No authorized numerical kernel is registered. These entries are visible so the gap is explicit, not so they can be run.',
    kind: 'bad',
  },
});

function statusKind(definition) {
  const state = definitionState(definition);
  if (state === 'BENCHMARK_ONLY') return 'warn';
  return isEngineeringCalculationExecutable(definition) ? 'ok' : 'bad';
}

function groupHeading(state) {
  return STATE_GUIDANCE[state] ?? {
    heading: state,
    note: 'State carries no declared authority guidance; treat as reference only.',
    kind: 'warn',
  };
}

function issueLabel(definition) {
  return definition.qualificationIssue
    ? `Qualification issue #${definition.qualificationIssue}`
    : 'No qualification issue';
}

function calculationAction(definition) {
  const executable = isEngineeringCalculationExecutable(definition);
  const assessmentSurface = definition.id === UG44_ID
    && definition.ui?.productSurface === UG44_PRODUCT_SURFACE;
  const label = assessmentSurface
    ? 'Open flange assessment'
    : executable
      ? 'Open calculation'
      : 'View qualification basis';
  return `<button type="button" class="engineering-console-btn ${assessmentSurface ? 'primary' : ''}" data-calc-id="${esc(definition.id)}">${label}</button>`;
}

function blockedReason(definition) {
  return definition.ui?.blockedReason
    ?? 'No authorized numerical kernel is registered for this assessment.';
}

function calculationCard(definition) {
  const state = definitionState(definition);
  const executable = isEngineeringCalculationExecutable(definition);
  const limitations = definition.applicability?.limitations ?? [];
  return `<article class="engineering-vibration-card" data-flange-calculation="${esc(definition.id)}">
    <div class="engineering-vibration-card-head">
      <div>
        <h3>${esc(definition.shortName || definition.name)}</h3>
        <div class="engineering-console-id">${esc(definition.id)}</div>
      </div>
      <div class="engineering-vibration-card-status">${pill(state, statusKind(definition))}</div>
    </div>
    <p>${esc(definition.purpose || '')}</p>
    <div class="engineering-vibration-meta"><span>${esc(issueLabel(definition))}</span><span>Design authority: NO</span><span>Code compliance: NO</span></div>
    ${executable ? '' : `<div class="engineering-console-banner bad"><strong>Execution blocked.</strong> ${esc(blockedReason(definition))}</div>`}
    ${limitations.length ? `<ul>${limitations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    <div class="engineering-console-actions">${calculationAction(definition)}</div>
  </article>`;
}

function stateGroup(state, rows) {
  const guidance = groupHeading(state);
  return `<section class="engineering-flange-state-group" data-flange-state="${esc(state)}">
    <header class="engineering-flange-state-head">
      <h3>${esc(guidance.heading)} ${pill(state, guidance.kind)} <small>${rows.length}</small></h3>
      <p>${esc(guidance.note)}</p>
    </header>
    <div class="engineering-vibration-grid">${rows.map(calculationCard).join('')}</div>
  </section>`;
}

function orderedStates(rows) {
  const present = [...new Set(rows.map((definition) => definitionState(definition)))];
  const known = STATE_ORDER.filter((state) => present.includes(state));
  const extra = present.filter((state) => !STATE_ORDER.includes(state)).sort();
  return [...known, ...extra];
}

function authorityBanner(rows, states) {
  const authorized = rows.filter((definition) => definition.authority?.designAuthority === true
    || definition.authority?.codeCompliance === true);
  if (authorized.length > 0) {
    return `<div class="engineering-console-banner bad"><strong>Authority boundary breached.</strong> ${authorized.length} entries claim Code compliance or design authority; no calculation in this family is qualified for either.</div>`;
  }
  return `<div class="engineering-console-banner warn"><strong>Authority boundary.</strong> No calculation in this family carries Code compliance or design authority. The ${states.length} states below are separate: sharing a family does not share qualification, and an executable kernel beside a blocked one says nothing about either.</div>`;
}

export function renderFlangeFamilyLanding(definitions = []) {
  const rows = definitions.filter((definition) => definition.family === FLANGE_FAMILY_ID);
  const blocked = rows.filter((definition) => !isEngineeringCalculationExecutable(definition)).length;
  const states = orderedStates(rows);

  return `<section class="engineering-vibration-landing engineering-flange-landing">
    <header class="engineering-vibration-header">
      <div>
        <h2>Flanges &amp; Joints</h2>
        <p>Bolted-joint and flange assessments. Qualification state is declared per calculation; the family grouping carries no authority of its own.</p>
      </div>
      <div class="engineering-vibration-count">${rows.length} calculations · ${blocked} blocked</div>
    </header>
    ${authorityBanner(rows, states)}
    <div class="engineering-vibration-boundary"><strong>SOURCE CUSTODY BOUNDARY</strong><span>Owner-supplied workbooks are committed and hash-pinned under docs/flange, and transcribed rows enter only as TEST_ONLY regression fixtures. A workbook being present in the repository establishes byte custody, never Code compliance, design authority, master-data authority or governing eligibility.</span></div>
    ${states.map((state) => stateGroup(state, rows.filter((definition) => definitionState(definition) === state))).join('')}
  </section>`;
}

export { FLANGE_FAMILY_ID as FLANGE_CALCULATION_FAMILY_ID };
