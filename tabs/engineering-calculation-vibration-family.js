import { isEngineeringCalculationExecutable } from './engineering-calculation-console-model.js';
import { definitionState, esc, pill } from './engineering-calculation-console-sections.js';

const FIT_ID = 'VIB.FIV.FLOW_TURBULENCE';
const AIV_ID = 'VIB.AIV.ACOUSTIC';
const FIT_PRODUCT_SURFACE = 'VIBRATION_INTEGRITY_TABLE_WORKSPACE';
const AIV_QUALIFICATION_SURFACE = 'VIBRATION_AIV_QUALIFICATION_WORKSPACE';

function statusKind(definition) {
  const state = definitionState(definition);
  if (state === 'BENCHMARK_ONLY') return 'warn';
  return isEngineeringCalculationExecutable(definition) ? 'ok' : 'bad';
}

function displayState(definition) {
  return definitionState(definition) === 'PRODUCTION_AUTHORIZED' ? 'PRODUCTION' : definitionState(definition);
}

function screeningAuthority(definition) {
  return definition.authority?.screeningAuthority === 'AUTHORIZED_BOUNDED'
    ? 'Screening authority: BOUNDED'
    : 'Screening authority: NOT AUTHORIZED';
}

function authorityUse(definition) {
  if (definition.id !== FIT_ID) return '<span>Design authority: NO</span>';
  const design = definition.authority?.designAuthorityDisposition === 'NOT_A_DESIGN_CHECK'
    ? 'Design use: SCREENING ONLY'
    : 'Design authority: NO';
  const code = definition.authority?.codeComplianceDisposition === 'NOT_A_CODE_COMPLIANCE_CHECK'
    ? 'Code compliance: NOT A CODE CHECK'
    : 'Code compliance: NO';
  return `<span>${esc(design)}</span><span>${esc(code)}</span>`;
}

function qualificationReference(definition) {
  if (!definition.qualificationIssue) return 'No qualification issue';
  return definition.id === FIT_ID && definitionState(definition) === 'PRODUCTION_AUTHORIZED'
    ? `Programme #${definition.qualificationIssue}`
    : `Issue #${definition.qualificationIssue}`;
}

function mechanismAction(definition) {
  const executable = isEngineeringCalculationExecutable(definition);
  const fitWorkspace = definition.id === FIT_ID
    && executable
    && definition.ui?.productSurface === FIT_PRODUCT_SURFACE;
  const aivQualification = definition.id === AIV_ID
    && definition.ui?.productSurface === AIV_QUALIFICATION_SURFACE;
  const label = fitWorkspace
    ? 'Open FIT workspace'
    : aivQualification
      ? 'Open AIV qualification workspace'
      : executable
        ? 'Open calculation'
        : 'View qualification basis';
  return `<button type="button" class="engineering-console-btn ${fitWorkspace ? 'primary' : ''}" data-calc-id="${esc(definition.id)}">${label}</button>`;
}

function mechanismCard(definition) {
  const limitations = definition.applicability?.limitations ?? [];
  return `<article class="engineering-vibration-card" data-vibration-mechanism="${esc(definition.id)}">
    <div class="engineering-vibration-card-head">
      <div>
        <h3>${esc(definition.shortName || definition.name)}</h3>
        <div class="engineering-console-id">${esc(definition.id)}</div>
      </div>
      <div class="engineering-vibration-card-status">${pill(displayState(definition), statusKind(definition))}</div>
    </div>
    <p>${esc(definition.purpose || '')}</p>
    <div class="engineering-vibration-meta"><span>${esc(qualificationReference(definition))}</span><span>${esc(screeningAuthority(definition))}</span>${authorityUse(definition)}</div>
    ${limitations.length ? `<ul>${limitations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    <div class="engineering-console-actions">${mechanismAction(definition)}</div>
  </article>`;
}

export function renderVibrationFamilyLanding(definitions = []) {
  const rows = definitions.filter((definition) => definition.family === 'VIB');
  const blocked = rows.filter((definition) => !isEngineeringCalculationExecutable(definition)).length;
  return `<section class="engineering-vibration-landing">
    <header class="engineering-vibration-header">
      <div>
        <h2>Vibration &amp; Dynamic Screening</h2>
        <p>Mechanism-specific vibration integrity. Product lifecycle, engineering authority and available product surfaces are shown as separate states.</p>
      </div>
      <div class="engineering-vibration-count">${rows.length} mechanisms · ${blocked} blocked</div>
    </header>
    <div class="engineering-console-banner warn"><strong>Authority boundary.</strong> Production lifecycle does not imply design or code-compliance authority. FIT is a bounded screening method, not a design/code check; every other mechanism retains its own registered authority.</div>
    <div class="engineering-vibration-boundary"><strong>TABLE DATA ONLY</strong><span>Vibration consumes 3D EDIT table exports. No 3D viewer or canvas is embedded here.</span></div>
    <div class="engineering-vibration-grid">${rows.map(mechanismCard).join('')}</div>
  </section>`;
}

export { FIT_ID as VIBRATION_FIT_CALCULATION_ID, AIV_ID as VIBRATION_AIV_CALCULATION_ID };
