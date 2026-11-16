// Explicit resolver match contracts: POS uses only aligned XYZ; PS uses configurable
// suffix removal; ROOT uses literal source support-reference tokens (no regex).
export const DEFAULT_PS_STRIP_SUFFIXES = Object.freeze(['.1.2', '.1', '-1', '_1']);
export const RESOLVER_MATCH_MODES = Object.freeze(['POS', 'PS', 'ROOT']);

export function normalizeResolverMatchMode(value) {
  const mode = String(value ?? 'POS').trim().toUpperCase();
  if (!RESOLVER_MATCH_MODES.includes(mode)) throw new Error('Unsupported resolver match mode: ' + mode);
  return mode;
}

export function normalizePsStripSuffixes(value) {
  const raw = value === undefined || value === null ? DEFAULT_PS_STRIP_SUFFIXES
    : Array.isArray(value) ? value : String(value).split(/[,\n;]+/);
  if (raw.length > 32) throw new Error('Too many PS suffixes (maximum 32)');
  const result = [];
  for (const entry of raw) {
    const suffix = String(entry ?? '').trim().toUpperCase();
    if (!suffix) continue;
    // 'N' is a numeric wildcard, e.g. .N or .N.N; each literal suffix is
    // anchored to the end. No user-authored regex is executed.
    if (!/^[._-](?:\d+|N)(?:\.(?:\d+|N))*$/.test(suffix) || suffix.length > 64)
      throw new Error('Invalid PS suffix: ' + suffix);
    if (!result.includes(suffix)) result.push(suffix);
  }
  return result;
}

function suffixLength(value, suffix) {
  const source = value.toUpperCase();
  const segments = suffix.toUpperCase().split('N');
  if (segments.length === 1) return source.endsWith(suffix) ? suffix.length : 0;
  // A wildcard matches one or more digits only. Check backwards from the
  // end so delimiters are never consumed accidentally.
  let cursor = source.length;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const literal = segments[i];
    if (!source.slice(0, cursor).endsWith(literal)) return 0;
    cursor -= literal.length;
    if (i > 0) {
      let digits = 0;
      while (cursor > 0 && source.charCodeAt(cursor - 1) >= 48
        && source.charCodeAt(cursor - 1) <= 57) { cursor -= 1; digits += 1; }
      if (!digits) return 0;
    }
  }
  return source.length - cursor;
}

export function canonicalPsOnly(value, stripSuffixes = DEFAULT_PS_STRIP_SUFFIXES) {
  const source = String(value ?? '').toUpperCase();
  // PS mode only. Standalone identity token must not match SL or unrelated
  // text, nor continue into unrecognized punctuation-delimited identifiers.
  const match = source.match(/(?:^|[^A-Z0-9])\/?(PS-?\d+(?:[._-]\d+)*)(?=$|[^A-Z0-9._-])/);
  if (!match) return '';
  let current = match[1].replace(/^PS-/, 'PS');
  const suffixes = normalizePsStripSuffixes(stripSuffixes);
  for (let n = 0; n < 16; n += 1) {
    const hits = suffixes.map((suffix) => suffixLength(current, suffix)).filter(Boolean);
    const remove = hits.length ? Math.max(...hits) : 0;
    if (!remove) break;
    current = current.slice(0, -remove);
  }
  return /^PS\d+$/.test(current) ? current : '';
}

export function literalSupportRoot(value) {
  // No regex. ROOT ignores PS suffix rules entirely; use the explicit
  // source support reference, or the XML member's first hierarchy segment.
  let token = String(value ?? '').trim().toUpperCase();
  if (!token) return '';
  const lastSlash = token.lastIndexOf('/');
  if (lastSlash >= 0) token = token.slice(lastSlash + 1);
  for (const separator of [' ', '(', '.', '\t', '\n']) {
    const i = token.indexOf(separator);
    if (i >= 0) token = token.slice(0, i);
  }
  return token;
}
