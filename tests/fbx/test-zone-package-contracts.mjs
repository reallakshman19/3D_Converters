import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { buildSelectedZoneGeometryManifest } from '../../tabs/model-converters/converters/fbx/zone-package/geometry-manifest.js';
import { buildSelectedZonePackage } from '../../tabs/model-converters/converters/fbx/zone-package/package-builder.js';
import {
  COMPLETE_SOURCE_GRAPH_SHA256, quadGeometry, sourceIdentityFixture,
} from './zone-package-fixtures.mjs';

const validatorProgram = `
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
Draft202012Validator.check_schema(payload["schema"])
validator = Draft202012Validator(payload["schema"])
errors = sorted(validator.iter_errors(payload["instance"]), key=lambda e: (list(e.absolute_path), e.message))
print(json.dumps([{"path": list(e.absolute_path), "message": e.message} for e in errors]))
`;

function validate(schema, instance) {
  const result = spawnSync(process.env.FBX_SCHEMA_PYTHON || 'python3', ['-c', validatorProgram], {
    input: JSON.stringify({ schema, instance }), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Unable to start schema validator: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Draft 2020-12 validation failed to execute.\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

async function loadJson(relative) {
  return JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
}

const manifestSchema = await loadJson('../../contracts/fbx/fbx-selected-zone-geometry-manifest.v1.schema.json');
const auditSchema = await loadJson('../../contracts/fbx/fbx-selected-zone-package-audit.v1.schema.json');

{
  const { manifest, buffersByGeometryId } = await buildSelectedZoneGeometryManifest({
    completeSourceGraphSha256: COMPLETE_SOURCE_GRAPH_SHA256,
    sourceIdentity: sourceIdentityFixture(),
    geometries: [quadGeometry('1', 'occ:1', '1'), quadGeometry('2', 'occ:2', '2', 20)],
  });
  assert.deepEqual(validate(manifestSchema, manifest), [], 'a genuine Phase 1 manifest must validate cleanly');
  const { audit } = await buildSelectedZonePackage({ manifest, buffersByGeometryId, stagedJsonText: '[]\n' });
  assert.deepEqual(validate(auditSchema, audit), [], 'a genuine Phase 1 audit must validate cleanly');
}

const malformedManifests = ['manifest-missing-digest.json', 'manifest-unexpected-property.json'];
for (const name of malformedManifests) {
  const instance = await loadJson(`../fixtures/fbx/zone-package/${name}`);
  const errors = validate(manifestSchema, instance);
  assert.ok(errors.length > 0, `${name} must be rejected by the manifest schema`);
}

const malformedAudits = ['audit-present-without-hash.json', 'audit-unknown-role.json'];
for (const name of malformedAudits) {
  const instance = await loadJson(`../fixtures/fbx/zone-package/${name}`);
  const errors = validate(auditSchema, instance);
  assert.ok(errors.length > 0, `${name} must be rejected by the audit schema`);
}

console.log('test-zone-package-contracts: PASS');
