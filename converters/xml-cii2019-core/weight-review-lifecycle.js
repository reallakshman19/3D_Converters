function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function cloneMap(value) { return plainObject(value) ? { ...value } : {}; }
function positiveWeight(value) { const numeric = Number(value); return Number.isFinite(numeric) && numeric > 0 ? numeric : null; }

export function isXmlCiiScopedWeightKey(key) {
  const normalized = text(key);
  return normalized.includes('::') && normalized.split('::')[0].trim().length > 0 && normalized.split('::').slice(1).join('::').trim().length > 0;
}

export function sanitizeXmlCiiWeightDecisionMap(value) {
  const accepted = {};
  const rejected = [];
  for (const [key, raw] of Object.entries(cloneMap(value))) {
    const weight = positiveWeight(raw);
    if (weight === null) continue;
    if (!isXmlCiiScopedWeightKey(key)) {
      rejected.push({ key, weight, reason: 'unscoped-node-number-key' });
      continue;
    }
    accepted[key] = weight;
  }
  return { accepted, rejected };
}

export function persistXmlCiiRigidMatch1Config(config) {
  const source = plainObject(config) ? config : {};
  const out = { ...source, overrides: plainObject(source.overrides) ? { ...source.overrides } : {} };
  const legacy = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeight);
  const existing = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeightMatch1);
  out.overrides.rigidWeightMatch1 = { ...existing.accepted, ...legacy.accepted };
  delete out.overrides.rigidWeight;
  out.weightReviewLifecycle = {
    ...(plainObject(out.weightReviewLifecycle) ? out.weightReviewLifecycle : {}),
    schema: 'xml-cii-weight-review-lifecycle/v1',
    match1DecisionCount: Object.keys(out.overrides.rigidWeightMatch1).length,
    rejectedUnscopedKeys: [...existing.rejected, ...legacy.rejected],
  };
  return out;
}

export function prepareXmlCiiRunWeightLifecycle(config) {
  const source = plainObject(config) ? config : {};
  const out = { ...source, overrides: plainObject(source.overrides) ? { ...source.overrides } : {} };
  const match1 = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeightMatch1);
  const priorFinal = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeightFinal);
  // rigidWeight is intentionally transient at this boundary: after Match1 is
  // persisted separately, the only normal writer is Finalise-and-Run review.
  const currentFinal = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeight);
  const finalAccepted = Object.keys(currentFinal.accepted).length
    ? currentFinal.accepted
    : priorFinal.accepted;
  const finalDecisionPresent = Object.keys(finalAccepted).length > 0;
  const effective = finalDecisionPresent ? finalAccepted : match1.accepted;

  out.overrides.rigidWeightMatch1 = { ...match1.accepted };
  out.overrides.rigidWeightFinal = { ...finalAccepted };
  out.overrides.rigidWeight = { ...effective };
  out.weightReviewLifecycle = {
    ...(plainObject(out.weightReviewLifecycle) ? out.weightReviewLifecycle : {}),
    schema: 'xml-cii-weight-review-lifecycle/v1',
    match1DecisionCount: Object.keys(match1.accepted).length,
    finalDecisionCount: Object.keys(finalAccepted).length,
    effectiveDecisionCount: Object.keys(effective).length,
    effectiveAuthority: finalDecisionPresent ? 'Rigidmatch2' : 'RigidMatch1',
    rejectedUnscopedKeys: [
      ...match1.rejected,
      ...priorFinal.rejected,
      ...currentFinal.rejected,
    ],
  };
  return out;
}

export function xmlCiiWeightLifecycleSummary(config) {
  const lifecycle = plainObject(config?.weightReviewLifecycle) ? config.weightReviewLifecycle : {};
  return {
    schema: lifecycle.schema || 'xml-cii-weight-review-lifecycle/v1',
    match1DecisionCount: Number(lifecycle.match1DecisionCount || 0),
    finalDecisionCount: Number(lifecycle.finalDecisionCount || 0),
    effectiveDecisionCount: Number(lifecycle.effectiveDecisionCount || 0),
    effectiveAuthority: text(lifecycle.effectiveAuthority) || '',
    rejectedUnscopedKeys: Array.isArray(lifecycle.rejectedUnscopedKeys) ? lifecycle.rejectedUnscopedKeys : [],
  };
}
