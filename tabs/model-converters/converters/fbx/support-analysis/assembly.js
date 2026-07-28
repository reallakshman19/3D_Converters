import { aabbGap, mergeBounds } from './geometry-analysis.js';
import { compareText } from './identity.js';

function connected(left, right, profile) {
  const sameParent = left.item.occurrence.parentOccurrenceId
    && left.item.occurrence.parentOccurrenceId === right.item.occurrence.parentOccurrenceId;
  return sameParent && aabbGap(left.boundingEvidence, right.boundingEvidence)
    <= profile.assemblySurfaceGapMm;
}

export function buildSupportAssemblies(analyses, profile) {
  const eligible = analyses.filter((item) => item?.geometryDisposition === 'ELIGIBLE')
    .sort((left, right) => compareText(left.item.occurrence.sourceOccurrenceId,
      right.item.occurrence.sourceOccurrenceId));
  if (eligible.length > profile.maximumCandidateAssemblyPairs) {
    throw new Error('BLOCKED_SUPPORT_RESOURCE candidate assembly pair limit exceeded.');
  }
  const parent = eligible.map((_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (left, right) => { const a = find(left), b = find(right); if (a !== b) parent[b] = a; };
  let pairs = 0;
  for (let left = 0; left < eligible.length; left += 1) for (let right = left + 1; right < eligible.length; right += 1) {
    pairs += 1;
    if (pairs > profile.maximumCandidateAssemblyPairs) {
      throw new Error('BLOCKED_SUPPORT_RESOURCE candidate assembly pair limit exceeded.');
    }
    if (connected(eligible[left], eligible[right], profile)) join(left, right);
  }
  const groups = new Map();
  eligible.forEach((item, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item);
  });
  return Object.freeze([...groups.values()].map((members) => {
    if (members.length > profile.maximumOccurrencesPerAssembly) {
      throw new Error('BLOCKED_SUPPORT_RESOURCE support assembly occurrence limit exceeded.');
    }
    const box = mergeBounds(members);
    return Object.freeze({
      members: Object.freeze(members),
      points: Object.freeze(members.flatMap((item) => item.points)),
      triangles: Object.freeze(members.flatMap((item) => item.triangles)),
      boundingEvidence: Object.freeze({ minMm: box.minimum, maxMm: box.maximum,
        extentMm: box.extent, diagonalMm: box.diagonal }),
      principalAxes: Object.freeze(members.flatMap((item) => item.principalAxes).slice(0, 3)),
    });
  }));
}
