// Pure, dependency-free scope-pattern matching for RVM / ATTRIBUTE branch selection.
//
// User input may contain comma/semicolon/newline-separated tokens. Matching
// outer quotes are presentation syntax and are removed. '*' is the only glob
// operator; every other regex metacharacter remains literal. Glob tokens use
// substring semantics, matching the legacy behavior of plain tokens.

const TOKEN_SEPARATOR = /[,;\n]+/;
const SCOPE_ATTR_KEYS = Object.freeze([
  'NAME', 'OWNER', 'OWNER_SITE', 'SITE', 'ZONE', 'OWNER_ZONE', 'ZONE_ID',
  'PIPE', 'BRANCH', 'HREF', 'TREF', 'CREF',
]);

function text(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function stripOuterQuotes(value) {
  const token = text(value);
  if (token.length < 2) return token;
  const first = token[0];
  const last = token[token.length - 1];
  if ((first === '"' || first === "'") && first === last) {
    return token.slice(1, -1).trim();
  }
  return token;
}

export function splitScopeTokens(pattern) {
  return String(pattern ?? '')
    .split(TOKEN_SEPARATOR)
    .map(stripOuterQuotes)
    .filter(Boolean);
}

export function normalizeScopePattern(pattern) {
  return splitScopeTokens(pattern).join(', ');
}

function tokenToRegexSource(token) {
  return token
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
}

export function rvmScopeRegex(pattern) {
  const tokens = splitScopeTokens(pattern);
  if (!tokens.length) return null;
  const source = tokens.map((token) => `(?:${tokenToRegexSource(token)})`).join('|');
  return new RegExp(source, 'i');
}

export function matchesScopeText(value, pattern) {
  const regex = rvmScopeRegex(pattern);
  if (!regex) return true;
  return regex.test(String(value ?? ''));
}

export function matchesScopeFields(fields, pattern) {
  const regex = rvmScopeRegex(pattern);
  if (!regex) return true;
  return (Array.isArray(fields) ? fields : [fields])
    .map(text)
    .filter(Boolean)
    .some((field) => regex.test(field));
}

export function rvmScopeFields(value) {
  if (!value || typeof value !== 'object') return [text(value)].filter(Boolean);
  const attrs = value.attributes && typeof value.attributes === 'object'
    ? value.attributes
    : {};
  const fields = [
    value.label, value.name, value.id, value.type, value.kind,
    ...SCOPE_ATTR_KEYS.map((key) => attrs[key]),
  ];
  return [...new Set(fields.map(text).filter(Boolean))];
}

export function matchesRvmScope(value, pattern) {
  return matchesScopeFields(rvmScopeFields(value), pattern);
}
