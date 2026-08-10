import { createEmpiricalWeightEstimator } from './empirical-weight-estimator.js';

export const DEFAULT_EMPIRICAL_WEIGHT_ABNORMALITY_THRESHOLD_PCT = 30;

function positive(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function thresholdPct(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0
    ? numeric
    : DEFAULT_EMPIRICAL_WEIGHT_ABNORMALITY_THRESHOLD_PCT;
}

function observedWeightKg(input = {}) {
  return positive(
    input.observedWeightKg
    ?? input.actualWeightKg
    ?? input.acceptedWeightKg
    ?? input.weightKg
    ?? input.WeightKg
    ?? input.weight
    ?? input.Weight
  );
}

function rowId(input = {}, index = null) {
  const value = input.rowId
    ?? input.id
    ?? input.key
    ?? input.tag
    ?? input.componentRefNo
    ?? input.ComponentRefNo
    ?? input.nodeNumber
    ?? input.NodeNumber;
  if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  return index === null ? '' : String(index + 1);
}

function compactError(result) {
  if (result?.ok) return null;
  return {
    code: result?.error?.code || 'UNAVAILABLE',
    message: result?.error?.message || 'Empirical estimate unavailable.',
  };
}

export function compareObservedWeightToEmpiricalEstimate(observedKg, result, abnormalityThresholdPct = 30) {
  const observed = positive(observedKg);
  const predicted = result?.ok ? positive(result.weightKg) : null;
  const threshold = thresholdPct(abnormalityThresholdPct);

  if (!observed) {
    return {
      available: false,
      abnormal: false,
      status: 'INVALID_OBSERVED_WEIGHT',
      observedWeightKg: observedKg ?? null,
      estimatedWeightKg: predicted,
      thresholdPct: threshold,
      error: { code: 'INVALID_OBSERVED_WEIGHT', message: 'Observed weight must be a positive number.' },
    };
  }

  if (!predicted) {
    return {
      available: false,
      abnormal: false,
      status: 'ESTIMATE_UNAVAILABLE',
      observedWeightKg: observed,
      estimatedWeightKg: null,
      thresholdPct: threshold,
      error: compactError(result),
    };
  }

  // Operational abnormality basis: observed weight relative to the empirical
  // estimate. A ±30% limit therefore means observed must lie inside
  // [0.70 * estimate, 1.30 * estimate]. Exactly ±30% is not abnormal.
  const deviationPct = ((observed - predicted) / predicted) * 100;
  // Secondary audit metric using the same denominator convention as common
  // model-validation APE/MAPE reporting.
  const predictionErrorPctOfObserved = ((predicted - observed) / observed) * 100;
  const abnormal = Math.abs(deviationPct) > threshold;
  const direction = deviationPct > threshold ? 'HIGH' : (deviationPct < -threshold ? 'LOW' : 'WITHIN');

  return {
    available: true,
    abnormal,
    status: abnormal ? `ABNORMAL_${direction}` : 'WITHIN_THRESHOLD',
    direction,
    observedWeightKg: observed,
    estimatedWeightKg: predicted,
    deviationPct,
    absoluteDeviationPct: Math.abs(deviationPct),
    predictionErrorPctOfObserved,
    thresholdPct: threshold,
    acceptableMinKg: predicted * (1 - threshold / 100),
    acceptableMaxKg: predicted * (1 + threshold / 100),
    approach: result.approach || null,
    confidence: result.confidence || null,
    modelId: result.modelId || null,
    extrapolated: result.extrapolated === true,
    validatedRange: result.validatedRange || null,
    bandRange: result.bandRange || null,
    bandCuts: result.bandCuts || null,
    predictions: result.predictions || null,
    weights: result.weights || null,
    configuredWeights: result.configuredWeights || null,
    support: result.support || null,
    error: null,
  };
}

function overallStatus(a1, a2) {
  const availableCount = Number(a1.available) + Number(a2.available);
  if (!availableCount) return 'UNVALIDATED';
  if (a1.abnormal && a2.abnormal) return 'ABNORMAL_BOTH';
  if (a1.abnormal) return 'ABNORMAL_A1';
  if (a2.abnormal) return 'ABNORMAL_A2';
  return availableCount === 2 ? 'WITHIN_THRESHOLD' : 'WITHIN_THRESHOLD_PARTIAL';
}

function maximumAbsoluteDeviation(a1, a2) {
  const values = [a1, a2]
    .filter((entry) => entry.available && Number.isFinite(entry.absoluteDeviationPct))
    .map((entry) => entry.absoluteDeviationPct);
  return values.length ? Math.max(...values) : null;
}

export function createEmpiricalWeightValidator({
  estimator = null,
  masterRows,
  model,
  abnormalityThresholdPct = DEFAULT_EMPIRICAL_WEIGHT_ABNORMALITY_THRESHOLD_PCT,
} = {}) {
  const empiricalEstimator = estimator || createEmpiricalWeightEstimator({ masterRows, model });
  const defaultThreshold = thresholdPct(abnormalityThresholdPct);

  function validate(input = {}, options = {}) {
    const observed = observedWeightKg(input);
    const threshold = thresholdPct(options.abnormalityThresholdPct ?? defaultThreshold);
    const request = {
      typeDesc: input.typeDesc ?? input.TypeDesc ?? input.valveType,
      ns: input.ns ?? input.NS,
      dn: input.dn ?? input.DN,
      rating: input.rating ?? input.Rating,
      target: input.target ?? input.endType,
    };

    const a1Result = empiricalEstimator.approach1(request, {
      allowExtrapolation: options.allowA1Extrapolation === true,
    });
    const a2Result = empiricalEstimator.approach2(request);
    const approach1 = compareObservedWeightToEmpiricalEstimate(observed, a1Result, threshold);
    const approach2 = compareObservedWeightToEmpiricalEstimate(observed, a2Result, threshold);
    const status = overallStatus(approach1, approach2);

    return {
      schema: 'empirical-weight-validation-row/v1',
      ok: observed !== null,
      rowId: rowId(input, options.rowIndex ?? null),
      source: input.source ?? input.weightSource ?? null,
      componentRefNo: input.componentRefNo ?? input.ComponentRefNo ?? null,
      nodeNumber: input.nodeNumber ?? input.NodeNumber ?? null,
      typeDesc: a1Result.typeDesc ?? a2Result.typeDesc ?? request.typeDesc ?? null,
      ns: finite(input.ns ?? input.NS),
      dn: finite(input.dn ?? input.DN),
      rating: finite(input.rating ?? input.Rating),
      target: a1Result.target ?? a2Result.target ?? request.target ?? null,
      observedWeightKg: observed,
      abnormalityThresholdPct: threshold,
      approach1,
      approach2,
      status,
      reportableAbnormality: approach1.abnormal || approach2.abnormal,
      maximumAbsoluteDeviationPct: maximumAbsoluteDeviation(approach1, approach2),
    };
  }

  function buildReport(rows = [], options = {}) {
    const inputRows = Array.isArray(rows) ? rows : [];
    const validations = inputRows.map((row, index) => validate(row, { ...options, rowIndex: index }));
    const abnormalities = validations
      .filter((row) => row.reportableAbnormality)
      .sort((a, b) => (b.maximumAbsoluteDeviationPct ?? -Infinity) - (a.maximumAbsoluteDeviationPct ?? -Infinity));

    const summary = {
      inputRows: validations.length,
      validObservedWeightRows: validations.filter((row) => row.ok).length,
      abnormalRows: abnormalities.length,
      abnormalBoth: validations.filter((row) => row.status === 'ABNORMAL_BOTH').length,
      abnormalA1Only: validations.filter((row) => row.status === 'ABNORMAL_A1').length,
      abnormalA2Only: validations.filter((row) => row.status === 'ABNORMAL_A2').length,
      withinThreshold: validations.filter((row) => row.status === 'WITHIN_THRESHOLD').length,
      withinThresholdPartial: validations.filter((row) => row.status === 'WITHIN_THRESHOLD_PARTIAL').length,
      unvalidated: validations.filter((row) => row.status === 'UNVALIDATED').length,
      approach1Available: validations.filter((row) => row.approach1.available).length,
      approach2Available: validations.filter((row) => row.approach2.available).length,
      approach1Abnormal: validations.filter((row) => row.approach1.abnormal).length,
      approach2Abnormal: validations.filter((row) => row.approach2.abnormal).length,
    };

    return {
      schema: 'empirical-weight-validation-report/v1',
      abnormalityThresholdPct: thresholdPct(options.abnormalityThresholdPct ?? defaultThreshold),
      abnormalityDefinition: '((observedWeightKg - estimatedWeightKg) / estimatedWeightKg) * 100; abnormal only when absolute deviation is greater than threshold',
      exactLookupUsed: false,
      approaches: ['A1_SIZE_BAND', 'A2_MATRIX'],
      authority: 'READ_ONLY_VALIDATION_NOT_WEIGHT_AUTHORITY',
      summary,
      abnormalities,
      rows: validations,
    };
  }

  return Object.freeze({ validate, buildReport, estimator: empiricalEstimator });
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rounded(value, digits = 3) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : '';
}

export function empiricalWeightValidationReportToCsv(report, { abnormalOnly = true } = {}) {
  const rows = abnormalOnly ? (report?.abnormalities || []) : (report?.rows || []);
  const headers = [
    'rowId', 'componentRefNo', 'nodeNumber', 'typeDesc', 'NS', 'DN', 'rating', 'target', 'observedWeightKg',
    'A1_estimatedWeightKg', 'A1_deviationPct', 'A1_status', 'A1_confidence', 'A1_modelId',
    'A2_estimatedWeightKg', 'A2_deviationPct', 'A2_status', 'A2_confidence', 'A2_modelId',
    'overallStatus', 'maximumAbsoluteDeviationPct', 'thresholdPct',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = [
      row.rowId,
      row.componentRefNo,
      row.nodeNumber,
      row.typeDesc,
      row.ns,
      row.dn,
      row.rating,
      row.target,
      rounded(row.observedWeightKg),
      rounded(row.approach1.estimatedWeightKg),
      rounded(row.approach1.deviationPct),
      row.approach1.status,
      row.approach1.confidence,
      row.approach1.modelId,
      rounded(row.approach2.estimatedWeightKg),
      rounded(row.approach2.deviationPct),
      row.approach2.status,
      row.approach2.confidence,
      row.approach2.modelId,
      row.status,
      rounded(row.maximumAbsoluteDeviationPct),
      row.abnormalityThresholdPct,
    ];
    lines.push(values.map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

const DEFAULT_VALIDATOR = createEmpiricalWeightValidator();
export const validateEmpiricalWeight = (input, options) => DEFAULT_VALIDATOR.validate(input, options);
export const buildEmpiricalWeightValidationReport = (rows, options) => DEFAULT_VALIDATOR.buildReport(rows, options);
