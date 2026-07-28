import assert from 'node:assert/strict';
import { runFbxWholeModelAutoPipe } from '../../tabs/model-converters/converters/fbx/zone-geometry/whole-model-auto-pipe.js';

function branch(ref) {
  return { type: 'BRANCH', id: ref, name: ref, attributes: { REF: ref }, children: [] };
}

function fakeAnalyse(byZone) {
  return async ({ zoneId }) => {
    const entry = byZone[zoneId];
    if (entry?.throws) throw new Error(entry.throws);
    return {
      autoPipe: {
        status: entry?.status || 'BLOCKED_AUTO_PIPE_CLASSIFICATION',
        stagedJsonText: entry?.status === 'STAGEDJSON_PASS' ? JSON.stringify(entry.branches) : null,
      },
      counts: { admittedPipes: entry?.admittedPipes || 0 },
    };
  };
}

{
  const analyse = fakeAnalyse({
    'occ:2': { status: 'STAGEDJSON_PASS', branches: [branch('B-2')], admittedPipes: 1 },
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('B-1')], admittedPipes: 1 },
  });
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse });
  assert.equal(result.conversionStatus, 'STAGEDJSON_PASS');
  assert.equal(result.counts.totalZones, 2);
  assert.equal(result.counts.passedZones, 2);
  assert.equal(result.counts.branches, 2);
  assert.deepEqual(JSON.parse(result.stagedJsonText).map((item) => item.attributes.REF), ['B-1', 'B-2'], 'branches merge in zoneId order');
  assert.deepEqual(result.duplicateRefs, []);
}

{
  // One zone passes, one is blocked: the passing zone's branches still ship.
  const analyse = fakeAnalyse({
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('B-1')] },
    'occ:2': { status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION' },
  });
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse });
  assert.equal(result.conversionStatus, 'STAGEDJSON_PASS');
  assert.equal(result.counts.branches, 1);
  const blockedReport = result.zoneReports.find((item) => item.zoneId === 'occ:2');
  assert.equal(blockedReport.status, 'BLOCKED_AUTO_PIPE_CLASSIFICATION');
}

{
  // No zone passes: falls back to a blocked whole-model result, never a fabricated success.
  const analyse = fakeAnalyse({
    'occ:1': { status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION' },
    'occ:2': { status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION' },
  });
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse });
  assert.equal(result.conversionStatus, 'BLOCKED_WHOLE_MODEL_AUTO_PIPE');
  assert.equal(result.stagedJsonText, null);
  assert.equal(result.counts.branches, 0);
}

{
  // A colliding branch identifier across two zones must block, not silently merge.
  const analyse = fakeAnalyse({
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('B-1')] },
    'occ:2': { status: 'STAGEDJSON_PASS', branches: [branch('B-1')] },
  });
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse });
  assert.equal(result.conversionStatus, 'BLOCKED_WHOLE_MODEL_AUTO_PIPE');
  assert.deepEqual(result.duplicateRefs, ['B-1']);
}

{
  // A zone whose analysis throws is reported, not fatal to the whole run.
  const analyse = fakeAnalyse({
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('B-1')] },
    'occ:2': { throws: 'geometry worker exploded' },
  });
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse });
  assert.equal(result.conversionStatus, 'STAGEDJSON_PASS');
  const errored = result.zoneReports.find((item) => item.zoneId === 'occ:2');
  assert.equal(errored.status, 'ERROR');
  assert.equal(errored.error, 'geometry worker exploded');
}

{
  const result = await runFbxWholeModelAutoPipe({ zoneIds: [], analyse: fakeAnalyse({}) });
  assert.equal(result.conversionStatus, 'BLOCKED_WHOLE_MODEL_AUTO_PIPE');
  assert.equal(result.counts.totalZones, 0);
}

console.log('test-whole-model-auto-pipe: PASS');
