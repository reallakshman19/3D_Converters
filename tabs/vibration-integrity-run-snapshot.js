function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function canonicalTable(table) {
  return {
    kind: text(table?.kind),
    contract: text(table?.contract),
    header: [...(table?.header ?? [])].map(text),
    rowIds: [...(table?.rowIds ?? [])].map(text),
    rows: (table?.rows ?? []).map((row) => row.map(text)),
    sourceName: table?.sourceName ?? null,
    sourceKind: table?.sourceKind ?? null,
    authorityDowngraded: table?.authorityDowngraded === true,
  };
}

function canonicalPayload(state) {
  return {
    schema: 'FitWorkingInputState.v1',
    allowLimitedExchange: state.allowLimitedExchange === true,
    benchmarkId: state.benchmark?.loaded?.id ?? null,
    benchmarkModified: state.benchmark?.loaded?.modified === true,
    tables: {
      topology: canonicalTable(state.tables?.topology),
      operating: canonicalTable(state.tables?.operating),
      enrichment: canonicalTable(state.tables?.enrichment),
    },
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto SHA-256 is required for vibration execution snapshots.');
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildVibrationIntegrityRunSnapshot(state) {
  const input = canonicalPayload(state);
  const canonicalInput = stableJson(input);
  const snapshotHash = await sha256Hex(canonicalInput);
  return Object.freeze({
    schema: 'FitRunSnapshot.v1',
    workingInputSchema: input.schema,
    snapshotHash,
    canonicalInput,
    input: Object.freeze(input),
  });
}
