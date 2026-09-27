const STANDARD_NPS = new Set(['0.5','0.75','1','1.25','1.5','2','2.5','3','3.5','4','5','6','8','10','12','14','16','18','20','22','24','26','28','30','32','34','36','40','42','48','54','60']);
const STANDARD_DN = new Set(['6','8','10','15','20','25','32','40','50','65','80','90','100','125','150','200','250','300','350','400','450','500','550','600','650','700','750','800','850','900','1000','1050','1200','1350','1500']);
const STANDARD_RATINGS = new Set(['150','300','600','900','1500','2500','5000','10000','15000','20000']);
const ROLE_ORDER = ['lineKey', 'pipingClass', 'rating', 'bore'];
const TRUSTED_AUTHORITIES = new Set(['AUTHORIZED_MASTER', 'GOVERNED_NORMALIZED_MASTER', 'EXPLICIT_SOURCE', 'DERIVED_FROM_AUTHORIZED_CLASS']);

const txt = (value) => String(value ?? '').trim();
const norm = (value) => txt(value).toUpperCase().replace(/[^A-Z0-9.]/g, '');
const clamp = (value) => Math.max(0, Math.min(1, value));

function coverage(values, predicate) {
  if (!values.length) return 0;
  return values.filter(predicate).length / values.length;
}

function suggestion(role, tokenPositions, confidence, authorityLevel, values, evidence, evidenceMetrics = {}) {
  return {
    role,
    tokenPositions,
    confidence: Number(confidence.toFixed(4)),
    authorityLevel,
    // Legacy `coverage` remains a sample-count compatibility field.
    coverage: values.length,
    sampleCount: values.length,
    evidenceMetrics: Object.freeze({ ...evidenceMetrics }),
    evidence,
    conflict: false,
    safe: false,
    review: false,
  };
}

