import assert from 'node:assert/strict';
import { buildSelectedZoneEngineeringPackage } from '../../tabs/model-converters/converters/fbx/support-analysis/package-writer.js';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { fixture } from './test-support-fixtures.mjs';

function zipEntries(bytes) {
  const entries = new Map(); let offset = 0;
  while (offset + 4 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    const signature = view.getUint32(0, true);
    if (signature !== 0x04034b50) break;
    const size = view.getUint32(18, true), nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true), nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    const dataStart = nameStart + nameLength + extraLength;
    entries.set(name, bytes.slice(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return entries;
}

const input = fixture();
const supportResult = await runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications });
const request = { sourceGraphSelectedZone: input.sourceGraphSelectedZone,
  selections: input.selections, zoneGeometryEvidence: input.zoneGeometryEvidence,
  derivedPortEvidence: input.derivedPortEvidence, supportResult, autoPipe: input.autoPipe };
const first = await buildSelectedZoneEngineeringPackage(request);
const second = await buildSelectedZoneEngineeringPackage(request);
assert.equal(first.status, 'ENGINEERING_PACKAGE_PASS');
assert.equal(first.packageId, second.packageId);
assert.equal(first.archiveSha256, second.archiveSha256);
assert.deepEqual(first.archiveBytes, second.archiveBytes);
const entries = zipEntries(first.archiveBytes);
for (const path of ['manifest.json','source-graph.selected-zone.json','geometry-bundle.manifest.json',
  'zone-geometry-evidence.json','derived-port-evidence.json','support-evidence.json',
  'pipe-inference-evidence.json','selected-zone.staged.json','package-audit.json']) assert.ok(entries.has(path), path);
const original = new Uint8Array(input.selections[1].buffers[0].buffer.bytes);
assert.deepEqual(entries.get('geometry-buffers/geometry-20-control-points-mm.bin'), original);
const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')));
assert.equal(manifest.stagedJsonDisposition, 'INCLUDED');
const absentRequest = { ...request, autoPipe: { ...input.autoPipe,
  status: 'BLOCKED_AUTO_PIPE_CONNECTIVITY', stagedJsonText: null } };
const absentPackage = await buildSelectedZoneEngineeringPackage(absentRequest);
const absentEntries = zipEntries(absentPackage.archiveBytes);
assert.ok(!absentEntries.has('selected-zone.staged.json'));
const absentManifest = JSON.parse(new TextDecoder().decode(absentEntries.get('manifest.json')));
assert.equal(absentManifest.stagedJsonDisposition, 'ABSENT');
assert.equal(absentManifest.stagedJsonBlockStatus, 'BLOCKED_AUTO_PIPE_CONNECTIVITY');
console.log('PASS test-support-package');
