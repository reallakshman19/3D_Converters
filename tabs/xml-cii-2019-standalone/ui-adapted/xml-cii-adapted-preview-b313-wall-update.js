import { calculateAndSelectPreviewB313Wall, B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT } from '../../../converters/xml-cii2019-core/b313-preview-wall-update.js';
import { listPipeWallsForSize } from '../../../converters/pipe-wall-master/index.js';
import { markAdaptedPreviewOverrideManual } from './xml-cii-adapted-preview-filldown.js';
import { _xmlCiiFindLineListRow } from './xml-cii-adapted-preview-dryrun-core.js';
import { XML_CII_PREVIEW_LEGACY_CACHE_KEY } from './xml-cii-adapted-preview-cache-v7.js';

export const B313_PREVIEW_ACTION_LABEL = 'Update wall thickness as per B31.3 Sec II';
export const B313_PREVIEW_BASIS_SCHEMA = 'xml-cii-b313-preview-design-basis/v1';
export const B313_PREVIEW_REPORT_SCHEMA = 'xml-cii-b313-preview-wall-update-report/v1';

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function positive(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function nonNegative(value) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; }
function normalizedToken(value) { return text(value).toUpperCase().replace(/\s+/g, ' ').trim(); }

function ensureOverrides(config) {
  if (!config.overrides || typeof config.overrides !== 'object' || Array.isArray(config.overrides)) config.overrides = {};
  return config.overrides;
}

function ensureBasisConfig(config) {
  if (!config.b313WallUpdate || typeof config.b313WallUpdate !== 'object' || Array.isArray(config.b313WallUpdate)) config.b313WallUpdate = {};
  const basis = config.b313WallUpdate;
  basis.schema = B313_PREVIEW_BASIS_SCHEMA;
  basis.negativeMillTolerancePct = B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT;
  if (!basis.bases || typeof basis.bases !== 'object' || Array.isArray(basis.bases)) basis.bases = {};
  return basis;
}

function materialText(row) {
  return text(row?.material || row?.materialName || row?.materialCode || row?.resolvedMaterial || '');
}

function temperatureText(row) {
  return text(row?.t1 ?? row?.designTemperature ?? '');
}

export function previewB313BasisKey(row) {
  const material = normalizedToken(materialText(row));
  const temperature = normalizedToken(temperatureText(row));
  return material ? `${material}|T1=${temperature || '?'}` : '';
}

function uniqueBasisGroups(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = previewB313BasisKey(row);
    if (!key || map.has(key)) continue;
    map.set(key, { key, material: materialText(row), designTemperature: temperatureText(row) });
  }
  return [...map.values()];
}

function readLegacyBranchRows() {
  try {
    const payload = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem(XML_CII_PREVIEW_LEGACY_CACHE_KEY) || 'null')
      : null;
    return Array.isArray(payload?.data?.branchRows) ? payload.data.branchRows : [];
  } catch {
    return [];
  }
}

function localName(node) { return text(node?.localName || node?.nodeName).replace(/^.*:/, ''); }
function childText(parent, name) {
  for (const child of [...(parent?.childNodes || [])]) if (child?.nodeType === 1 && localName(child) === name) return text(child.textContent);
  return '';
}

function parseSourceXml(xmlText) {
  if (typeof DOMParser === 'undefined') return { pressureUnit: '', byBranch: new Map() };
  try {
    const document = new DOMParser().parseFromString(text(xmlText), 'application/xml');
    if (document.getElementsByTagName('parsererror').length) return { pressureUnit: '', byBranch: new Map() };
    let pressureUnit = '';
    for (const element of [...document.getElementsByTagName('*')]) {
      if (localName(element) === 'PressureUnits') { pressureUnit = text(element.textContent); break; }
    }
    const byBranch = new Map();
    for (const branch of [...document.getElementsByTagName('*')].filter((element) => localName(element) === 'Branch')) {
      const branchName = childText(branch, 'Branchname');
      if (!branchName) continue;
      const candidates = [];
      for (const node of [...branch.childNodes].filter((child) => child?.nodeType === 1 && localName(child) === 'Node')) {
        const fields = ['EffectiveOutsideDiameter', 'OutsideDiameter', 'OuterDiameter', 'OD'];
        for (const field of fields) {
          const value = positive(childText(node, field));
          if (!value) continue;
          candidates.push({
            value,
            field,
            nodeNumber: childText(node, 'NodeNumber'),
            endpoint: childText(node, 'Endpoint'),
            componentType: childText(node, 'ComponentType'),
            componentRefNo: childText(node, 'ComponentRefNo'),
          });
          break;
        }
      }
      byBranch.set(branchName, candidates);
    }
    return { pressureUnit, byBranch };
  } catch {
    return { pressureUnit: '', byBranch: new Map() };
  }
}

