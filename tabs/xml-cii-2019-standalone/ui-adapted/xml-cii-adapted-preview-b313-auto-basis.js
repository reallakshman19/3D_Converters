import {
  resolvePreviewB313FactorBasis,
} from '../../../converters/xml-cii2019-core/b313-preview-wall-update.js?v=20260928-issue776-authority-1';
import {
  previewB313BasisKey,
  resolvePreviewB313MaterialFromRow,
} from './xml-cii-adapted-preview-b313-wall-update.js?v=20260928-issue776-authority-1';

export const B313_PREVIEW_AUTO_BASIS_SCHEMA = 'xml-cii-b313-preview-auto-basis/v1';

const FACTORS = ['S', 'E', 'W', 'Y'];

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function esc(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function temperatureText(row) {
  return text(row?.t1 ?? row?.designTemperature ?? '');
}

function storedBasisForRow(config, row, materialId, t1) {
  const bases = config?.b313WallUpdate?.bases;
  if (!bases || typeof bases !== 'object' || Array.isArray(bases)) return {};
  const key = previewB313BasisKey(row);
  if (key && bases[key] && typeof bases[key] === 'object') return bases[key];
  return Object.values(bases).find((basis) => (
    basis
    && typeof basis === 'object'
    && text(basis.materialId) === text(materialId)
    && text(basis.designTemperature) === text(t1)
  )) || {};
}

function factorAvailabilityFrom(factorBasis) {
  return factorBasis?.factorAvailability
    || factorBasis?.details?.factorAvailability
    || null;
}

function routeFromAvailability(availability) {
  if (!availability?.factors) return '';
  for (const factor of ['E', 'W', 'S', 'Y']) {
    const route = text(availability.factors[factor]?.requestedManufacturingRoute);
    if (route) return route;
  }
  return '';
}

function factorStatus(availability) {
  if (!availability?.factors) return { code: 'DATA_MISSING', label: 'DATA MISSING' };
  const rows = FACTORS.map((factor) => availability.factors[factor]).filter(Boolean);
  if (rows.length === FACTORS.length && rows.every((item) => item.strictAvailable === true)) {
    return { code: 'AUTO_READY', label: 'AUTO READY ✓' };
  }
  const hasCandidate = rows.some((item) => Array.isArray(item.candidateStatuses) && item.candidateStatuses.length > 0);
  const hasRejected = rows.some((item) => item.status === 'QUALIFICATION_STATUS_REJECTED');
  if (hasCandidate || hasRejected) return { code: 'REVIEW_REQUIRED', label: 'REVIEW REQUIRED' };
  return { code: 'DATA_MISSING', label: 'DATA MISSING' };
}

function unavailableFactorSummary(availability) {
  if (!availability?.factors) return 'S/E/W/Y unavailable';
  return FACTORS.map((factor) => {
    const item = availability.factors[factor];
    if (!item) return `${factor} unavailable`;
    if (item.strictAvailable) return `${factor} STRICT`;
    const statuses = Array.isArray(item.candidateStatuses)
      ? item.candidateStatuses.filter(Boolean).join('/')
      : '';
    return `${factor} ${statuses || item.status || 'unavailable'}`;
  }).join(' · ');
}

function strictFactorSummary(factorBasis) {
  return `S ${Number(factorBasis.allowableStress).toPrecision(6)} ${text(factorBasis.stressUnit)} · E ${factorBasis.qualityFactorE} · W ${factorBasis.weldStrengthReductionW} · Y ${factorBasis.coefficientY}`;
}

export function derivePreviewB313AutoBasisRow(row, config = {}) {
  const material = text(row?.material || row?.materialName || row?.resolvedMaterial || row?.materialCode || '');
  const materialSource = text(row?.materialSource || '');
  const t1 = temperatureText(row);
  const materialIdentity = resolvePreviewB313MaterialFromRow(row);

  if (!materialIdentity?.ok) {
    return {
      schema: B313_PREVIEW_AUTO_BASIS_SCHEMA,
      material,
      materialSource,
      t1,
      materialId: '',
      identityCode: materialIdentity?.code || 'B313_PREVIEW_MATERIAL_NOT_MAPPED',
      statusCode: 'MATERIAL_UNRESOLVED',
      statusLabel: 'MATERIAL UNRESOLVED',
      factorSummary: '',
      route: '',
      routeSource: 'unresolved',
      tableContext: null,
    };
  }

  const materialId = text(materialIdentity.material?.materialId);
  const storedBasis = storedBasisForRow(config, row, materialId, t1);
  const explicitRoute = text(storedBasis.manufacturingRoute);

  if (!t1) {
    const defaultRoute = materialId === 'CS-A106-B' ? 'SEAMLESS' : '';
    return {
      schema: B313_PREVIEW_AUTO_BASIS_SCHEMA,
      material,
      materialSource,
      t1,
      materialId,
      identityCode: materialIdentity.code,
      statusCode: 'B313_PREVIEW_T1_REQUIRED',
      statusLabel: 'T1 REQUIRED',
      factorSummary: 'S/E/W/Y not evaluated until Preview T1 is resolved',
      route: explicitRoute || defaultRoute,
      routeSource: explicitRoute
        ? 'controlled Preview basis'
        : defaultRoute
          ? 'A106 carbon-steel default'
          : 'unresolved',
      tableContext: { materialId, temperatureC: undefined },
    };
  }

  const factorBasis = resolvePreviewB313FactorBasis({
    materialIdentity,
    designTemperatureC: t1,
    manufacturingRoute: explicitRoute,
    manualBasis: {},
  });
  const availability = factorAvailabilityFrom(factorBasis);
  const defaultRoute = routeFromAvailability(availability)
    || (materialId === 'CS-A106-B' ? 'SEAMLESS' : '');
  const route = explicitRoute || defaultRoute;
  const routeSource = explicitRoute
    ? 'controlled Preview basis'
    : materialId === 'CS-A106-B' && route === 'SEAMLESS'
      ? 'A106 carbon-steel default'
      : route
        ? 'active factor master'
        : 'unresolved';
  const status = factorBasis?.ok && factorBasis.mode === 'ACTIVE_MASTER_STRICT'
    ? { code: 'AUTO_READY', label: 'AUTO READY ✓' }
    : factorStatus(availability);

  return {
    schema: B313_PREVIEW_AUTO_BASIS_SCHEMA,
    material,
    materialSource,
    t1,
    materialId,
    identityCode: materialIdentity.code,
    factorBasisCode: factorBasis?.code || '',
    statusCode: status.code,
    statusLabel: status.label,
    factorSummary: factorBasis?.ok && factorBasis.mode === 'ACTIVE_MASTER_STRICT'
      ? strictFactorSummary(factorBasis)
      : unavailableFactorSummary(availability),
    route,
    routeSource,
    tableContext: {
      materialId,
      temperatureC: Number.isFinite(Number(t1)) ? Number(t1) : undefined,
    },
  };
}

export function buildPreviewB313AutoBasisRows(rows = [], config = {}) {
  const unique = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue;
    const model = derivePreviewB313AutoBasisRow(row, config);
    const key = `${model.materialId || model.material}|T1=${model.t1 || '?'}|ROUTE=${model.route || '?'}`;
    if (!unique.has(key)) unique.set(key, model);
  }
  return [...unique.values()];
}

