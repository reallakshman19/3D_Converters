function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function metric(label, value) {
  return `<div class="vi-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
}

function resultPanel(result) {
  if (!result) return '';
  if (!result.ok) {
    const problems = result.problems?.map((problem) => (
      `<li><strong>${esc(problem.term)}</strong> · ${esc(problem.status)}${problem.reason ? ` · ${esc(problem.reason)}` : ''}</li>`
    )).join('') ?? '';
    return `<div class="vi-banner warn"><strong>SBC Type-3 NOT READY.</strong><span>Complete one exact row for each required term in this scope.</span></div>
      <div class="vi-detail-body"><ul>${problems}</ul></div>`;
  }
  return `<div class="vi-banner"><strong>Candidate Type-3 result.</strong><span>Calculated from explicit project inputs only; not screening or design authority.</span></div>
    <div class="vi-summary">
      ${metric('First geometry LOF', result.firstSpan.geometryLof)}
      ${metric('First modifier', result.firstSpan.modifier)}
      ${metric('Subsequent geometry LOF', result.subsequentSpans.geometryLof)}
      ${metric('Subsequent modifier', result.subsequentSpans.modifier)}
      ${metric('Overall SBC modifier', result.overallModifier)}
      ${metric('Main-line adjusted LOF', result.mainline.adjustedLof)}
      ${metric('SBC LOF', result.lof)}
    </div>
    <div class="vi-import-facts"><span>Method: <strong class="vi-mono">${esc(result.methodId)}</strong></span><span>Status: <strong>${esc(result.status)}</strong></span><span>Scope: <strong>${esc(result.scopeId)}</strong></span></div>`;
}

export function renderSbcType3UserInputPanel(state) {
  const scopeId = state.sbcType3ScopeId ?? '';
  return `<section class="vi-card vi-sbc-type3-user-panel">
    <div class="vi-section-head"><div><h3>SBC Type-3 · user-input evaluation</h3><p>For continuous SBCs with intermediate supports. Generate the exact project-input rows for the first-span configuration, complete the values/source basis in the table above, then evaluate this scope.</p></div></div>
    <div class="vi-filterbar">
      <label>SBC scope / assessment ID<input class="vi-cell-input" data-vi-sbc-type3-scope value="${esc(scopeId)}" placeholder="e.g. LINE-100/NORMAL/SBC-01"></label>
    </div>
    <div class="vi-actions">
      <button type="button" class="vi-btn" data-vi-sbc-type3-template="mass">Add Type-3 inputs · first span WITH mass</button>
      <button type="button" class="vi-btn" data-vi-sbc-type3-template="no-mass">Add Type-3 inputs · first span WITHOUT mass</button>
      <button type="button" class="vi-btn primary" data-vi-sbc-type3-evaluate>Evaluate Type-3 SBC</button>
    </div>
    <div class="vi-banner warn"><strong>Input custody.</strong><span>Curve terms D/F/G are entered as evaluated LOF values from T3-1/T3-2/T3-3/T3-4. Minimum-span term E, location LOF, main-line LOF and multiplier are also explicit until governed data is available. The evaluator performs only the documented max/min combination; it does not digitize curves or infer missing values.</span></div>
    ${resultPanel(state.sbcType3Result)}
  </section>`;
}
