function compareText(left, right) {
  const a = left == null ? '' : String(left), b = right == null ? '' : String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, stableValue(value[key])]));
}

function sorted(values, fields) {
  return [...(values || [])].map(stableValue).sort((left, right) => {
    for (const field of fields) {
      const order = compareText(left?.[field], right?.[field]);
      if (order) return order;
    }
    return compareText(JSON.stringify(left), JSON.stringify(right));
  });
}

function canonicalRawSupportObservations(value = {}) {
  return {
    supportKinds: sorted(value.supportKinds, ['value']),
    supportMapperKinds: sorted(value.supportMapperKinds, ['value']),
    supportTypes: sorted(value.supportTypes, ['value']),
  };
}

function canonicalInventory(value) {
  return {
    ...stableValue(value),
    outerTypes: sorted(value.outerTypes, ['outerType']),
    attributeTypes: sorted(value.attributeTypes, ['attributeType']),
    attributeRawTypes: sorted(value.attributeRawTypes, ['attributeRawType']),
    rawSupportObservations: canonicalRawSupportObservations(value.rawSupportObservations),
    ownerSites: sorted(value.ownerSites, ['ownerSite']),
    duplicateIdentities: sorted(value.duplicateIdentities, ['indexName', 'key']),
  };
}

export function canonicalBenchmarkEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Benchmark evidence must be an object.');
  if (value.schema === 'FbxBenchmarkInventory.v1') return canonicalInventory(value);
  return stableValue(value);
}

export function canonicalBenchmarkEvidenceJson(value) {
  return `${JSON.stringify(canonicalBenchmarkEvidence(value), null, 2)}\n`;
}
