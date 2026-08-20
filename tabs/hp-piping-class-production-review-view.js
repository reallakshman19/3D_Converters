function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmt(value, digits = 5) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
}

function metric(label, value, note = '') {
  return `<div class="hpwb-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
}

function valueRow(label, value, unit = '', digits = 5) {
  const formatted = Number.isFinite(value) ? `${fmt(value, digits)}${unit ? ` ${unit}` : ''}` : '—';
  return `<tr><td>${esc(label)}</td><td><strong>${esc(formatted)}</strong></td></tr>`;
}

function warningRows(result) {
  const rows = [];
  const add = (entry, scope) => {
    if (!entry) return;
    const code = String(entry.code ?? 'ADVISORY').trim() || 'ADVISORY';
    const message = String(entry.message ?? entry).trim();
    const key = `${scope}|${code}|${message}`;
    if (!message || rows.some((row) => row.key === key)) return;
    rows.push({ key, scope, code, message });
  };
  (result?.warnings ?? []).forEach((entry) => add(entry, 'PROJECT'));
  (result?.advisories ?? []).forEach((entry) => add(entry, 'PROJECT'));
  for (const product of result?.products ?? []) {
    for (const [name, calculation] of Object.entries(product?.calculations ?? {})) {
      (calculation?.warnings ?? []).forEach((entry) => add(entry, `${product.productId}:${name}`));
    }
  }
  return rows;
}

export function summarizeHpPipingClassProductionReadiness(validation = {}) {
  return Object.freeze({
    readyToCalculate: validation.ok === true,
    blockingIssues: Object.freeze([...(validation.issues ?? [])]),
    advisories: Object.freeze([...(validation.advisories ?? [])]),
    validationPolicy: validation.validationPolicy ?? null,
  });
}

export function renderHpPipingClassProductionReadinessHtml(validation = {}) {
  const summary = summarizeHpPipingClassProductionReadiness(validation);
  if (summary.blockingIssues.length) {
    return `<div class="hpwb-notice error"><strong>${summary.blockingIssues.length} calculation blocker(s).</strong><ul>${summary.blockingIssues.slice(0, 8).map((item) => `<li><span class="hpwb-code">${esc(item.code)}</span> · ${esc(item.path || 'project')}: ${esc(item.message)}</li>`).join('')}</ul></div>`;
  }
  if (summary.advisories.length) {
    return `<div class="hpwb-notice warn"><strong>Calculation available · ${summary.advisories.length} advisory item(s).</strong><ul>${summary.advisories.slice(0, 8).map((item) => `<li><span class="hpwb-code">${esc(item.code)}</span> · ${esc(item.path || 'project')}: ${esc(item.message)}</li>`).join('')}</ul><div class="hpwb-muted">Advisories do not block the production engineering-review calculation and do not establish design authority.</div></div>`;
  }
  return '<div class="hpwb-notice good"><strong>Calculation inputs structurally ready.</strong> No production-review validation blockers or method-identity advisories are open.</div>';
}

function staticTable(product) {
  const out = product?.calculations?.static?.outputs ?? {};
  return `<div class="hpwb-table-wrap"><table class="hpwb-table hpwb-production-table"><thead><tr><th>Static / pressure quantity</th><th>Value</th></tr></thead><tbody>
    ${valueRow('Pressure-design thickness', out.pressureDesignThicknessMm, 'mm')}
    ${valueRow('Required minimum thickness', out.requiredMinimumThicknessMm, 'mm')}
    ${valueRow('Required nominal thickness', out.requiredNominalThicknessMm, 'mm')}
    ${valueRow('Minimum as-manufactured thickness', out.minimumAsManufacturedThicknessMm, 'mm')}
    ${valueRow('Effective net wall', out.effectiveNetWallMm, 'mm')}
    ${valueRow('Calculated pressure rating', out.pressureRatingMpa, 'MPa')}
    ${valueRow('Pressure-rating margin', out.pressureRatingMargin, '', 6)}
    ${valueRow('Minimum-wall margin', out.minimumWallMarginMm, 'mm')}
  </tbody></table></div>`;
}

function wallTable(product) {
  const out = product?.calculations?.wallState?.outputs ?? {};
  return `<div class="hpwb-table-wrap"><table class="hpwb-table hpwb-production-table"><thead><tr><th>Wall-state quantity</th><th>Value</th></tr></thead><tbody>
    ${valueRow('Nominal wall', out.nominalWallMm, 'mm')}
    ${valueRow('Minimum as-manufactured wall', out.minimumAsManufacturedWallMm, 'mm')}
    ${valueRow('Begin-of-life conservative wall', out.beginOfLifeConservativeWallMm, 'mm')}
    ${valueRow('Reserved service loss', out.reservedServiceLossMm, 'mm')}
    ${valueRow('End-of-life effective wall', out.endOfLifeEffectiveWallMm, 'mm')}
    ${valueRow('Measured current wall', out.measuredCurrentWallMm, 'mm')}
    ${valueRow('Future service loss', out.futureServiceLossMm, 'mm')}
    ${valueRow('Projected end-of-life wall', out.projectedEndOfLifeWallMm, 'mm')}
  </tbody></table></div>`;
}

function fatigueTable(product) {
  const out = product?.calculations?.fatigue?.outputs ?? {};
  const cycles = out.cycles ?? [];
  if (!cycles.length) return '<div class="hpwb-notice">Fatigue not evaluated for this product.</div>';
  return `<div class="hpwb-table-wrap"><table class="hpwb-table hpwb-production-cycle-table"><thead><tr><th>Cycle</th><th>State pair</th><th>n</th><th>ΔP MPa</th><th>CORE Salt MPa</th><th>User Salt</th><th>Salt QA</th><th>External Seq MPa</th><th>External N</th><th>Ui</th></tr></thead><tbody>${cycles.map((cycle) => `<tr>
    <td><strong>${esc(cycle.cycleId || '—')}</strong></td>
    <td>${esc(cycle.fromStateId || '—')} → ${esc(cycle.toStateId || '—')}</td>
    <td>${Number.isFinite(cycle.appliedCycles) ? esc(Number(cycle.appliedCycles).toLocaleString()) : '—'}</td>
    <td>${fmt(cycle.pressureRangeMpa, 5)}</td>
    <td><strong>${fmt(cycle.coreSaltMpa, 6)}</strong></td>
    <td>${fmt(cycle.userSaltMpa, 6)}</td>
    <td>${esc(cycle.saltCrossCheckStatus || '—')}</td>
    <td>${fmt(cycle.equivalentAlternatingStressMpa, 6)}</td>
    <td>${Number.isFinite(cycle.permissibleCycles) ? esc(Number(cycle.permissibleCycles).toLocaleString()) : cycle.zeroDamage ? 'N/A · zero damage' : '—'}</td>
    <td><strong>${fmt(cycle.usage, 6)}</strong></td>
  </tr>`).join('')}</tbody></table></div>`;
}

function productDetail(product) {
  const staticState = product?.assessment?.staticPass === true ? 'PASS'
    : product?.assessment?.staticPass === false ? 'FAIL' : 'NOT EVALUATED';
  const fatigueState = product?.assessment?.fatigueEvaluated
    ? product?.assessment?.fatigueUsageWithinUnity === true ? 'U ≤ 1' : 'U > 1'
    : 'NOT SUPPLIED';
  const fatigueOut = product?.calculations?.fatigue?.outputs ?? {};
  return `<details class="hpwb-details hpwb-production-product" open data-hpwb-production-product="${esc(product.productId)}"><summary>${esc(product.productId)} · ${esc(product.engineeringState || 'REVIEW')}</summary>
    <div class="hpwb-metrics hpwb-production-metrics">
      ${metric('Static', staticState, 'engineering review')}
      ${metric('Pressure rating', `${fmt(product?.calculations?.static?.outputs?.pressureRatingMpa, 4)} MPa`, 'calculated')}
      ${metric('Selected fatigue wall', `${fmt(product.selectedFatigueWallMm, 5)} mm`, product.selectedFatigueWallBasis || '')}
      ${metric('Cumulative U', fmt(product?.assessment?.cumulativeUsage, 6), fatigueState)}
      ${metric('Evidence issues', Number.isFinite(fatigueOut.evidenceIssueCount) ? String(fatigueOut.evidenceIssueCount) : '—', 'advisory only')}
    </div>
    <div class="hpwb-production-ledger-grid"><section><h4>Static pressure ledger</h4>${staticTable(product)}</section><section><h4>Wall-state ledger</h4>${wallTable(product)}</section></div>
    <section style="margin-top:12px"><h4>Pressure-cycle fatigue ledger</h4>${fatigueTable(product)}</section>
  </details>`;
}

export function renderHpPipingClassProductionResultHtml(result = null) {
  if (!result) return '';
  if (!result.ok) {
    return `<div class="hpwb-notice error"><strong>${esc(result.projectState || 'CALCULATION BLOCKED')}</strong> · No production result ledger is shown because the canonical evaluator did not complete.</div>`;
  }
  const advisories = warningRows(result);
  return `<section class="hpwb-card hpwb-production-review" data-hpwb-production-review="true">
    <div class="hpwb-section-toolbar"><div><h4>Production engineering-review ledger</h4><p>Detailed numerical replay of the same canonical evaluator after an explicit review run.</p></div><span class="hpwb-badge warn">REVIEW ONLY · NO DESIGN AUTHORITY</span></div>
    ${advisories.length ? `<div class="hpwb-notice warn"><strong>${advisories.length} advisory / warning item(s).</strong><ul>${advisories.slice(0, 12).map((row) => `<li><span class="hpwb-code">${esc(row.code)}</span> · ${esc(row.scope)}: ${esc(row.message)}</li>`).join('')}</ul></div>` : '<div class="hpwb-notice good">No calculation warnings were returned by the review evaluator.</div>'}
    ${(result.products ?? []).map(productDetail).join('') || '<div class="hpwb-notice warn">No product results were returned.</div>'}
  </section>`;
}
