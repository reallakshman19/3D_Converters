import { resolveChapterIxBasis } from '../converters/b313-chapter-ix/basis-resolver.js';
import { calculateChapterIxWallState } from '../converters/b313-chapter-ix/wall-state.js';

function failure(code, message, details = {}) {
  return { ok: false, code, message, details, canUseForDesignAuthority: false };
}

function text(value) {
  return String(value ?? '').trim();
}

function directBasis(product) {
  const basis = product?.calculationBasis ?? {};
  return {
    outsideDiameterMm: basis.outsideDiameterMm,
    nominalWallMm: basis.nominalWallMm,
    minusTolerancePct: basis.minusTolerancePct,
  };
}

function resolvedBasis(product) {
  if (product?.calculationBasis?.mode === 'DIRECT_ENGINEERING_INPUT') {
    return { ok: true, resolved: directBasis(product) };
  }
  const result = resolveChapterIxBasis(product?.calculationBasis?.basisPackage ?? {});
  return result.ok ? { ok: true, resolved: result.resolved } : result;
}

function wallStateInput(project, product, basis) {
  const wall = product?.wallState ?? {};
  return {
    nominalWallMm: basis.nominalWallMm,
    minusTolerancePct: basis.minusTolerancePct,
    internalServiceAllowanceMm: project?.classBasis?.internalAllowanceMm,
    externalServiceAllowanceMm: project?.classBasis?.externalAllowanceMm,
    ...(wall.measuredCurrentWallMm !== undefined ? { measuredCurrentWallMm: wall.measuredCurrentWallMm } : {}),
    ...(wall.futureInternalLossMm !== undefined ? { futureInternalLossMm: wall.futureInternalLossMm } : {}),
    ...(wall.futureExternalLossMm !== undefined ? { futureExternalLossMm: wall.futureExternalLossMm } : {}),
  };
}

function selectedFatigueWall(product, wallState) {
  if (product?.wallState?.fatigueWallBasis === 'PROJECTED_END_OF_LIFE') {
    return wallState.projectedEndOfLifeWallMm;
  }
  return wallState.endOfLifeEffectiveWallMm;
}

export function resolveHpPipingClassFatigueAnalysisGeometry(project, evidenceIndex) {
  const pkg = project?.fatigueEvidence?.[Number(evidenceIndex)];
  if (!pkg) return failure('KD_ANALYSIS_GEOMETRY_PACKAGE_NOT_FOUND', 'KD evidence package was not found.');
  const productId = text(pkg.productId);
  const product = (project?.products ?? []).find((row) => text(row?.productId) === productId);
  if (!product) {
    return failure('KD_ANALYSIS_GEOMETRY_PRODUCT_NOT_FOUND', `KD evidence product ${productId || '(blank)'} was not found.`);
  }
  const basis = resolvedBasis(product);
  if (!basis.ok) {
    return failure(
      'KD_ANALYSIS_GEOMETRY_BASIS_BLOCKED',
      basis.message || 'Product basis could not be resolved for KD analysis geometry.',
      { productId, sourceCode: basis.code ?? null },
    );
  }
  const wallState = calculateChapterIxWallState(wallStateInput(project, product, basis.resolved));
  if (!wallState.ok) {
    return failure(
      'KD_ANALYSIS_GEOMETRY_WALL_BLOCKED',
      wallState.message || 'Wall state could not be resolved for KD analysis geometry.',
      { productId, sourceCode: wallState.code ?? null },
    );
  }
  const effectiveWallMm = selectedFatigueWall(product, wallState);
  if (!(Number.isFinite(basis.resolved.outsideDiameterMm) && basis.resolved.outsideDiameterMm > 0
      && Number.isFinite(effectiveWallMm) && effectiveWallMm > 0)) {
    return failure('KD_ANALYSIS_GEOMETRY_INVALID', 'Resolved OD/effective wall are not valid positive finite values.', { productId });
  }
  return {
    ok: true,
    productId,
    analysisGeometry: {
      outsideDiameterMm: basis.resolved.outsideDiameterMm,
      effectiveWallMm,
    },
    fatigueWallBasis: product.wallState?.fatigueWallBasis ?? null,
    canUseForDesignAuthority: false,
  };
}
