import assert from 'node:assert/strict';
import { buildSelectedZoneGeometryManifest, validateSelectedZoneGeometryManifest } from '../../tabs/model-converters/converters/fbx/zone-package/geometry-manifest.js';
import { buildSelectedZonePackage, validateSelectedZonePackage } from '../../tabs/model-converters/converters/fbx/zone-package/package-builder.js';
import { FbxZonePackageError } from '../../tabs/model-converters/converters/fbx/zone-package/constants.js';
import { COMPLETE_SOURCE_GRAPH_SHA256, quadGeometry, sourceIdentityFixture } from './zone-package-fixtures.mjs';

async function buildManifest(geometries) {
  return buildSelectedZoneGeometryManifest({ completeSourceGraphSha256: COMPLETE_SOURCE_GRAPH_SHA256,
    sourceIdentity: sourceIdentityFixture(), geometries });
}
{
  const shared = quadGeometry('10', 'occ:2', '1');
  shared.occurrenceIds = ['occ:2', 'occ:1']; delete shared.occurrenceId;
  const { manifest, buffersByGeometryId } = await buildManifest([quadGeometry('20', 'occ:3', '2'), shared]);
  assert.equal(manifest.byteOrder, 'little-endian');
  assert.deepEqual(manifest.geometries[0].occurrenceIds, ['occ:1', 'occ:2']);
  await validateSelectedZoneGeometryManifest(manifest);
  const first = await buildSelectedZonePackage({ manifest, buffersByGeometryId });
  const second = await buildSelectedZonePackage({ manifest, buffersByGeometryId });
  assert.deepEqual(first.audit, second.audit);
  assert.equal(first.audit.files.filter((item) => item.role === 'GEOMETRY_DESCRIPTOR').length, 2);
  assert.equal(first.audit.files.filter((item) => item.role === 'GEOMETRY_BUFFER').length, 6);
  await validateSelectedZonePackage(first);
  const tampered = { files: first.files.map((file) => ({ path: file.path, bytes: file.bytes.slice() })), audit: structuredClone(first.audit) };
  tampered.files.find((file) => file.path.endsWith('control-points-mm.bin')).bytes[0] ^= 1;
  await assert.rejects(() => validateSelectedZonePackage(tampered),
    (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_FILE');
}
{
  const { manifest, buffersByGeometryId } = await buildManifest([quadGeometry('1', 'occ:1', '1')]);
  const withStaged = await buildSelectedZonePackage({ manifest, buffersByGeometryId, stagedJsonText: '[]\n' });
  assert.equal(withStaged.audit.files.find((item) => item.role === 'STAGEDJSON').disposition, 'PRESENT');
  await assert.rejects(() => buildSelectedZonePackage({ manifest, buffersByGeometryId, stagedJsonText: '{broken' }),
    (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_STAGEDJSON');
}
{
  const bad = quadGeometry('1', 'occ:1', '1'); bad.polygonOffsets = [0, 1.5];
  await assert.rejects(() => buildManifest([bad]),
    (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_BUFFER');
}
console.log('test-zone-package-core: PASS');
