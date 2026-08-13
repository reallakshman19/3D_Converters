import { aivEitLengthMm } from './aiv-eit-units.js';

function numberText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError('AIV .eit export requires finite numerical result.');
  return String(n);
}

export function buildAivEitPipe(assessment, pipeId) {
  return {
    nb: '',
    sch: '',
    od: numberText(aivEitLengthMm(assessment.mainOutsideDiameter, 'Main Outside Diameter')),
    wt: numberText(aivEitLengthMm(assessment.mainWallThickness, 'Main Wall Thickness')),
    mat: String(assessment.material ?? ''),
    spec: '',
    pi: pipeId,
    id: numberText(aivEitLengthMm(assessment.mainInsideDiameter, 'Main Inside Diameter')),
    assessmentCanonicalId: assessment.assessmentCanonicalId,
    assessmentType: assessment.assessmentType,
  };
}
