/**
 * Canonical branch identity for StagedJSON -> PSI XML projection.
 * Source branch suffixes (/B1, /B02, ...) are retained as trace evidence while
 * XML grouping uses the owner/root line identity.
 */

export function canonicalBranchRoot(value) {
  return text(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\\+/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '')
    .replace(/\/B0*\d+$/i, '');
}

export function branchSuffix(value) {
  return text(value).match(/\/(B0*\d+)$/i)?.[1]?.toUpperCase() || '';
}

export function resolveBranchIdentity({ sourceName, owner }) {
  const source = text(sourceName);
  const ownerRoot = canonicalBranchRoot(owner);
  const sourceRoot = canonicalBranchRoot(source);
  return Object.freeze({
    sourceName: source,
    owner: text(owner),
    canonicalName: ownerRoot || sourceRoot || source,
    suffix: branchSuffix(source),
  });
}

function text(value) {
  return String(value ?? '').trim();
}
