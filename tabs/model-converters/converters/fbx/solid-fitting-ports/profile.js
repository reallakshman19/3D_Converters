import { AUTO_PIPE_PROFILE, scaledTolerance } from '../auto-pipe/profile.js';

export const SOLID_FITTING_PORT_PROFILE = Object.freeze({
  schema: 'FbxSolidFittingPortProfile.v2',
  planarJoinDotTolerance: 0.999,
  minimumRegionAreaRatio: 0.75,
  coAxialDotTolerance: 0.01,
  radiusTaperRatio: 0.05,
  shortSpanRadiusRatio: 1.5,
  minimumSpanMm: AUTO_PIPE_PROFILE.minimumSpanMm,
  radiusAbsoluteMm: AUTO_PIPE_PROFILE.radiusAbsoluteMm,
  radiusRatio: AUTO_PIPE_PROFILE.radiusRatio,
  vertexMergeAbsoluteMm: 1e-6,
  vertexMergeRelativeTolerance: 1e-9,
  maximumPortsPerOccurrence: 4,
});

export { scaledTolerance };
