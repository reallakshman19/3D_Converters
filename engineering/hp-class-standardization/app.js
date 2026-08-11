'use strict';

const KD2_SOURCE = Object.freeze({
  commit: '4dd651abbc86310077eaace6caa8b6788c1a6697',
  blob: '8f20cd0dab683d28359e02207f6f65b834144ec9',
});

const DEFAULTS = Object.freeze({
  diameter: 114.3,
  designPressure: 20,
  allowableStress: 138,
  ci: 3,
  co: 0,
  tolerance: 12.5,
  walls: '13.49, 17.12, 22.00',
  cycles: [
    { id: 'C1', name: 'Startup / shutdown', pMin: 2, pMax: 20, tMin: 40, tMax: 200, syt: 225, n: 500 },
  ],
});

const byId = (id) => document.getElementById(id);
let cycleCounter = 1;
let currentWalls = [];
let currentMatrix = [];
let lastInput = null;
let lastStaticMinimum = NaN;

function numberValue(id) {
  const value = Number(byId(id).value);
  return Number.isFinite(value) ? value : NaN;
}

function parseWalls(value) {
  return [...new Set(value.split(',').map((part) => Number(part.trim())).filter((n) => n > 0 && Number.isFinite(n)))];
}

function requiredPressureWall({ D, co, P, S }) {
  return ((D - 2 * co) / 2) * (1 - Math.exp(-P / S));
}

function pressureRating({ D, co, T, ci, S }) {
  const numerator = D - 2 * co;
  const denominator = D - 2 * (T - ci);
  if (numerator <= 0 || denominator <= 0 || numerator <= denominator) return NaN;
  return S * Math.log(numerator / denominator);
}

function pressureStress({ P, D, T, c }) {
  const effective = T - c;
  const denominator = 2 * effective * (D - effective);
  if (effective <= 0 || D <= effective || denominator <= 0) return NaN;
  return (P * D * D) / denominator;
}

function pressureState({ P, D, effective }) {
  const ro = D / 2;
  const ri = ro - effective;
  const denominator = ro * ro - ri * ri;
  if (!(effective > 0) || !(ri > 0) || !(denominator > 0)) {
    return { axial: NaN, hoop: NaN, radial: NaN };
  }
  return {
    axial: P * ri * ri / denominator,
    hoop: P * (ro * ro + ri * ri) / denominator,
    radial: -P,
  };
}

function stressIntensityFromPrincipal(values) {
  if (!values.every(Number.isFinite)) return NaN;
  return Math.max(...values) - Math.min(...values);
}