function statusColor(model) {
  if (model.statusCode === 'AUTO_READY') return '#86efac';
  if (model.statusCode === 'REVIEW_REQUIRED') return '#fbbf24';
  return '#fca5a5';
}

function panelHtml(models) {
  const rowsHtml = models.map((model) => {
    const source = model.materialSource ? `source ${esc(model.materialSource)}` : 'source unknown';
    const t1 = model.t1 ? `${esc(model.t1)} °C` : 'unresolved';
    const route = model.route || '—';
    const routeSource = model.routeSource || 'unresolved';
    const iconDisabled = model.tableContext?.materialId ? '' : 'disabled';
    return `<tr data-b313-auto-material-id="${esc(model.tableContext?.materialId || '')}" data-b313-auto-temperature="${esc(model.tableContext?.temperatureC ?? '')}">
      <td style="padding:6px 8px;border-bottom:1px solid #334155;vertical-align:top;"><strong>${esc(model.material || '—')}</strong><div style="font-size:10px;color:#94a3b8;">${source} · T1 ${t1}</div></td>
      <td style="padding:6px 8px;border-bottom:1px solid #334155;vertical-align:top;"><strong>${esc(model.materialId || model.identityCode)}</strong><div style="font-size:10px;color:${statusColor(model)};font-weight:700;">${esc(model.statusLabel)}</div><div style="font-size:10px;color:#cbd5e1;">${esc(model.factorSummary)}</div></td>
      <td style="padding:6px 8px;border-bottom:1px solid #334155;vertical-align:top;"><strong>${esc(route)}</strong><div style="font-size:10px;color:#94a3b8;">${esc(routeSource)}</div></td>
      <td style="padding:6px 8px;border-bottom:1px solid #334155;text-align:center;vertical-align:middle;"><button type="button" data-b313-auto-open-material ${iconDisabled} aria-label="Open B31.3 Material Factors table" title="Open B31.3 Material Factors table" style="width:24px;height:24px;padding:0;border:1px solid #64748b;border-radius:4px;background:#111827;color:#e2e8f0;cursor:pointer;font-size:14px;line-height:22px;">▦</button></td>
    </tr>`;
  }).join('');

  return `<div data-mc-b313-auto-basis-panel style="margin:8px 0;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#e2e8f0;padding:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;"><strong>B31.3 automatic basis</strong><span style="font-size:10px;color:#94a3b8;">${models.length} material-temperature group${models.length === 1 ? '' : 's'}</span></div>
    <div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">Read-only Preview basis. A106 carbon steel defaults to SEAMLESS; other route-sensitive materials remain unresolved unless controlled route evidence exists. Strict automatic factors remain VERIFIED / PROJECT_APPROVED only.</div>
    <div style="overflow:auto;"><table style="border-collapse:collapse;width:100%;font-size:11px;min-width:760px;"><thead><tr><th style="text-align:left;padding:5px;">Preview Material / T1</th><th style="text-align:left;padding:5px;">B31.3 identity / factors</th><th style="text-align:left;padding:5px;">Route</th><th style="text-align:center;padding:5px;">Table</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
  </div>`;
}

