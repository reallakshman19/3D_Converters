import { AUTO_PIPE_PROFILE, scaledTolerance } from '../auto-pipe/profile.js';

export const SOLID_FITTING_PORT_PROFILE = Object.freeze({
  schema: 'FbxSolidFittingPortProfile.v1',
  planarJoinDotTolerance: 0.999,
  minimumRegionAreaRatio: 0.75,
  coAxialDotTolerance: 0.01,
  radiusTaperRatio: 0.05,
  shortSpanRadiusRatio: 1.5,
  minimumSpanMm: AUTO_PIPE_PROFILE.minimumSpanMm,
  radiusAbsoluteMm: AUTO_PIPE_PROFILE.radiusAbsoluteMm,
  radiusRatio: AUTO_PIPE_PROFILE.radiusRatio,
  maximumPortsPerOccurrence: 4,
});

export { scaledTolerance };
