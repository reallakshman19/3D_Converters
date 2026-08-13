const LINE_FIELDS = new Set(['p1', 't1', 't2', 't3', 'density']);
const CLASS_FIELDS = new Set(['hydroPressure', 'material', 'rating', 'corrosion']);
const CLASS_SIZE_FIELDS = new Set(['materialCode', 'wallThickness']);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function norm(value) {
  return text(value).toUpperCase().replace(/\s+/g, '');
}

function classKey(row) {
  const value = norm(row?.pipingClass || row?.pipingClassDerived);
  return value ? `PC:${value}` : '';
}

function classSizeKey(row) {
  const cls = classKey(row);
  const numeric = Number(row?.sizeMm ?? text(row?.size).replace(/[^0-9.+-]/g, ''));
  return cls && Number.isFinite(numeric) && numeric > 0 ? `${cls}|DN:${Math.round(numeric)}` : cls;
}

export function modeAPreviewFillRule(field) {
  if (LINE_FIELDS.has(field)) return { field, scope: 'line', label: 'Same Line Key' };
  if (CLASS_FIELDS.has(field)) return { field, scope: 'class', label: 'Same Piping Class' };
  if (CLASS_SIZE_FIELDS.has(field)) return { field, scope: 'class-size', label: 'Same Piping Class + Size' };
  return null;
}

export function modeAPreviewFillGroupKey(row, field) {
  const rule = modeAPreviewFillRule(field);
  if (!rule) return '';
  if (rule.scope === 'line') return text(row?.lineKey) ? `LINE:${text(row.lineKey)}` : '';
  return rule.scope === 'class-size' ? classSizeKey(row) : classKey(row);
}

export function modeAPreviewFieldSource(row, field) {
  if (field === 'materialCode') return row?.materialCodeNeedsReview ? 'review' : (row?.materialCodeMethod || '');
  return row?.[`${field}Source`] || '';
}

function safeSource(value) {
  const source = text(value).toLowerCase();
  return !source || /(^|-)default($|-)|default-zero|config-default|none|missing|unresolved|review|approx|fuzzy/.test(source);
}

export function modeAPreviewSafeFillTarget(row, field, sourceValue) {
  const current = text(row?.[field]);
  if (!text(sourceValue) || current === text(sourceValue)) return false;
  if (!current || current === '—') return true;
  return safeSource(modeAPreviewFieldSource(row, field));
}

export function buildModeAPreviewFillPlan(rows = [], sourceRow = {}, field = '') {
  const rule = modeAPreviewFillRule(field);
  const value = text(sourceRow?.[field]);
  const groupKey = modeAPreviewFillGroupKey(sourceRow, field);
  if (!rule || !value || !groupKey) return { rule, value, groupKey, changes: [], skipped: [] };
  const changes = [];
  const skipped = [];
  for (const row of rows || []) {
    if (row?.sourceId === sourceRow?.sourceId && row?.branchName === sourceRow?.branchName) continue;
    if (modeAPreviewFillGroupKey(row, field) !== groupKey) continue;
    if (!modeAPreviewSafeFillTarget(row, field, value)) {
      skipped.push({ sourceId: row.sourceId, branchName: row.branchName });
      continue;
    }
    changes.push({
      sourceId: row.sourceId,
      fileName: row.fileName,
      branchName: row.branchName,
      lineKey: row.lineKey,
      field,
      value,
      groupKey,
      ratingKey: row.ratingKey || classKey(row) || row.lineKey || row.branchName,
      materialCodeKey: row.materialCodeKey || classKey(row) || row.lineKey || row.branchName,
      wallThicknessKey: row.wallThicknessKey || classSizeKey(row) || row.lineKey || row.branchName,
      corrosionKey: row.corrosionKey || classKey(row) || row.lineKey || row.branchName,
    });
  }
  return { rule, value, groupKey, changes, skipped };
}

export function buildModeAProjectDataMatchPlan(rows = [], sourceLineKeys = {}, resolver) {
  const changes = [];
  const ambiguous = [];
  const unmatched = [];
  const seen = new Set();
  for (const row of rows || []) {
    if (!row?.lineMiss) continue;
    const identity = `${row.sourceId}::${row.branchName}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const result = typeof resolver === 'function'
      ? resolver(row.branchName || '', sourceLineKeys?.[row.sourceId] || [])
      : { status: 'none' };
    if (result?.status === 'match' && text(result.key)) {
      changes.push({ sourceId: row.sourceId, fileName: row.fileName, branchName: row.branchName, lineKey: text(result.key) });
    } else if (result?.status === 'ambiguous') {
      ambiguous.push({ sourceId: row.sourceId, fileName: row.fileName, branchName: row.branchName, candidates: result.candidates || [] });
    } else {
      unmatched.push({ sourceId: row.sourceId, fileName: row.fileName, branchName: row.branchName });
    }
  }
  return { changes, ambiguous, unmatched, affectedSourceCount: new Set(changes.map((row) => row.sourceId)).size };
}
