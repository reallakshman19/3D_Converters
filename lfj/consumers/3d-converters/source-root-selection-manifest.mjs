/**
 * A3 T05a: PURE selected-root identity planning, not a source reader,
 * matching implementation, proof of original bytes, or export authority.
 *
 * The caller must first attest the whole original indexed source HEAD and
 * obtain each root descriptor from its ORIGINAL committed ordinal/byte span.
 * Never populate descriptors by querying a guessed displayed branch label.
 */
const SCHEMA = 'LFJ.A3.OriginalToSelectedRootManifest.v1';
export const ALL_SOURCE_SCOPES = '__ALL__';
export const UNSCOPED_SOURCE_ID = '__UNSCOPED__';
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const hex64 = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const whole = n => Number.isSafeInteger(n) && n >= 0;
const text = value => typeof value === 'string' ? value.trim() : '';

const EVIDENCE = new Set(['DIRECT_ROOT', 'DIRECT_ATTRIBUTES', 'NONE']);
const OWNER_KEYS = new Set(['OWNER_ZONE', 'ZONE_ID', 'OWNER_SITE', 'SITE', 'ZONE']);

/**
 * Validated original-root metadata, collected from individual bounded slices:
 *
 * { ordinal, parentOrdinal:0, member:0..N-1, startByte, endByteExclusive,
 *   type:'BRANCH', name:'...', ownerScope:'ZONE'|'',
 *   scopeEvidence:'DIRECT_ROOT'|'DIRECT_ATTRIBUTES'|'NONE',
 *   scopeKey:'OWNER_ZONE'|...|'' }
 *
 * This helper cannot independently prove root metadata came from the actual
 * Blob; T05b must reattest the catalogue/Blob before this function is called.
 */
export async function createOriginalToSelectedRootManifest({
  sourceSha256, sourceGeneration, originalSourceBytes,
  xmlSha256, configDigest, requestedScopeId, rootProfile, roots
} = {}) {
  if (!hex64(sourceSha256) || !hex64(xmlSha256) || !hex64(configDigest) ||
      !text(sourceGeneration) || !whole(originalSourceBytes) ||
      originalSourceBytes === 0)
    fail('SCOPE_BASIS_INVALID', 'full original File, XML and config identity required');
  if (rootProfile !== 'root-array')
    fail('ROOT_PROFILE_UNSUPPORTED', 'indexed hierarchy scope requires original root array');
  if (!text(requestedScopeId))
    fail('SCOPE_INVALID', 'selected scope must be explicitly identified');
  if (!Array.isArray(roots) || roots.length === 0)
    fail('SCOPE_EMPTY', 'nonempty original root descriptor census required');

  let lastOrdinal = 0;
  let lastEnd = 0;
  const census = roots.map((root, member) => {
    if (!root || root.parentOrdinal !== 0 || root.member !== member ||
        !whole(root.ordinal) || root.ordinal <= lastOrdinal ||
        !whole(root.startByte) || root.startByte < lastEnd ||
        !whole(root.endByteExclusive) ||
        root.endByteExclusive <= root.startByte ||
        root.endByteExclusive > originalSourceBytes)
      fail('ROOT_PROVENANCE_INVALID', 'root index, source ordinal or byte span is missing, reordered or duplicated');
    lastOrdinal = root.ordinal;
    lastEnd = root.endByteExclusive;
    if (root.type !== 'BRANCH' || !text(root.name))
      fail('TOPOLOGY_NOT_PROVEN', 'only named flat BRANCH root sources are admitted');
    const ownerScope = text(root.ownerScope);
    const scopeEvidence = text(root.scopeEvidence);
    if (!EVIDENCE.has(scopeEvidence) ||
        (ownerScope && scopeEvidence === 'NONE') ||
        (!ownerScope && scopeEvidence !== 'NONE') ||
        (ownerScope && !OWNER_KEYS.has(root.scopeKey)) ||
        (!ownerScope && root.scopeKey))
      fail('SCOPE_EVIDENCE_INVALID',
        'scope label must be proven from the direct root or root attributes, not a nested string');
    return Object.freeze({
      ordinal: root.ordinal, member, originalPath: '$[' + member + ']',
      startByte: root.startByte, endByteExclusive: root.endByteExclusive,
      name: root.name, ownerScope, scopeEvidence,
      scopeKey: ownerScope ? root.scopeKey : '',
      scopeId: ownerScope || UNSCOPED_SOURCE_ID
    });
  });

  const chosen = requestedScopeId === ALL_SOURCE_SCOPES
    ? census
    : census.filter(root => root.scopeId === requestedScopeId);
  if (chosen.length === 0)
    fail('SCOPE_UNKNOWN', 'selected source scope is absent from the complete original root census');

  const selected = chosen.map((root, selectedIndex) => Object.freeze({
    originalOrdinal: root.ordinal,
    originalRootIndex: root.member,
    originalPath: root.originalPath,
    selectedIndex,
    displayPath: '$[' + selectedIndex + ']',
    startByte: root.startByte, endByteExclusive: root.endByteExclusive,
    branchName: root.name
  }));
  // Deterministic digest binds even unselected root labels to the same source
  // census; not merely a hash of a caller's selected label.
  const basis = {
    schema: SCHEMA, sourceSha256, sourceGeneration, originalSourceBytes,
    xmlSha256, configDigest, requestedScopeId,
    originalRootCount: census.length, selectedRootCount: selected.length,
    census, selected
  };
  if (!globalThis.crypto?.subtle)
    fail('SCOPE_DIGEST_UNAVAILABLE', 'native SHA-256 required for selected original manifest');
  const bytes = new TextEncoder().encode(JSON.stringify(basis));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  return Object.freeze({
    ...basis, selectionDigestSha256: digest,
    // Research data and a selection manifest never themselves confer product
    // receipt/download/CII authority.
    sourceOnly: true, engineeringReady: false, downloadAuthorized: false
  });
}
