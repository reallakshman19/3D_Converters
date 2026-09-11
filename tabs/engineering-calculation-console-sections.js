import {
  buildEngineeringResultViewModel,
  canExecuteEngineeringCalculation,
  isEngineeringCalculationExecutable,
  readEngineeringConsoleObjectDraft,
} from './engineering-calculation-console-model.js';

export function esc(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
export function pretty(value) { try { return JSON.stringify(value ?? null, null, 2); } catch { return String(value); } }
export function definitionState(definition) {
  return definition?.ui?.lifecycleState
    ?? definition?.lifecycle?.state
    ?? definition?.authority?.qualificationState
    ?? definition?.authority?.calculationState
    ?? 'CONCEPT';
}
export function pill(text, kind='') { return `<span class="engineering-console-pill ${kind}">${esc(text)}</span>`; }
function scalar(value) { return typeof value === 'object' && value !== null ? `<pre class="engineering-console-inline-json">${esc(pretty(value))}</pre>` : esc(value ?? '—'); }
function fieldId(field) { return `engineering-console-${field.key.replace(/[^a-z0-9_-]/gi,'-')}`; }

function accessibilityAttrs(id, errors) {
  const errorId = `${id}-error`;
  return errors.length
    ? ` aria-invalid="true" aria-describedby="${errorId}"`
    : '';
}

function negativeMillToleranceControl(field, state, errors) {
  const id = fieldId(field);
  const value = readEngineeringConsoleObjectDraft(state.draft, field.key);
  const basis = value.basis ?? '';
  const toleranceValue = value.value ?? '';
  const unit = value.unit ?? '';
  const attrs = accessibilityAttrs(id, errors);
  const unitDisabled = basis === 'absolute' ? '' : ' disabled';
  return `<div id="${id}" class="engineering-console-object-editor" role="group" aria-labelledby="${id}-label"${errors.length ? ` aria-describedby="${id}-error"` : ''}>
    <label class="engineering-console-object-part" for="${id}-basis"><span>Basis</span><select id="${id}-basis" class="engineering-console-input" data-object-field="${field.key}" data-object-property="basis"${attrs}><option value="" ${basis === '' ? 'selected' : ''}>Select…</option><option value="percent" ${basis === 'percent' ? 'selected' : ''}>Percentage</option><option value="absolute" ${basis === 'absolute' ? 'selected' : ''}>Absolute length</option></select></label>
    <label class="engineering-console-object-part" for="${id}-value"><span>Value</span><input id="${id}-value" class="engineering-console-input" type="number" step="any" min="0" data-object-field="${field.key}" data-object-property="value" data-object-type="number" value="${esc(toleranceValue)}"${attrs}></label>
    <label class="engineering-console-object-part" for="${id}-unit"><span>Unit</span><select id="${id}-unit" class="engineering-console-input" data-object-field="${field.key}" data-object-property="unit" data-object-unit-control${unitDisabled}${attrs}><option value="" ${unit === '' ? 'selected' : ''}>${basis === 'percent' ? '%' : 'Select…'}</option><option value="mm" ${unit === 'mm' ? 'selected' : ''}>mm</option><option value="cm" ${unit === 'cm' ? 'selected' : ''}>cm</option><option value="m" ${unit === 'm' ? 'selected' : ''}>m</option><option value="in" ${unit === 'in' ? 'selected' : ''}>in</option></select></label>
  </div>`;
}

function fieldControl(field, state, errors) {
  const value = state.draft.values[field.key];
  const id = fieldId(field);
  const attrs = accessibilityAttrs(id, errors);
  if (field.ui?.editor === 'negative-mill-tolerance') return negativeMillToleranceControl(field, state, errors);
  if (field.type === 'boolean') {
    return `<label class="engineering-console-checkbox" for="${id}"><input id="${id}" type="checkbox" data-field="${field.key}" ${value === true ? 'checked' : ''}${attrs}><span>${esc(field.label || field.key)}${field.required ? ' *' : ''}</span></label>`;
  }
  if (field.type === 'enum') return `<select id="${id}" class="engineering-console-input" data-field="${field.key}"${attrs}>${value === '' ? '<option value="" selected disabled>Select…</option>' : ''}${(field.values||[]).map((item)=>`<option value="${esc(item)}" ${item === value ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select>`;
  if (field.type === 'object' || field.type === 'array' || field.type === 'table') return `<textarea id="${id}" class="engineering-console-input engineering-console-json-editor" data-field="${field.key}" spellcheck="false" placeholder="${esc(field.placeholder || '')}"${attrs}>${esc(value)}</textarea>`;
  const type = ['number','integer'].includes(field.type ?? 'number') ? 'number' : 'text';
  return `<input id="${id}" class="engineering-console-input" type="${type}" ${type === 'number' ? 'step="any"' : ''} data-field="${field.key}" value="${esc(value)}"${attrs}>`;
}

function blockedDefinitionMessage(definition) {
  const lifecycle = definition?.ui?.lifecycleState ?? definition?.lifecycle?.state;
  if (definition?.ui?.blockedReason) return definition.ui.blockedReason;
  if (lifecycle) return `${lifecycle} — engineering execution is not available in the current capability lifecycle state.`;
  return `No authorized numerical kernel is registered.${definition.qualificationIssue ? ` Qualification issue #${definition.qualificationIssue}.` : ''}`;
}

export function renderInputForm(definition, state) {
  if (!isEngineeringCalculationExecutable(definition)) {
    return `<div class="engineering-console-banner bad"><strong>Execution blocked.</strong> ${esc(blockedDefinitionMessage(definition))}</div>`;
  }
  const authorityBanner = definition?.ui?.warning
    ? `<div class="engineering-console-banner warn"><strong>Authority restriction.</strong> ${esc(definition.ui.warning)}</div>`
    : '';
  const fields = (definition.inputs||[]).map((field)=>{
    const errors = state.editorErrors.filter((item)=>item.field === field.key);
    const id = fieldId(field);
    const errorId = `${id}-error`;
    const structuredObject = field.ui?.editor === 'negative-mill-tolerance';
    const unit = field.quantity && field.quantity !== 'dimensionless'
      ? `<input class="engineering-console-input engineering-console-unit" data-unit="${field.key}" value="${esc(state.draft.units[field.key] ?? '')}" aria-label="${esc(field.label || field.key)} unit">`
      : '';
    const visibleLabel = field.type === 'boolean'
      ? ''
      : structuredObject
        ? `<div id="${id}-label" class="engineering-console-field-label">${esc(field.label || field.key)}${field.required ? ' *' : ''}</div>`
        : `<label for="${id}">${esc(field.label || field.key)}${field.required ? ' *' : ''}</label>`;
    const errorMarkup = errors.length
      ? `<div id="${errorId}" class="engineering-console-field-error">${errors.map((item)=>esc(item.message)).join(' · ')}</div>`
      : '';
    const guidance = field.help
      ? esc(field.help)
      : `${field.engineeringDefault !== undefined ? `Declared default: ${esc(String(field.engineeringDefault))}` : 'No UI default'}${field.quantity ? ` · ${esc(field.quantity)}` : ''}`;
    return `<div class="engineering-console-field ${errors.length ? 'has-error' : ''}">${visibleLabel}<div class="engineering-console-control-row">${fieldControl(field,state,errors)}${unit}</div><div class="engineering-console-field-meta">${guidance}</div>${errorMarkup}</div>`;
  }).join('');
  return `${authorityBanner}<div class="engineering-console-form-grid">${fields}</div>`;
}

function assessmentDisplay(status) {
  return status === 'NOT_ASSESSED' ? 'NOT ASSESSED' : status;
}

function assessmentBanner(view) {
  const disposition = view.assessment.disposition;
  if (view.assessment.status === 'FAIL') {
    return `<div class="engineering-console-banner bad"><strong>Assessment failed.</strong>${disposition ? ` ${esc(disposition)}` : ''}</div>`;
  }
  if (view.assessment.status === 'PASS') {
    return `<div class="engineering-console-banner"><strong>Assessment passed.</strong>${disposition ? ` ${esc(disposition)}` : ''}</div>`;
  }
  if (view.assessment.status === 'NOT_ASSESSED') {
    return `<div class="engineering-console-banner warn"><strong>No top-level acceptance decision.</strong>${disposition ? ` Disposition: ${esc(disposition)}.` : ''} Numerical execution is not an engineering PASS.</div>`;
  }
  if (view.assessment.status === 'INDETERMINATE') {
    return `<div class="engineering-console-banner warn"><strong>Assessment indeterminate.</strong>${disposition ? ` Disposition: ${esc(disposition)}.` : ''} Review the checks and evidence before using the result.</div>`;
  }
  return '';
}

function yesNoUnknown(value) {
  if (value === true) return 'YES';
  if (value === false) return 'NO';
  return '—';
}

export function renderResults(definition, result, validation) {
  const validationBanner = validation ? `<div class="engineering-console-banner ${validation.ok ? '' : 'bad'}">Validation: ${validation.ok ? 'PASS' : 'BLOCKED'} · ${(validation.errors||[]).length} errors · ${(validation.warnings||[]).length} warnings</div>` : '';
  if (!result) return `${validationBanner}<div class="engineering-console-empty">No calculation result yet.</div>`;
  const view = buildEngineeringResultViewModel(definition, result);
  return `${validationBanner}${assessmentBanner(view)}<div class="engineering-console-metrics"><div class="engineering-console-card"><small>Assessment outcome</small><strong>${esc(assessmentDisplay(view.assessment.status))}</strong></div><div class="engineering-console-card"><small>Disposition</small><strong>${esc(view.assessment.disposition ?? '—')}</strong></div><div class="engineering-console-card"><small>Authority</small><strong>${esc(view.authority.effective ?? '—')}</strong></div><div class="engineering-console-card"><small>Execution</small><strong>${esc(view.execution.status)}</strong></div><div class="engineering-console-card"><small>Design authority</small><strong>${yesNoUnknown(view.authority.designAuthority)}</strong></div><div class="engineering-console-card"><small>Code compliance</small><strong>${yesNoUnknown(view.authority.codeCompliance)}</strong></div><div class="engineering-console-card"><small>Governing eligible</small><strong>${yesNoUnknown(view.assessment.governingEligible)}</strong></div></div>${view.execution.errorCode ? `<div class="engineering-console-banner bad">${esc(view.execution.errorCode)}</div>` : ''}${(result.errors||[]).map((error)=>`<div class="engineering-console-banner bad">${esc(error.code)} — ${esc(error.message)}</div>`).join('')}${(result.warnings||[]).map((warning)=>`<div class="engineering-console-banner warn">${esc(warning.message || warning.code || warning)}</div>`).join('')}${view.outputs.length ? `<div class="engineering-console-table-wrap"><table class="engineering-console-table"><thead><tr><th>Output</th><th>Value</th><th>Unit</th></tr></thead><tbody>${view.outputs.map((output)=>`<tr><td>${esc(output.label)}</td><td>${scalar(output.value)}</td><td>${esc(output.unit ?? '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="engineering-console-empty">No authoritative outputs returned.</div>'}`;
}

export function renderChecks(result) {
  const checks = buildEngineeringResultViewModel(null, result).checks;
  if (!checks.length) return '<div class="engineering-console-empty">No qualified assessment checks returned by the calculator.</div>';
  return `<div class="engineering-console-table-wrap"><table class="engineering-console-table"><thead><tr><th>Check</th><th>Actual</th><th>Allowable</th><th>Utilization</th><th>Status</th><th>Authority</th></tr></thead><tbody>${checks.map((check)=>`<tr><td>${esc(check.label)}</td><td>${scalar(check.actual)}</td><td>${scalar(check.allowable)}</td><td>${scalar(check.utilization)}</td><td>${pill(check.status, check.status === 'PASS' ? 'ok' : check.status === 'FAIL' ? 'bad' : 'warn')}</td><td>${esc(check.authority)}</td></tr>`).join('')}</tbody></table></div>`;
}

export function renderBasis(definition, resolution) {
  const lifecycle = definition?.ui?.lifecycleState ?? definition?.lifecycle?.state ?? '—';
  const methodState = definition?.authority?.qualificationState ?? definition?.authority?.calculationState ?? 'CONCEPT';
  return `<div class="engineering-console-metrics"><div class="engineering-console-card"><small>Calculation ID</small><strong>${esc(definition.id)}</strong></div><div class="engineering-console-card"><small>Method revision</small><strong>${esc(definition.methodRevision)}</strong></div><div class="engineering-console-card"><small>Lifecycle</small><strong>${esc(lifecycle)}</strong></div><div class="engineering-console-card"><small>Method state</small><strong>${esc(methodState)}</strong></div><div class="engineering-console-card"><small>Qualification issue</small><strong>${esc(definition.qualificationIssue ?? '—')}</strong></div></div><div class="engineering-console-card"><h3>Purpose</h3><p>${esc(definition.purpose || '')}</p></div><div class="engineering-console-card"><h3>Applicability</h3><p>${esc(definition.applicability?.description || 'Not declared.')}</p><ul>${(definition.applicability?.limitations||[]).map((item)=>`<li>${esc(item)}</li>`).join('')}</ul></div>${resolution ? `<div class="engineering-console-card"><h3>Latest resolved inputs</h3><pre class="engineering-console-json">${esc(pretty(resolution))}</pre></div>` : ''}`;
}

export function renderEvidence(result) {
  if (!result) return '<div class="engineering-console-empty">Run a calculation to inspect qualification, provenance and evidence.</div>';
  return `<div class="engineering-console-preview-grid"><div class="engineering-console-card"><h3>Qualification</h3><pre class="engineering-console-json">${esc(pretty(result.qualification))}</pre></div><div class="engineering-console-card"><h3>Provenance</h3><pre class="engineering-console-json">${esc(pretty(result.provenance))}</pre></div></div><div class="engineering-console-card"><h3>Evidence</h3><pre class="engineering-console-json">${esc(pretty(result.evidence))}</pre></div>`;
}

export function renderBatch(state, definition) {
  const batch = state.batchResult;
  const executable = canExecuteEngineeringCalculation(definition, state.qualificationMode);
  const authorityBanner = executable
    ? 'Batch uses the central batch API; every item follows the same registered single-calculation path.'
    : 'Current calculator is not executable in the selected qualification mode and cannot be added to batch.';
  return `<div class="engineering-console-banner ${executable ? '' : 'warn'}">${esc(authorityBanner)}</div><textarea class="engineering-console-input engineering-console-batch-editor" data-batch-editor spellcheck="false">${esc(state.batchText)}</textarea><div class="engineering-console-actions"><button class="engineering-console-btn" data-action="add-current-batch" ${executable ? '' : 'disabled'}>Add current request</button><button class="engineering-console-btn primary" data-action="run-batch">Run Batch</button></div>${state.batchError ? `<div class="engineering-console-banner bad">${esc(state.batchError)}</div>` : ''}${batch ? `<div class="engineering-console-metrics"><div class="engineering-console-card"><small>Total</small><strong>${batch.total}</strong></div><div class="engineering-console-card"><small>Succeeded</small><strong>${batch.succeeded}</strong></div><div class="engineering-console-card"><small>Failed</small><strong>${batch.failed}</strong></div></div><pre class="engineering-console-json">${esc(pretty(batch))}</pre>` : ''}`;
}
