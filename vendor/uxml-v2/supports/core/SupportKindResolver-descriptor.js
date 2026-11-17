import { resolveKindPure } from './SupportKindResolver.js';

// ── Composite descriptor API (Phase 7) ───────────────────────────────────────
// Force DOFs for each kind. Used by resolveKindDescriptor for combined supports.
const _KIND_DOFS = {
  REST:     { Fy: true },
  GUIDE:    { Fx: true, Fz: true },
  LINESTOP: { Fz: true },
  LIMIT:    { Fz: true },
  ANCHOR:   { Fx: true, Fy: true, Fz: true, Mx: true, My: true, Mz: true },
  SPRING:   { Fy: true },
};

// Catalog codes that represent composite (multi-kind) supports.
// CA100 = Rest + Guide: vertical load bearing AND lateral constraint, no axial freedom.
const _COMPOSITE = {
  CA100: { primaryKind: 'REST', kinds: ['REST', 'GUIDE'] },
};

/**
 * Returns a kind descriptor: { primaryKind, kinds[], dofs } for an attribute bag.
 * For single-kind supports, kinds has one entry. For composites (CA100), kinds has several.
 * Accepts the same options as resolveKindPure.
 *
 * @param {object} attrs
 * @param {object} [options] - same as resolveKindPure options
 * @returns {{ primaryKind: string, kinds: string[], dofs: object }}
 */
export function resolveKindDescriptor(attrs, options = {}) {
  const skey = String(attrs?.SKEY || attrs?.['SUPPORT-SKEY'] || '').toUpperCase().trim();
  const composite = _COMPOSITE[skey];
  if (composite) {
    options.onDecision?.({source:'composite-skey',rule:{id:'composite-skey',field:'SKEY',value:skey}});
    const dofs = composite.kinds.reduce((acc, k) => ({ ...acc, ...(_KIND_DOFS[k] || {}) }), {});
    return { primaryKind: composite.primaryKind, kinds: [...composite.kinds], dofs };
  }
  const kind = resolveKindPure(attrs, options);
  return {
    primaryKind: kind || '',
    kinds:       kind ? [kind] : [],
    dofs:        _KIND_DOFS[kind] || {},
  };
}
