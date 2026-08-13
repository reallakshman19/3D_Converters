import { AIV_EIT_VERSION, assertAivEitV5Document } from './aiv-eit-contract.js';
import { buildAivEitPipe, buildAivEitSourceDetail, buildAivEitStream } from './aiv-eit-records.js';

const skey = (sourceId, caseId) => `${sourceId}\u0000${caseId}`;
const rkey = (sourceId, assessmentId, caseId) => `${sourceId}\u0000${assessmentId}\u0000${caseId}`;

function maps(screeningPackage) {
  const result = screeningPackage.result;
  const sources = new Map((screeningPackage.inputs?.sources ?? []).map((x) => [skey(x.sourceCanonicalId, x.caseId), x]));
  const assessments = new Map((screeningPackage.inputs?.assessments ?? []).map((x) => [x.assessmentCanonicalId, x]));
  const relationships = new Map((screeningPackage.inputs?.relationships ?? []).map((x) => [rkey(x.sourceCanonicalId, x.assessmentCanonicalId, x.caseId), x]));
  const sourceResults = new Map((result.sourceResults ?? []).map((x) => [skey(x.sourceCanonicalId, x.caseId), x]));
  const paths = new Map((screeningPackage.flareNetworkEvidence?.pathEvidence ?? []).map((x) => [rkey(x.sourceCanonicalId, x.assessmentCanonicalId, x.caseId), x]));
  return { result, sources, assessments, relationships, sourceResults, paths };
}

function lineRecord(assessmentResult, index, refs) {
  const sourceIds = [...assessmentResult.contributingSourceCanonicalIds].sort();
  const details = sourceIds.map((sourceId) => {
    const sourceKey = skey(sourceId, assessmentResult.caseId);
    const relationshipKey = rkey(sourceId, assessmentResult.assessmentCanonicalId, assessmentResult.caseId);
    const source = refs.sources.get(sourceKey);
    const sourceResult = refs.sourceResults.get(sourceKey);
    if (!source || !sourceResult) throw new Error(`AIV_EIT_SOURCE_RESULT_MISSING: ${sourceKey}`);
    return buildAivEitSourceDetail({ source, sourceResult, assessmentResult, relationship: refs.relationships.get(relationshipKey), pathEvidence: refs.paths.get(relationshipKey) });
  });
  const trace = (refs.result.lineCaseSummaries ?? []).find((x) => x.caseId === assessmentResult.caseId && x.assessmentCanonicalIds?.includes(assessmentResult.assessmentCanonicalId));
  const pwls = sourceIds.map((id) => refs.sourceResults.get(skey(id, assessmentResult.caseId))?.effectiveSourcePwlDb).filter(Number.isFinite);
  const lof = Number(assessmentResult.lof);
  return {
    rid: String(index + 1), pnid: assessmentResult.caseId,
    lref: assessmentResult.line || assessmentResult.assessmentCanonicalId,
    ldesc: `AIV assessment ${assessmentResult.assessmentCanonicalId}`,
    pi: refs.pipeIds.get(assessmentResult.assessmentCanonicalId),
    si: refs.streamIds.get(skey(sourceIds[0], assessmentResult.caseId)),
    modules: 'aiv', aiv: String(lof), pwl: pwls.length ? String(Math.max(...pwls)) : '',
    aiv_data: JSON.stringify(details), maxLof: String(lof), aivAuthorityScope: 'ASSESSMENT',
    aivAssessmentCanonicalId: assessmentResult.assessmentCanonicalId,
    aivConfiguredLineCaseTraceLof: trace?.lof ?? null,
    aivConfiguredLineCaseTraceAuthoritative: false,
  };
}

export function buildAivEitV5Document(screeningPackage, title, options = {}) {
  const refs = maps(screeningPackage);
  const assessmentIds = [...new Set((refs.result.assessmentResults ?? []).map((x) => x.assessmentCanonicalId))].sort();
  refs.pipeIds = new Map(assessmentIds.map((id, i) => [id, i + 1]));
  const pipes = assessmentIds.map((id) => buildAivEitPipe(refs.assessments.get(id), refs.pipeIds.get(id)));
  const sourceKeys = [...new Set((refs.result.assessmentResults ?? []).flatMap((a) => a.contributingSourceCanonicalIds.map((id) => skey(id, a.caseId))))].sort();
  refs.streamIds = new Map(sourceKeys.map((key, i) => [key, i + 1]));
  const streams = sourceKeys.map((key) => buildAivEitStream(refs.sources.get(key), refs.streamIds.get(key)));
  const lines = (refs.result.assessmentResults ?? []).map((a, i) => lineRecord(a, i, refs));
  const document = {
    options: { title: String(title), version: AIV_EIT_VERSION, id: Number(options.id ?? 0), project: Number(options.project ?? 0), advancedFip: '0', debug: String(options.debug ?? '0'), 'ignore-vib': Number(options['ignore-vib'] ?? 0) },
    lines, pipes, streams, mats: [],
  };
  return assertAivEitV5Document(document);
}