function normalizePressureUnit(value) {
  const unit = normalizedToken(value).replace(/[.\s_-]+/g, '');
  if (!unit || unit === 'AUTO') return '';
  if (unit === 'PASCAL' || unit === 'PASCALS' || unit === 'PA') return 'PA';
  if (unit === 'KPA' || unit === 'KPAG') return 'KPA';
  if (unit === 'MPA' || unit === 'MPAG') return 'MPA';
  if (unit === 'BARG') return 'BARG';
  if (unit === 'BAR') return 'BAR';
  if (unit === 'PSIG') return 'PSIG';
  if (unit === 'PSI') return 'PSI';
  if (unit === 'KSI') return 'KSI';
  return '';
}

function pressureUnitFromColumnName(key) {
  const value = normalizedToken(key);
  if (/KPA\s*\(?G\)?|KPA/.test(value)) return 'KPA';
  if (/MPA\s*\(?G\)?|MPA/.test(value)) return 'MPA';
  if (/BARG/.test(value)) return 'BARG';
  if (/\bBAR\b/.test(value)) return 'BAR';
  if (/PSIG/.test(value)) return 'PSIG';
  if (/\bPSI\b/.test(value)) return 'PSI';
  if (/\bPA\b|PASCAL/.test(value)) return 'PA';
  return '';
}

