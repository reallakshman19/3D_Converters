'use strict';

const DEFAULTS = Object.freeze({
  diameter: 114.3,
  designPressure: 20,
  pMin: 2,
  pMax: 20,
  tMin: 40,
  tMax: 200,
  allowableStress: 138,
  yieldStrength: 225,
  ci: 3,
  co: 0,
  tolerance: 12.5,
  cycles: 500,
  walls: '13.49, 17.12, 22.00',
});

const byId = (id) => document.getElementById(id);

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

function requiredNominalWall(minRequired, tolerancePercent) {
  const factor = 1 - tolerancePercent / 100;
  return factor > 0 ? minRequired / factor : NaN;
}

function readInputs() {
  return {
    D: numberValue('diameter'),
    Pdesign: numberValue('designPressure'),
    pMin: numberValue('pMin'),
    pMax: numberValue('pMax'),
    tempMin: numberValue('tempMin'),
    tempMax: numberValue('tempMax'),
    S: numberValue('allowableStress'),
    Syt: numberValue('yieldStrength'),
    ci: numberValue('ci'),
    co: numberValue('co'),
    tolerance: numberValue('tolerance'),
    cycles: numberValue('cycles'),
    walls: parseWalls(byId('candidateWalls').value),
  };
}

function validateInputs(input) {
  const positive = ['D', 'Pdesign', 'pMax', 'S', 'Syt', 'cycles'];
  if (positive.some((key) => !(input[key] > 0))) return 'D, design pressure, Pmax, S, Syt and cycles must be positive.';
  if (input.pMin < 0 || input.pMax < input.pMin) return 'Pressure cycle requires 0 <= Pmin <= Pmax.';
  if (input.ci < 0 || input.co < 0) return 'ci and co cannot be negative.';
  if (input.D <= 2 * input.co) return 'D must be greater than 2 × co.';
  if (input.tempMax < input.tempMin) return 'Cycle temperature requires Tmin <= Tmax.';
  if (!(input.tolerance >= 0 && input.tolerance < 100)) return 'Wall minus tolerance must be between 0% and 100%.';
  if (!input.walls.length) return 'Enter at least one positive candidate nominal wall.';
  return '';
}

function candidateResult(input, tNominal) {
  const c = input.ci + input.co;
  const T = tNominal * (1 - input.tolerance / 100);
  const rating = pressureRating({ D: input.D, co: input.co, T, ci: input.ci, S: input.S });
  const spMin = pressureStress({ P: input.pMin, D: input.D, T, c });
  const spMax = pressureStress({ P: input.pMax, D: input.D, T, c });
  const deltaSp = spMax - spMin;
  return {
    tNominal,
    T,
    effective: T - c,
    rating,
    spMin,
    spMax,
    deltaSp,
    halfRange: deltaSp / 2,
    elastic: Number.isFinite(spMax) && spMax <= 2 * input.Syt,
  };
}

function kdState(tNominal) {
  const key = tNominal.toFixed(4);
  return {
    seq: Number(byId(`seq-${key}`)?.value),
    ni: Number(byId(`ni-${key}`)?.value),
    source: (byId(`source-${key}`)?.value || '').trim(),
    approved: Boolean(byId(`approved-${key}`)?.checked),
  };
}

function statusFor(result, staticMinimum, input, kd) {
  const staticPass = result.T >= staticMinimum && result.rating >= input.Pdesign;
  if (!staticPass) return ['Static fail', 'bad'];
  if (!result.elastic) return ['Inelastic analysis required', 'warn'];
  if (!(kd.seq > 0) || !(kd.ni > 0) || !kd.source || !kd.approved) return ['KD blocked / not released', 'blocked'];
  const usage = input.cycles / kd.ni;
  if (usage > 1) return ['KD usage > 1.0', 'bad'];
  return ['Eligible for class-release review', 'good'];
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'INVALID';
}

function renderSummary(input, pressureWall, staticMinimum, nominalRequired) {
  byId('requiredWall').textContent = `${fmt(pressureWall, 4)} mm`;
  byId('minimumWall').textContent = `${fmt(staticMinimum, 4)} mm`;
  byId('nominalRequired').textContent = `${fmt(nominalRequired, 4)} mm`;
  byId('averageTemperature').textContent = `${fmt((input.tempMin + input.tempMax) / 2, 1)} °C`;
}

