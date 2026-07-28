import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { buildSelectedZoneGeometryManifest } from '../../tabs/model-converters/converters/fbx/zone-package/geometry-manifest.js';
import { buildSelectedZonePackage } from '../../tabs/model-converters/converters/fbx/zone-package/package-builder.js';
import { COMPLETE_SOURCE_GRAPH_SHA256, quadGeometry, sourceIdentityFixture } from './zone-package-fixtures.mjs';

const program = `import json,sys\nfrom jsonschema import Draft202012Validator\np=json.load(sys.stdin)\nDraft202012Validator.check_schema(p["schema"])\nv=Draft202012Validator(p["schema"])\nprint(json.dumps([[e.message for e in v.iter_errors(i)] for i in p["instances"]]))`;
function validate(schema, instances) {
  const result = spawnSync(process.env.FBX_SCHEMA_PYTHON || 'python3', ['-c', program], {
    input: JSON.stringify({ schema, instances }), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return JSON.parse(result.stdout);
}
const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const manifestSchema = await load('../../contracts/fbx/fbx-selected-zone-geometry-manifest.v1.schema.json');
const auditSchema = await load('../../contracts/fbx/fbx-selected-zone-package-audit.v1.schema.json');
const shared = quadGeometry('1', 'occ:1', '1'); shared.occurrenceIds = ['occ:1', 'occ:2'];
const { manifest, buffersByGeometryId } = await buildSelectedZoneGeometryManifest({
  completeSourceGraphSha256: COMPLETE_SOURCE_GRAPH_SHA256, sourceIdentity: sourceIdentityFixture(), geometries: [shared] });
const { audit } = await buildSelectedZonePackage({ manifest, buffersByGeometryId, stagedJsonText: '[]\n' });
const mutate = (value, change) => { const copy = structuredClone(value); change(copy); return copy; };
const manifests = validate(manifestSchema, [manifest,
  mutate(manifest, (item) => { delete item.byteOrder; }),
  mutate(manifest, (item) => { item.geometries[0].occurrenceIds = []; }),
  mutate(manifest, (item) => { item.geometries[0].buffers[0].role = 'polygon-offsets'; }),
  mutate(manifest, (item) => { item.geometries[0].buffers[0].byteLength += 8; })]);
assert.equal(manifests[0].length, 0); manifests.slice(1).forEach((errors) => assert.ok(errors.length));
const audits = validate(auditSchema, [audit,
  mutate(audit, (item) => { item.files = item.files.filter((file) => file.role !== 'GEOMETRY_DESCRIPTOR'); }),
  mutate(audit, (item) => { item.files = item.files.filter((file) => file.role !== 'GEOMETRY_BUFFER'); }),
  mutate(audit, (item) => { item.files[0].path = '../escape'; })]);
assert.equal(audits[0].length, 0); audits.slice(1).forEach((errors) => assert.ok(errors.length));
console.log('test-zone-package-contracts: PASS');
