// Ported from 3D_Converters v045/converters/xml-cii2019-core/weight-valve-hints.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.

export function text(value) { return value === null || value === undefined ? '' : String(value); }

export function numberOr(value, fallback) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }

export function pickText(row, keys) { for (const key of keys || []) { const value = row?.[key] ?? row?._raw?.[key]; if (text(value).trim()) return text(value).trim(); } return ''; }
// Memoize only primitive field parsing. The selected raw field value is checked
// on every lookup, so edits to a master row invalidate the entry automatically.

export const numericMasterFields = new WeakMap();

export let numericMasterFieldHits = 0;

export const masterNumberPattern = /-?\d+(?:\.\d+)?/;

export function pickNumber(row, keys) {
  let cachedFields = row && typeof row === 'object' ? numericMasterFields.get(row) : null;
  if (!cachedFields && row && typeof row === 'object') {
    cachedFields = new Map(); numericMasterFields.set(row, cachedFields);
  }
  for (const key of keys || []) {
    const raw = row?.[key] ?? row?._raw?.[key];
    const eligible = raw === null || raw === undefined || ['string', 'number', 'boolean'].includes(typeof raw);
    const entry = eligible ? cachedFields?.get(key) : null;
    let value;
    if (entry && Object.is(entry.raw, raw)) {
      numericMasterFieldHits += 1;
      value = entry.number;
    } else {
      const match = text(raw).replace(/,/g, '').match(masterNumberPattern);
      const parsed = match ? Number(match[0]) : NaN;
      value = Number.isFinite(parsed) ? parsed : null;
      if (eligible) cachedFields?.set(key, { raw, number: value });
    }
    if (value !== null) return value;
  }
  return null;
}

