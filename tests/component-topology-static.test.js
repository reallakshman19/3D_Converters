const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const converter = read('tabs/model-converters/converters/stagedjson-to-inputxml.js');
const exporter = read('tabs/model-converters/converters/component-topology/topology-artifact-exporter.js');
const connectivity = read('tabs/model-converters/converters/component-topology/topology-connectivity.js');
const writer = read('tabs/model-converters/converters/component-topology/topology-inputxml-writer.js');

assert(converter.includes('buildComponentTopologyArtifacts'), 'StagedJSON converter must emit component topology artifacts');
assert(converter.includes('topologyArtifactOutputs'), 'StagedJSON converter must expose canonical, ledger, and topology InputXML downloads');
assert(exporter.includes('CanonicalTopology.v1') || exporter.includes('buildCanonicalTopology'), 'exporter must construct the canonical artifact');
assert(connectivity.includes('BRANCH_CHILD_ORDER'), 'source order must be explicit connection authority');
assert(connectivity.includes('AUTO_GENERATED_PIPE_COMPONENT_SPAN'), 'managed PIPE/INST overlap must be explicit');
assert(connectivity.includes('planCrefConnections') && connectivity.includes('reciprocalRole'), 'CREF/HREF/TREF connection evidence must be retained');
assert(writer.includes('SOURCE_ENTITY_IDS'), 'InputXML elements must retain source ancestry');
assert(writer.includes('CANONICAL_EDGE_ID'), 'InputXML elements must retain canonical ancestry');
assert(writer.includes('<RESTRAINT'), 'native topology InputXML must emit resolved restraints');
assert(writer.includes('<RIGID'), 'native topology InputXML must emit resolved rigid properties');
assert(writer.includes('DIAMETER') && writer.includes('WALL_THICK'), 'native topology InputXML must emit engineering attributes');

for (const relative of fs.readdirSync(path.join(root, 'tabs/model-converters/converters/component-topology'))) {
  if (!relative.endsWith('.js')) continue;
  const lines = read(`tabs/model-converters/converters/component-topology/${relative}`).split(/\r?\n/).length;
  assert(lines <= 300, `${relative} exceeds 300 lines (${lines})`);
}

console.log('component topology static contracts passed.');
