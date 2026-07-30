import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { buildSelectedZoneConnectivityEvidence } from '../../tabs/model-converters/converters/fbx/fitting-kernels/connectivity/evidence.js';
import {
  prepareGeneratedGapPipeRelease,
} from '../../tabs/model-converters/converters/fbx/generated-gap-pipe/release.js';
import {
  buildSelectedZoneGeneratedGapPipeEvidence,
} from '../../tabs/model-converters/converters/fbx/generated-gap-pipe/selected-evidence.js';
import { writeNativeStagedJsonV2 } from '../../tabs/model-converters/converters/fbx/staged-writer.js';

function port(portId, role, positionMm, vector, connection = null) {
  return {
    portId, role, authority: 'mesh-vertex', geometryObjectId: `${role}-geo`,
    positionMm, direction: { authority: 'world-vector', vector },
    connections: connection ? [connection] : [],
  };
}

function fixture() {
  const entries = [
    { mappingEntryId: 'p1', logicalComponentId: 'P-1', componentType: 'PIPE',
      sourceModelObjectId: '1', sourceOccurrenceId: 'occ:1',
      sourceGeometryObjectIds: ['10'], engineering: {} },
    { mappingEntryId: 'p2', logicalComponentId: 'P-2', componentType: 'PIPE',
      sourceModelObjectId: '2', sourceOccurrenceId: 'occ:2',
      sourceGeometryObjectIds: ['20'], engineering: {} },
  ];
  const resolvedByEntry = new Map([
    ['p1', {
      A: port('A', 'A', [-10, 0, 0], [-1, 0, 0]),
      L: port('L', 'L', [0, 0, 0], [1, 0, 0],
        { mappingEntryId: 'p2', portId: 'A' }),
    }],
    ['p2', {
      A: port('A', 'A', [100, 0, 0], [-1, 0, 0],
        { mappingEntryId: 'p1', portId: 'L' }),
      L: port('L', 'L', [110, 0, 0], [1, 0, 0]),
    }],
  ]);
  return {
    entries, resolvedByEntry,
    links: [{ pairKey: 'p1:L|p2:A', endpoints: ['p1:L', 'p2:A'] }],
  };
}

function schemaErrors(schema, instances) {
  const program = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
Draft202012Validator.check_schema(payload["schema"])
validator = Draft202012Validator(payload["schema"])
print(json.dumps([[error.message for error in validator.iter_errors(item)] for item in payload["instances"]]))
`;
  const result = spawnSync(process.env.FBX_SCHEMA_PYTHON || 'python3', ['-c', program], {
    input: JSON.stringify({ schema, instances }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return JSON.parse(result.stdout);
}

function functionLengths(source) {
  const lines = source.split('\n'), lengths = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (!match) continue;
    let depth = 0, started = false, end = index;
    for (; end < lines.length; end += 1) {
      for (const character of lines[end]) {
        if (character === '{') { depth += 1; started = true; }
        if (character === '}') depth -= 1;
      }
      if (started && depth === 0) break;
    }
    lengths.push([match[1], end - index + 1]);
  }
  return lengths;
}

const release = prepareGeneratedGapPipeRelease(fixture());
const staged = writeNativeStagedJsonV2(
  release.entries, release.resolvedByEntry, release.links);
const zone = {
  artifactId: 'zone:gap', selectedZone: { zoneId: 'zone:gap' },
  selectedOccurrenceIds: ['occ:1', 'occ:2'],
};
const selected = buildSelectedZoneGeneratedGapPipeEvidence({
  stagedBranches: staged,
  zoneGeometryEvidence: zone,
  mappingStatus: 'MAPPED_STAGE_AVAILABLE',
});
const branchId = staged[0].attributes.REF;
const componentCrosswalk = {
  schema: 'FbxSelectedZoneComponentCrosswalk.v1', artifactId: 'crosswalk:gap',
  inputs: { zoneGeometryArtifactId: zone.artifactId, selectedZoneId: zone.selectedZone.zoneId },
  managedComponents: staged[0].children.map((child) => {
    const attributes = child.attributes;
    const provenance = attributes.mappingEngineering?.generationProvenance;
    const generated = provenance?.generated === true;
    return {
      managedRecordId: `${branchId}::${attributes.REF}`,
      exactSourceOccurrenceId: generated ? null : attributes.sourceOccurrenceId,
      disposition: generated ? 'GENERATED_MANAGED_COMPONENT' : 'MATCHED_SOURCE_COMPONENT',
      generationProvenanceStatus: generated ? 'EVIDENCED' : 'NOT_APPLICABLE',
      generationMethod: generated ? provenance.generationMethod : null,
    };
  }),
};
const connectivity = await buildSelectedZoneConnectivityEvidence({
  stagedBranches: staged, componentCrosswalk, mappingStatus: 'MAPPED_STAGE_AVAILABLE',
});
const globalSchema = JSON.parse(await readFile(new URL(
  '../../contracts/fbx/fbx-generated-gap-pipe-evidence.v1.schema.json', import.meta.url), 'utf8'));
const selectedSchema = JSON.parse(await readFile(new URL(
  '../../contracts/fbx/fbx-selected-zone-generated-gap-pipe-evidence.v1.schema.json', import.meta.url), 'utf8'));
const connectivitySchema = JSON.parse(await readFile(new URL(
  '../../contracts/fbx/fbx-selected-zone-connectivity-evidence.v1.schema.json', import.meta.url), 'utf8'));
const globalUnexpected = structuredClone(release.evidence);
globalUnexpected.unexpected = true;
const globalAuthority = structuredClone(release.evidence);
globalAuthority.authority.proximityConnectionsAccepted = true;
const selectedUnexpected = structuredClone(selected);
selectedUnexpected.records[0].unexpected = true;
const selectedMethod = structuredClone(selected);
selectedMethod.authority.generationMethod = 'UNAPPROVED';
const globalErrors = schemaErrors(globalSchema, [release.evidence, globalUnexpected, globalAuthority]);
const selectedErrors = schemaErrors(selectedSchema, [selected, selectedUnexpected, selectedMethod]);
const connectivityUnexpected = structuredClone(connectivity);
connectivityUnexpected.authority.writerAuthorityChanged = true;
const connectivityErrors = schemaErrors(
  connectivitySchema, [connectivity, connectivityUnexpected]);
assert.equal(globalErrors[0].length, 0, JSON.stringify(globalErrors[0]));
assert.equal(selectedErrors[0].length, 0, JSON.stringify(selectedErrors[0]));
assert.equal(connectivityErrors[0].length, 0, JSON.stringify(connectivityErrors[0]));
for (const errors of [
  ...globalErrors.slice(1), ...selectedErrors.slice(1), ...connectivityErrors.slice(1),
]) {
  assert.notEqual(errors.length, 0, 'invalid schema fixture passed');
}

const productionFiles = [
  'profile.js', 'endpoint-model.js', 'qualify.js', 'release.js',
  'selected-evidence.js', 'review-model.js', 'review-ui.js',
].map((name) => new URL(
  `../../tabs/model-converters/converters/fbx/generated-gap-pipe/${name}`, import.meta.url));
for (const url of productionFiles) {
  const source = await readFile(url, 'utf8');
  assert.ok(source.split('\n').length - 1 < 300, `${url.pathname} exceeds 300 lines`);
  assert.doesNotMatch(source, /export\s+default|localeCompare|Math\.random|Date\.now/);
  for (const [name, length] of functionLengths(source)) {
    assert.ok(length <= 40, `${name} has ${length} lines`);
  }
}

console.log('PASS test-generated-gap-pipe-contract');
