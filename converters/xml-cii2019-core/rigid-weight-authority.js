export const XML_CII_RIGID_WEIGHT_BUCKETS = Object.freeze({
  final: 'rigidWeightFinal',
  match1: 'rigidWeightMatch1',
  legacy: 'rigidWeight',
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function positive(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function uniqueKeys(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map(text).filter(Boolean))];
}

function positiveBucket(value) {
  const out = {};
  for (const [key, raw] of Object.entries(plainObject(value))) {
    const numeric = positive(raw);
    if (text(key) && numeric !== null) out[key] = numeric;
  }
  return out;
}

function resolution(bucketName, key, value) {
  const labels = {
    rigidWeightFinal: 'final-review',
    rigidWeightMatch1: 'weight-match-1',
    rigidWeight: 'legacy-override',
  };
  return {
    weightKg: value,
    bucket: bucketName,
    key,
    source: labels[bucketName] || bucketName,
    legacy: bucketName === XML_CII_RIGID_WEIGHT_BUCKETS.legacy,
  };
}

export function resolveXmlCiiRigidWeight(config, keys, sourceWeightKg = null) {
  const overrides = plainObject(config?.overrides);
  const candidates = uniqueKeys(keys);
  for (const bucketName of [
    XML_CII_RIGID_WEIGHT_BUCKETS.final,
    XML_CII_RIGID_WEIGHT_BUCKETS.match1,
    XML_CII_RIGID_WEIGHT_BUCKETS.legacy,
  ]) {
    const bucket = plainObject(overrides[bucketName]);
    for (const key of candidates) {
      const value = positive(bucket[key]);
      if (value !== null) return resolution(bucketName, key, value);
    }
  }
  const source = positive(sourceWeightKg);
  return source === null
    ? { weightKg: null, bucket: '', key: '', source: 'unresolved', legacy: false }
    : { weightKg: source, bucket: 'xmlWeight', key: '', source: 'xml-weight', legacy: false };
}

export function xmlCiiEffectiveRigidWeightMap(config) {
  const overrides = plainObject(config?.overrides);
  return {
    ...positiveBucket(overrides[XML_CII_RIGID_WEIGHT_BUCKETS.legacy]),
    ...positiveBucket(overrides[XML_CII_RIGID_WEIGHT_BUCKETS.match1]),
    ...positiveBucket(overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final]),
  };
}

export function withXmlCiiEffectiveRigidWeightLegacyView(config) {
  const base = plainObject(config);
  return {
    ...base,
    overrides: {
      ...plainObject(base.overrides),
      rigidWeight: xmlCiiEffectiveRigidWeightMap(base),
    },
  };
}

function nextConfig(config) {
  const base = plainObject(config);
  return {
    ...base,
    overrides: { ...plainObject(base.overrides) },
  };
}

export function withXmlCiiRigidWeightMatch1(config, weightsByKey = {}) {
  const next = nextConfig(config);
  const match1 = { ...plainObject(next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.match1]) };
  const final = { ...plainObject(next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final]) };
  for (const [rawKey, rawValue] of Object.entries(plainObject(weightsByKey))) {
    const key = text(rawKey);
    const value = positive(rawValue);
    if (!key || value === null) continue;
    match1[key] = value;
    delete final[key];
  }
  next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.match1] = match1;
  if (Object.keys(final).length) next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final] = final;
  else delete next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final];
  return next;
}

export function withXmlCiiRigidWeightFinal(config, weightsByKey = {}) {
  const next = nextConfig(config);
  const final = { ...plainObject(next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final]) };
  for (const [rawKey, rawValue] of Object.entries(plainObject(weightsByKey))) {
    const key = text(rawKey);
    const value = positive(rawValue);
    if (key && value !== null) final[key] = value;
  }
  next.overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final] = final;
  return next;
}

export function xmlCiiRigidWeightLifecycleSnapshot(config) {
  const overrides = plainObject(config?.overrides);
  return {
    legacy: positiveBucket(overrides[XML_CII_RIGID_WEIGHT_BUCKETS.legacy]),
    match1: positiveBucket(overrides[XML_CII_RIGID_WEIGHT_BUCKETS.match1]),
    final: positiveBucket(overrides[XML_CII_RIGID_WEIGHT_BUCKETS.final]),
  };
}
