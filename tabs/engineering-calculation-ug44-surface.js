import { esc, pill } from './engineering-calculation-console-sections.js';

/**
 * Result surface for FLANGE.RATED_LOAD.UG44B.
 *
 * The generic results table renders every output as an anonymous row, which
 * hides the two things that decide whether a UG-44 row is trustworthy: how the
 * external equivalent pressure splits between bending and axial, and how much
 * margin the row actually passes by. Bending typically dominates by more than an
 * order of magnitude, and real rows pass by fractions of a percent.
 *
 * Nothing here asserts Code compliance or design acceptance. The relation being
 * numerically satisfied is reported as exactly that.
 */

export const UG44_PRODUCT_SURFACE = 'FLANGE_UG44_ASSESSMENT_SURFACE';

/**
 * A pass narrower than this is reported as marginal. The legacy workbook's own
 * `3.14` literal moves the allowable by 0.0507%, so a margin of this order is
 * within the noise of constant and rounding choices rather than real headroom.
 */
export const MARGINAL_PASS_FRACTION = 0.001;

const BASIS_LABELS = Object.freeze({
  DIRECT_INPUT: 'Supplied directly',
  WORKBOOK_MEAN_GASKET_CONTACT_DIAMETER: 'Derived — mean gasket contact diameter',
  WORKBOOK_DESIGN_PRESSURE_PLUS_STATIC_HEAD: 'Derived — design pressure + static head',
});

function kPa(value) {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value / 1000);
  const decimals = magnitude >= 100 ? 1 : magnitude >= 1 ? 3 : 6;
  return `${(value / 1000).toFixed(decimals)} kPa`;
}

function percent(value, decimals = 2) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(decimals)}%` : '—';
}

function metric(label, value, extra = '') {
  return `<div class="engineering-console-card"><small>${esc(label)}</small><strong>${esc(value)}</strong>${extra}</div>`;
}

function share(part, total) {
  return Number.isFinite(part) && Number.isFinite(total) && total > 0 ? part / total : Number.NaN;
}

/** Margin as a fraction of the available pressure, and whether the pass is thin. */
export function assessUg44Margin(outputs = {}) {
  const available = Number(outputs.availablePressure);
  const demand = Number(outputs.demandPressure);
  if (!Number.isFinite(available) || !Number.isFinite(demand) || !(available > 0)) {
    return { marginFraction: Number.NaN, satisfied: false, marginal: false };
  }
  const marginFraction = (available - demand) / available;
  return {
    marginFraction,
    satisfied: outputs.equationSatisfied === true,
    marginal: outputs.equationSatisfied === true
      && marginFraction >= 0
      && marginFraction < MARGINAL_PASS_FRACTION,
  };
}

/** Whether the rating cap, not the external load, is what limits Pmax. */
export function assessUg44Cap(outputs = {}, intermediates = {}) {
  const capped = Number(outputs.maximumPressure);
  const uncapped = Number(intermediates.uncappedMaximumPressure);
  if (!Number.isFinite(capped) || !Number.isFinite(uncapped)) {
    return { capBinds: false, capped, uncapped };
  }
  return { capBinds: uncapped > capped, capped, uncapped };
}

function renderDisposition(outputs, margin) {
  if (!margin.satisfied) {
    return `<div class="engineering-console-banner bad"><strong>Reference relation exceeded.</strong> The external load exceeds the rated-flange allowable for the supplied inputs. This is a reference relation result, not a Code or design disposition.</div>`;
  }
  if (margin.marginal) {
    return `<div class="engineering-console-banner warn"><strong>Reference relation satisfied — marginal.</strong> The row passes by ${esc(percent(margin.marginFraction, 4))} of the available pressure, under the ${esc(percent(MARGINAL_PASS_FRACTION, 1))} threshold. For scale, the legacy workbook's 3.14 constant alone shifts the allowable by 0.05%, so a margin of this order is sensitive to rounding and constant choices rather than real headroom. This is a reference relation result, not a Code or design disposition.</div>`;
  }
  return `<div class="engineering-console-banner"><strong>Reference relation satisfied.</strong> Passes by ${esc(percent(margin.marginFraction))} of the available pressure. This is a reference relation result, not a Code or design disposition.</div>`;
}

function renderDecomposition(outputs) {
  const bending = Number(outputs.bendingEquivalentPressure);
  const axial = Number(outputs.axialEquivalentPressure);
  const total = Number(outputs.externalEquivalentPressure);
  const bendingShare = share(bending, total);
  const axialShare = share(axial, total);
  const dominant = Number.isFinite(bendingShare) && Number.isFinite(axialShare) && axial > 0
    ? `<p class="engineering-console-field-meta">Bending contributes ${esc((bending / axial).toFixed(1))}× the axial term.</p>`
    : '';

  return `<div class="engineering-console-card"><h3>External equivalent pressure</h3>
<div class="engineering-console-table-wrap"><table class="engineering-console-table"><thead><tr><th>Contribution</th><th>Relation</th><th>Value</th><th>Share</th></tr></thead><tbody>
<tr><td>Bending</td><td>16·ME / (π·G³)</td><td>${esc(kPa(bending))}</td><td>${esc(percent(bendingShare, 1))}</td></tr>
<tr><td>Axial (opening)</td><td>4·FE / (π·G²)</td><td>${esc(kPa(axial))}</td><td>${esc(percent(axialShare, 1))}</td></tr>
<tr><td><strong>Total</strong></td><td>—</td><td><strong>${esc(kPa(total))}</strong></td><td>100.0%</td></tr>
</tbody></table></div>${dominant}</div>`;
}

