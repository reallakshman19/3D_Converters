function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function cloneMap(value) { return plainObject(value) ? { ...value } : {}; }
function positiveWeight(value) { const numeric = Number(value); return Number.isFinite(numeric) && numeric > 0 ? numeric : null; }

export function isXmlCiiScopedWeightKey(key) {
  const normalized = text(key);
  return normalized.includes('::') && normalized.split('::')[0].trim().length > 0 && normalized.split('::').slice(1).join('::').trim().length > 0;
}

export function isXmlCiiPhysicalWeightKey(key) {
  return text(key).startsWith('WPC1::');
}

export function sanitizeXmlCiiWeightDecisionMap(value) {
  const accepted = {};
  const rejected = [];
  const legacyScoped = [];
  for (const [key, raw] of Object.entries(cloneMap(value))) {
    const weight = positiveWeight(raw);
    if (weight === null) continue;
    if (!isXmlCiiScopedWeightKey(key)) {
      rejected.push({ key, weight, reason: 'unscoped-node-number-key' });
      continue;
    }
    accepted[key] = weight;
    if (!isXmlCiiPhysicalWeightKey(key)) legacyScoped.push({ key, weight, reason: 'legacy-scoped-key-awaiting-physical-migration' });
  }
  return { accepted, rejected, legacyScoped };
}

export function persistXmlCiiRigidMatch1Config(config) {
  const source = plainObject(config) ? config : {};
  const out = { ...source, overrides: plainObject(source.overrides) ? { ...source.overrides } : {} };
  const legacy = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeight);
  const existing = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeightMatch1);
  out.overrides.rigidWeightMatch1 = { ...existing.accepted, ...legacy.accepted };
  // rigidWeight is compatibility/transient only. It must never persist as a
  // second authority beside RigidMatch1 or Rigidmatch2.
  delete out.overrides.rigidWeight;
  out.weightReviewLifecycle = {
    ...(plainObject(out.weightReviewLifecycle) ? out.weightReviewLifecycle : {}),
    schema: 'xml-cii-weight-review-lifecycle/v2',
    match1DecisionCount: Object.keys(out.overrides.rigidWeightMatch1).length,
    match1Persisted: true,
    rejectedUnscopedKeys: [...existing.rejected, ...legacy.rejected],
    legacyScopedKeys: [...existing.legacyScoped, ...legacy.legacyScoped],
  };
  return out;
}

export function prepareXmlCiiRunWeightLifecycle(config) {
  const source = plainObject(config) ? config : {};
  const out = { ...source, overrides: plainObject(source.overrides) ? { ...source.overrides } : {} };
  const explicitMatch1 = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeightMatch1);
  const explicitFinal = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeightFinal);
  const legacyTransient = sanitizeXmlCiiWeightDecisionMap(out.overrides.rigidWeight);

  // A historical positive rigidWeight value is never promoted to Final.
  // If no explicit Match1 exists it is demoted to Match1-compatible history,
  // forcing the current Final review to remain the only writer of Rigidmatch2.
  const match1Accepted = Object.keys(explicitMatch1.accepted).length
    ? explicitMatch1.accepted
    : legacyTransient.accepted;
  const finalAccepted = explicitFinal.accepted;
  const finalDecisionPresent = Object.keys(finalAccepted).length > 0;
  const effective = finalDecisionPresent ? finalAccepted : match1Accepted;

  out.overrides.rigidWeightMatch1 = { ...match1Accepted };
  out.overrides.rigidWeightFinal = { ...finalAccepted };
  // This remains a transient effective map only. The workflow adapter converts
  // physical WPC1 keys to legacy branch/node keys immediately before the old
  // XML mutator is invoked.
  out.overrides.rigidWeight = { ...effective };
  out.weightReviewLifecycle = {
    ...(plainObject(out.weightReviewLifecycle) ? out.weightReviewLifecycle : {}),
    schema: 'xml-cii-weight-review-lifecycle/v2',
    match1DecisionCount: Object.keys(match1Accepted).length,
    finalDecisionCount: Object.keys(finalAccepted).length,
    effectiveDecisionCount: Object.keys(effective).length,
    effectiveAuthority: finalDecisionPresent ? 'Rigidmatch2' : 'RigidMatch1',
    legacyRigidWeightDemotedToMatch1: !Object.keys(explicitMatch1.accepted).length && Object.keys(legacyTransient.accepted).length > 0,
    rejectedUnscopedKeys: [
      ...explicitMatch1.rejected,
      ...explicitFinal.rejected,
      ...legacyTransient.rejected,
    ],
    legacyScopedKeys: [
      ...explicitMatch1.legacyScoped,
      ...explicitFinal.legacyScoped,
      ...legacyTransient.legacyScoped,
    ],
  };
  return out;
}

export function xmlCiiWeightLifecycleSummary(config) {
  const lifecycle = plainObject(config?.weightReviewLifecycle) ? config.weightReviewLifecycle : {};
  return {
    schema: lifecycle.schema || 'xml-cii-weight-review-lifecycle/v2',
    match1DecisionCount: Number(lifecycle.match1DecisionCount || 0),
    finalDecisionCount: Number(lifecycle.finalDecisionCount || 0),
    effectiveDecisionCount: Number(lifecycle.effectiveDecisionCount || 0),
    effectiveAuthority: text(lifecycle.effectiveAuthority) || '',
    legacyRigidWeightDemotedToMatch1: lifecycle.legacyRigidWeightDemotedToMatch1 === true,
    rejectedUnscopedKeys: Array.isArray(lifecycle.rejectedUnscopedKeys) ? lifecycle.rejectedUnscopedKeys : [],
    legacyScopedKeys: Array.isArray(lifecycle.legacyScopedKeys) ? lifecycle.legacyScopedKeys : [],
  };
}
