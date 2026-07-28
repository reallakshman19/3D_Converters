import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { bindSourceGraph, fixture } from './test-support-fixtures.mjs';
import { validateSchema } from './test-support-schema-validator.mjs';

const schema = JSON.parse(await fs.readFile(new URL('../../contracts/fbx/fbx-support-evidence.v1.schema.json', import.meta.url)));
const input = await bindSourceGraph(fixture());
const result = await runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications, sourceGraph: input.sourceGraph });
assert.equal(schema.additionalProperties, false);
for (const definition of Object.values(schema.$defs)) {
  if (definition.type === 'object') assert.equal(definition.additionalProperties, false);
}
assert.equal(validateSchema(schema, result.supportEvidence), true);
const invalid = structuredClone(result.supportEvidence); invalid.unknown = true;
assert.throws(() => validateSchema(schema, invalid), /additional property/);
console.log('PASS test-support-evidence-contract');
