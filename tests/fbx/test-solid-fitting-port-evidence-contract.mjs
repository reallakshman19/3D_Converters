import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { buildSolidFittingPortEvidence } from '../../tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js';
import {
  occurrenceFixture, prismGeometry, selectionFromGeometry,
} from './solid-fitting-port-fixtures.mjs';

function validateSchema(schema, instances) {
  const program = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
Draft202012Validator.check_schema(payload["schema"])
validator = Draft202012Validator(payload["schema"])
print(json.dumps([[error.message for error in validator.iter_errors(item)] for item in payload["instances"]]))
`;
  const python = process.env.FBX_SCHEMA_PYTHON || 'python3';
  const result = spawnSync(python, ['-c', program], {
    input: JSON.stringify({ schema, instances }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return JSON.parse(result.stdout);
}

async function main() {
  const geometry = prismGeometry(10, 50, 8);
  const selection = selectionFromGeometry('101', '1', geometry);
  const occurrence = occurrenceFixture('occ:1', '1', '101');
  const scope = { selectedOccurrences: [occurrence] };
  const zoneArtifact = { artifactId: `fbx-zone-geometry-evidence:${'a'.repeat(64)}` };
  const evidence = await buildSolidFittingPortEvidence(zoneArtifact, scope, [selection]);

  const extra = structuredClone(evidence);
  extra.unexpected = true;
  const malformed = structuredClone(evidence);
  malformed.artifactId = 'not-a-valid-id';
  const missingProjection = structuredClone(evidence);
  delete missingProjection.occurrenceEvidence[0].analysisProjection;

  const schema = JSON.parse(await readFile(
    new URL('../../contracts/fbx/fbx-solid-fitting-port-evidence.v2.schema.json', import.meta.url), 'utf8',
  ));
  const results = validateSchema(schema, [evidence, extra, malformed, missingProjection]);
  assert.equal(results[0].length, 0, JSON.stringify(results[0]));
  assert.notEqual(results[1].length, 0, 'unexpected top-level field passed schema');
  assert.notEqual(results[2].length, 0, 'malformed artifactId passed schema');
  assert.notEqual(results[3].length, 0, 'missing analysis projection passed schema');

  console.log('PASS test-solid-fitting-port-evidence-contract');
}

await main();