function bindTableLinks(panel) {
  panel?.querySelectorAll?.('[data-b313-auto-open-material]').forEach((button) => button.addEventListener('click', () => {
    const rowEl = button.closest('[data-b313-auto-material-id]');
    const materialId = text(rowEl?.dataset?.b313AutoMaterialId);
    const rawTemperature = text(rowEl?.dataset?.b313AutoTemperature);
    const temperatureC = rawTemperature === '' ? undefined : Number(rawTemperature);
    if (!materialId || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('app:switch-tab', {
      detail: {
        tabId: 'b313-material-factors',
        context: {
          materialId,
          temperatureC: Number.isFinite(temperatureC) ? temperatureC : undefined,
        },
      },
    }));
  }));
}

function applyT1Guard(host, models) {
  const button = host?.querySelector?.('[data-mc-b313-wall-update]');
  if (!button) return;
  const hasMissingT1 = models.some((model) => model.statusCode === 'B313_PREVIEW_T1_REQUIRED');
  if (hasMissingT1) {
    if (!button.dataset.mcB313AutoBasisOriginalTitle) button.dataset.mcB313AutoBasisOriginalTitle = button.title || '';
    button.dataset.mcB313AutoBasisT1Guard = 'true';
    button.disabled = true;
    button.title = 'Resolve Preview T1 before running the B31.3 wall update. Blank T1 is never treated as 0 °C.';
    return;
  }
  if (button.dataset.mcB313AutoBasisT1Guard === 'true') {
    button.disabled = false;
    button.title = button.dataset.mcB313AutoBasisOriginalTitle || button.title;
    delete button.dataset.mcB313AutoBasisT1Guard;
  }
}

export function installPreviewB313AutoBasisPanel({ host, config, rows = [] } = {}) {
  if (!host) return [];
  const models = buildPreviewB313AutoBasisRows(rows, config);
  const legacyEditor = host.querySelector?.('[data-mc-b313-basis-editor]');
  if (legacyEditor) {
    legacyEditor.hidden = true;
    legacyEditor.style.display = 'none';
    legacyEditor.dataset.mcB313AutoBasisReplaced = 'true';
  }

  host.querySelector?.('[data-mc-b313-auto-basis-panel]')?.remove?.();
  if (models.length) {
    if (legacyEditor) legacyEditor.insertAdjacentHTML('afterend', panelHtml(models));
    else {
      const actionBar = host.querySelector?.('[data-mc-preview-build]')?.parentElement;
      actionBar?.parentElement?.insertAdjacentHTML?.('afterend', panelHtml(models));
    }
    bindTableLinks(host.querySelector?.('[data-mc-b313-auto-basis-panel]'));
  }
  applyT1Guard(host, models);
  return models;
}
