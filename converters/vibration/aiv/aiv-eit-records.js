import {
  aivEitMassFlowKgH,
  aivEitPressureBarAbsolute,
  aivEitTemperatureC,
  aivEitTrimReductionDb,
} from './aiv-eit-units.js';

const DEVICE_LABEL = Object.freeze({
  RELIEF_VALVE: 'Relief',
  CONTROL_VALVE: 'Control',
  RESTRICTION_ORIFICE: 'Restriction orifice',
  PRESSURE_REDUCING_BRANCH_CONNECTION: 'Pressure reducing',
});

function asText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function numberText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError('AIV .eit export requires finite numerical result.');
  return String(n);
}

export function buildAivEitStream(source, streamId) {
  return {
    desc: source.sourceCanonicalId,
    phase: String(source.phase ?? '').toLowerCase(),
    si: streamId,
    mfr: numberText(aivEitMassFlowKgH(source.massFlow)),
    t: numberText(aivEitTemperatureC(source.upstreamTemperature)),
    p: numberText(aivEitPressureBarAbsolute(source, 'upstreamPressure')),
    mw: numberText(source.molecularWeight?.value),
    sourceCanonicalId: source.sourceCanonicalId,
    caseId: source.caseId,
  };
}

export function buildAivEitPipe(assessment, pipeId) {
  return {
    nb: '',
    sch: '',
    od: numberText(assessment.mainOutsideDiameter?.value),
    wt: numberText(assessment.mainWallThickness?.value),
    mat: asText(assessment.material),
    spec: '',
    pi: pipeId,
    id: numberText(assessment.mainInsideDiameter?.value),
    assessmentCanonicalId: assessment.assessmentCanonicalId,
    assessmentType: assessment.assessmentType,
  };
}

export function buildAivEitSourceDetail({
  source,
  sourceResult,
  assessmentResult,
  relationship,
  pathEvidence = null,
}) {
  const contribution = (assessmentResult.sourceContributionsAtPoint ?? [])
    .find((item) => item.sourceCanonicalId === source.sourceCanonicalId);
  const trimDb = aivEitTrimReductionDb(source);
  return {
    vt: DEVICE_LABEL[source.sourceDeviceType] ?? source.sourceDeviceType,
    mfr: numberText(aivEitMassFlowKgH(source.massFlow)),
    usp: numberText(aivEitPressureBarAbsolute(source, 'upstreamPressure')),
    dsp: numberText(aivEitPressureBarAbsolute(source, 'downstreamPressure')),
    ust: numberText(aivEitTemperatureC(source.upstreamTemperature)),
    ...(trimDb > 0 ? { lnt: numberText(trimDb) } : {}),
    lof: Number(assessmentResult.lof),
    sourceCanonicalId: source.sourceCanonicalId,
    assessmentCanonicalId: assessmentResult.assessmentCanonicalId,
    caseId: assessmentResult.caseId,
    sourcePwl: Number(sourceResult.effectiveSourcePwlDb),
    pointPwl: contribution ? Number(contribution.pointPwlDb) : null,
    combinedPointPwl: Number(assessmentResult.combinedPointPwlDb),
    distance: relationship?.physicalDistance?.value ?? pathEvidence?.physicalDistanceM ?? null,
    distanceUnit: relationship?.physicalDistance?.unit ?? (pathEvidence?.physicalDistanceM != null ? 'm' : null),
    distanceAuthority: pathEvidence?.distanceAuthority ?? relationship?.distanceSource ?? null,
    simultaneousSourceGroup: relationship?.simultaneousSourceGroup ?? null,
    segmentIds: [...(pathEvidence?.segmentIds ?? [])],
  };
}
