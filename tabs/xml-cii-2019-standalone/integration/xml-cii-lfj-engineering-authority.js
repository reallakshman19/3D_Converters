/**
 * LFJ.EngineeringSourceBasis.v1 — separate engineering authority boundary.
 *
 * Indexed LFJ Build/CSV receipts are original-source-backed but explicitly
 * sourceOnly:true and engineeringReady:false. Neither their display rows nor
 * a state object with manually set authority flags can qualify final CII.
 *
 * T5 must introduce a source-verified native FactRecord attestor that creates
 * the independent receipt and registers it here only AFTER full occurrence,
 * source-path, owner-scope and master/review revision checks. Until then,
 * intentionally no receipt issuer is exported: all indexed final Runs fail closed.
 */
export const LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA =
  'LFJ.EngineeringSourceBasis.v1';
const ALL_SCOPE_ID = '__ALL__';
const verifiedProductReceipts = new WeakSet();
const codeError = (code, message) =>
  Object.assign(new Error(message), {code});
const scopeId = state => state?.jsonTraceScopeId || ALL_SCOPE_ID;

export function inspectIndexedEngineeringRunAuthority(state = {}) {
  if (state?.resolverSourceMode !== 'lfj-indexed-preview')
    return Object.freeze({applicable:false, ready:true, code:'LFJ_LEGACY_MODE'});
  const preview = state.lfjIndexedPreview;
  const receipt = state.lfjIndexedExportReceipt;
  if (preview?.mode !== 'lfj-indexed-preview' ||
      preview?.status !== 'SOURCE_PINNED_PREVIEW_ONLY' ||
      preview?.sourceOnly !== true ||
      preview?.engineeringReady !== false ||
      preview?.downloadAuthorized !== false ||
      !Number.isSafeInteger(preview?.xmlNodes) || preview.xmlNodes < 1 ||
      !Array.isArray(preview?.nodeWiseRows) ||
      preview.nodeWiseRows.length !== preview.xmlNodes)
    return Object.freeze({applicable:true, ready:false,
      code:'LFJ_ENGINEERING_BUILD_REQUIRED',
      message:'Run a complete source-verified indexed LFJ Build first.'});
  if (receipt?.schema !== 'LFJ.A3.IndexedCsvReceipt.v1' ||
      !Object.isFrozen(receipt) ||
      receipt.preview !== preview ||
      receipt.sourceFile !== state.stagedJsonFile ||
      receipt.selectedScopeId !== scopeId(state) ||
      receipt.originalSha256 !== preview.originalSha256 ||
      receipt.xmlSha256 !== preview.xmlSha256 ||
      receipt.nodeWiseCsvSha256 !== preview.nodeWiseCsvSha256 ||
      receipt.evidenceTreeCsvSha256 !== preview.evidenceTreeCsvSha256 ||
      receipt.selectionDigestSha256 !== (preview.selectionDigestSha256 ?? null))
    return Object.freeze({applicable:true, ready:false,
      code:'LFJ_ENGINEERING_SOURCE_DRIFT',
      message:'Selected original JSON/XML or scope has changed since indexed Build.'});
  const basis = state.lfjEngineeringSourceBasis;
  if (!basis || typeof basis !== 'object' ||
      basis.schema !== LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA ||
      basis.originalSha256 !== preview.originalSha256 ||
      basis.xmlSha256 !== preview.xmlSha256 ||
      basis.selectedScopeId !== receipt.selectedScopeId ||
      basis.selectionDigestSha256 !== receipt.selectionDigestSha256 ||
      basis.xmlNodes !== preview.xmlNodes ||
      !verifiedProductReceipts.has(basis))
    return Object.freeze({applicable:true, ready:false,
      code:'LFJ_ENGINEERING_FACTS_NOT_ATTESTED',
      message:'Indexed CSV results are source-only. Complete a separately verified engineering FactRecord handoff before final Run.'});
  return Object.freeze({applicable:true, ready:true,
    code:'LFJ_ENGINEERING_FACTS_ATTESTED'});
}

export function requireIndexedEngineeringRunAuthority(state = {}) {
  const result = inspectIndexedEngineeringRunAuthority(state);
  if (result.applicable && !result.ready)
    throw codeError(result.code, result.message);
  return result;
}