function requiredNominalWall(minRequired, tolerancePercent) {
  const factor = 1 - tolerancePercent / 100;
  return factor > 0 ? minRequired / factor : NaN;
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'INVALID';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function authorityState() {
  return {
    b31Edition: byId('b31Edition').value.trim(),
    viii3Edition: byId('viii3Edition').value.trim(),
    materialSpec: byId('materialSpec').value.trim(),
    materialGrade: byId('materialGrade').value.trim(),
    productSpec: byId('productSpec').value.trim(),
    toleranceSource: byId('toleranceSource').value.trim(),
    kdRoute: byId('kdRoute').value.trim(),
    fatigueCurveId: byId('fatigueCurveId').value.trim(),
    evidencePackage: byId('evidencePackage').value.trim(),
    fractureStatus: byId('fractureStatus').value,
    fractureEvidence: byId('fractureEvidence').value.trim(),
    kd2Edition: byId('kd2Edition').value.trim(),
    kd2AnalysisMethod: byId('kd2AnalysisMethod').value,
    kd2StressModel: byId('kd2StressModel').value,
    kd2Geometry: byId('kd2Geometry').value,
    kd2Residual: byId('kd2Residual').value,
    kd2LimitCalcId: byId('kd2LimitCalcId').value.trim(),
    kd2Approved: Boolean(byId('kd2Approved').checked),
  };
}

function authorityComplete(authority) {
  return Boolean(
    authority.viii3Edition && authority.materialSpec && authority.materialGrade && authority.productSpec &&
    authority.toleranceSource && authority.kdRoute && authority.fatigueCurveId && authority.evidencePackage
  );
}

function kd2Gate(authority) {
  if (!authority.kd2Edition) return { ok: false, label: 'KD-2 edition unconfirmed', css: 'blocked' };
  if (authority.kd2AnalysisMethod === 'unassessed') return { ok: false, label: 'KD-2 route unassessed', css: 'blocked' };
  if (authority.kd2AnalysisMethod === 'inelastic' || authority.kd2AnalysisMethod === 'special') {
    return { ok: false, label: 'KD-2 detailed/special route', css: 'warn' };
  }
  if (authority.kd2StressModel !== 'pressure-analytic') return { ok: false, label: 'External KD-2 model required', css: 'warn' };
  if (authority.kd2Geometry !== 'uniform') return { ok: false, label: 'Local/special geometry route', css: 'warn' };
  if (authority.kd2Residual === 'evidence' && !authority.kd2LimitCalcId) return { ok: false, label: 'Residual/prestress evidence required', css: 'blocked' };
  if (!authority.kd2LimitCalcId) return { ok: false, label: 'KD-2 limit-check ID required', css: 'blocked' };
  if (!authority.kd2Approved) return { ok: false, label: 'KD-2 approval pending', css: 'blocked' };
  return { ok: true, label: 'KD-2 package approved', css: 'good' };
}

function fractureGate(authority) {
  if (authority.fractureStatus === 'special') return { ok: false, label: 'Outside automatic class route', css: 'warn' };
  if (authority.fractureStatus === 'unassessed') return { ok: false, label: 'Unassessed', css: 'blocked' };
  if (!authority.fractureEvidence) return { ok: false, label: 'Evidence ID required', css: 'blocked' };
  if (authority.fractureStatus === 'kd4-approved') return { ok: true, label: 'KD-4 evidence approved', css: 'good' };
  return { ok: true, label: 'Review cleared', css: 'good' };
}

function addCycleRow(data = {}) {
  cycleCounter += 1;
  const id = data.id || `C${cycleCounter}`;
  const row = document.createElement('tr');
  row.dataset.cycleId = id;
  row.innerHTML = `
    <td><input class="table-input cycle-name" value="${escapeHtml(data.name || id)}" aria-label="Cycle block name"></td>
    <td><input class="table-input cycle-pmin" type="number" step="any" value="${data.pMin ?? ''}" aria-label="Pmin"></td>
    <td><input class="table-input cycle-pmax" type="number" step="any" value="${data.pMax ?? ''}" aria-label="Pmax"></td>
    <td><input class="table-input cycle-tmin" type="number" step="any" value="${data.tMin ?? ''}" aria-label="Tmin"></td>
    <td><input class="table-input cycle-tmax" type="number" step="any" value="${data.tMax ?? ''}" aria-label="Tmax"></td>
    <td class="cycle-avg">-</td>
    <td><input class="table-input cycle-syt" type="number" min="0" step="any" value="${data.syt ?? ''}" placeholder="controlled" aria-label="Syt at average temperature"></td>
    <td><input class="table-input cycle-n" type="number" min="1" step="1" value="${data.n ?? ''}" aria-label="Cycle count"></td>
    <td class="center"><button type="button" class="remove-cycle small-button">Remove</button></td>`;
  byId('cycleBody').appendChild(row);
  refreshCycleAverage(row);
}

function refreshCycleAverage(row) {
  const tMin = Number(row.querySelector('.cycle-tmin').value);
  const tMax = Number(row.querySelector('.cycle-tmax').value);
  row.querySelector('.cycle-avg').textContent = Number.isFinite(tMin) && Number.isFinite(tMax) ? fmt((tMin + tMax) / 2, 1) : '-';
}

function readCycles() {
  return [...byId('cycleBody').querySelectorAll('tr')].map((row, index) => {
    const num = (selector) => Number(row.querySelector(selector).value);
    return {
      id: row.dataset.cycleId || `C${index + 1}`,
      name: row.querySelector('.cycle-name').value.trim() || `Cycle ${index + 1}`,
      pMin: num('.cycle-pmin'),
      pMax: num('.cycle-pmax'),
      tMin: num('.cycle-tmin'),
      tMax: num('.cycle-tmax'),
      syt: num('.cycle-syt'),
      n: num('.cycle-n'),
    };
  });
}

function readInputs() {
  return {
    D: numberValue('diameter'),
    Pdesign: numberValue('designPressure'),
    S: numberValue('allowableStress'),
    ci: numberValue('ci'),
    co: numberValue('co'),
    tolerance: numberValue('tolerance'),
    walls: parseWalls(byId('candidateWalls').value),
    cycles: readCycles(),
    authority: authorityState(),
  };
}

function validateInputs(input) {
  if (!(input.D > 0) || !(input.Pdesign > 0) || !(input.S > 0)) return 'D, design pressure and allowable stress S must be positive.';
  if (input.ci < 0 || input.co < 0) return 'ci and co cannot be negative.';
  if (input.D <= 2 * input.co) return 'D must be greater than 2 x co.';
  if (!(input.tolerance >= 0 && input.tolerance < 100)) return 'Wall minus tolerance must be between 0% and 100%.';
  if (!input.walls.length) return 'Enter at least one positive candidate nominal wall.';
  if (!input.cycles.length) return 'Enter at least one pressure-cycle block.';
  for (const cycle of input.cycles) {
    if (![cycle.pMin, cycle.pMax, cycle.tMin, cycle.tMax, cycle.syt, cycle.n].every(Number.isFinite)) return `Complete all numeric inputs for ${cycle.name}.`;
    if (cycle.pMin < 0 || cycle.pMax < cycle.pMin) return `${cycle.name}: require 0 <= Pmin <= Pmax.`;
    if (cycle.tMax < cycle.tMin) return `${cycle.name}: require Tmin <= Tmax.`;
    if (!(cycle.syt > 0)) return `${cycle.name}: Syt at cycle-average temperature must be positive.`;
    if (!(cycle.n > 0)) return `${cycle.name}: cycle count n must be positive.`;
  }
  return '';
}

function staticWallResult(input, tNominal, staticMinimum) {
  const T = tNominal * (1 - input.tolerance / 100);
  const rating = pressureRating({ D: input.D, co: input.co, T, ci: input.ci, S: input.S });
  const pass = T >= staticMinimum && Number.isFinite(rating) && rating >= input.Pdesign;
  return { tNominal, T, rating, pass };
}

function fatigueResult(input, wall, cycle) {
  const c = input.ci + input.co;
  const effective = wall.T - c;
  const spMin = pressureStress({ P: cycle.pMin, D: input.D, T: wall.T, c });
  const spMax = pressureStress({ P: cycle.pMax, D: input.D, T: wall.T, c });
  const deltaSp = spMax - spMin;
  const stateMin = pressureState({ P: cycle.pMin, D: input.D, effective });
  const stateMax = pressureState({ P: cycle.pMax, D: input.D, effective });
  const delta = {
    axial: stateMax.axial - stateMin.axial,
    hoop: stateMax.hoop - stateMin.hoop,
    radial: stateMax.radial - stateMin.radial,
  };
  const deltaSI = stressIntensityFromPrincipal([delta.axial, delta.hoop, delta.radial]);
  return {
    wall: wall.tNominal,
    cycleId: cycle.id,
    cycleName: cycle.name,
    averageT: (cycle.tMin + cycle.tMax) / 2,
    syt: cycle.syt,
    n: cycle.n,
    effective,
    spMin,
    spMax,
    deltaSp,
    halfRange: deltaSp / 2,
    elastic: Number.isFinite(spMax) && spMax <= 2 * cycle.syt,
    stateMin,
    stateMax,
    delta,
    deltaSI,
  };
}

function rowKey(wall, cycleId) {
  return `${wall.toFixed(4)}-${cycleId}`;
}

function readKdState(wall, cycleId) {
  const key = rowKey(wall, cycleId);
  return {
    seq: Number(byId(`seq-${key}`)?.value),
    ni: Number(byId(`ni-${key}`)?.value),
    source: (byId(`source-${key}`)?.value || '').trim(),
    approved: Boolean(byId(`approved-${key}`)?.checked),
  };
}

function captureKdStates() {
  const map = new Map();
  for (const result of currentMatrix) map.set(rowKey(result.wall, result.cycleId), readKdState(result.wall, result.cycleId));
  return map;
}

function kdComplete(kd) {
  return kd.seq > 0 && kd.ni > 0 && Boolean(kd.source) && kd.approved;
}

function kdInputsHtml(result, previous, defaultSource) {
  const key = rowKey(result.wall, result.cycleId);
  const seq = Number.isFinite(previous.seq) && previous.seq > 0 ? previous.seq : '';
  const ni = Number.isFinite(previous.ni) && previous.ni > 0 ? previous.ni : '';
  const source = previous.source || defaultSource || '';
  return `<td><input id="seq-${key}" class="table-input" type="number" min="0" step="any" value="${seq}" placeholder="licensed"></td>
    <td><input id="ni-${key}" class="table-input" type="number" min="1" step="1" value="${ni}" placeholder="licensed"></td>
    <td><input id="source-${key}" class="table-input source-input" value="${escapeHtml(source)}" placeholder="KD-3 clause / calc ID"></td>
    <td class="center"><input id="approved-${key}" type="checkbox" ${previous.approved ? 'checked' : ''} aria-label="Licensed KD-3 evidence approved"></td>`;
}

function renderSummaryMetrics(input, pressureWall, staticMinimum, nominalRequired) {
  byId('requiredWall').textContent = `${fmt(pressureWall, 4)} mm`;
  byId('minimumWall').textContent = `${fmt(staticMinimum, 4)} mm`;
  byId('nominalRequired').textContent = `${fmt(nominalRequired, 4)} mm`;
  byId('cycleCountMetric').textContent = String(input.cycles.length);
}

function renderStaticTable(input, staticMinimum) {
  currentWalls = input.walls.map((wall) => staticWallResult(input, wall, staticMinimum));
  byId('staticBody').innerHTML = currentWalls.map((wall) => `<tr>
    <td>${fmt(wall.tNominal, 2)}</td><td>${fmt(wall.T, 4)}</td><td>${fmt(wall.T - staticMinimum, 4)}</td>
    <td>${fmt(wall.rating, 2)}</td><td><span class="badge ${wall.pass ? 'good' : 'bad'}">${wall.pass ? 'PASS' : 'FAIL'}</span></td>
  </tr>`).join('');
}

function renderKd2Table(input) {
  const gate = kd2Gate(input.authority);
  byId('kd2Body').innerHTML = currentMatrix.map((result) => `<tr>
    <td>${fmt(result.wall, 2)}</td><td class="text-left">${escapeHtml(result.cycleName)}</td><td>${fmt(result.effective, 4)}</td>
    <td>${fmt(result.stateMin.axial, 2)} / ${fmt(result.stateMax.axial, 2)}</td>
    <td>${fmt(result.stateMin.hoop, 2)} / ${fmt(result.stateMax.hoop, 2)}</td>
    <td>${fmt(result.stateMin.radial, 2)} / ${fmt(result.stateMax.radial, 2)}</td>
    <td>${fmt(result.delta.axial, 2)} / ${fmt(result.delta.hoop, 2)} / ${fmt(result.delta.radial, 2)}</td>
    <td>${fmt(result.deltaSI, 2)}</td>
    <td><span class="badge ${gate.css}">${escapeHtml(gate.label)}</span></td>
  </tr>`).join('');
}

function renderFatigueMatrix(input) {
  const oldKd = captureKdStates();
  currentMatrix = [];
  for (const wall of currentWalls) {
    for (const cycle of input.cycles) currentMatrix.push(fatigueResult(input, wall, cycle));
  }
  renderKd2Table(input);
  byId('fatigueBody').innerHTML = currentMatrix.map((result) => {
    const previous = oldKd.get(rowKey(result.wall, result.cycleId)) || { seq: NaN, ni: NaN, source: '', approved: false };
    return `<tr data-key="${rowKey(result.wall, result.cycleId)}">
      <td>${fmt(result.wall, 2)}</td><td class="text-left">${escapeHtml(result.cycleName)}</td><td>${fmt(result.averageT, 1)}</td><td>${fmt(result.effective, 4)}</td>
      <td>${fmt(result.spMin, 2)}</td><td>${fmt(result.spMax, 2)}</td><td>${fmt(result.deltaSp, 2)}</td><td>${fmt(result.halfRange, 2)}</td>
      <td><span class="badge ${result.elastic ? 'good' : 'warn'}">${result.elastic ? 'Elastic route' : 'Inelastic required'}</span></td>
      ${kdInputsHtml(result, previous, input.authority.evidencePackage)}<td class="usage">-</td></tr>`;
  }).join('');
  updateUsageAndClassSummary(input);
}

function wallStatus(input, wall) {
  if (!wall.pass) return { label: 'Static fail', css: 'bad', cumulative: NaN, kdCount: 0, allKd: false, anyInelastic: false };
  const kd2 = kd2Gate(input.authority);
  if (!kd2.ok) return { label: kd2.label, css: kd2.css, cumulative: NaN, kdCount: 0, allKd: false, anyInelastic: false };

  const results = currentMatrix.filter((row) => row.wall === wall.tNominal);
  const anyInelastic = results.some((row) => !row.elastic);
  if (anyInelastic) return { label: 'Inelastic / special route', css: 'warn', cumulative: NaN, kdCount: 0, allKd: false, anyInelastic };

  let cumulative = 0;
  let kdCount = 0;
  let allKd = true;
  for (const result of results) {
    const kd = readKdState(result.wall, result.cycleId);
    if (!kdComplete(kd)) {
      allKd = false;
      continue;
    }
    kdCount += 1;
    cumulative += result.n / kd.ni;
  }
  const authority = input.authority;
  const fracture = fractureGate(authority);
  if (!allKd) return { label: 'KD-3 placeholders pending', css: 'blocked', cumulative: NaN, kdCount, allKd, anyInelastic };
  if (!authorityComplete(authority)) return { label: 'Authority metadata incomplete', css: 'blocked', cumulative, kdCount, allKd, anyInelastic };
  if (!fracture.ok) return { label: fracture.label, css: fracture.css, cumulative, kdCount, allKd, anyInelastic };
  if (cumulative > 1) return { label: 'Cumulative fatigue usage > 1.0', css: 'bad', cumulative, kdCount, allKd, anyInelastic };
  return { label: 'Eligible for class-release review', css: 'good', cumulative, kdCount, allKd, anyInelastic };
}

function updateUsageAndClassSummary(input) {
  for (const result of currentMatrix) {
    const row = byId('fatigueBody').querySelector(`tr[data-key="${rowKey(result.wall, result.cycleId)}"]`);
    if (!row) continue;
    const kd = readKdState(result.wall, result.cycleId);
    const usage = kdComplete(kd) ? result.n / kd.ni : NaN;
    row.querySelector('.usage').textContent = Number.isFinite(usage) ? usage.toFixed(5) : '-';
  }

  const fracture = fractureGate(input.authority);
  const kd2 = kd2Gate(input.authority);
  byId('summaryBody').innerHTML = currentWalls.map((wall) => {
    const status = wallStatus(input, wall);
    return `<tr>
      <td>${fmt(wall.tNominal, 2)}</td>
      <td><span class="badge ${wall.pass ? 'good' : 'bad'}">${wall.pass ? 'PASS' : 'FAIL'}</span></td>
      <td><span class="badge ${kd2.css}">${escapeHtml(kd2.label)}</span></td>
      <td>${input.cycles.length}</td>
      <td>${status.kdCount}/${input.cycles.length} approved</td>
      <td>${status.anyInelastic ? 'YES' : 'NO'}</td>
      <td>${Number.isFinite(status.cumulative) ? status.cumulative.toFixed(5) : '-'}</td>
      <td><span class="badge ${fracture.css}">${escapeHtml(fracture.label)}</span></td>
      <td><span class="badge ${status.css}">${escapeHtml(status.label)}</span></td>
    </tr>`;
  }).join('');
}

function calculate() {
  const input = readInputs();
  const error = validateInputs(input);
  byId('errorBox').textContent = error;
  byId('errorBox').hidden = !error;
  if (error) return;

  const c = input.ci + input.co;
  const pressureWall = requiredPressureWall({ D: input.D, co: input.co, P: input.Pdesign, S: input.S });
  const staticMinimum = pressureWall + c;
  const nominalRequired = requiredNominalWall(staticMinimum, input.tolerance);
  lastInput = input;
  lastStaticMinimum = staticMinimum;
  renderSummaryMetrics(input, pressureWall, staticMinimum, nominalRequired);
  renderStaticTable(input, staticMinimum);
  renderFatigueMatrix(input);
}

function loadReferenceExample() {
  byId('diameter').value = DEFAULTS.diameter;
  byId('designPressure').value = DEFAULTS.designPressure;
  byId('allowableStress').value = DEFAULTS.allowableStress;
  byId('ci').value = DEFAULTS.ci;
  byId('co').value = DEFAULTS.co;
  byId('tolerance').value = DEFAULTS.tolerance;
  byId('candidateWalls').value = DEFAULTS.walls;
  byId('viii3Edition').value = '';
  byId('materialSpec').value = '';
  byId('materialGrade').value = '';
  byId('productSpec').value = '';
  byId('toleranceSource').value = '';
  byId('kdRoute').value = '';
  byId('fatigueCurveId').value = '';
  byId('evidencePackage').value = '';
  byId('fractureStatus').value = 'unassessed';
  byId('fractureEvidence').value = '';
  byId('kd2Edition').value = '';
  byId('kd2AnalysisMethod').value = 'unassessed';
  byId('kd2StressModel').value = 'pressure-analytic';
  byId('kd2Geometry').value = 'uniform';
  byId('kd2Residual').value = 'none';
  byId('kd2LimitCalcId').value = '';
  byId('kd2Approved').checked = false;
  byId('cycleBody').innerHTML = '';
  cycleCounter = 0;
  DEFAULTS.cycles.forEach((cycle) => addCycleRow(cycle));
  currentMatrix = [];
  calculate();
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv() {
  if (!lastInput || !currentMatrix.length) calculate();
  if (!lastInput || !currentMatrix.length) return;
  const a = lastInput.authority;
  const headers = [
    'b31_edition','viii3_edition','material_spec','material_grade','product_spec','tolerance_source',
    'kd2_source_commit','kd2_source_blob','kd2_source_edition','kd2_analysis_method','kd2_stress_model','kd2_geometry','kd2_residual','kd2_limit_calc_id','kd2_approved',
    'kd3_route','fatigue_curve_id','evidence_package','fracture_status','fracture_evidence',
    'nominal_wall_mm','minimum_T_mm','static_pass','cycle_id','cycle_name','Pmin_MPa','Pmax_MPa','Tmin_C','Tmax_C','avg_T_C','Syt_MPa','cycles_n',
    'effective_T_minus_c_mm','sigma_z_Pmin_MPa','sigma_z_Pmax_MPa','sigma_theta_Pmin_MPa','sigma_theta_Pmax_MPa','sigma_r_Pmin_MPa','sigma_r_Pmax_MPa',
    'delta_sigma_z_MPa','delta_sigma_theta_MPa','delta_sigma_r_MPa','pressure_only_delta_SI_MPa',
    'Sp_Pmin_MPa','Sp_Pmax_MPa','delta_Sp_MPa','half_range_descriptor_MPa','elastic_gate','licensed_Seq_MPa','licensed_Ni_cycles','KD3_source','KD3_approved','usage_Ui','cumulative_U','class_status'
  ];
  const rows = currentMatrix.map((result) => {
    const wall = currentWalls.find((w) => w.tNominal === result.wall);
    const cycle = lastInput.cycles.find((c) => c.id === result.cycleId);
    const kd = readKdState(result.wall, result.cycleId);
    const usage = kdComplete(kd) ? result.n / kd.ni : '';
    const summary = wallStatus(lastInput, wall);
    return [
      a.b31Edition,a.viii3Edition,a.materialSpec,a.materialGrade,a.productSpec,a.toleranceSource,
      KD2_SOURCE.commit,KD2_SOURCE.blob,a.kd2Edition,a.kd2AnalysisMethod,a.kd2StressModel,a.kd2Geometry,a.kd2Residual,a.kd2LimitCalcId,a.kd2Approved,
      a.kdRoute,a.fatigueCurveId,a.evidencePackage,a.fractureStatus,a.fractureEvidence,
      result.wall,wall.T,wall.pass,cycle.id,cycle.name,cycle.pMin,cycle.pMax,cycle.tMin,cycle.tMax,result.averageT,result.syt,result.n,
      result.effective,result.stateMin.axial,result.stateMax.axial,result.stateMin.hoop,result.stateMax.hoop,result.stateMin.radial,result.stateMax.radial,
      result.delta.axial,result.delta.hoop,result.delta.radial,result.deltaSI,
      result.spMin,result.spMax,result.deltaSp,result.halfRange,result.elastic,kd.seq>0?kd.seq:'',kd.ni>0?kd.ni:'',kd.source,kd.approved,usage,Number.isFinite(summary.cumulative)?summary.cumulative:'',summary.label
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hp-class-standardization-qualification-matrix.csv';
  link.click();
  URL.revokeObjectURL(url);
}

byId('calculateButton').addEventListener('click', calculate);
byId('resetButton').addEventListener('click', loadReferenceExample);
byId('csvButton').addEventListener('click', downloadCsv);
byId('printButton').addEventListener('click', () => window.print());
byId('addCycleButton').addEventListener('click', () => addCycleRow({ name: `Cycle ${cycleCounter + 1}` }));
byId('cycleBody').addEventListener('input', (event) => {
  const row = event.target.closest('tr');
  if (row) refreshCycleAverage(row);
});
byId('cycleBody').addEventListener('click', (event) => {
  if (!event.target.classList.contains('remove-cycle')) return;
  if (byId('cycleBody').children.length <= 1) {
    byId('errorBox').textContent = 'At least one pressure-cycle block is required.';
    byId('errorBox').hidden = false;
    return;
  }
  event.target.closest('tr').remove();
  calculate();
});
byId('fatigueBody').addEventListener('input', () => lastInput && updateUsageAndClassSummary({ ...lastInput, authority: authorityState() }));
byId('fatigueBody').addEventListener('change', () => lastInput && updateUsageAndClassSummary({ ...lastInput, authority: authorityState() }));
[
  'viii3Edition','materialSpec','materialGrade','productSpec','toleranceSource','kdRoute','fatigueCurveId','evidencePackage',
  'fractureStatus','fractureEvidence','kd2Edition','kd2AnalysisMethod','kd2StressModel','kd2Geometry','kd2Residual','kd2LimitCalcId','kd2Approved'
].forEach((id) => {
  byId(id).addEventListener('input', () => {
    if (!lastInput) return;
    lastInput = { ...lastInput, authority: authorityState() };
    renderKd2Table(lastInput);
    updateUsageAndClassSummary(lastInput);
  });
  byId(id).addEventListener('change', () => {
    if (!lastInput) return;
    lastInput = { ...lastInput, authority: authorityState() };
    renderKd2Table(lastInput);
    updateUsageAndClassSummary(lastInput);
  });
});

loadReferenceExample();
