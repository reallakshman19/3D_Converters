import {
  createEmpiricalWeightValidator,
  empiricalWeightValidationReportToCsv,
} from '../../../converters/empirical-weight/index.js';
import { DEFAULT_WEIGHT_MASTER_ROWS } from '../../../converters/xml-cii2019-core/default-weight-master-rows.js';

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function esc(value) { return text(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }

function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }

function targetRows(masterRows = []) {
  const out = [];
  for (let index = 0; index < masterRows.length; index += 1) {
    const row = masterRows[index] || {};
    const base = {
      rowId: row.rowId || row.id || `master-${index + 1}`,
      source: 'weight-master',
      typeDesc: row.TypeDesc ?? row.typeDesc ?? row.valveType,
      ns: row.NS ?? row.ns,
      dn: row.DN ?? row.dn,
      rating: row.Rating ?? row.rating,
    };
    const rf = positive(row['RF/RTJ KG'] ?? row.rfRtjKg ?? row.rfWeightKg);
    const bw = positive(row['BW KG'] ?? row.bwKg ?? row.bwWeightKg);
    if (rf) out.push({ ...base, target: 'RF/RTJ KG', observedWeightKg: rf, rowId: `${base.rowId}:RF` });
    if (bw) out.push({ ...base, target: 'BW KG', observedWeightKg: bw, rowId: `${base.rowId}:BW` });
  }
  return out;
}

function masterRowsFromState(state) {
  let config = {};
  try { config = JSON.parse(state?.supportConfigJson || '{}'); } catch {}
  if (Array.isArray(config?.weight?.masterRows) && config.weight.masterRows.length) return config.weight.masterRows;
  if (Array.isArray(state?.masterContext?.weightMasterRows) && state.masterContext.weightMasterRows.length) return state.masterContext.weightMasterRows;
  return DEFAULT_WEIGHT_MASTER_ROWS;
}

function makeBlobDownload(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function cell(value, digits = null) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (digits !== null && Number.isFinite(n)) return n.toFixed(digits);
  return esc(value);
}

function renderTable(host, report) {
  const rows = report?.abnormalities || [];
  if (!rows.length) {
    host.innerHTML = '<div style="padding:12px;color:#86efac;border:1px solid #166534;background:#052e16;border-radius:6px;">No weight-master abnormalities exceed ±30% against Approach 1 or Approach 2.</div>';
    return;
  }
  host.innerHTML = `<div style="overflow:auto;max-height:46vh;border:1px solid #334155;border-radius:6px;">
    <table style="border-collapse:collapse;width:100%;font-size:12px;min-width:1180px;">
      <thead><tr>${['TypeDesc','NS','DN','Rating','Target','Observed kg','A1 kg','A1 Δ%','A1 status','A2 kg','A2 Δ%','A2 status','Overall'].map((h) => `<th style="position:sticky;top:0;background:#172033;color:#bfdbfe;padding:6px;text-align:left;border-bottom:1px solid #334155;">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td style="padding:6px;border-bottom:1px solid #243244;">${esc(row.typeDesc)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.ns)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.dn)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.rating)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${esc(row.target)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.observedWeightKg, 3)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.approach1?.estimatedWeightKg, 3)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.approach1?.deviationPct, 1)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${esc(row.approach1?.status)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.approach2?.estimatedWeightKg, 3)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${cell(row.approach2?.deviationPct, 1)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;">${esc(row.approach2?.status)}</td>
        <td style="padding:6px;border-bottom:1px solid #243244;font-weight:700;color:#fca5a5;">${esc(row.status)}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

export function appendEmpiricalWeightValidationReport(card, stateRef) {
  const section = document.createElement('section');
  section.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid #334155;';
  section.innerHTML = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <strong style="color:#dbeafe;">Weight Validation Report — A1/A2 abnormality &gt; ±30%</strong>
    <button type="button" data-ewv-build style="padding:6px 10px;border-radius:6px;border:1px solid #475569;background:#1d4ed8;color:white;cursor:pointer;">Build report</button>
    <button type="button" data-ewv-csv disabled style="padding:6px 10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#cbd5e1;cursor:pointer;">Save abnormal CSV</button>
    <button type="button" data-ewv-json disabled style="padding:6px 10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#cbd5e1;cursor:pointer;">Save audit JSON</button>
    <span data-ewv-status style="font-size:12px;color:#94a3b8;">Read-only validation; no accepted weight is modified.</span>
  </div>
  <div data-ewv-table style="margin-top:10px;"></div>`;
  card.appendChild(section);

  let report = null;
  const status = section.querySelector('[data-ewv-status]');
  const table = section.querySelector('[data-ewv-table]');
  const csvBtn = section.querySelector('[data-ewv-csv]');
  const jsonBtn = section.querySelector('[data-ewv-json]');

  section.querySelector('[data-ewv-build]')?.addEventListener('click', () => {
    const masterRows = masterRowsFromState(stateRef.current);
    const validationRows = targetRows(masterRows);
    const validator = createEmpiricalWeightValidator({ masterRows });
    report = validator.buildReport(validationRows, { abnormalityThresholdPct: 30 });
    stateRef.current.empiricalWeightValidationReport = report;
    renderTable(table, report);
    csvBtn.disabled = false;
    jsonBtn.disabled = false;
    if (status) status.textContent = `${report.summary.abnormalRows} abnormal row(s) of ${report.summary.inputRows}; A1 ${report.summary.approach1Abnormal}, A2 ${report.summary.approach2Abnormal}.`;
  });

  csvBtn?.addEventListener('click', () => {
    if (!report) return;
    makeBlobDownload('empirical-weight-abnormalities.csv', empiricalWeightValidationReportToCsv(report, { abnormalOnly: true }), 'text/csv;charset=utf-8');
  });
  jsonBtn?.addEventListener('click', () => {
    if (!report) return;
    makeBlobDownload('empirical-weight-validation-report.json', `${JSON.stringify(report, null, 2)}\n`, 'application/json;charset=utf-8');
  });
}