function escapeAttribute(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function kdInputsHtml(result, previous) {
  const key = result.tNominal.toFixed(4);
  const seq = Number.isFinite(previous.seq) && previous.seq > 0 ? previous.seq : '';
  const ni = Number.isFinite(previous.ni) && previous.ni > 0 ? previous.ni : '';
  return `<td><input id="seq-${key}" class="table-input" type="number" min="0" step="any" value="${seq}" placeholder="licensed"></td>
    <td><input id="ni-${key}" class="table-input" type="number" min="1" step="1" value="${ni}" placeholder="licensed"></td>
    <td><input id="source-${key}" class="table-input source-input" value="${escapeAttribute(previous.source)}" placeholder="KD clause / calc ID"></td>
    <td class="center"><input id="approved-${key}" type="checkbox" ${previous.approved ? 'checked' : ''} aria-label="Licensed KD evidence approved"></td>`;
}

function renderCandidates(input, pressureWall, staticMinimum) {
  const oldKd = new Map(currentResults.map((r) => [r.tNominal.toFixed(4), kdState(r.tNominal)]));
  currentResults = input.walls.map((wall) => candidateResult(input, wall));
  const body = byId('resultsBody');
  body.innerHTML = currentResults.map((result) => {
    const previous = oldKd.get(result.tNominal.toFixed(4)) || { seq: NaN, ni: NaN, source: '', approved: false };
    return `<tr data-wall="${result.tNominal}">
      <td>${fmt(result.tNominal, 2)}</td><td>${fmt(result.T, 4)}</td><td>${fmt(result.T - staticMinimum, 4)}</td>
      <td>${fmt(result.rating, 2)}</td><td>${fmt(result.effective, 4)}</td><td>${fmt(result.spMin, 2)}</td>
      <td>${fmt(result.spMax, 2)}</td><td>${fmt(result.deltaSp, 2)}</td><td>${fmt(result.halfRange, 2)}</td>
      <td>${result.elastic ? 'Elastic route' : 'Inelastic required'}</td>${kdInputsHtml(result, previous)}
      <td class="usage">—</td><td class="status-cell">—</td></tr>`;
  }).join('');
  updateKdStatuses(input, staticMinimum);
}

function updateKdStatuses(input, staticMinimum) {
  currentResults.forEach((result) => {
    const row = byId('resultsBody').querySelector(`tr[data-wall="${result.tNominal}"]`);
    const kd = kdState(result.tNominal);
    const usage = kd.ni > 0 ? input.cycles / kd.ni : NaN;
    row.querySelector('.usage').textContent = Number.isFinite(usage) ? usage.toFixed(5) : '—';
    const [label, css] = statusFor(result, staticMinimum, input, kd);
    row.querySelector('.status-cell').innerHTML = `<span class="badge ${css}">${label}</span>`;
  });
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
  renderSummary(input, pressureWall, staticMinimum, nominalRequired);
  renderCandidates(input, pressureWall, staticMinimum);
  lastInput = input;
  lastStaticMinimum = staticMinimum;
}

function resetDefaults() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    const map = { diameter:'diameter', designPressure:'designPressure', pMin:'pMin', pMax:'pMax', tMin:'tempMin', tMax:'tempMax', allowableStress:'allowableStress', yieldStrength:'yieldStrength', ci:'ci', co:'co', tolerance:'tolerance', cycles:'cycles', walls:'candidateWalls' };
    byId(map[key]).value = value;
  });
  currentResults = [];
  calculate();
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv() {
  if (!lastInput || !currentResults.length) calculate();
  const headers = ['nominal_wall_mm','minimum_T_mm','effective_T_minus_c_mm','pressure_rating_MPa','Sp_Pmin_MPa','Sp_Pmax_MPa','delta_Sp_MPa','half_range_descriptor_MPa','elastic_gate','licensed_Seq_MPa','licensed_Ni_cycles','KD_source','KD_approved','usage_ni_over_Ni','status'];
  const rows = currentResults.map((result) => {
    const kd = kdState(result.tNominal);
    const usage = kd.ni > 0 ? lastInput.cycles / kd.ni : '';
    const [status] = statusFor(result, lastStaticMinimum, lastInput, kd);
    return [result.tNominal,result.T,result.effective,result.rating,result.spMin,result.spMax,result.deltaSp,result.halfRange,result.elastic?'elastic':'inelastic',kd.seq>0?kd.seq:'',kd.ni>0?kd.ni:'',kd.source,kd.approved,usage,status];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'hp-class-standardization.csv'; link.click();
  URL.revokeObjectURL(url);
}

let currentResults = [];
let lastInput = null;
let lastStaticMinimum = NaN;

byId('calculateButton').addEventListener('click', calculate);
byId('resetButton').addEventListener('click', resetDefaults);
byId('csvButton').addEventListener('click', downloadCsv);
byId('printButton').addEventListener('click', () => window.print());
byId('resultsBody').addEventListener('input', () => lastInput && updateKdStatuses(lastInput, lastStaticMinimum));
byId('resultsBody').addEventListener('change', () => lastInput && updateKdStatuses(lastInput, lastStaticMinimum));

resetDefaults();
