import assert from 'node:assert/strict';
import { buildSelectedZoneGeometryManifest } from '../../tabs/model-converters/converters/fbx/zone-package/geometry-manifest.js';
import { buildSelectedZonePackage } from '../../tabs/model-converters/converters/fbx/zone-package/package-builder.js';
import { buildPackageArchive, readPackageArchive } from '../../tabs/model-converters/converters/fbx/zone-package/archive.js';
import { FbxZonePackageError } from '../../tabs/model-converters/converters/fbx/zone-package/constants.js';
import { COMPLETE_SOURCE_GRAPH_SHA256, quadGeometry, sourceIdentityFixture } from './zone-package-fixtures.mjs';

const { manifest, buffersByGeometryId } = await buildSelectedZoneGeometryManifest({
  completeSourceGraphSha256: COMPLETE_SOURCE_GRAPH_SHA256,
  sourceIdentity: sourceIdentityFixture(),
  geometries: [quadGeometry('1', 'occ:1', '1'), quadGeometry('2', 'occ:2', '2', 20)],
});
const { files } = await buildSelectedZonePackage({ manifest, buffersByGeometryId, stagedJsonText: '[]\n' });

{
  const archive = await buildPackageArchive(files);
  assert.match(archive.sha256, /^[0-9a-f]{64}$/);
  const again = await buildPackageArchive(files);
  assert.equal(archive.sha256, again.sha256, 'archive bytes must be deterministic on repeated builds');
  assert.deepEqual([...archive.bytes], [...again.bytes]);

  const roundTripped = readPackageArchive(archive.bytes);
  assert.equal(roundTripped.length, files.length);
  for (let index = 0; index < files.length; index += 1) {
    assert.equal(roundTripped[index].path, files[index].path);
    assert.equal(roundTripped[index].sha256, files[index].sha256);
    assert.deepEqual([...roundTripped[index].bytes], [...files[index].bytes], `${files[index].path} bytes must round-trip exactly`);
  }
}

{
  await assert.rejects(() => buildPackageArchive([]), (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_INPUT');
}

{
  const corrupted = (await buildPackageArchive(files)).bytes.slice();
  corrupted[0] = 0;
  assert.throws(() => readPackageArchive(corrupted), (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_ARCHIVE');
}

console.log('test-zone-package-archive: PASS');
