import { toText, toFiniteNumber, normalizePoint, normalizeSupportTag, supportTagBase, ownerBranchVariants, ownerBranchSimilarity, getXmlNodeProperty } from './ResolverPrimitives.js';
import { stagedTypeOf, stagedComponentDtxr, stagedComponentDtxrPs, stagedAttr, cleanDtxr, canonKey } from './StagedDtxrIndex.js';
import { xmlCiiPositionsMatch } from './PositionOffset.js';

export function chooseBestDtxrCandidate(candidates, xmlNode, config = {}) {
  const list = (Array.isArray(candidates) ? candidates : []).filter(Boolean);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const xmlType = getXmlNodeProperty(xmlNode, 'ComponentType').toUpperCase();
  for (const cand of list) if (stagedTypeOf(cand) && stagedTypeOf(cand) === xmlType) return cand;
  const allowed = config?._allowedStagedTypes || [];
  if (allowed.length) {
    const typed = list.find((cand) => allowed.includes(stagedTypeOf(cand)));
    if (typed) return typed;
  }
  return list[0];
}

export function candidateArrayFromMap(map, key) {
  if (!map || !key) return [];
  const direct = map.get(canonKey(key));
  return Array.isArray(direct) ? direct : (direct ? [direct] : []);
}

export function sameDtxrPositionEvidence(xmlNode, indexed, config = {}) {
  const xmlDtxrPos = cleanDtxr(getXmlNodeProperty(xmlNode, 'DTXR_POS') || getXmlNodeProperty(xmlNode, 'DtxrPos'));
  const stagedDtxrPos = cleanDtxr(indexed?.dtxr || stagedComponentDtxr(indexed?.raw || indexed) || '');
  if (xmlDtxrPos && stagedDtxrPos && xmlDtxrPos === stagedDtxrPos) return true;

  const xmlPoint = normalizePoint(getXmlNodeProperty(xmlNode, 'Position'));
  const stagedPoint = indexed?.coord || null;
  if (!xmlPoint || !stagedPoint) return false;
  const tolerances = [
    toFiniteNumber(config?.dtxrPositionOffset?.tolerance, null),
    toFiniteNumber(config?.dtxrCoordinateToleranceMm, null),
    toFiniteNumber(config?.coordinateTolerance, 1),
  ].filter(Number.isFinite);
  const tolerance = Math.max(...tolerances, 0);
  return xmlCiiPositionsMatch(xmlPoint, stagedPoint, tolerance || 1);
}

export function relaxedPsTagCandidates(stagedIndex, xmlNode, tag, config = {}) {
  const baseTag = supportTagBase(tag);
  if (!baseTag || baseTag === normalizeSupportTag(tag)) return [];
  return candidateArrayFromMap(stagedIndex?.byPsBaseTag, baseTag)
    .filter((candidate) => sameDtxrPositionEvidence(xmlNode, candidate, config));
}

export function selectEffectiveDtxrEvidence(dtxrPosValue, dtxrPsValue) {
  const dtxrPos = cleanDtxr(dtxrPosValue);
  const dtxrPs = cleanDtxr(dtxrPsValue);
  if (dtxrPos) {
    return { dtxrPos, dtxrPs, effectiveDtxr: dtxrPos, effectiveSource: 'DTXR_POS', fallbackUsed: false };
  }
  if (dtxrPs) {
    return { dtxrPos, dtxrPs, effectiveDtxr: dtxrPs, effectiveSource: 'DTXR_PS_FALLBACK', fallbackUsed: true };
  }
  return { dtxrPos: '', dtxrPs: '', effectiveDtxr: '', effectiveSource: 'NONE', fallbackUsed: false };
}

export function emptyDtxrResult(reason = 'not-found') {
  return { canonicalText: '', value: '', dtxrPos: '', dtxrPs: '', effectiveDtxr: '', effectiveSource: 'NONE', fallbackUsed: false, teeDesc: '', cmpSupGap: '', supportTags: [], source: reason, matchedBy: '', matchedKey: '', stagedType: '', componentRefNo: '', confidence: 0, suppressed: false, suppressionReason: '', candidates: [] };
}

