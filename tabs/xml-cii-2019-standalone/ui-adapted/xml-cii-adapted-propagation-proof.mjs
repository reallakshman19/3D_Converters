/** Independent, source-identity-bound CII checks. No global string searches. */
const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/;
const MISSING = new Set(['', '-', '—', '–', 'n/a', 'na', 'none', 'null', 'undefined']);

export function engineeringNumber(value, temperature = false) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const source = String(value).trim();
  if (MISSING.has(source.toLowerCase()) || !NUMERIC.test(source)) return null;
  const n = Number(source);
  if (!Number.isFinite(n) || (temperature && n === -100000)) return null;
  return n;
}

function fields(row, minimum = 6) {
  const parts = String(row || '').trim().split(/\s+/);
  if (parts.length < minimum || parts.slice(0, minimum).some(x => engineeringNumber(x) === null)) {
    throw new Error('CII_ELEMENT_ROW_MALFORMED');
  }
  return parts;
}

export function parseCiiEngineeringFields(text) {
  const sections = new Map();
  let section = '';
  for (const line of String(text || '').split(/\r?\n/)) {
    const heading = /^#\$\s+(.+?)\s*$/.exec(line);
    if (heading) {
      section = heading[1];
      if (sections.has(section)) throw new Error('CII_DUPLICATE_SECTION');
      sections.set(section, []);
    } else if (section) {
      sections.get(section).push(line);
    }
  }
  const rows = sections.get('ELEMENTS');
  if (!rows || rows.length === 0 || rows.length % 15 !== 0) {
    throw new Error('CII_ELEMENT_BLOCK_COUNT_INVALID');
  }
  const control = sections.get('CONTROL');
  if (!control || !control.length || Number(control[0].trim().split(/\s+/)[0]) !== rows.length / 15) {
    throw new Error('CII_CONTROL_ELEMENT_COUNT_MISMATCH');
  }
  const rigid = (sections.get('RIGID') || []).map((line, index) => {
    const n = fields(line, 2);
    return { index: index + 1, forceN: Number(n[1]) };
  });
  const elements = [];
  for (let i = 0; i < rows.length; i += 15) {
    const block = rows.slice(i, i + 15);
    const endpoints = /^\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)/.exec(block[0]);
    if (!endpoints) throw new Error('CII_ELEMENT_ENDPOINTS_INVALID');
    const branch = /^\s*\d+\s+(.+?)\s*$/.exec(block[10]);
    if (!branch) throw new Error('CII_ELEMENT_BRANCH_MISSING');
    const r2 = fields(block[1]);
    const r4 = fields(block[3]);
    const r6 = fields(block[5]);
    const pointers = fields(block[12]);
    const rigidPointer = Number(pointers[1]);
    if (!Number.isSafeInteger(rigidPointer) || rigidPointer < 0 || rigidPointer > rigid.length) {
      throw new Error('CII_RIGID_POINTER_INVALID');
    }
    const from = Number(endpoints[1]), to = Number(endpoints[2]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) {
      throw new Error('CII_NODE_NUMBER_INVALID');
    }
    elements.push({
      index: i / 15 + 1, branch: branch[1], from: String(from), to: String(to),
      wallThickness: Number(r2[0]), corrosion: Number(r2[2]),
      t1: Number(r2[3]), t2: Number(r2[4]), t3: Number(r2[5]),
      p1: Number(r4[0]), density: Number(r6[1]), rigidPointer,
    });
  }
  return { elements, rigid };
}

function approximately(value, actual) {
  return Math.abs(value - actual) <= Math.max(1e-8, Math.abs(value) * 1e-5);
}

/** Require every emitted element for the owning branch to agree. */
export function ciiBranchFieldMatches(parsed, branch, field, sourceValue) {
  const expected = engineeringNumber(sourceValue, field.startsWith('t'));
  if (!parsed || expected === null || !['t1','t2','t3','p1','density'].includes(field)) return null;
  const candidates = parsed.elements.filter(e => e.branch === branch);
  if (!candidates.length) return false;
  const scales = field === 'density' ? [1, 1e-6] : [1];
  return candidates.every(e => scales.some(scale => approximately(expected * scale, e[field])));
}

/** Parse the exact owning element, not a whole CII occurrence of the value. */
export function ciiElementFieldMatches(parsed, branch, from, to, field, sourceValue) {
  const value = engineeringNumber(sourceValue);
  if (!parsed || value === null || !['wallThickness','corrosion','t1','t2','t3','p1','density'].includes(field)) return null;
  const candidates = parsed.elements.filter(e =>
    e.branch === branch && e.from === String(from) && e.to === String(to));
  if (candidates.length !== 1) return null; // duplicates need physical occurrence custody
  return approximately(value, candidates[0][field]);
}

/** RIGID force is verified through the owning ELEMENTS pointer, never text includes(). */
export function ciiNodeWeightMatches(parsed, branch, nodeNumber, sourceKg, scale = 10) {
  const expected = engineeringNumber(sourceKg);
  if (!parsed || expected === null || !Number.isFinite(scale)) return null;
  const node = String(nodeNumber ?? '').trim();
  if (!/^\d+$/.test(node)) return null; // Inline -1 requires physical-occurrence custody.
  const candidates = parsed.elements.filter(e => e.branch === branch && (e.from === node || e.to === node));
  if (!candidates.length) return false;
  const bound = candidates.filter(e => e.rigidPointer > 0);
  if (!bound.length) return false;
  const actual = bound.map(e => parsed.rigid[e.rigidPointer - 1]?.forceN);
  if (actual.some(v => v === undefined)) return null;
  // A CII node may be referenced by several edges; without unique weight
  // ownership the result is unknown instead of a possibly unrelated match.
  if (new Set(actual.map(x => x.toPrecision(10))).size !== 1) return null;
  return approximately(expected * scale, actual[0]);
}
