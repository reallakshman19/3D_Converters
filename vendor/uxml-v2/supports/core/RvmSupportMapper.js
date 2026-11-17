// Plain-data legacy resolver: today's no-localStorage path.
import { resolveKindPure, DEFAULT_RULES, SUPPORT_KINDS, MATCH_TYPES, splitRuleTerms } from './SupportKindResolver.js';

const REQUIRED_REST_PATTERN_TERMS = Object.freeze([
  'REST',
  'SHOE',
  'BP',
  'BEARING PLATE',
  'WP',
  'WEAR PAD',
  'ANCI',
]);

const REQUIRED_REST_FIELDS = Object.freeze([
  'SPRE',
  'SKEY',
  'NAME',
  'DESCRIPTION',
  'DESC',
  'CMPSUPTYPE',
  'ComponentType',
  'COMPONENTTYPE',
]);

const BUILTIN_RULES = DEFAULT_RULES;


function _canonicalTerm(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function _mergeCommaTerms(value, requiredTerms = []) {
  const seen = new Set();
  const out = [];
  const pushTerm = (term) => {
    const normalized = _canonicalTerm(term);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  splitRuleTerms(value).forEach(pushTerm);
  requiredTerms.forEach(pushTerm);
  return out.join(',');
}

function _applyRequiredBuiltinGuards(candidate, baseRule) {
  if (baseRule?.id !== 'builtin-user-rest') return candidate;

  return {
    ...candidate,
    field: _mergeCommaTerms(candidate.field || baseRule.field, REQUIRED_REST_FIELDS),
    pattern: _mergeCommaTerms(candidate.pattern || baseRule.pattern, REQUIRED_REST_PATTERN_TERMS),
    match: 'contains',
    kind: 'REST',
    label: 'REST/SHOE/BP/WP/ANCI -> REST',
  };
}

export function getBuiltinRules() {
  // The original storage reader returns {} when browser storage is unavailable.
  const overrides = {};
  return BUILTIN_RULES.map(rule => {
    const merged = { ...rule, ...(overrides[rule.id] || {}) };
    return _normalizeRuleForUse(_applyRequiredBuiltinGuards(merged, rule));
  });
}

export function resolveKindFromAttrs(attrs) {
  return resolveKindPure(attrs, {
    userRules:    [], // Original no-storage result; saved Step 7 rules use the injected config upstream.
    defaultRules: getBuiltinRules(),
    kindMap:      {},
  });
}

function _normalizeRuleForStorage(rule) {
  const field = String(rule?.field || '*').trim();
  const match = MATCH_TYPES.includes(rule?.match) ? rule.match : 'contains';
  const pattern = String(rule?.pattern || '').trim();
  const kind = _normalizeSupportKind(rule?.kind);
  if (!pattern) throw new Error('Support mapper rule requires a keyword or pattern.');
  if (!kind) throw new Error(`Support mapper rule kind must be one of: ${SUPPORT_KINDS.join(', ')}.`);

  return {
    ...rule,
    field,
    match,
    pattern,
    kind,
    label: `${field} ${match} "${pattern}" -> ${kind}`,
  };
}

function _normalizeRuleForUse(rule) {
  try {
    return _normalizeRuleForStorage(rule);
  } catch {
    return { ...rule, field: String(rule?.field || '*'), match: 'contains', pattern: String(rule?.pattern || ''), kind: 'REST' };
  }
}

function _normalizeSupportKind(kind) {
  const normalizedKind = String(kind || '').trim().toUpperCase().replace(/\s+/g, '');
  return SUPPORT_KINDS.includes(normalizedKind) ? normalizedKind : '';
}