export function resultFromStagedItem(indexed, { source, matchedBy, matchedKey, purpose, confidence = 1 } = {}) {
  const evidence = selectEffectiveDtxrEvidence(
    indexed?.dtxr || stagedComponentDtxr(indexed?.raw || indexed) || '',
    indexed?.dtxrPs || stagedComponentDtxrPs(indexed?.raw || indexed) || '',
  );
  const cmpSupGap = toText(indexed?.cmpSupGap || stagedAttr(indexed?.raw || indexed, ['CMPSUPGAP']) || '').trim();
  const stagedType = stagedTypeOf(indexed);
  const canonicalText = evidence.effectiveDtxr;
  return { ...emptyDtxrResult(source || 'staged'), ...evidence, canonicalText, value: canonicalText, teeDesc: purpose === 'tee-description' ? evidence.dtxrPos : '', cmpSupGap, supportTags: [], source: source || 'staged', matchedBy: matchedBy || '', matchedKey: String(matchedKey || ''), stagedType, componentRefNo: toText(indexed?.attrs?.ComponentRefNo || indexed?.attrs?.COMPONENTREFNO || '').trim(), confidence, _sourcePath: indexed?._path || '' };
}

export function resultFromExistingXml(xmlNode, { source, matchedBy, confidence = 0.75 } = {}) {
  const nodeNumber = getXmlNodeProperty(xmlNode, 'NodeNumber');
  const evidence = selectEffectiveDtxrEvidence(
    getXmlNodeProperty(xmlNode, 'DTXR_POS') || getXmlNodeProperty(xmlNode, 'DtxrPos'),
    getXmlNodeProperty(xmlNode, 'DTXR_PS') || getXmlNodeProperty(xmlNode, 'DtxrPs'),
  );
  if (!evidence.effectiveDtxr) return null;
  const sourceName = evidence.effectiveSource === 'DTXR_POS' ? 'xml-dtxr-pos' : 'xml-dtxr-ps-fallback';
  return { ...emptyDtxrResult(source || 'xml-existing'), ...evidence, canonicalText: evidence.effectiveDtxr, value: evidence.effectiveDtxr, source: source || sourceName, matchedBy: matchedBy || sourceName, matchedKey: `NodeNumber:${nodeNumber}`, confidence };
}

export const DTXR_PURPOSE_RULES = Object.freeze({
  'weight-review': { allowExistingXmlDtxr: true, allowComponentRef: true, allowPsTag: false, allowNodeNumber: false, allowNodeNameAsDtxr: false, allowCoordinate: true, allowNearestCoordinate: false, allowOwnerFallback: false, allowedStagedTypes: ['RIGID', 'FLAN', 'FLANGE', 'VALV', 'VALVE', 'VLV'], suppressTextPatterns: [/\bTEE\b/i, /\bELBOW\b|\bBEND\b/i, /\bPIPE\s*REST\b|\bSUPPORT\b|\bGUIDE\b|\bSTOP\b|\bWEAR\s*PLATE\b/i, /\bRESTRAINT\b|\bSHOE\b|\bANCHOR\b|\bLINE\s*STOP\b/i] },
  'tee-description': { allowExistingXmlDtxr: true, allowComponentRef: true, allowPsTag: false, allowNodeNumber: true, allowNodeNameAsDtxr: true, allowCoordinate: true, allowNearestCoordinate: true, allowOwnerFallback: true, allowedStagedTypes: ['TEE'], suppressTextPatterns: [/\bPIPE\s*REST\b|\bSUPPORT\b|\bGUIDE\b|\bSTOP\b|\bWEAR\s*PLATE\b/i] },
  'support-restraint': { allowExistingXmlDtxr: true, allowComponentRef: true, allowPsTag: true, allowNodeNumber: true, allowNodeNameAsDtxr: true, allowCoordinate: true, allowNearestCoordinate: true, allowOwnerFallback: true, allowedStagedTypes: ['SUPPORT', 'ATTA', 'REST', 'RESTRAINT'], suppressTextPatterns: [] },
  'component-description': { allowExistingXmlDtxr: true, allowComponentRef: true, allowPsTag: false, allowNodeNumber: true, allowNodeNameAsDtxr: true, allowCoordinate: true, allowNearestCoordinate: false, allowOwnerFallback: false, allowedStagedTypes: [], suppressTextPatterns: [] },
});

