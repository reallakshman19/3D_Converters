/**
 * Exact SITE/ZONE coverage gate for independently supplied reference inventory.
 * Source identity is authoritative: never infer/fabricate missing ATT nodes.
 * A self-consistent ATT index alone proves nothing about NWD/RVM completeness.
 */
const NATIVE_KINDS = new Set(['SITE', 'ZONE']);
const MAX_EXPECTED_RECORDS = 200000;

function validName(value, label) {
  const name = String(value ?? '').trim();
  if (!name.startsWith('/') || /\s/.test(name) || name.length < 2) {
    throw new Error(label + ' must be an exact slash-prefixed native NAME.');
  }
  return name;
}

/**
 * Supported plain-text syntax:
 * SITE /ASIM-1885-CU-PL
 * ZONE /ASIM-1885-CU-PL-S OWNER=/ASIM-1885-CU-PL
 *
 * Or JSON: {source:"NWD export", complete:true, nodes:[
 *   {type:"SITE", name:"/ASIM-1885-CU-PL", owner:"/*"} ]}
 * A pasted subset is NOT a complete source inventory.
 */
export function parseExpectedAttSiteZoneManifest(input, options = {}) {
  let data;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Enter at least one expected SITE or ZONE.');
    if (trimmed.startsWith('{')) {
      try { data = JSON.parse(trimmed); }
      catch { throw new Error('Expected inventory JSON is invalid.'); }
    } else {
      const entries = [];
      for (const line of trimmed.split(/\r?\n/)) {
        const value = line.trim();
        if (!value || value.startsWith('#')) continue;
        const tokens = /^(\S+)\s+(\/\S+)(?:\s+OWNER=(\/\S+))?$/i.exec(value);
        if (!tokens) {
          throw new Error('Expected "SITE /NAME" or "ZONE /NAME OWNER=/PARENT": ' + value.slice(0, 160));
        }
        entries.push({ type: tokens[1], name: tokens[2], ...(tokens[3] ? { owner: tokens[3] } : {}) });
      }
      data = { source: options.source || 'Pasted expected model list', complete: options.complete === true, nodes: entries };
    }
  } else if (input && typeof input === 'object' && !Array.isArray(input)) {
    data = input;
  } else {
    throw new TypeError('Expected inventory must be plain text or an inventory object.');
  }

  const supplied = data.nodes;
  if (!Array.isArray(supplied) || !supplied.length) {
    throw new Error('Expected inventory requires a nonempty nodes[] list.');
  }
  if (supplied.length > MAX_EXPECTED_RECORDS) {
    throw new Error('Expected list exceeds safe validation limit; no entries were silently truncated.');
  }
  if (data.complete !== undefined && typeof data.complete !== 'boolean') {
    throw new Error('Expected inventory "complete" must be true or false.');
  }
  const names = new Set();
  const nodes = supplied.map((item, i) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid expected record at line ' + (i + 1));
    const type = String(item.type || '').trim().toUpperCase();
    if (!NATIVE_KINDS.has(type)) throw new Error('Expected type must be SITE or ZONE: ' + type);
    const name = validName(item.name, 'Expected ' + type + ' NAME');
    if (names.has(name)) throw new Error('Duplicate expected identity: ' + name);
    names.add(name);
    const owner = item.owner == null || item.owner === '' ? null
      : validName(item.owner, 'Expected OWNER');
    return Object.freeze({ type, name, owner });
  });
  return Object.freeze({
    source: String(data.source || 'Supplied independent model list').trim().slice(0, 200),
    complete: data.complete === true,
    nodes: Object.freeze(nodes),
  });
}

/** Compare only exact native identities and recorded ownership. */
export function compareAttExpectedCoverage(index, manifest) {
  if (!index?.records || !index?.byId || !index?.counts) throw new TypeError('Native ATT source index required.');
  const expected = parseExpectedAttSiteZoneManifest(manifest);
  const actualByName = new Map();
  for (const record of index.records) {
    const entries = actualByName.get(record.name) || [];
    entries.push(record);
    actualByName.set(record.name, entries);
  }
  const expectedNames = new Set(expected.nodes.map(node => node.name));
  const missing = [], typeMismatch = [], ownerMismatch = [], ambiguous = [], found = [], unexpected = [];
  for (const node of expected.nodes) {
    const actual = actualByName.get(node.name) || [];
    if (!actual.length) missing.push(node);
    else if (actual.length !== 1) ambiguous.push({ ...node, found: actual.length });
    else if (actual[0].type !== node.type) {
      typeMismatch.push({ ...node, actualType: actual[0].type });
    } else if (node.owner !== null && actual[0].owner !== node.owner) {
      ownerMismatch.push({ ...node, actualOwner: actual[0].owner });
    } else found.push(node);
  }
  if (expected.complete) {
    for (const record of index.records) {
      if (NATIVE_KINDS.has(record.type) && !expectedNames.has(record.name)) {
        unexpected.push(Object.freeze({ name: record.name, type: record.type, owner: record.owner }));
      }
    }
  }
  const mismatchCount = missing.length + typeMismatch.length
    + ownerMismatch.length + ambiguous.length + unexpected.length;
  return Object.freeze({
    status: mismatchCount ? 'MISMATCH' : 'MATCH',
    scope: expected.complete ? 'COMPLETE_REFERENCE' : 'EXPECTED_SUBSET',
    source: expected.source, expectedTotal: expected.nodes.length,
    matched: found.length, indexTotal: index.counts.typed,
    missing: Object.freeze(missing), typeMismatch: Object.freeze(typeMismatch),
    ownerMismatch: Object.freeze(ownerMismatch), ambiguous: Object.freeze(ambiguous),
    unexpected: Object.freeze(unexpected),
    mismatchCount,
  });
}

/** A comparison which is edited or fails is NOT silently bypassed. */
export function attCoverageCanConvert(rawExpectation, validatedRaw, coverage) {
  const raw = String(rawExpectation || '').trim();
  if (!raw) return true; // ATT-only mode: permitted, completeness explicitly unverified.
  return Boolean(coverage && coverage.status === 'MATCH' && raw === String(validatedRaw || '').trim());
}
