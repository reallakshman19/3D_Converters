import assert from 'node:assert/strict';
import { runFbxWholeModelAutoPipe } from '../../tabs/model-converters/converters/fbx/zone-geometry/whole-model-auto-pipe.js';

function branch(ref, childId = `${ref}-PIPE`) {
  return { type: 'BRANCH', id: ref, name: 'FBX Mapping Branch 1', attributes: { REF: ref },
    children: [{ type: 'PIPE', id: childId, name: childId, attributes: { REF: childId }, children: [] }] };
}
function fakeAnalyse(byZone, activity = null) {
  return async ({ zoneId }) => {
    const entry = byZone[zoneId] || {};
    if (activity) {
      activity.active += 1; activity.maximum = Math.max(activity.maximum, activity.active);
      await new Promise((resolve) => setTimeout(resolve, entry.delay || 2)); activity.active -= 1;
    }
    if (entry.throws) throw new Error(entry.throws);
    return { autoPipe: { status: entry.status || 'BLOCKED_AUTO_PIPE_CLASSIFICATION',
      stagedJsonText: entry.status === 'STAGEDJSON_PASS' ? JSON.stringify(entry.branches) : null },
      counts: { admittedPipes: entry.admittedPipes || 0 } };
  };
}
{
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:2', 'occ:1'], analyse: fakeAnalyse({
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('FBX-BRANCH-0001', 'PIPE-1')] },
    'occ:2': { status: 'STAGEDJSON_PASS', branches: [branch('FBX-BRANCH-0001', 'PIPE-2')] },
  }) });
  assert.equal(result.conversionStatus, 'STAGEDJSON_PASS');
  const output = JSON.parse(result.stagedJsonText);
  assert.equal(output.length, 2);
  assert.equal(new Set(output.map((item) => item.attributes.REF)).size, 2);
  assert.deepEqual(output.map((item) => item.attributes.sourceZoneId), ['occ:1', 'occ:2']);
}
{
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse: fakeAnalyse({
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('B-1', 'PIPE-1')] },
    'occ:2': { status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION' },
  }) });
  assert.equal(result.conversionStatus, 'STAGEDJSON_PARTIAL_PASS');
  assert.equal(result.counts.blockedZones, 1);
}
{
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:2'], analyse: fakeAnalyse({
    'occ:1': { status: 'STAGEDJSON_PASS', branches: [branch('B-1', 'PIPE-1')] },
    'occ:2': { throws: 'geometry worker exploded' },
  }) });
  assert.equal(result.conversionStatus, 'STAGEDJSON_PARTIAL_PASS');
  assert.equal(result.counts.errorZones, 1);
  assert.match(result.zoneReports.find((item) => item.zoneId === 'occ:2').error, /exploded/);
}
{
  const result = await runFbxWholeModelAutoPipe({ zoneIds: ['occ:1', 'occ:1'], analyse: fakeAnalyse({}) });
  assert.equal(result.conversionStatus, 'BLOCKED_WHOLE_MODEL_AUTO_PIPE');
}
{
  const activity = { active: 0, maximum: 0 };
  const zones = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [
    `occ:${index + 1}`, { status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION', delay: 4 },
  ]));
  await runFbxWholeModelAutoPipe({ zoneIds: Object.keys(zones), analyse: fakeAnalyse(zones, activity), concurrency: 3 });
  assert.ok(activity.maximum <= 3);
}
console.log('test-whole-model-auto-pipe: PASS');