export function dtxrPurposeForComponentType(componentType, fallback = 'component-description') {
  const type = toText(componentType).trim().toUpperCase();
  if (type === 'TEE') return 'tee-description';
  if (['ATTA', 'REST', 'RESTRAINT', 'SUPPORT'].includes(type)) return 'support-restraint';
  if (type === 'RIGID' || /^FLAN/.test(type) || ['VALV', 'VALVE', 'VLV'].includes(type)) return 'component-description';
  return fallback;
}

export function suppressIfUnsafe(result, { xmlNode, purpose, rules }) {
  if (!result || (!result.canonicalText && !result.dtxrPs && !result.dtxrPos && !result.cmpSupGap)) return result;
  const xmlType = getXmlNodeProperty(xmlNode, 'ComponentType').toUpperCase();
  const stagedType = toText(result.stagedType).toUpperCase();
  const text = toText(result.canonicalText || result.dtxrPos || result.dtxrPs).toUpperCase();
  const allowed = Array.isArray(rules?.allowedStagedTypes) ? rules.allowedStagedTypes : [];
  const badStagedType = !!stagedType && allowed.length > 0 && !allowed.includes(stagedType) && result.matchedBy !== 'component-refno';
  const unsafeStagedForWeight = purpose === 'weight-review' && ['RIGID', 'FLAN', 'VALV', 'VALVE', 'VLV'].some((prefix) => xmlType === prefix || xmlType.startsWith(prefix)) && ['TEE', 'ELBO', 'ELBOW', 'BEND', 'SUPPORT', 'ATTA', 'PIPE', 'GASK'].includes(stagedType) && result.matchedBy !== 'component-refno';
  const unsafeText = Array.isArray(rules?.suppressTextPatterns) && rules.suppressTextPatterns.some((re) => re.test(text));
  if (badStagedType || unsafeStagedForWeight || unsafeText) return { ...result, canonicalText: '', value: '', effectiveDtxr: '', effectiveSource: 'NONE', fallbackUsed: false, suppressed: true, suppressionReason: badStagedType ? `unsafe staged type ${stagedType} for ${purpose}` : (unsafeStagedForWeight ? `unsafe staged type ${stagedType} for ${purpose}` : `text suppressed for ${purpose}`) };
  return result;
}

export function dtxrPsByOwnerBranch(branchName, stagedIndex, config = {}) {
  if (!branchName || !stagedIndex?.byOwnerBranch) return null;
  for (const key of ownerBranchVariants(branchName)) {
    const exact = stagedIndex.byOwnerBranch.get(key);
    if (exact?.length) return resultFromStagedItem(exact[0], { purpose: 'support-restraint', source: 'staged-owner-dtxr-ps', matchedBy: 'owner-branch', matchedKey: `OWNER:${exact[0].owner}`, confidence: 1 });
  }
  const threshold = toFiniteNumber(config.dtxrOwnerFuzzyThreshold, 0.86);
  let best = null;
  for (const item of stagedIndex.ownerItems || []) {
    const score = ownerBranchSimilarity(branchName, item.owner);
    if (score >= threshold && (!best || score > best.score)) best = { item, score };
  }
  return best ? resultFromStagedItem(best.item, { purpose: 'support-restraint', source: 'staged-owner-dtxr-ps-fuzzy', matchedBy: 'owner-branch-fuzzy', matchedKey: `OWNER:${best.item.owner} · ${Math.round(best.score * 100)}%`, confidence: best.score }) : null;
}

export function findNearestCoordinateMatch(target, items, tolerance) {
  let nearestItem = null;
  let nearestDist = Infinity;
  for (const item of items || []) {
    let itemCoord = item.coord;
    if (!itemCoord) {
      const attrs = item.attrs || {};
      for (const key of ['SUPPORTCOORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS']) {
        itemCoord = normalizePoint(attrs[key]);
        if (itemCoord) break;
      }
    }
    if (!itemCoord) continue;
    const dx = itemCoord.x - target.x;
    const dy = itemCoord.y - target.y;
    const dz = itemCoord.z - target.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist <= tolerance && dist < nearestDist) { nearestDist = dist; nearestItem = item; }
  }
  return nearestItem ? { item: nearestItem, distanceMm: nearestDist } : null;
}

