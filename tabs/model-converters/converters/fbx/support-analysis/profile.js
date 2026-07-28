import { deepFreeze } from '../canonical-json.js';

export const FBX_SUPPORT_SCHEMA = 'FbxSupportEvidence.v1';
export const FBX_SUPPORT_PACKAGE_SCHEMA = 'FbxSelectedZoneEngineeringPackage.v1';
export const FBX_SUPPORT_PROFILE_NAME = 'FBX_SUPPORT_Z1_PROFILE_V1';

export const SUPPORT_TERMINAL_DISPOSITIONS = deepFreeze([
  'SUPPORT_ADMITTED',
  'SUPPORT_CANDIDATE_REJECTED',
  'SUPPORT_CANDIDATE_AMBIGUOUS',
  'NOT_SUPPORT_EVIDENCE',
  'CONTEXT_ONLY',
]);

export const SUPPORT_HOST_OUTCOMES = deepFreeze([
  'SINGLE_HOST_PROVED',
  'MULTI_HOST_PROVED',
  'HOST_AMBIGUOUS',
  'HOST_NOT_FOUND',
  'HOST_ASSOCIATION_NOT_APPLICABLE',
]);

export const SUPPORT_RELEASE_STATUSES = deepFreeze([
  'SUPPORT_ANALYSIS_PASS',
  'SUPPORT_EVIDENCE_PASS',
  'ENGINEERING_PACKAGE_PASS',
  'BLOCKED_SUPPORT_BINDING',
  'BLOCKED_SUPPORT_SCOPE',
  'BLOCKED_SUPPORT_TOPOLOGY',
  'BLOCKED_SUPPORT_CLASSIFICATION',
  'BLOCKED_SUPPORT_HOST_ASSOCIATION',
  'BLOCKED_SUPPORT_AMBIGUITY',
  'BLOCKED_SUPPORT_RESOURCE',
  'BLOCKED_SUPPORT_PACKAGE',
  'BLOCKED_SUPPORT_CANCELLED',
]);

export const FBX_SUPPORT_PROFILE = deepFreeze({
  profile: FBX_SUPPORT_PROFILE_NAME,
  coordinateUnit: 'millimetre',
  worldUp: [0, 0, 1],
  minimumCandidateDiagonalMm: 25,
  maximumCandidateDiagonalMm: 12000,
  minimumOccupiedAxisExtentMm: 1,
  maximumAxisSpanMm: 12000,
  maximumConnectedShellCount: 64,
  maximumSourcePolygonsPerCandidate: 250000,
  maximumSourceVertexReferencesPerCandidate: 500000,
  maximumDerivedTrianglesPerCandidate: 500000,
  maximumDerivedTrianglesPerZone: 5000000,
  maximumOccurrencesPerAssembly: 128,
  maximumPipeSearchRadiusMm: 1500,
  contactClearanceAbsoluteMm: 2,
  contactClearanceMaximumMm: 20,
  contactClearanceDiameterRatio: 0.01,
  contactNormalToleranceDegrees: 30,
  minimumContactWitnessCount: 3,
  minimumAxialContactOverlapAbsoluteMm: 10,
  minimumAxialContactOverlapMaximumMm: 100,
  minimumAxialContactOverlapDiameterRatio: 0.05,
  minimumStructuralContinuationAbsoluteMm: 15,
  minimumStructuralContinuationMaximumMm: 150,
  minimumStructuralContinuationDiameterRatio: 0.10,
  lineLikeSlendernessExclusive: 120,
  sheetLikeSlendernessExclusive: 120,
  degenerateEdgeMmInclusive: 0.000001,
  degenerateTriangleAreaMm2Inclusive: 0.00000001,
  polygonPlanarityAbsoluteMm: 0.01,
  polygonPlanarityRatio: 0.000001,
  maximumCandidateHostPairs: 200000,
  maximumCandidateAssemblyPairs: 200000,
  assemblySurfaceGapMm: 2,
});

export function scaledBound(absolute, maximum, ratio, scale) {
  return Math.max(absolute, Math.min(maximum, ratio * scale));
}
