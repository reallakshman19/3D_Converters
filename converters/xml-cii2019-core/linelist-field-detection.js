const semanticSegment = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const FIELD_RULES = Object.freeze({
  lineSeqNo: { semanticSegments: ['seq', 'sequence', 'line seq', 'line sequence', 'line seq no', 'line sequence no'] },
  lineKey1: {
    all: [['service', 'fluid']],
    reject: [/piping\s*class/i, /pipe\s*class/i, /line\s*(number|no\.?)/i, /rating/i, /pressure/i, /temp/i, /density/i],
  },
  lineKey2: {
    all: [['line number', 'line no', 'line no.', 'lineno', 'line', 'seq', 'sequence']],
    reject: [/(piping|construction|pipe)\s*class/i, /\bspec\b/i, /rating/i, /material/i, /pressure/i, /temp/i, /density/i, /fluid/i, /critical/i, /stress/i, /\bempty\b/i],
    requireHeaderMatch: true,
  },
  pipingClass: {
    all: [['piping', 'pipe'], ['class', 'spec']],
    reject: [/construction\s*class/i, /\bconstruction\b/i, /line\s*(number|no\.?)/i, /\bservice\b/i, /\bfluid\b/i, /rating/i, /material/i, /pressure/i, /temp/i, /density/i, /insulation/i],
  },
  rating: { all: [['rating']], reject: [/piping\s*class/i, /pipe\s*class/i, /material/i, /pressure/i, /temp/i, /density/i, /line/i] },
  material: {
    all: [['material', 'mat', 'moc']],
    reject: [/material\s*code/i, /mat\.?\s*code/i, /\bcode\b/i, /piping\s*class/i, /pipe\s*class/i, /construction\s*class/i, /insulation\s*material/i, /insulation/i, /rating/i, /pressure/i, /temp/i, /density/i],
  },
  convertedBore: { all: [['bore', 'size', 'dn', 'nb', 'nps', 'nominal pipe', 'nominal bore']], reject: [/class/i, /spec/i, /rating/i, /pressure/i, /temp/i, /density/i, /line/i] },
  p1: { all: [['p1', 'pressure', 'pr'], ['p1', 'max', 'design']], reject: [/test\s*pressure/i, /hydro/i, /hydrostatic/i, /proof/i, /temp/i, /temperature/i, /density/i, /fluid/i, /line\s*(number|no\.?)/i, /piping\s*class/i] },
  t1: { all: [['t1', 'temp', 'temperature'], ['t1', 'max', 'design']], reject: [/min/i, /pressure/i, /test/i, /hydro/i, /density/i] },
  t2: { all: [['t2', 'temp', 'temperature']], optional: [['normal', 'operating']], reject: [/max/i, /min/i, /pressure/i, /test/i, /hydro/i, /density/i] },
  t3: { all: [['t3', 'temp', 'temperature'], ['t3', 'min']], reject: [/max/i, /pressure/i, /test/i, /hydro/i, /density/i] },
  hydroPressure: { all: [['pressure', 'pr'], ['hydo', 'hydro', 'test']], reject: [/temp/i, /temperature/i, /density/i, /line\s*(number|no\.?)/i, /piping\s*class/i] },
  insThk: { all: [['insulation', 'ins'], ['thickness', 'thk']], reject: [/insulation\s*type/i] },
  density: { all: [['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']], reject: [/mixed/i, /gas/i, /liquid/i, /\bliq\b/i, /phase/i, /pressure/i, /temp/i] },
  densityMixed: { all: [['mixed'], ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']], reject: [/gas/i, /liquid/i, /\bliq\b/i] },
  densityGas: { all: [['gas'], ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']], reject: [/mixed/i, /liquid/i, /\bliq\b/i] },
  densityLiquid: { all: [['liquid', 'liq'], ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']], reject: [/mixed/i, /gas/i] },
  phase: { all: [['fluid', 'phase', 'medium']], reject: [] },
  from: { semanticSegments: ['from'] },
  to: { semanticSegments: ['to'] },
});

export const DETECTION_ORDER = Object.freeze([
  'lineSeqNo', 'lineKey1', 'lineKey2', 'pipingClass', 'rating', 'material', 'convertedBore',
  'p1', 't1', 't2', 't3', 'hydroPressure', 'insThk',
  'densityMixed', 'densityGas', 'densityLiquid', 'density', 'phase', 'from', 'to',
]);

export function canon(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/º/g, '°').replace(/³/g, '3')
    .replace(/[_\-()[\]/|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function splitPipeSegments(value) {
  return String(value ?? '').split(/\s*\|\s*/g).map((segment) => segment.trim()).filter(Boolean);
}

function semanticSegmentsMatch(rule, probe) {
  if (!rule?.semanticSegments?.length) return false;
  const allowed = new Set(rule.semanticSegments.map(semanticSegment));
  return splitPipeSegments(probe).some((segment) => allowed.has(semanticSegment(segment)));
}

export function buildColumnProbe(key, rows) {
  const vals = [key];
  const safeRows = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < Math.min(12, safeRows.length); i += 1) {
    const value = safeRows[i]?.[key];
    if (value !== undefined && value !== null && String(value).trim()) vals.push(String(value).trim());
  }
  return vals.join(' | ');
}

export function getAllColumnKeys(rows) {
  return Array.from(new Set((Array.isArray(rows) ? rows : []).flatMap((row) => Object.keys(row || {}))));
}

export function hasAlias(probe, alias) {
  const source = canon(probe);
  const token = canon(alias);
  if (!token) return false;
  if (/^[a-z0-9]+$/.test(token) && token.length <= 4) return new RegExp(`\\b${token}\\b`, 'i').test(source);
  return source.includes(token);
}

export const hasAny = (probe, aliases) => aliases.some((alias) => hasAlias(probe, alias));
export const groupsMatch = (probe, groups) => groups.every((group) => hasAny(probe, group));
export const rejectMatch = (probe, rejects) => rejects.some((rx) => rx.test(probe));

function directProcessHeaderMatch(field, probe) {
  const value = canon(probe);
  if (field === 'p1') return /\bp\s*1\b/.test(value) && /(pressure|pres|design|pr\b)/i.test(value);
  if (field === 't1') return /\bt\s*1\b|\btemperature\s*1\b/i.test(value);
  if (field === 't2') return /\bt\s*2\b|\btemperature\s*2\b/i.test(value);
  if (field === 't3') return /\bt\s*3\b|\btemperature\s*3\b/i.test(value);
  return false;
}

export function pipeSegmentMatchesField(field, value) {
  const rule = FIELD_RULES[field];
  if (!rule) return false;
  if (rule.semanticSegments) return semanticSegmentsMatch(rule, value);
  return splitPipeSegments(value).some((segment) => groupsMatch(segment, rule.all || []) && !rejectMatch(segment, rule.reject || []));
}

export function isValidFieldMatch(field, probe, key) {
  const rule = FIELD_RULES[field];
  if (!rule) return false;
  if (rule.semanticSegments) return semanticSegmentsMatch(rule, probe);
  if (rejectMatch(probe, rule.reject || [])) return false;
  if (directProcessHeaderMatch(field, probe)) return true;
  if (!groupsMatch(probe, rule.all || [])) return false;
  if (!rule.requireHeaderMatch || key === undefined) return true;
  const header = canon(key);
  const headerMatch = groupsMatch(header, rule.all || []) && !rejectMatch(header, rule.reject || []);
  return headerMatch || (field === 'lineKey2' && pipeSegmentMatchesField(field, probe));
}

export function scoreField(field, key, rows) {
  const rule = FIELD_RULES[field];
  if (!rule) return -999;
  const probe = buildColumnProbe(key, rows);
  if (!isValidFieldMatch(field, probe, key)) return -999;
  if (rule.semanticSegments) return 500 + (semanticSegmentsMatch(rule, key) ? 100 : 0);
  const header = canon(key);
  let score = 200;
  if (groupsMatch(header, rule.all || []) && !rejectMatch(header, rule.reject || [])) score += 90;
  if (directProcessHeaderMatch(field, key) || directProcessHeaderMatch(field, probe)) score += 120;
  for (const group of rule.all || []) if (hasAny(header, group)) score += 15;
  if (field === 'lineKey2' && pipeSegmentMatchesField(field, probe)) score += 80;
  for (const group of rule.optional || []) if (hasAny(probe, group)) score += 35;
  if (field === 'pipingClass' && /\bpiping\s*class\b/i.test(probe)) score += 180;
  if (field === 'pipingClass' && /\bpipe\s*class\b/i.test(probe)) score += 160;
  if (field === 'pipingClass' && /\bpiping\s*spec\b|\bpipe\s*spec\b/i.test(probe)) score += 130;
  if (field === 'p1' && /design\s*pressure|pressure\s*design/i.test(probe)) score += 140;
  if (field === 'p1' && /max/i.test(probe) && /pressure/i.test(probe)) score += 100;
  if (field === 'hydroPressure' && /(test\s*pressure|hydro\s*pressure|hydrostatic\s*pressure)/i.test(probe)) score += 160;
  return score;
}

export function shouldKeepExisting(field, key, rows) {
  return Boolean(key) && scoreField(field, key, rows) >= 200;
}

function customAliasMatch(rows, key, alias) {
  if (String(key).trim() === String(alias).trim()) return true;
  return (Array.isArray(rows) ? rows.slice(0, 12) : []).some((row) => String(row?.[key] ?? '').trim() === String(alias).trim());
}

export function detectLineListFieldMap(rows, existingMap = {}, config = null) {
  const keys = getAllColumnKeys(rows);
  const result = { ...existingMap };
  const claimed = new Set();
  const customAliases = config?.customMappingAliases || {};

  for (const field of DETECTION_ORDER) {
    const customAlias = customAliases[field];
    if (!customAlias) continue;
    const key = keys.find((candidate) => !claimed.has(candidate) && customAliasMatch(rows, candidate, customAlias));
    if (key) { result[field] = key; claimed.add(key); }
  }

  for (const [field, key] of Object.entries(result)) {
    if (claimed.has(key)) continue;
    if (!FIELD_RULES[field]) continue;
    if (shouldKeepExisting(field, key, rows)) claimed.add(key);
    else delete result[field];
  }

  for (const field of DETECTION_ORDER) {
    if (result[field]) continue;
    let bestKey = '';
    let bestScore = 0;
    for (const key of keys) {
      if (claimed.has(key)) continue;
      const score = scoreField(field, key, rows);
      if (score > bestScore) { bestScore = score; bestKey = key; }
    }
    if (bestKey && bestScore >= 200) { result[field] = bestKey; claimed.add(bestKey); }
  }

  if (result.p1 && result.hydroPressure && result.p1 === result.hydroPressure) delete result.p1;
  return result;
}
