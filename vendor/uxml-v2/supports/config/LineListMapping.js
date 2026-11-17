import { FIELD_RULES, DETECTION_ORDER } from './LineListRules.js';

export function canon(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/º/g, '°')
    .replace(/³/g, '3')
    .replace(/[_\-()[\]/|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildColumnProbe(key, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const vals = [key];
  for (let i = 0; i < Math.min(5, safeRows.length); i++) {
    const v = safeRows[i]?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      vals.push(String(v).trim());
    }
  }
  // Keep pipe delimiters in the probe so table previews like
  // "3 | Line number | 8010125 | 8010126" can be split and compared
  // segment-by-segment instead of only as one flattened string.
  return vals.join(' | ');
}

export function getAllColumnKeys(rows) {
  return Array.from(
    new Set((Array.isArray(rows) ? rows : []).flatMap((row) => Object.keys(row || {})))
  );
}

export function hasAlias(probe, alias) {
  const p = canon(probe);
  const a = canon(alias);

  if (!a) return false;

  // Short aliases like "pr", "den", "liq", "ins" should be word-boundary matched.
  if (/^[a-z0-9]+$/.test(a) && a.length <= 4) {
    return new RegExp(`\\b${a}\\b`, 'i').test(p);
  }

  return p.includes(a);
}

export function hasAny(probe, aliases) {
  return aliases.some((alias) => hasAlias(probe, alias));
}

export function groupsMatch(probe, groups) {
  return groups.every((group) => hasAny(probe, group));
}

export function rejectMatch(probe, rejects) {
  return rejects.some((rx) => rx.test(probe));
}

function directProcessHeaderMatch(field, probe) {
  const text = canon(probe);
  if (field === 'p1') return /\bp\s*1\b/.test(text) && /(pressure|pres|design|pr\b)/i.test(text);
  if (field === 't1') return /\bt\s*1\b|\btemperature\s*1\b/i.test(text);
  if (field === 't2') return /\bt\s*2\b|\btemperature\s*2\b/i.test(text);
  if (field === 't3') return /\bt\s*3\b|\btemperature\s*3\b/i.test(text);
  return false;
}

export function splitPipeSegments(value) {
  return String(value ?? '')
    .split(/\s*\|\s*/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function pipeSegmentMatchesField(field, value) {
  const rule = FIELD_RULES[field];
  if (!rule) return false;
  return splitPipeSegments(value).some((segment) => {
    if (!groupsMatch(segment, rule.all || [])) return false;
    if (rejectMatch(segment, rule.reject || [])) return false;
    return true;
  });
}

export function isValidFieldMatch(field, probe, key) {
  const rule = FIELD_RULES[field];
  if (!rule) return false;

  if (rejectMatch(probe, rule.reject || [])) return false;
  if (directProcessHeaderMatch(field, probe)) return true;
  if (!groupsMatch(probe, rule.all || [])) return false;

  // If the rule requires a header match, the column key itself must satisfy
  // the AND-groups. For lineKey2, also allow pipe-delimited preview/probe
  // segments such as "3 | Line number | 8010125 | 8010126" to match the
  // semantic header segment without accepting numeric-only sample values.
  if (rule.requireHeaderMatch && key !== undefined) {
    const header = canon(key);
    const headerMatches = groupsMatch(header, rule.all || []) && !rejectMatch(header, rule.reject || []);
    const pipeHeaderMatches = field === 'lineKey2' && pipeSegmentMatchesField(field, probe);
    if (!headerMatches && !pipeHeaderMatches) {
      return false;
    }
  }

  return true;
}

export function scoreField(field, key, rows) {
  const rule = FIELD_RULES[field];
  if (!rule) return -999;

  const probe = buildColumnProbe(key, rows);
  const header = canon(key);

  if (!isValidFieldMatch(field, probe, key)) return -999;

  let score = 200;

  // Stronger score if the header itself satisfies the AND-groups.
  if (groupsMatch(header, rule.all || []) && !rejectMatch(header, rule.reject || [])) {
    score += 90;
  }
  if (directProcessHeaderMatch(field, key) || directProcessHeaderMatch(field, probe)) score += 120;

  // Small boost for each group hit in header.
  for (const group of rule.all || []) {
    if (hasAny(header, group)) score += 15;
  }

  // Pipe-delimited header/probe segment boost, e.g. "3 | Line number | 8010125".
  if (field === 'lineKey2' && pipeSegmentMatchesField(field, probe)) score += 80;

  // Optional group boost, e.g. normal/operating for T2.
  for (const group of rule.optional || []) {
    if (hasAny(probe, group)) score += 35;
  }

  // Field-specific boosts.
  if (field === 'pipingClass' && /\bpiping\s*class\b/i.test(probe)) score += 180;
  if (field === 'pipingClass' && /\bpipe\s*class\b/i.test(probe)) score += 160;
  if (field === 'pipingClass' && /\bpiping\s*spec\b|\bpipe\s*spec\b/i.test(probe)) score += 130;

  if (field === 'p1' && /design\s*pressure|pressure\s*design/i.test(probe)) score += 140;
  if (field === 'p1' && /max/i.test(probe) && /pressure/i.test(probe)) score += 100;

  if (field === 'hydroPressure' && /(test\s*pressure|hydro\s*pressure|hydrostatic\s*pressure)/i.test(probe)) {
    score += 160;
  }

  return score;
}

export function shouldKeepExisting(field, key, rows) {
  if (!key) return false;

  const probe = buildColumnProbe(key, rows);

  if (!isValidFieldMatch(field, probe, key)) return false;

  return scoreField(field, key, rows) >= 200;
}

export function detectLineListFieldMap(rows, existingMap = {}, config = null) {
  const keys = getAllColumnKeys(rows);
  const result = { ...existingMap };
  const claimed = new Set();
  const customAliases = config?.customMappingAliases || {};

  // First, map any fields that have custom aliases defined in the config.
  // We do this first so they are claimed and won't be overridden.
  for (const field of DETECTION_ORDER) {
    const customAlias = customAliases[field];
    if (!customAlias) continue;

    // Find a column key that matches the custom alias.
    // If it's a standard header (non-__EMPTY), check exact header match.
    // Otherwise, check if the first row's cell value equals the custom alias.
    for (const key of keys) {
      if (claimed.has(key)) continue;

      const headerText = String(key).trim();
      const firstRowVal = rows[0]?.[key] !== undefined && rows[0]?.[key] !== null ? String(rows[0][key]).trim() : '';

      if (headerText === customAlias || firstRowVal === customAlias) {
        result[field] = key;
        claimed.add(key);
        break;
      }
    }
  }

  // Validate existing mappings.
  for (const [field, key] of Object.entries(result)) {
    if (claimed.has(key)) continue;
    if (FIELD_RULES[field] && shouldKeepExisting(field, key, rows)) {
      claimed.add(key);
    } else if (FIELD_RULES[field]) {
      delete result[field];
    }
  }

  // Detect unmapped fields.
  for (const field of DETECTION_ORDER) {
    if (result[field]) continue; // already mapped (e.g. by custom alias or kept existing)

    let bestKey = '';
    let bestScore = 0;

    for (const key of keys) {
      if (claimed.has(key) && result[field] !== key) continue;

      const score = scoreField(field, key, rows);

      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    if (bestKey && bestScore >= 200) {
      result[field] = bestKey;
      claimed.add(bestKey);
    }
  }

  // Density fallback.
  if (!result.density && result.densityMixed) {
    result.density = result.densityMixed;
  }

  // P1 must never equal Hydro.
  if (result.p1 && result.hydroPressure && result.p1 === result.hydroPressure) {
    delete result.p1;
  }

  return result;
}