function renderCapacity(outputs, margin) {
  return `<div class="engineering-console-card"><h3>Capacity and demand</h3>
<div class="engineering-console-table-wrap"><table class="engineering-console-table"><thead><tr><th>Term</th><th>Relation</th><th>Value</th></tr></thead><tbody>
<tr><td>Available</td><td>PR · (1 + FM)</td><td>${esc(kPa(outputs.availablePressure))}</td></tr>
<tr><td>Demand</td><td>PD + external equivalent</td><td>${esc(kPa(outputs.demandPressure))}</td></tr>
<tr><td>Margin</td><td>available − demand</td><td>${esc(kPa(outputs.margin))} (${esc(percent(margin.marginFraction))})</td></tr>
<tr><td>Utilization</td><td>demand / available</td><td>${esc(percent(Number(outputs.utilization)))}</td></tr>
</tbody></table></div></div>`;
}

function renderMaximumPressure(cap) {
  const note = cap.capBinds
    ? `<p class="engineering-console-field-meta">The flange pressure rating limits this result, not the external load. Without the cap the relation would allow ${esc(kPa(cap.uncapped))}.</p>`
    : '<p class="engineering-console-field-meta">The external load limits this result; the flange pressure rating is not the binding term.</p>';

  return `<div class="engineering-console-card"><h3>Maximum pressure</h3>
<div class="engineering-console-metrics">
${metric('Pmax (rating cap applied)', kPa(cap.capped))}
${metric('Uncapped', kPa(cap.uncapped))}
</div>${note}</div>`;
}

function renderInputBases(intermediates, provenance) {
  const gasketBasis = provenance.gasketReactionDiameterBasis;
  const pressureBasis = provenance.designPressureBasis;
  const gasketWarning = gasketBasis === 'WORKBOOK_MEAN_GASKET_CONTACT_DIAMETER'
    ? '<p class="engineering-console-field-meta">Mean gasket contact diameter is the legacy workbook basis. It is not an Appendix 2 effective-seating-width derivation and does not govern G.</p>'
    : '';
  const headRow = Number(intermediates.staticHeadPressure) > 0
    ? `<tr><td>Static head</td><td>${esc(kPa(intermediates.staticHeadPressure))}</td><td>SG · height · 9.80665</td></tr>`
    : '';

  return `<div class="engineering-console-card"><h3>Resolved inputs</h3>
<div class="engineering-console-table-wrap"><table class="engineering-console-table"><thead><tr><th>Input</th><th>Value</th><th>Basis</th></tr></thead><tbody>
<tr><td>Gasket reaction diameter G</td><td>${esc((Number(intermediates.resolvedGasketReactionDiameter) * 1000).toFixed(3))} mm</td><td>${esc(BASIS_LABELS[gasketBasis] ?? gasketBasis ?? '—')}</td></tr>
<tr><td>Design pressure PD</td><td>${esc(kPa(intermediates.resolvedDesignPressure))}</td><td>${esc(BASIS_LABELS[pressureBasis] ?? pressureBasis ?? '—')}</td></tr>
${headRow}
</tbody></table></div>${gasketWarning}</div>`;
}

export function renderUg44ResultsHtml(result, validation) {
  const validationBanner = validation
    ? `<div class="engineering-console-banner ${validation.ok ? '' : 'bad'}">Validation: ${validation.ok ? 'PASS' : 'BLOCKED'} · ${(validation.errors || []).length} errors · ${(validation.warnings || []).length} warnings</div>`
    : '';

  if (!result) {
    return `${validationBanner}<div class="engineering-console-empty">No calculation result yet.</div>`;
  }

  if (result.ok === false) {
    return `${validationBanner}${(result.errors || []).map((error) => `<div class="engineering-console-banner bad">${esc(error.code)} — ${esc(error.message)}</div>`).join('')}`;
  }

  const outputs = result.outputs || {};
  const intermediates = result.intermediates || {};
  const provenance = result.provenance || {};
  const margin = assessUg44Margin(outputs);
  const cap = assessUg44Cap(outputs, intermediates);

  const authorityRow = `<div class="engineering-console-actions">${pill(result.qualification?.effective ?? 'BENCHMARK_ONLY', 'warn')} ${pill('NOT CODE COMPLIANCE', 'warn')} ${pill('NOT DESIGN AUTHORITY', 'warn')}</div>`;

  return `${validationBanner}${renderDisposition(outputs, margin)}${authorityRow}
${renderDecomposition(outputs)}
${renderCapacity(outputs, margin)}
${renderMaximumPressure(cap)}
${renderInputBases(intermediates, provenance)}`;
}
