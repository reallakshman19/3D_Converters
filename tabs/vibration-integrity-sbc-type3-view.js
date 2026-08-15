function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function metric(label, value) {
  return `<div class="vi-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
}

function option(value, selected, label = value) {
  return `<option value="${esc(value)}"${String(value) === String(selected ?? '') ? ' selected' : ''}>${esc(label)}</option>`;
}

function field(label, key, value, placeholder = '') {
  return `<label>${esc(label)}<input class="vi-cell-input" data-vi-sbc-master-physical="${esc(key)}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}"></label>`;
}

function selectField(label, key, selected, values) {
  return `<label>${esc(label)}<select data-vi-sbc-master-physical="${esc(key)}">
    ${option('', selected, 'Select…')}${values.map(([value, text]) => option(value, selected, text)).join('')}
  </select></label>`;
}

const FITTINGS = Object.freeze([
  ['SHORT_CONTOURED_BODY','Short contoured body'],['CONTOURED_BODY','Contoured body'],
  ['FORGED_REDUCING_TEE','Forged reducing tee'],['WELDED_TEE','Welded tee'],['WELDOLET','Weldolet'],
  ['THREADOLET_FULLY_BACK_WELDED','Threadolet · fully back-welded'],
  ['SCREWED_FULLY_BACK_WELDED','Screwed · fully back-welded'],['THREADOLET','Threadolet'],
  ['SCREWED','Screwed'],['SOCKOLET','Sockolet'],
  ['THREADOLET_PARTIALLY_BACK_WELDED','Threadolet · partially back-welded'],
  ['SCREWED_PARTIALLY_BACK_WELDED','Screwed · partially back-welded'],
  ['SET_ON','Set-on'],['SET_IN','Set-in'],['SET_THRU','Set-thru'],
]);
const VALVE_CONFIGS = Object.freeze([
  ['FLANGE_ONLY','Flange only'],['ONE_VALVE_OR_INTEGRAL_DBB','One valve / integral DBB'],
  ['TWO_OR_MORE_VALVES','Two or more valves'],['ONE_OR_MORE_VALVES','One or more valves (ANSI 900+)'],
]);
const LOCATIONS = Object.freeze([
  ['VALVE','Near valve'],['REDUCER','Near reducer'],['BEND','Near bend'],['TEE','Near tee'],
  ['MID_SPAN','Mid span'],['PARTIALLY_FIXED_SUPPORT','Partially fixed support'],['FIXED_SUPPORT','Fixed support'],
]);
const DIAMETERS = Object.freeze([
  ['0.25','¼ in'],['0.375','⅜ in'],['0.5','½ in'],['0.75','¾ in'],
  ['1','1 in'],['1.25','1¼ in'],['1.5','1½ in'],['2','2 in'],
]);

function curveRequestList(result) {
  if (!result?.curveRequests?.length) return '';
  return `<div class="vi-detail-body"><strong>Manual curve values still required:</strong><ul>${result.curveRequests.map((row) => (
    `<li><span class="vi-mono">${esc(row.blockerId)}</span> · diameter ${esc(row.xValue)} ${esc(row.xUnit)} · span ${esc(row.yValue)} ${esc(row.yUnit)}</li>`
  )).join('')}</ul></div>`;
}

function resultPanel(result) {
  if (!result) return '';
  if (!result.ok) {
    const problems = result.problems?.map((problem) => (
      `<li><strong>${esc(problem.term)}</strong> · ${esc(problem.status)}${problem.reason ? ` · ${esc(problem.reason)}` : ''}</li>`
    )).join('') ?? '';
    return `<div class="vi-banner warn"><strong>SBC Type-3 NOT READY.</strong><span>Complete the physical inputs and the exact D/F/G curve rows requested for this scope.</span></div>
      <div class="vi-detail-body"><ul>${problems}</ul></div>${curveRequestList(result)}`;
  }
  const master = result.masterAssistance;
  const banner = master
    ? 'C and E are calculated from candidate EI non-curve masters; D/F/G remain explicit manual curve reads. This result is not screening or design authority.'
    : 'Calculated from explicit project inputs only; not screening or design authority.';
  return `<div class="vi-banner"><strong>Candidate Type-3 result.</strong><span>${esc(banner)}</span></div>
    <div class="vi-summary">
      ${master ? metric('Master C', master.geometryC) : ''}
      ${master ? metric('Master E', master.minimumSpanE) : ''}
      ${metric('First geometry LOF', result.firstSpan.geometryLof)}
      ${metric('First modifier', result.firstSpan.modifier)}
      ${metric('Subsequent geometry LOF', result.subsequentSpans.geometryLof)}
      ${metric('Overall SBC modifier', result.overallModifier)}
      ${metric('Main-line adjusted LOF', result.mainline.adjustedLof)}
      ${metric('SBC LOF', result.lof)}
    </div>
    <div class="vi-import-facts"><span>Method: <strong class="vi-mono">${esc(result.methodId)}</strong></span><span>Status: <strong>${esc(result.status)}</strong></span><span>Scope: <strong>${esc(result.scopeId)}</strong></span>${master ? `<span>Modified minimum span: <strong>${esc(master.modifiedMinimumSpanM)} m</strong></span>` : ''}</div>`;
}

function masterAssistedPanel(state, physical, mainline) {
  const busy = state.sbcType3Busy ? ' disabled' : '';
  return `<div class="vi-detail-body">
    <div class="vi-section-head"><div><h4>Master-assisted physical inputs</h4><p>Enter physical/project data. Candidate EI masters calculate non-curve terms C, E, location and the 1.42 main-line rule. Conflicted chart terms D/F/G stay manual and exact-coordinate matched.</p></div></div>
    <div class="vi-filterbar">
      ${selectField('First span unsupported mass?', 'firstSpanHasUnsupportedMass', physical.firstSpanHasUnsupportedMass, [['TRUE','Yes'],['FALSE','No']])}
      ${selectField('Fitting type', 'fittingKey', physical.fittingKey, FITTINGS)}
      ${field('Branch length to mass (mm) · mass case', 'branchLengthMm', physical.branchLengthMm, '700')}
      ${field('Valve pressure class · mass case', 'valvePressureClass', physical.valvePressureClass, '600')}
      ${selectField('Valve / flange configuration · mass case', 'valveConfiguration', physical.valveConfiguration, VALVE_CONFIGS)}
      ${field('Parent pipe schedule', 'parentSchedule', physical.parentSchedule, '120')}
      ${selectField('Minimum SBC diameter', 'sbcMinDiameterIn', physical.sbcMinDiameterIn, DIAMETERS)}
      ${field('First span length (m)', 'firstSpanLengthM', physical.firstSpanLengthM, '0.9')}
      ${field('Max subsequent span with mass (m)', 'subsequentMassSpanM', physical.subsequentMassSpanM, '2.3')}
      ${field('Max subsequent span without mass (m)', 'subsequentNoMassSpanM', physical.subsequentNoMassSpanM, '1.4')}
      ${selectField('Parent-line location · required when main-line LOF < 1', 'locationKey', physical.locationKey, LOCATIONS)}
      <label>Main-line LOF<input class="vi-cell-input" data-vi-sbc-master-mainline value="${esc(mainline ?? '')}" placeholder="blank = unknown → EI assessment value 1.0"></label>
    </div>
    <div class="vi-actions">
      <button type="button" class="vi-btn" data-vi-sbc-master-template${busy}>Generate / refresh D/F/G curve rows</button>
      <button type="button" class="vi-btn primary" data-vi-sbc-master-evaluate${busy}>Evaluate master-assisted Type-3</button>
    </div>
    <div class="vi-banner warn"><strong>Curve quarantine retained.</strong><span>T3-1…T3-4 are not activated because the supplied digitization conflicts with EI Worked Example D7. Generated rows identify the exact diameter/span coordinates that still require an explicit engineering curve read.</span></div>
  </div>`;
}

function legacyPanel() {
  return `<details class="vi-detail-body"><summary>Legacy explicit-intermediate-input workflow</summary>
    <p>Use only when you need the previous fallback. This mode asks for intermediate C/E/location/multiplier values directly and switches the facility scope away from master-assisted mode.</p>
    <div class="vi-actions">
      <button type="button" class="vi-btn" data-vi-sbc-type3-template="mass">Add legacy Type-3 inputs · first span WITH mass</button>
      <button type="button" class="vi-btn" data-vi-sbc-type3-template="no-mass">Add legacy Type-3 inputs · first span WITHOUT mass</button>
      <button type="button" class="vi-btn" data-vi-sbc-type3-evaluate>Evaluate legacy Type-3</button>
    </div>
  </details>`;
}

export function renderSbcType3UserInputPanel(state) {
  const scopeId = state.sbcType3ScopeId ?? '';
  const physical = state.sbcType3PhysicalByScope?.[scopeId] ?? {};
  const mainline = state.sbcType3MainlineByScope?.[scopeId] ?? '';
  return `<section class="vi-card vi-sbc-type3-user-panel">
    <div class="vi-section-head"><div><h3>SBC Type-3 · master-assisted candidate</h3><p>For continuous SBCs with intermediate supports. Use physical geometry and project data; qualified non-curve candidate masters remove intermediate data-entry burden while the unresolved EI curves remain explicit.</p></div></div>
    <div class="vi-filterbar">
      <label>SBC scope / assessment ID<input class="vi-cell-input" data-vi-sbc-type3-scope value="${esc(scopeId)}" placeholder="e.g. LINE-100/NORMAL/SBC-01"></label>
    </div>
    ${masterAssistedPanel(state, physical, mainline)}
    ${resultPanel(state.sbcType3Result)}
    ${legacyPanel()}
  </section>`;
}
