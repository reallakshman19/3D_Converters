import { childText, setChildText } from '../PlainDom.js';
import { toText, getXmlNodeProperty, xmlNodeSupportTags } from './ResolverPrimitives.js';
import { chooseBestDtxrCandidate, candidateArrayFromMap } from './ResolverCandidates.js';
import { stagedComponentDtxr, stagedComponentDtxrPs, stagedAttr } from './StagedDtxrIndex.js';
import { resolveDtxrForXmlNode } from './ResolveDtxr.js';

export function applyDtxrAnnotations(document, node, resolved, purpose = 'component-description') {
  if (!document || !node || !resolved || resolved.suppressed) return 0;
  let count = 0;
  if (purpose === 'tee-description') {
    const text = resolved.teeDesc || resolved.dtxrPos || resolved.canonicalText;
    if (text) { setChildText(node, 'TEEDESC_POS', text); setChildText(node, 'DTXR_SOURCE', resolved.source); count += 1; }
    return count;
  }
  if (purpose === 'support-restraint') {
    let wroteEvidence = false;
    if (resolved.dtxrPos) { setChildText(node, 'DTXR_POS', resolved.dtxrPos); wroteEvidence = true; }
    if (resolved.dtxrPs) { setChildText(node, 'DTXR_PS', resolved.dtxrPs); wroteEvidence = true; }
    if (!wroteEvidence && resolved.canonicalText) {
      const field = resolved.effectiveSource === 'DTXR_PS_FALLBACK' ? 'DTXR_PS' : 'DTXR_POS';
      setChildText(node, field, resolved.canonicalText);
      wroteEvidence = true;
    }
    if (wroteEvidence) { setChildText(node, 'DTXR_SOURCE', resolved.source); count += 1; }
    if (resolved.cmpSupGap) { setChildText(node, 'CMPSUPGAP_PS', resolved.cmpSupGap); if (!childText(node, 'CMPSUPGAP')) setChildText(node, 'CMPSUPGAP', resolved.cmpSupGap); count += 1; }
    return count;
  }
  const text = resolved.dtxrPos || resolved.canonicalText;
  if (text) { setChildText(node, 'DTXR_POS', text); setChildText(node, 'DTXR_SOURCE', resolved.source); count += 1; }
  return count;
}

export function resolveXmlCiiNodeDtxr(xmlNode, stagedIndex, config = {}, root) {
  const result = resolveDtxrForXmlNode({ xmlNode, context: stagedIndex, purpose: 'component-description', config, trustExistingXmlDtxr: config.trustExistingXmlDtxr !== false, root });
  return { value: result.canonicalText || result.value || '', dtxrPos: result.dtxrPos || '', dtxrPs: result.dtxrPs || '', effectiveDtxr: result.effectiveDtxr || '', effectiveSource: result.effectiveSource || 'NONE', fallbackUsed: result.fallbackUsed === true, source: result.source, confidence: result.confidence, matchedKey: result.matchedKey, matchedBy: result.matchedBy, stagedType: result.stagedType, suppressed: result.suppressed, suppressionReason: result.suppressionReason, sourcePath: result._sourcePath || '' };
}

function componentDescPrefix(node) {
  const type = getXmlNodeProperty(node, 'ComponentType').toUpperCase();
  return type === 'TEE' ? 'TEEDESC' : '';
}

export function annotateComponentDtxr(node, sourceSuffix, value) {
  const prefix = componentDescPrefix(node);
  const text = toText(value).trim();
  if (!prefix || !text) return;
  setChildText(node, `${prefix}_${sourceSuffix}`, text);
}

export function annotateCmpSupGap(node, suffix, value) {
  const text = toText(value).trim();
  if (!text) return;
  setChildText(node, `CMPSUPGAP_${suffix}`, text);
  if (!childText(node, 'CMPSUPGAP')) setChildText(node, 'CMPSUPGAP', text);
}

function annotateFromRefAndTags(node, index) {
  const componentRefNo = getXmlNodeProperty(node, 'ComponentRefNo');
  const ref = chooseBestDtxrCandidate(candidateArrayFromMap(index?.byComponentRefNo, componentRefNo), node, {}) || null;
  if (ref?.dtxr) annotateComponentDtxr(node, 'REFBASIS', ref.dtxr);
  const tagCandidates = [];
  for (const tag of xmlNodeSupportTags(node)) tagCandidates.push(...candidateArrayFromMap(index?.byPsTag, tag));
  const ps = chooseBestDtxrCandidate(tagCandidates, node, {}) || null;
  if (ps?.cmpSupGap) annotateCmpSupGap(node, 'PS', ps.cmpSupGap);
  return { ref, ps };
}

export function xmlCiiDtxrPsForNode(node, stagedComponentIndex) {
  if (!stagedComponentIndex || stagedComponentIndex.count <= 0) return { text: '', tags: [], values: [] };
  const tags = xmlNodeSupportTags(node);
  const values = [];
  const gapValues = [];
  for (const tag of tags) {
    const matches = stagedComponentIndex.byTag.get(tag) || [];
    for (const match of matches) {
      const dtxr = stagedComponentDtxrPs(match) || stagedComponentDtxr(match);
      const gap = stagedAttr(match, ['CMPSUPGAP']);
      if (dtxr && !values.includes(dtxr)) values.push(dtxr);
      if (gap && !gapValues.includes(gap)) gapValues.push(gap);
    }
  }
  if (gapValues.length) annotateCmpSupGap(node, 'PS', gapValues[0]);
  return { text: values.join('|'), tags, values, cmpSupGap: gapValues[0] || '' };
}

export function annotateXmlCiiNodeFromStagedDtxr(node, stagedIndex) {
  if (!node || !stagedIndex) return;
  annotateFromRefAndTags(node, stagedIndex);
}
