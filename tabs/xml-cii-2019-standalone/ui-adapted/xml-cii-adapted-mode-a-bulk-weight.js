function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function norm(value) {
  return text(value).toUpperCase().replace(/\s+/g, ' ');
}

export function modeAQualifiedExactWeightRow(row = {}) {
  const weight = number(row.bestWeight);
  const boreDelta = number(row.bestBoreDelta);
  return Boolean(
    weight !== null && weight > 0
    && row.bestPreferred === true
    && row.bestLengthQualified === true
    && row.bestRatingExact === true
    && boreDelta !== null && Math.abs(boreDelta) < 1
    && row.bestInferredWeight !== true
    && row.bestFallbackSuggestion !== true
    && row.bestSpecialFactorRule !== true
    && row.bestFlangeWeightFallback !== true
    && row.bestZeroFallback !== true
  );
}

export function modeAWeightGroupKey(row = {}) {
  if (!modeAQualifiedExactWeightRow(row)) return '';
  const bore = number(row.boreMm);
  const length = number(row.lengthMm);
  const weight = number(row.bestWeight);
  if (bore === null || length === null || weight === null) return '';
  return [
    norm(row.componentType),
    Math.round(bore),
    norm(row.rating),
    Math.round(length * 10) / 10,
    norm(row.bestDescription),
    Math.round(weight * 1000) / 1000,
  ].join('|');
}

function changeForRow(row) {
  return {
    sourceId: row.sourceId,
    fileName: row.fileName,
    branchName: row.branchName,
    key: row.key,
    nodeNumber: row.nodeNumber,
    componentRefNo: row.componentRefNo,
    weight: number(row.bestWeight),
  };
}

export function buildModeAWeightProjectMatchPlan(rows = []) {
  const changes = [];
  const review = [];
  const mapped = [];
  for (const row of rows || []) {
    if (row?.mapped) {
      mapped.push(row);
      continue;
    }
    if (modeAQualifiedExactWeightRow(row)) changes.push(changeForRow(row));
    else review.push(row);
  }
  return {
    changes,
    review,
    mapped,
    affectedSourceCount: new Set(changes.map((row) => row.sourceId)).size,
  };
}

export function buildModeAWeightFillPlan(rows = [], sourceRow = {}) {
  const groupKey = modeAWeightGroupKey(sourceRow);
  if (!groupKey) return { groupKey, changes: [], skipped: [] };
  const changes = [];
  const skipped = [];
  for (const row of rows || []) {
    if (row?.sourceId === sourceRow?.sourceId && row?.key === sourceRow?.key) continue;
    if (modeAWeightGroupKey(row) !== groupKey) continue;
    if (row?.mapped) {
      skipped.push({ sourceId: row.sourceId, key: row.key, reason: 'already-mapped' });
      continue;
    }
    changes.push(changeForRow(row));
  }
  return { groupKey, changes, skipped };
}

export function buildModeAWeightUsePlan(row = {}) {
  const weight = number(row.bestWeight);
  if (weight === null || weight <= 0 || !text(row.key)) return null;
  const qualifiedExact = modeAQualifiedExactWeightRow(row);
  return {
    change: changeForRow(row),
    qualifiedExact,
    requiresReview: !qualifiedExact,
  };
}