function boreCandidate(values, position) {
  const explicit = coverage(values, (value) => /^\d+(?:\.\d+)?\s*(?:"|IN|NPS)$/i.test(value));
  const dn = coverage(values, (value) => /^DN\s*\d+(?:\.\d+)?$/i.test(value));
  const known = coverage(values, (value) => {
    const number = txt(value).replace(/[^0-9.]/g, '');
    return STANDARD_NPS.has(number) || STANDARD_DN.has(number);
  });
  const explicitSyntaxRate = clamp(explicit + dn);
  const score = clamp(0.48 * explicit + 0.40 * dn + 0.25 * known + (explicit || dn ? 0.22 : 0));
  const authority = explicitSyntaxRate === 1 ? 'EXPLICIT_SOURCE' : explicitSyntaxRate > 0 ? 'PARTIAL_SOURCE_EVIDENCE' : 'HEURISTIC_ONLY';
  return suggestion('bore', [position], score, authority, values,
    [`${Math.round(explicitSyntaxRate * 100)}% explicit size syntax`, `${Math.round(known * 100)}% standard NPS/DN values`],
    { explicitSyntaxRate, standardValueRate: known });
}

function safePattern(pattern) {
  try { return new RegExp(pattern || '(?:M[0-9A-Z]+)$', 'i'); }
  catch { return /(?:M[0-9A-Z]+)$/i; }
}

function classCandidate(values, position, masters, suffixPattern) {
  const exact = coverage(values, (value) => masters.has(norm(value)));
  const suffix = safePattern(suffixPattern);
  const normalized = coverage(values, (value) => masters.has(norm(txt(value).replace(suffix, ''))));
  const shape = coverage(values, (value) => /\d{3,}[A-Z0-9]*$/i.test(value));
  const score = clamp(0.65 * exact + 0.58 * normalized + 0.20 * shape);
  const authority = exact === 1
    ? 'AUTHORIZED_MASTER'
    : normalized === 1
      ? 'GOVERNED_NORMALIZED_MASTER'
      : exact > 0 || normalized > 0
        ? 'PARTIAL_MASTER_EVIDENCE'
        : 'HEURISTIC_ONLY';
  return suggestion('pipingClass', [position], score, authority, values,
    [`${Math.round(exact * 100)}% exact master match`, `${Math.round(normalized * 100)}% governed normalized match`],
    { exactMasterRate: exact, normalizedMasterRate: normalized, shapeRate: shape });
}

function lineKeyCandidates(rows, lineMasters, maxTokens) {
  const out = [];
  const maxColumns = Math.max(0, ...rows.map((row) => row.values.length));
  for (let width = 1; width <= maxTokens; width += 1) {
    for (let start = 1; start + width - 1 <= maxColumns; start += 1) {
      const pos = Array.from({ length: width }, (_, index) => start + index);
      const values = rows.map((row) => pos.map((p) => row.values[p - 1] || '').join('')).filter(Boolean);
      const exact = coverage(values, (value) => lineMasters.has(norm(value)));
      const unique = new Set(values.map(norm)).size / Math.max(1, values.length);
      const lineShape = coverage(values, (value) => /[A-Z]+\d{4,}/i.test(value));
      const score = clamp(0.72 * exact + 0.16 * unique + 0.18 * lineShape - (width - 1) * 0.03);
      const authority = exact === 1 ? 'AUTHORIZED_MASTER' : exact > 0 ? 'PARTIAL_MASTER_EVIDENCE' : 'HEURISTIC_ONLY';
      out.push(suggestion('lineKey', pos, score, authority, values,
        [`${Math.round(exact * 100)}% exact line-list match`, `${Math.round(unique * 100)}% uniqueness`, `${Math.round(lineShape * 100)}% line-key shape`],
        { exactMasterRate: exact, uniquenessRate: unique, shapeRate: lineShape }));
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence || a.tokenPositions.length - b.tokenPositions.length);
}

function ratingCandidate(values, position) {
  const explicit = coverage(values, (value) => STANDARD_RATINGS.has(txt(value).replace(/[^0-9]/g, '')));
  const score = clamp(explicit * 0.92);
  const authority = explicit === 1 ? 'EXPLICIT_SOURCE' : explicit > 0 ? 'PARTIAL_SOURCE_EVIDENCE' : 'HEURISTIC_ONLY';
  return suggestion('rating', [position], score, authority, values,
    [`${Math.round(explicit * 100)}% standard rating values`],
    { standardValueRate: explicit });
}

function positionValues(rows, position) {
  return rows.map((row) => row.values[position - 1] || '').filter(Boolean);
}

function bestByRole(candidates, thresholds) {
  const out = [];
  for (const role of ROLE_ORDER) {
    const best = candidates.filter((item) => item.role === role).sort((a, b) => b.confidence - a.confidence)[0];
    if (!best || best.confidence < thresholds.display) continue;
    best.safe = best.confidence >= thresholds.safe && TRUSTED_AUTHORITIES.has(best.authorityLevel);
    best.review = !best.safe && (
      best.confidence >= thresholds.review
      || best.authorityLevel === 'PARTIAL_MASTER_EVIDENCE'
      || best.authorityLevel === 'PARTIAL_SOURCE_EVIDENCE'
    );
    out.push(best);
  }
  return out;
}

function markConflicts(suggestions) {
  for (let i = 0; i < suggestions.length; i += 1) {
    for (let j = i + 1; j < suggestions.length; j += 1) {
      const a = suggestions[i]; const b = suggestions[j];
      if (a.role === 'lineKey' || b.role === 'lineKey') continue;
      if (a.tokenPositions.some((pos) => b.tokenPositions.includes(pos))) a.conflict = b.conflict = true;
    }
  }
  return suggestions;
}

function derivedRatingSuggestion(suggestions, ratingSequence) {
  const pipingClass = suggestions.find((item) => item.role === 'pipingClass');
  if (!pipingClass || !TRUSTED_AUTHORITIES.has(pipingClass.authorityLevel)) return null;
  return {
    role: 'rating', tokenPositions: [], confidence: pipingClass.confidence,
    authorityLevel: 'DERIVED_FROM_AUTHORIZED_CLASS', coverage: pipingClass.coverage,
    sampleCount: pipingClass.sampleCount, evidenceMetrics: pipingClass.evidenceMetrics,
    evidence: [`Derived from piping class by ${Array.isArray(ratingSequence) ? ratingSequence.length : 0} configured prefix rules`],
    conflict: false, safe: pipingClass.safe, review: pipingClass.review, derived: true,
  };
}

export function buildRegexRoleSuggestions({ rows = [], lineMasters = new Set(), classMasters = new Set(), profile, ratingSequence = [] } = {}) {
  const maxColumns = Math.max(0, ...rows.map((row) => row.values.length));
  const candidates = [];
  for (let pos = 1; pos <= maxColumns; pos += 1) {
    const values = positionValues(rows, pos);
    candidates.push(
      boreCandidate(values, pos),
      classCandidate(values, pos, classMasters, profile.normalization.classSuffixPattern),
      ratingCandidate(values, pos),
    );
  }
  candidates.push(...lineKeyCandidates(rows, lineMasters, profile.formatPolicy.maximumLineKeyTokens));
  let suggestions = markConflicts(bestByRole(candidates, profile.thresholds));
  const explicitRating = suggestions.find((item) => item.role === 'rating');
  if (!explicitRating || explicitRating.confidence < profile.thresholds.review) {
    suggestions = suggestions.filter((item) => item.role !== 'rating');
    const derived = derivedRatingSuggestion(suggestions, ratingSequence);
    if (derived) suggestions.push(derived);
  }
  return suggestions;
}
