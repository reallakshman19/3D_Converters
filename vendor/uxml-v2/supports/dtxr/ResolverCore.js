export { getXmlNodeProperty, normalizeSupportTag, xmlNodeSupportTags, canonicalRoot, euclideanDistance } from './ResolverPrimitives.js';
export { buildStagedDtxrIndex, buildDtxrContext } from './StagedDtxrIndex.js';
export { selectEffectiveDtxrEvidence, DTXR_PURPOSE_RULES, dtxrPurposeForComponentType } from './ResolverCandidates.js';
export { resolveDtxrForXmlNode } from './ResolveDtxr.js';
export { applyDtxrAnnotations, resolveXmlCiiNodeDtxr, xmlCiiDtxrPsForNode, annotateXmlCiiNodeFromStagedDtxr } from './ResolverAnnotations.js';
export { xmlCiiDtxrPositionOffset, xmlCiiApplyDtxrPositionOffset, xmlCiiPositionsMatch } from './PositionOffset.js';
export { buildStagedDtxrPositionIndex, xmlCiiCalibrateDtxrPositionIndex, xmlCiiDtxrPosForNode } from './DtxrPositionIndex.js';