export function normalizeWeightText(value) { return text(value).toUpperCase().replace(/[_/\\]+/g, '-').replace(/[^A-Z0-9#+.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }

export function safeRegex(pattern) { try { return pattern ? new RegExp(pattern, 'i') : null; } catch { return null; } }

export function normalizedRating(value) { return text(value).replace(/#/g, '').trim().toUpperCase(); }

export function masterLength(rawLength, xmlLengthMm, config) { if (rawLength === null || rawLength === undefined) return null; if (config?.weight?.convertSmallLengthsInToMm !== true) return rawLength; return rawLength < 100 && xmlLengthMm > 100 ? rawLength * numberOr(config?.weight?.inchToMm, 25.4) : rawLength; }

export const DEFAULT_VALVE_HINT_MAPPING = Object.freeze([
  { on: true, priority: 10, code: 'VGT', label: 'Gate Valve', subtype: 'GATE', nodeNameRegex: String.raw`(?:^|[-_/\s])VGT(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\bGATE\b.*\bVALVE\b|\bVALVE\b.*\bGATE\b|\bGATE\b`, notes: 'Gate valve tag' },
  { on: true, priority: 20, code: 'VCH', label: 'Check Valve', subtype: 'CHECK', nodeNameRegex: String.raw`(?:^|[-_/\s])VCH(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\b(CHECK|SWING|NRV|NON[- ]?RETURN)\b`, notes: 'Check / swing / NRV tag' },
  { on: true, priority: 30, code: 'VBL', label: 'Ball Valve', subtype: 'BALL', nodeNameRegex: String.raw`(?:^|[-_/\s])VBL(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\bBALL\b.*\bVALVE\b|\bVALVE\b.*\bBALL\b|\bBALL\b`, notes: 'Ball valve tag' },
  { on: true, priority: 40, code: 'VCV', label: 'Control Valve', subtype: 'CONTROL', nodeNameRegex: String.raw`(?:^|[-_/\s])VCV(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\bCONTROL\b.*\bVALVE\b|\bVALVE\b.*\bCONTROL\b|\bCONTROL\b`, notes: 'Control valve tag' },
  { on: true, priority: 50, code: 'VGL', label: 'Globe Valve', subtype: 'GLOBE', nodeNameRegex: String.raw`(?:^|[-_/\s])VGL(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\bGLOBE\b.*\bVALVE\b|\bVALVE\b.*\bGLOBE\b|\bGLOBE\b`, notes: 'Globe valve tag' },
  { on: true, priority: 60, code: 'VBF', label: 'Butterfly Valve', subtype: 'BUTTERFLY', nodeNameRegex: String.raw`(?:^|[-_/\s])VBF(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\bBUTTERFLY\b.*\bVALVE\b|\bVALVE\b.*\bBUTTERFLY\b|\bBUTTERFLY\b`, notes: 'Butterfly valve tag' },
  { on: true, priority: 70, code: 'VBV', label: 'Ball Valve', subtype: 'BALL', nodeNameRegex: String.raw`(?:^|[-_/\s])VBV(?=$|[-_/\s]|\d)`, masterRegex: String.raw`\bBALL\b.*\bVALVE\b|\bVALVE\b.*\bBALL\b|\bBALL\b`, notes: 'Alternate ball valve tag' },
]);

export const DEFAULT_WEIGHT_KEYWORD_RULES = Object.freeze([
  { on: true, priority: 10, code: 'FULL_BORE', label: 'Full bore', patterns: [String.raw`\bFULL\s*BORE\b`, String.raw`\bFB\b`, String.raw`\bFULL\s*PORT\b`, String.raw`\bFULL\b`] },
  { on: true, priority: 20, code: 'REDUCED_BORE', label: 'Reduced bore', patterns: [String.raw`\bRED(?:UCED|UCING)?\s*BORE\b`, String.raw`\bRB\b`, String.raw`\bRED(?:UCED)?\s*PORT\b`] },
  { on: true, priority: 30, code: 'BALL', label: 'Ball', patterns: [String.raw`\bBALL\b`, String.raw`\bVBL\b`, String.raw`\bVBV\b`, String.raw`\bBV\b`] },
  { on: true, priority: 40, code: 'GATE', label: 'Gate', patterns: [String.raw`\bGATE\b`, String.raw`\bVGT\b`, String.raw`\bGV\b`] },
  { on: true, priority: 50, code: 'GLOBE', label: 'Globe', patterns: [String.raw`\bGLOBE\b`, String.raw`\bVGL\b`, String.raw`\bGlV\b`] },
  { on: true, priority: 60, code: 'SWING', label: 'Swing check', patterns: [String.raw`\bSWING\b`, String.raw`\bSWING\s*CHECK\b`] },
  { on: true, priority: 70, code: 'NON_SLAM', label: 'Non-slam check', patterns: [String.raw`\bNON[-\s]?SLAM\b`, String.raw`\bNOZZLE\s*CHECK\b`] },
  { on: true, priority: 80, code: 'WAFER_BUTTERFLY', label: 'Wafer butterfly', patterns: [String.raw`\bWAFER\b.*\bBUTTERFLY\b`, String.raw`\bBUTTERFLY\b.*\bWAFER\b`] },
  { on: true, priority: 90, code: 'BUTTERFLY', label: 'Butterfly', patterns: [String.raw`\bBUTTERFLY\b`, String.raw`\bVBF\b`, String.raw`\bBFV\b`] },
  { on: true, priority: 100, code: 'CHECK', label: 'Check', patterns: [String.raw`\bCHECK\b`, String.raw`\bNRV\b`, String.raw`\bNON[-\s]?RETURN\b`, String.raw`\bVCH\b`] },
  { on: true, priority: 110, code: 'CONTROL', label: 'Control', patterns: [String.raw`\bCONTROL\b`, String.raw`\bVCV\b`, String.raw`\bCV\b`, String.raw`\bFCV\b`, String.raw`\bTCV\b`] },
  { on: true, priority: 120, code: 'RELIEF', label: 'Relief', patterns: [String.raw`\bRELIEF\b`, String.raw`\bSAFETY\b`, String.raw`\bPSV\b`, String.raw`\bPRV\b`, String.raw`\bRV\b`] },
]);

export const DEFAULT_SPECIAL_VALVE_FACTOR_RULES = Object.freeze([
  { on: true, priority: 10, code: 'UZV_EMERGENCY', label: 'UZV / Emergency', patterns: [String.raw`\bUZV\b`, String.raw`\bEMERGENCY\b`, String.raw`\bESD\b`, String.raw`\bSHUT[-\s]?DOWN\b`], targets: [{ code: 'CONTROL', label: 'Control valve', factor: 2 }, { code: 'BALL', label: 'Ball valve', factor: 2 }] },
  { on: true, priority: 20, code: 'INST_PCV_FCV', label: 'INST / PCV / FCV', patterns: [String.raw`\bINST\b`, String.raw`\bPCV\b`, String.raw`\bFCV\b`, String.raw`\bCONTROL\s*VALVE\b`], targets: [{ code: 'CONTROL', label: 'Control valve', factor: 1.3 }, { code: 'BALL', label: 'Ball valve', factor: 1.5 }] },
  { on: true, priority: 30, code: 'RELIEF_RV', label: 'Relief / RV', patterns: [String.raw`\bRELIEF\b`, String.raw`\bRV\b`, String.raw`\bPSV\b`, String.raw`\bPRV\b`, String.raw`\bSAFETY\s*VALVE\b`], targets: [{ code: 'BALL', label: 'Ball valve', factor: 1 }] },
]);

export function valveHintLengthToleranceMm(config) { return Math.max(0, numberOr(config?.weight?.valveHintLengthToleranceMm, 6)); }

export function useNodeNameValveHints(config) { return config?.weight?.useNodeNameValveHints !== false; }

export function valveHintMappingRows(config) { const rows = Array.isArray(config?.weight?.valveHintMapping) && config.weight.valveHintMapping.length ? config.weight.valveHintMapping : DEFAULT_VALVE_HINT_MAPPING; return rows.map((row, index) => ({ on: row?.on !== false, priority: numberOr(row?.priority, (index + 1) * 10), code: text(row?.code).trim().toUpperCase(), label: text(row?.label).trim(), family: text(row?.family || 'VALVE').trim().toUpperCase() || 'VALVE', subtype: text(row?.subtype).trim().toUpperCase(), nodeNameRegex: text(row?.nodeNameRegex).trim(), masterRegex: text(row?.masterRegex).trim(), notes: text(row?.notes).trim() })); }

export function semanticKeywordRows(config) { const rows = Array.isArray(config?.weight?.semanticKeywordRules) && config.weight.semanticKeywordRules.length ? config.weight.semanticKeywordRules : DEFAULT_WEIGHT_KEYWORD_RULES; return rows.map((row, index) => ({ on: row?.on !== false, priority: numberOr(row?.priority, (index + 1) * 10), code: text(row?.code).trim().toUpperCase(), label: text(row?.label).trim(), patterns: Array.isArray(row?.patterns) ? row.patterns.map(text).filter(Boolean) : [] })); }

export function keywordRules(config) { return semanticKeywordRows(config).filter((row) => row.on && row.code && row.patterns.length).sort((a, b) => a.priority - b.priority); }

export function specialValveFactorRows(config) { const rows = Array.isArray(config?.weight?.specialValveFactorRules) && config.weight.specialValveFactorRules.length ? config.weight.specialValveFactorRules : DEFAULT_SPECIAL_VALVE_FACTOR_RULES; return rows.map((row, index) => ({ on: row?.on !== false, priority: numberOr(row?.priority, (index + 1) * 10), code: text(row?.code).trim().toUpperCase(), label: text(row?.label).trim(), patterns: Array.isArray(row?.patterns) ? row.patterns.map(text).filter(Boolean) : [], targets: Array.isArray(row?.targets) ? row.targets.map((target) => ({ code: text(target?.code).trim().toUpperCase(), label: text(target?.label).trim(), factor: numberOr(target?.factor, 1) })).filter((target) => target.code && Number.isFinite(target.factor) && target.factor > 0) : [] })); }

export function activeSpecialValveFactorRows(config) { return specialValveFactorRows(config).filter((row) => row.on && row.code && row.patterns.length && row.targets.length).sort((a, b) => a.priority - b.priority); }

export function ensureValveHintConfig(config) { if (!config.weight || typeof config.weight !== 'object') config.weight = {}; if (!Array.isArray(config.weight.valveHintMapping) || !config.weight.valveHintMapping.length) config.weight.valveHintMapping = valveHintMappingRows(config); if (!Array.isArray(config.weight.semanticKeywordRules) || !config.weight.semanticKeywordRules.length) config.weight.semanticKeywordRules = semanticKeywordRows(config); if (!Array.isArray(config.weight.specialValveFactorRules) || !config.weight.specialValveFactorRules.length) config.weight.specialValveFactorRules = specialValveFactorRows(config); if (!Number.isFinite(Number(config.weight.valveHintLengthToleranceMm))) config.weight.valveHintLengthToleranceMm = 6; if (config.weight.useNodeNameValveHints !== false) config.weight.useNodeNameValveHints = true; if (config.weight.showLengthRejectedSemanticMatches !== false) config.weight.showLengthRejectedSemanticMatches = true; if (config.weight.useWeightExtrapolation !== false) config.weight.useWeightExtrapolation = true; if (!Number.isFinite(Number(config.weight.extrapolationMinRatio))) config.weight.extrapolationMinRatio = 0.65; if (!Number.isFinite(Number(config.weight.extrapolationMaxRatio))) config.weight.extrapolationMaxRatio = 1.6; if (!Number.isFinite(Number(config.weight.fullBoreFallbackFactor))) config.weight.fullBoreFallbackFactor = 1.3; return config.weight; }

export function resolveNodeNameValveHint(nodeName, config) { if (!useNodeNameValveHints(config)) return null; const raw = text(nodeName); if (!raw.trim()) return null; const normalized = normalizeWeightText(raw); for (const row of valveHintMappingRows(config).filter((entry) => entry.on !== false).sort((a, b) => a.priority - b.priority)) { const regex = safeRegex(row.nodeNameRegex); if (regex && (regex.test(raw) || regex.test(normalized))) return { ...row, family: 'VALVE' }; if (row.code && (`-${normalized}-`).includes(`-${row.code}-`)) return { ...row, family: 'VALVE' }; } return null; }

export function formatValveHint(hint) { return hint ? `${hint.code} → ${hint.label || hint.subtype || 'Valve'}` : ''; }

export function keywordMatches(value, config) { const raw = text(value); const normalized = normalizeWeightText(raw); const matches = []; for (const rule of keywordRules(config)) { if ((rule.patterns || []).some((pattern) => { const regex = safeRegex(pattern); return regex && (regex.test(raw) || regex.test(normalized)); })) matches.push(rule); } return matches; }

export function semanticSourceForContext(context, nodeHint, config) { const dtxrMatches = keywordMatches(context?.dtxr || '', config); if (dtxrMatches.length) return { source: 'DTXR', matches: dtxrMatches, label: dtxrMatches.map((m) => m.label).join(' + ') }; if (nodeHint) return { source: 'Valve Hint', matches: [{ priority: numberOr(nodeHint.priority, 999), code: nodeHint.subtype || nodeHint.code, label: nodeHint.label || nodeHint.subtype, patterns: [nodeHint.masterRegex].filter(Boolean) }], label: formatValveHint(nodeHint) }; return { source: '', matches: [], label: '' }; }

export function scoreSemanticSource(source, candidate, config) { if (!source?.matches?.length) return { tier: 0, reason: '' }; const candText = `${candidate?.type || ''} ${candidate?.typeDesc || ''} ${candidate?.valveType || ''}`; const candMatches = keywordMatches(candText, config); for (const wanted of source.matches) { if (candMatches.some((hit) => hit.code === wanted.code)) { const tier = source.source === 'DTXR' ? 3000 - wanted.priority : 2000 - wanted.priority; return { tier, reason: `${source.source} keyword match: ${wanted.label || wanted.code}` }; } const regexes = (wanted.patterns || []).map(safeRegex).filter(Boolean); if (regexes.some((regex) => regex.test(candText))) { const tier = source.source === 'DTXR' ? 2800 - wanted.priority : 1800 - wanted.priority; return { tier, reason: `${source.source} keyword regex: ${wanted.label || wanted.code}` }; } }
  if (source.source === 'DTXR') return { tier: -40, reason: `DTXR keyword mismatch: ${source.label}` };
  return { tier: 0, reason: source.label ? `${source.source}: ${source.label}` : '' };
}

export function classifyWeightMasterCandidate(candidate) { const value = typeof candidate === 'string' ? candidate : `${candidate?.type || ''} ${candidate?.typeDesc || ''}`; const normalized = normalizeWeightText(value); if (/\b(SPECTACLE|SPADE|SPACER|BLIND)\b/.test(normalized)) return { family: 'BLIND', subtype: 'BLIND' }; if (/\b(CHECK|SWING|NRV|NON-RETURN|NONRETURN)\b/.test(normalized)) return { family: 'VALVE', subtype: 'CHECK' }; if (/\bGATE\b/.test(normalized)) return { family: 'VALVE', subtype: 'GATE' }; if (/\bBALL\b/.test(normalized)) return { family: 'VALVE', subtype: 'BALL' }; if (/\bGLOBE\b/.test(normalized)) return { family: 'VALVE', subtype: 'GLOBE' }; if (/\bCONTROL\b/.test(normalized)) return { family: 'VALVE', subtype: 'CONTROL' }; if (/\bBUTTERFLY\b/.test(normalized)) return { family: 'VALVE', subtype: 'BUTTERFLY' }; if (/\b(VALVE|VLV)\b/.test(normalized)) return { family: 'VALVE', subtype: 'VALVE_GENERIC' }; if (/\b(FLANGE|FLANGED|WELDNECK|WELDING-NECK|WNFL)\b/.test(normalized)) return { family: 'FLANGE', subtype: 'FLANGE' }; return { family: '', subtype: '' }; }

export function scoreValveHintAgainstCandidate(nodeHint, candidateClass, candidate) { if (!nodeHint) return { tier: 0, reason: '' }; const masterText = `${candidate?.type || ''} ${candidate?.typeDesc || ''}`; const regex = safeRegex(nodeHint.masterRegex); if (regex && regex.test(masterText)) return { tier: 120, reason: `${nodeHint.code} exact` }; if (nodeHint.family === 'VALVE' && candidateClass.family === 'VALVE' && nodeHint.subtype && nodeHint.subtype === candidateClass.subtype) return { tier: 110, reason: `${nodeHint.code} exact` }; if (nodeHint.family === 'VALVE' && candidateClass.family === 'VALVE' && candidateClass.subtype && candidateClass.subtype !== 'VALVE_GENERIC') return { tier: 70, reason: `${nodeHint.code} valve, wrong subtype` }; if (nodeHint.family === 'VALVE' && candidateClass.family === 'VALVE') return { tier: 50, reason: `${nodeHint.code} generic valve` }; if (nodeHint.family === 'VALVE' && ['FLANGE', 'BLIND'].includes(candidateClass.family)) return { tier: -80, reason: `${nodeHint.code} non-valve demoted` }; return { tier: 0, reason: `${nodeHint.code} no semantic match` }; }

export function roundWeight(value) { const numeric = Number(value); return Number.isFinite(numeric) ? Math.round(numeric * 1000) / 1000 : 0; }
/**
 * Physical-family constraint for a component with source DTXR identity.
 * Presentation/ranking only: this never approves engineering source mass.
 * An unresolved component family gets no family-foreign length extrapolation.
 */

export function resolveCandidateWeight(candidate, xmlLengthMm, config) { const masterWeight = Number(candidate.weight); const masterLength = Number(candidate.rowLength); const xmlLength = Number(xmlLengthMm); if (config?.weight?.useWeightExtrapolation === false || !Number.isFinite(masterWeight) || !Number.isFinite(masterLength) || !Number.isFinite(xmlLength) || masterLength <= 0) return { masterWeight, selectedWeight: masterWeight, suggestedWeight: masterWeight, weightMethod: 'master', extrapolationRatio: 1, weightWarning: '' }; const ratio = xmlLength / masterLength; const minRatio = numberOr(config?.weight?.extrapolationMinRatio, 0.65); const maxRatio = numberOr(config?.weight?.extrapolationMaxRatio, 1.6); if (ratio < minRatio || ratio > maxRatio) return { masterWeight, selectedWeight: masterWeight, suggestedWeight: masterWeight, weightMethod: 'master', extrapolationRatio: ratio, weightWarning: `extrapolation ratio ${ratio.toFixed(2)} outside ${minRatio}-${maxRatio}` }; if (Math.abs(ratio - 1) <= 1e-9) return { masterWeight, selectedWeight: masterWeight, suggestedWeight: masterWeight, weightMethod: 'master', extrapolationRatio: 1, weightWarning: '' }; const selectedWeight = roundWeight(masterWeight * ratio); return { masterWeight, selectedWeight, suggestedWeight: selectedWeight, weightMethod: 'length-extrapolated', extrapolationRatio: ratio, weightWarning: '' }; }

export function baseCandidateFromRow(row, config, lengthMm) { const rowBore = pickNumber(row, ['boreMm', 'convertedBore', 'Converted Bore', 'bore', 'Bore', 'BORE', 'DN', 'NB', 'NPS']); const rawLength = pickNumber(row, ['lengthMm', 'length', 'Length', 'LENGTH', 'Length mm', 'LENGTH_MM', 'Length (RF-F/F)', 'RF-F/F', 'LEN', 'faceToFace', 'Face To Face', 'F2F']); const rowLength = masterLength(rawLength, Number(lengthMm), config); const weight = pickNumber(row, ['valveWeight', 'directWeight', 'weight', 'Weight', 'WEIGHT', 'Weight kg', 'WEIGHT_KG', 'RF/RTJ KG', 'Valve Weight']); const rowRating = normalizedRating(pickText(row, ['ratingClass', 'rating', 'Rating', 'RATING', 'Class', 'CLASS', 'Pressure Class'])); const type = pickText(row, ['type', 'Type', 'TYPE', 'valveType', 'Valve Type']); const typeDesc = pickText(row, ['typeDesc', 'TypeDesc', 'Type Desc', 'Type Description', 'Description', 'Valve Type']); if (rowBore === null || rowLength === null || weight === null || !rowRating) return null; return { weight, rowBore, rowLength, rowRating, type, valveType: type, typeDesc, rowData: row }; }

export function interpolateBetween(a, b, targetLength) { const lenA = Number(a.rowLength), lenB = Number(b.rowLength), wtA = Number(a.weight), wtB = Number(b.weight); if (!Number.isFinite(lenA) || !Number.isFinite(lenB) || !Number.isFinite(wtA) || !Number.isFinite(wtB) || Math.abs(lenB - lenA) <= 1e-9) return null; return wtA + ((Number(targetLength) - lenA) * (wtB - wtA)) / (lenB - lenA); }

export function ratioFromNearest(nearest, targetLength) { const len = Number(nearest?.rowLength), wt = Number(nearest?.weight), target = Number(targetLength); if (!Number.isFinite(len) || !Number.isFinite(wt) || !Number.isFinite(target) || len <= 0) return null; return wt * target / len; }

export function sameBoreRatingRows(rows, config, { boreMm, wantedRating, lengthMm }) { const bore = Number(boreMm); return rows.map((row) => baseCandidateFromRow(row, config, lengthMm)).filter(Boolean).filter((candidate) => { const boreDelta = Math.abs(Number(candidate.rowBore) - bore); return Number.isFinite(boreDelta) && boreDelta < 1 && candidate.rowRating === wantedRating && Number(candidate.rowLength) > 0 && Number(candidate.weight) > 0; }).sort((a, b) => Number(a.rowLength) - Number(b.rowLength)); }

export function ruleMatchesText(rule, value) { const raw = text(value); const normalized = normalizeWeightText(raw); return (rule?.patterns || []).some((pattern) => { const regex = safeRegex(pattern); return regex && (regex.test(raw) || regex.test(normalized)); }); }

export function matchedSpecialFactorRule(context, config) { const source = `${context?.dtxr || ''} ${context?.nodeName || ''} ${context?.componentRefNo || ''}`; return activeSpecialValveFactorRows(config).find((rule) => ruleMatchesText(rule, source)) || null; }
