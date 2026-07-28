function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function candidateForRow(row) {
  const ratings = Array.isArray(row?.ratingDtxrRatings)
    ? [...new Set(row.ratingDtxrRatings.map(text).filter(Boolean))]
    : [];
  const rating = text(row?.ratingDtxr);
  if (ratings.length > 1) return { status: 'conflict', rating: '', ratings };
  const selected = rating || ratings[0] || '';
  return selected
    ? { status: 'match', rating: selected, ratings: [selected] }
    : { status: 'missing', rating: '', ratings: [] };
}

function targetKey(row) {
  return text(row?.branchName) || text(row?.lineKey);
}

function clearFetchedRatingOverrides(overrides) {
  const markers = object(overrides.__dtxrRatingKeys);
  const rating = object(overrides.rating);
  for (const key of Object.keys(markers)) {
    delete rating[key];
    const processRow = overrides.processData?.[key];
    if (processRow && typeof processRow === 'object') {
      delete processRow.rating;
      if (!Object.keys(processRow).length) delete overrides.processData[key];
    }
  }
  overrides.rating = rating;
  overrides.__dtxrRatingKeys = {};
}

export function isPreviewDtxrRatingOverride(config, key) {
  const cleanKey = text(key);
  return Boolean(cleanKey && config?.overrides?.__dtxrRatingKeys?.[cleanKey]);
}

export function applyPreviewDtxrRatingOverrides(config = {}, branchRows = []) {
  const target = config && typeof config === 'object' ? config : {};
  target.overrides = object(target.overrides);
  target.overrides.processData = object(target.overrides.processData);
  clearFetchedRatingOverrides(target.overrides);

  let applied = 0;
  let conflicts = 0;
  let missing = 0;
  const targets = [];
  for (const row of Array.isArray(branchRows) ? branchRows : []) {
    const key = targetKey(row);
    const candidate = candidateForRow(row);
    if (candidate.status === 'conflict') {
      conflicts += 1;
      continue;
    }
    if (!key || candidate.status !== 'match') {
      missing += 1;
      continue;
    }
    target.overrides.rating[key] = candidate.rating;
    target.overrides.__dtxrRatingKeys[key] = true;
    targets.push({ key, rating: candidate.rating, branchName: text(row?.branchName) });
    applied += 1;
  }
  return { config: target, applied, conflicts, missing, targets };
}

export function previewDtxrRatingCandidate(row) {
  return candidateForRow(row);
}