function sameNumeric(left, right) {
  const a = Number(String(left ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?/)?.[0]);
  const b = Number(String(right ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?/)?.[0]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= scale * 1e-9;
}

export function inferPreviewPressureUnit(row, config, sourceXml, basis = {}) {
  const explicit = normalizePressureUnit(basis.pressureUnit);
  if (explicit) return { unit: explicit, source: 'design-basis' };

  const match = _xmlCiiFindLineListRow(row?.lineKey, config);
  const raw = match?.row || null;
  if (raw && typeof raw === 'object') {
    const preferred = [];
    const fallback = [];
    for (const [key, value] of Object.entries(raw)) {
      const unit = pressureUnitFromColumnName(key);
      if (!unit) continue;
      const item = { unit, source: `line-list-column:${key}` };
      if (sameNumeric(value, row?.p1)) preferred.push(item); else fallback.push(item);
    }
    if (preferred.length === 1) return preferred[0];
    if (!preferred.length && fallback.length === 1 && normalizedToken(row?.p1Source).startsWith('LINELIST')) return fallback[0];
  }

  if (normalizedToken(row?.p1Source).includes('XML')) {
    const unit = normalizePressureUnit(sourceXml?.pressureUnit);
    if (unit) return { unit, source: 'source-xml-units' };
  }
  return { unit: '', source: 'unresolved' };
}

export function inferPreviewDimensionStandard(row, basis = {}) {
  const explicit = text(basis.dimensionStandard);
  if (explicit && normalizedToken(explicit) !== 'AUTO') return { standard: explicit, source: 'design-basis' };
  const material = normalizedToken(materialText(row));
  if (!material) return { standard: '', source: 'unresolved' };
  if (/A312|A358|A789|A790|STAINLESS|DUPLEX|\bDSS\b|\bSDSS\b/.test(material)) return { standard: 'ASME B36.19M', source: 'material-family-inference' };
  if (/A106|A53|A333|A335|A671|A672|API\s*5L|CARBON|\bCS\b|LTCS/.test(material)) return { standard: 'ASME B36.10M', source: 'material-family-inference' };
  return { standard: '', source: 'unresolved' };
}

function masterOutsideDiameterMm(dn, dimensionStandard) {
  const listed = listPipeWallsForSize({ dn, dimensionStandard });
  if (!listed.ok || !listed.rows.length) return null;
  const values = [...new Set(listed.rows.map((row) => positive(row.outsideDiameterMm)).filter(Boolean))];
  return values.length === 1 ? values[0] : null;
}

export function resolvePreviewOutsideDiameter(row, sourceXml, dimensionStandard) {
  const dn = positive(row?.sizeMm ?? row?.boreMm);
  if (!dn) return { ok: false, code: 'B313_PREVIEW_DN_REQUIRED' };
  const referenceOd = masterOutsideDiameterMm(dn, dimensionStandard);
  if (!referenceOd) return { ok: false, code: 'B313_PREVIEW_MASTER_OD_UNAVAILABLE', dn, dimensionStandard };
  const candidates = Array.isArray(sourceXml?.byBranch?.get(row?.branchName)) ? sourceXml.byBranch.get(row.branchName) : [];
  if (!candidates.length) return { ok: false, code: 'B313_PREVIEW_ROW_OD_UNAVAILABLE', dn, referenceOd };
  const ranked = candidates
    .map((candidate) => ({ ...candidate, deltaMm: Math.abs(candidate.value - referenceOd) }))
    .sort((left, right) => left.deltaMm - right.deltaMm || left.value - right.value);
  const winner = ranked[0];
  const toleranceMm = Math.max(1.5, referenceOd * 0.02);
  if (!winner || winner.deltaMm > toleranceMm) {
    return {
      ok: false,
      code: 'B313_PREVIEW_ROW_OD_PARITY_MISMATCH',
      dn,
      referenceOd,
      toleranceMm,
      candidates: ranked,
    };
  }
  return {
    ok: true,
    outsideDiameterMm: winner.value,
    source: `source-xml:${winner.field}`,
    sourceNodeNumber: winner.nodeNumber,
    sourceComponentRefNo: winner.componentRefNo,
    referenceOdMm: referenceOd,
    parityDeltaMm: winner.deltaMm,
    toleranceMm,
    candidates: ranked,
  };
}

function basisValidation(basis) {
  const missing = [];
  if (!positive(basis?.allowableStress)) missing.push('S allowableStress');
  if (!text(basis?.stressUnit)) missing.push('S unit');
  if (!positive(basis?.qualityFactorE)) missing.push('E qualityFactorE');
  if (!positive(basis?.weldStrengthReductionW)) missing.push('W weldStrengthReductionW');
  const y = nonNegative(basis?.coefficientY);
  if (y === null || y > 1) missing.push('Y coefficientY');
  if (!text(basis?.sourceReference)) missing.push('controlled source reference');
  return { ok: missing.length === 0, missing };
}

function wallOverrideKey(row) {
  return text(row?.wallThicknessKey || row?.lineKey || row?.branchName);
}

function updateVisibleWallCell(host, rowIndex, result) {
  const cell = host?.querySelector?.(`[data-mc-edit-type="wallThickness"][data-mc-edit-row="${rowIndex}"]`);
  if (!cell) return;
  const value = Number(result.selectedNominalWallMm.toPrecision(8)).toString();
  const span = cell.querySelector('.mc-preview-editable-val');
  if (span) span.textContent = value;
  const scheduleText = (result.equivalentSchedules || []).join(' / ') || result.selectedSchedule;
  cell.title = `B31.3 explicit Preview update. Required nominal ${result.calculation.requiredNominalThicknessMm.toFixed(4)} mm; selected ${result.selectedNominalWallMm.toFixed(4)} mm; Sch ${scheduleText}; margin ${result.selectionMarginMm.toFixed(4)} mm; mill tolerance ${B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT}%.`;
  cell.dataset.mcFillState = 'manual';
  let badge = cell.querySelector('.mc-preview-badge');
  if (!badge) {
    cell.insertAdjacentHTML('beforeend', ' <span class="mc-preview-badge exact">✓ B31.3</span>');
    badge = cell.querySelector('.mc-preview-badge');
  }
  if (badge) { badge.textContent = '✓ B31.3'; badge.className = 'mc-preview-badge exact'; }
}

function reportHtml(report) {
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const failures = rows.filter((row) => row.status !== 'UPDATED');
  const summary = report?.summary || {};
  const statusColor = failures.length ? '#92400e' : '#166534';
  const background = failures.length ? '#fffbeb' : '#f0fdf4';
  const detailRows = rows.map((row) => {
    const result = row.result;
    const schedule = result?.equivalentSchedules?.join(' / ') || result?.selectedSchedule || '';
    const detail = row.status === 'UPDATED'
      ? `OD ${result.outsideDiameterMm.toFixed(3)} mm · P ${result.designPressure} ${esc(result.pressureUnit)} · CA ${result.corrosionAllowanceMm} mm · required ${result.calculation.requiredNominalThicknessMm.toFixed(4)} mm · selected ${result.selectedNominalWallMm.toFixed(4)} mm · Sch ${esc(schedule)} · margin ${result.selectionMarginMm.toFixed(4)} mm`
      : esc(row.message || row.code || 'not updated');
    return `<tr><td style="padding:5px;border-bottom:1px solid #e2e8f0;">${esc(row.branchName)}</td><td style="padding:5px;border-bottom:1px solid #e2e8f0;font-weight:700;">${esc(row.status)}</td><td style="padding:5px;border-bottom:1px solid #e2e8f0;">${detail}</td></tr>`;
  }).join('');
  return `<details data-mc-b313-report open style="margin:8px 0;border:1px solid ${statusColor};border-radius:6px;background:${background};padding:8px;">
    <summary style="cursor:pointer;font-weight:700;color:${statusColor};">B31.3 wall update audit — ${summary.updatedRows || 0} updated, ${summary.skippedRows || 0} not updated</summary>
    <div style="font-size:12px;margin:6px 0;">12.5% negative mill tolerance. Only rows with an explicit S/E/W/Y basis and controlled source reference are changed.</div>
    <div style="overflow:auto;max-height:300px;"><table style="border-collapse:collapse;width:100%;font-size:12px;"><thead><tr><th style="text-align:left;padding:5px;">Branch</th><th style="text-align:left;padding:5px;">Status</th><th style="text-align:left;padding:5px;">Basis / result</th></tr></thead><tbody>${detailRows}</tbody></table></div>
  </details>`;
}

function renderBasisEditor(host, config, rows, options) {
  const actionBar = host?.querySelector?.('[data-mc-preview-build]')?.parentElement?.parentElement;
  if (!actionBar) return;
  let editor = host.querySelector('[data-mc-b313-basis-editor]');
  const groups = uniqueBasisGroups(rows);
  if (!groups.length) {
    editor?.remove();
    return;
  }
  const cfg = ensureBasisConfig(config);
  const rowsHtml = groups.map((group) => {
    const basis = cfg.bases[group.key] || {};
    return `<tr data-b313-key="${esc(group.key)}">
      <td style="padding:5px;border-bottom:1px solid #334155;">${esc(group.material)}<div style="font-size:10px;color:#94a3b8;">T1 ${esc(group.designTemperature || '?')}</div></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><input data-b313-field="allowableStress" type="number" step="any" value="${esc(basis.allowableStress)}" style="width:90px;"></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><select data-b313-field="stressUnit">${['MPa','psi','ksi'].map((unit) => `<option value="${unit}" ${normalizedToken(basis.stressUnit || 'MPa') === normalizedToken(unit) ? 'selected' : ''}>${unit}</option>`).join('')}</select></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><input data-b313-field="qualityFactorE" type="number" step="any" min="0" max="1" value="${esc(basis.qualityFactorE)}" style="width:65px;"></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><input data-b313-field="weldStrengthReductionW" type="number" step="any" min="0" max="1" value="${esc(basis.weldStrengthReductionW)}" style="width:65px;"></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><input data-b313-field="coefficientY" type="number" step="any" min="0" max="1" value="${esc(basis.coefficientY)}" style="width:65px;"></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><select data-b313-field="pressureUnit">${['AUTO','PA','KPA','MPA','BAR','BARG','PSI','PSIG'].map((unit) => `<option value="${unit}" ${normalizedToken(basis.pressureUnit || 'AUTO') === normalizedToken(unit) ? 'selected' : ''}>${unit}</option>`).join('')}</select></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><select data-b313-field="dimensionStandard">${['AUTO','ASME B36.10M','ASME B36.19M'].map((standard) => `<option value="${standard}" ${normalizedToken(basis.dimensionStandard || 'AUTO') === normalizedToken(standard) ? 'selected' : ''}>${standard}</option>`).join('')}</select></td>
      <td style="padding:5px;border-bottom:1px solid #334155;"><input data-b313-field="sourceReference" type="text" value="${esc(basis.sourceReference)}" placeholder="controlled Sec II / project basis" style="min-width:220px;"></td>
    </tr>`;
  }).join('');
  const html = `<details data-mc-b313-basis-editor style="margin:8px 0;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#e2e8f0;padding:8px;">
    <summary style="cursor:pointer;font-weight:700;">B31.3 Sec II / project design basis (${groups.length} material-temperature group${groups.length === 1 ? '' : 's'})</summary>
    <div style="font-size:11px;color:#fbbf24;margin:6px 0;">S, E, W and Y are caller-supplied controlled engineering inputs. No ASME Section II allowable-stress table is embedded. The A106 benchmark is not used as a default.</div>
    <div style="overflow:auto;"><table style="border-collapse:collapse;width:100%;font-size:11px;min-width:1100px;"><thead><tr><th>Material / T1</th><th>S</th><th>S unit</th><th>E</th><th>W</th><th>Y</th><th>P unit</th><th>Dimension std</th><th>Source reference</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
  </details>`;
  if (editor) editor.outerHTML = html;
  else actionBar.insertAdjacentHTML('afterend', html);
  editor = host.querySelector('[data-mc-b313-basis-editor]');
  editor?.querySelectorAll?.('[data-b313-field]').forEach((input) => input.addEventListener('change', async () => {
    const rowEl = input.closest('[data-b313-key]');
    const key = text(rowEl?.dataset?.b313Key);
    if (!key) return;
    const group = groups.find((item) => item.key === key);
    const record = { ...(cfg.bases[key] || {}), material: group?.material || '', designTemperature: group?.designTemperature || '' };
    rowEl.querySelectorAll('[data-b313-field]').forEach((field) => { record[field.dataset.b313Field] = field.value; });
    cfg.bases[key] = record;
    await options?.onSaveConfig?.(config);
  }));
}

function failureRow(row, code, message, details = {}) {
  return { branchName: row?.branchName || '', lineKey: row?.lineKey || '', status: 'NOT_UPDATED', code, message, details };
}

export function buildPreviewB313WallUpdateReport({ rows, config, xmlText, host } = {}) {
  const branchRows = Array.isArray(rows) ? rows : [];
  const sourceXml = parseSourceXml(xmlText);
  const basisConfig = ensureBasisConfig(config || {});
  const results = [];
  let updated = 0;

  branchRows.forEach((row, rowIndex) => {
    const key = previewB313BasisKey(row);
    if (!key) {
      results.push(failureRow(row, 'B313_PREVIEW_MATERIAL_BASIS_KEY_UNAVAILABLE', 'Material/T1 design-basis key is unavailable.'));
      return;
    }
    const basis = basisConfig.bases[key] || {};
    const validated = basisValidation(basis);
    if (!validated.ok) {
      results.push(failureRow(row, 'B313_PREVIEW_DESIGN_BASIS_INCOMPLETE', `Missing ${validated.missing.join(', ')}.`, { basisKey: key, missing: validated.missing }));
      return;
    }
    const pressure = positive(String(row?.p1 ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?/)?.[0]);
    if (!pressure) {
      results.push(failureRow(row, 'B313_PREVIEW_PRESSURE_REQUIRED', 'Positive Preview design pressure P1 is unavailable.'));
      return;
    }
    const corrosion = nonNegative(row?.corrosion);
    if (corrosion === null) {
      results.push(failureRow(row, 'B313_PREVIEW_CORROSION_REQUIRED', 'Preview corrosion allowance is unavailable.'));
      return;
    }
    const pressureBasis = inferPreviewPressureUnit(row, config, sourceXml, basis);
    if (!pressureBasis.unit) {
      results.push(failureRow(row, 'B313_PREVIEW_PRESSURE_UNIT_UNRESOLVED', 'Pressure unit could not be resolved. Set P unit explicitly in the B31.3 design basis.'));
      return;
    }
    const dimensionBasis = inferPreviewDimensionStandard(row, basis);
    if (!dimensionBasis.standard) {
      results.push(failureRow(row, 'B313_PREVIEW_DIMENSION_STANDARD_UNRESOLVED', 'Pipe dimension standard could not be resolved. Set it explicitly in the B31.3 design basis.'));
      return;
    }
    const odBasis = resolvePreviewOutsideDiameter(row, sourceXml, dimensionBasis.standard);
    if (!odBasis.ok) {
      results.push(failureRow(row, odBasis.code, 'A reliable row outside diameter could not be established from source XML against the DN master reference.', odBasis));
      return;
    }
    const result = calculateAndSelectPreviewB313Wall({
      dn: row?.sizeMm ?? row?.boreMm,
      outsideDiameterMm: odBasis.outsideDiameterMm,
      designPressure: pressure,
      pressureUnit: pressureBasis.unit,
      corrosionAllowanceMm: corrosion,
      allowableStress: basis.allowableStress,
      stressUnit: basis.stressUnit,
      qualityFactorE: basis.qualityFactorE,
      weldStrengthReductionW: basis.weldStrengthReductionW,
      coefficientY: basis.coefficientY,
      dimensionStandard: dimensionBasis.standard,
      edition: '2024',
    });
    if (!result.ok) {
      results.push(failureRow(row, result.code, result.message || result.code, { result, odBasis, pressureBasis, dimensionBasis, basisKey: key }));
      return;
    }

    const overrideKey = wallOverrideKey(row);
    if (!overrideKey) {
      results.push(failureRow(row, 'B313_PREVIEW_WALL_OVERRIDE_KEY_UNAVAILABLE', 'Wall-thickness override key is unavailable.'));
      return;
    }
    const overrides = ensureOverrides(config);
    if (!overrides.wallThickness || typeof overrides.wallThickness !== 'object' || Array.isArray(overrides.wallThickness)) overrides.wallThickness = {};
    if (!overrides.__b313WallEvidence || typeof overrides.__b313WallEvidence !== 'object' || Array.isArray(overrides.__b313WallEvidence)) overrides.__b313WallEvidence = {};
    overrides.wallThickness[overrideKey] = Number(result.selectedNominalWallMm.toPrecision(8)).toString();
    if (overrides.__dtxrWallKeys && typeof overrides.__dtxrWallKeys === 'object') delete overrides.__dtxrWallKeys[overrideKey];
    const evidence = {
      schema: 'xml-cii-b313-wall-evidence/v1',
      basisKey: key,
      material: materialText(row),
      designTemperature: temperatureText(row),
      sourceReference: basis.sourceReference,
      allowableStress: Number(basis.allowableStress),
      stressUnit: basis.stressUnit,
      qualityFactorE: Number(basis.qualityFactorE),
      weldStrengthReductionW: Number(basis.weldStrengthReductionW),
      coefficientY: Number(basis.coefficientY),
      pressureSource: row?.p1Source || '',
      pressureUnitSource: pressureBasis.source,
      dimensionStandardSource: dimensionBasis.source,
      outsideDiameterSource: odBasis.source,
      outsideDiameterReferenceMm: odBasis.referenceOdMm,
      outsideDiameterParityDeltaMm: odBasis.parityDeltaMm,
      negativeMillTolerancePct: B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT,
      calculation: result.calculation,
      selection: result.selection,
    };
    overrides.__b313WallEvidence[overrideKey] = evidence;
    markAdaptedPreviewOverrideManual({ config, ensureOverrides, field: 'wallThickness', key: overrideKey, value: overrides.wallThickness[overrideKey] });
    updateVisibleWallCell(host, rowIndex, result);
    results.push({ branchName: row.branchName || '', lineKey: row.lineKey || '', status: 'UPDATED', overrideKey, result, evidence });
    updated += 1;
  });

  return {
    schema: B313_PREVIEW_REPORT_SCHEMA,
    action: B313_PREVIEW_ACTION_LABEL,
    standard: 'ASME B31.3-2024',
    paragraph: '304.1.2',
    equation: '3a',
    negativeMillTolerancePct: B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT,
    authority: 'EXPLICIT_PREVIEW_ACTION_NOT_AUTOMATIC_WALL_AUTHORITY',
    summary: { inputRows: branchRows.length, updatedRows: updated, skippedRows: branchRows.length - updated },
    rows: results,
  };
}

function installAction(host, config, xmlText, options) {
  const rows = readLegacyBranchRows();
  const buildButton = host?.querySelector?.('[data-mc-preview-build]');
  const actionBar = buildButton?.parentElement;
  if (!actionBar || !rows.length) return;
  renderBasisEditor(host, config, rows, options);
  if (actionBar.querySelector('[data-mc-b313-wall-update]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'model-converters-download-btn';
  button.dataset.mcB313WallUpdate = 'true';
  button.textContent = B313_PREVIEW_ACTION_LABEL;
  button.title = 'Explicitly calculate B31.3-2024 straight-pipe required nominal wall using row OD, P1 and corrosion plus the controlled S/E/W/Y basis below, then select the next adequate project-master pipe wall. 12.5% negative mill tolerance is fixed.';
  button.style.cssText = 'padding:8px 14px;min-width:300px;';
  actionBar.appendChild(button);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const currentRows = readLegacyBranchRows();
      const report = buildPreviewB313WallUpdateReport({ rows: currentRows, config, xmlText, host });
      await options?.onSaveConfig?.(config);
      await options?.onB313WallUpdateReport?.(report);
      host.querySelector('[data-mc-b313-report]')?.remove?.();
      const editor = host.querySelector('[data-mc-b313-basis-editor]');
      if (editor) editor.insertAdjacentHTML('afterend', reportHtml(report));
      else actionBar.parentElement?.insertAdjacentHTML?.('afterend', reportHtml(report));
    } catch (error) {
      const report = {
        schema: B313_PREVIEW_REPORT_SCHEMA,
        action: B313_PREVIEW_ACTION_LABEL,
        authority: 'EXPLICIT_PREVIEW_ACTION_NOT_AUTOMATIC_WALL_AUTHORITY',
        summary: { inputRows: rows.length, updatedRows: 0, skippedRows: rows.length },
        rows: [{ branchName: '', status: 'NOT_UPDATED', code: 'B313_PREVIEW_ACTION_EXCEPTION', message: text(error?.message || error) }],
      };
      await options?.onB313WallUpdateReport?.(report);
      host.querySelector('[data-mc-b313-report]')?.remove?.();
      actionBar.parentElement?.insertAdjacentHTML?.('afterend', reportHtml(report));
    } finally {
      button.disabled = false;
    }
  });
}

export function installPreviewB313WallUpdateController({ host, config, xmlText, options = {} } = {}) {
  if (!host || !config) return;
  host.__xmlCiiB313WallObserver?.disconnect?.();
  let scheduled = false;
  const refresh = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      installAction(host, config, xmlText, options);
    });
  };
  refresh();
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(refresh);
    observer.observe(host, { childList: true, subtree: true });
    host.__xmlCiiB313WallObserver = observer;
  }
}
