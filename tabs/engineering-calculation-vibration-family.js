import { isEngineeringCalculationExecutable } from './engineering-calculation-console-model.js';
import { definitionState, esc, pill } from './engineering-calculation-console-sections.js';

const FIT_ID = 'VIB.FIV.FLOW_TURBULENCE';

function statusKind(definition) {
  const state = definitionState(definition);
  if (state === 'BENCHMARK_ONLY') return 'warn';
  return isEngineeringCalculationExecutable(definition) ? 'ok' : 'bad';
}

function mechanismAction(definition) {
  if (definition.id === FIT_ID && definitionState(definition) === 'BENCHMARK_ONLY') {
    return '<button type="button" class="engineering-console-btn primary" data-vibration-workspace="fit">Open FIT workspace</button>';
  }
  return `<button type="button" class="engineering-console-btn" data-calc-id="${esc(definition.id)}">View qualification basis</button>`;
}

function mechanismCard(definition) {
  const issue = definition.qualificationIssue ? `Issue #${definition.qualificationIssue}` : 'No qualification issue';
  const limitations = definition.applicability?.limitations ?? [];
  return `<article class="engineering-vibration-card" data-vibration-mechanism="${esc(definition.id)}">
    <div class="engineering-vibration-card-head">
      <div>
        <h3>${esc(definition.shortName || definition.name)}</h3>
        <div class="engineering-console-id">${esc(definition.id)}</div>
      </div>
      <div class="engineering-vibration-card-status">${pill(definitionState(definition), statusKind(definition))}</div>
    </div>
    <p>${esc(definition.purpose || '')}</p>
    <div class="engineering-vibration-meta"><span>${esc(issue)}</span><span>Design authority: NO</span></div>
    ${limitations.length ? `<ul>${limitations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    <div class="engineering-console-actions">${mechanismAction(definition)}</div>
  </article>`;
}

export function renderVibrationFamilyLanding(definitions = []) {
  const rows = definitions.filter((definition) => definition.family === 'VIB');
  return `<section class="engineering-vibration-landing">
    <header class="engineering-vibration-header">
      <div>
        <h2>Vibration &amp; Dynamic Screening</h2>
        <p>Mechanism-specific vibration integrity. FIT is available only as a benchmark/reference workflow; every other vibration mechanism remains qualification-blocked.</p>
      </div>
      <div class="engineering-vibration-count">${rows.length} mechanisms</div>
    </header>
    <div class="engineering-console-banner warn"><strong>Authority boundary.</strong> No mechanism on this page has screening or design authority. Evidence/benchmark capability does not imply production qualification.</div>
    <div class="engineering-vibration-boundary"><strong>TABLE DATA ONLY</strong><span>Vibration consumes 3D EDIT table exports. No 3D viewer or canvas is embedded here.</span></div>
    <div class="engineering-vibration-grid">${rows.map(mechanismCard).join('')}</div>
  </section>`;
}

export { FIT_ID as VIBRATION_FIT_CALCULATION_ID };
