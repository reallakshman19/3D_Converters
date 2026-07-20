import { RESTRAINT_CODE_MAP } from '../../../stagedjson-to-enrichxml/sj-restraint-resolver.js';
import { cleanText, xmlAttribute } from './topology-values.js';
import {
  buildEdgeEngineeringValues,
  engineeringRecord,
  engineeringValues,
  finiteNumber,
  physicalWall,
} from './topology-inputxml-engineering-context.js';
import {
  topologyElementTraceAttributes,
  topologyRestraintTraceAttributes,
  topologyRigidTraceAttributes,
} from './topology-inputxml-trace-attributes.js';

const SENTINEL = '-1.010100';

function fixed(value) {
  const number = finiteNumber(value);
  return number === null ? SENTINEL : number.toFixed(6);
}

function globalFixed(value) {
  const number = finiteNumber(value);
  if (number === null) throw new TypeError(`Invalid canonical global coordinate: ${value}.`);
  return number.toFixed(3);
}

function nodeMap(canonical) {
  return new Map(canonical.nodes.map((node) => [node.id, node]));
}

function nativeAttributes(edge, from, to, values, fromName, toName) {
  const delta = {
    x: to.position.x - from.position.x,
    y: to.position.y - from.position.y,
    z: to.position.z - from.position.z,
  };
  const attributes = [
    ['ID', edge.inputXmlElementIds[0]],
    ['FROM_NODE', fixed(from.inputXmlNodeIds[0])],
    ['TO_NODE', fixed(to.inputXmlNodeIds[0])],
    ['DELTA_X', fixed(delta.x)],
    ['DELTA_Y', fixed(delta.y)],
    ['DELTA_Z', fixed(delta.z)],
    ['DIAMETER', fixed(values.diameter)],
    ['WALL_THICK', fixed(values.wall)],
    ['INSUL_THICK', fixed(values.insulation)],
    ['CORR_ALLOW', fixed(values.corrosion)],
    ['TEMP_EXP_C1', fixed(values.temperature)],
  ];
  for (let index = 2; index <= 9; index += 1) attributes.push([`TEMP_EXP_C${index}`, SENTINEL]);
  attributes.push(['PRESSURE1', fixed(values.pressure)]);
  for (let index = 2; index <= 9; index += 1) attributes.push([`PRESSURE${index}`, SENTINEL]);
  attributes.push(
    ['HYDRO_PRESSURE', fixed(values.hydro)],
    ['MODULUS', fixed(values.modulus)],
    ['POISSONS', fixed(values.poisson)],
    ['PIPE_DENSITY', fixed(values.pipeDensity)],
    ['INSUL_DENSITY', fixed(values.insulationDensity)],
    ['FLUID_DENSITY', fixed(values.fluidDensity)],
    ['MATERIAL_NUM', fixed(values.materialNumber)],
    ['MATERIAL_NAME', cleanText(values.materialName)],
    ['NAME', cleanText(values.name)],
    ['LINE_ID', cleanText(values.lineId)],
    ['FROM_NAME', fromName],
    ['TO_NAME', toName],
    ['FROM_GLOBAL_X', globalFixed(from.position.x)],
    ['FROM_GLOBAL_Y', globalFixed(from.position.y)],
    ['FROM_GLOBAL_Z', globalFixed(from.position.z)],
    ['TO_GLOBAL_X', globalFixed(to.position.x)],
    ['TO_GLOBAL_Y', globalFixed(to.position.y)],
    ['TO_GLOBAL_Z', globalFixed(to.position.z)],
    ['GLOBAL_COORD_BASIS_NODE', from.inputXmlNodeIds[0]],
    ['SOURCE_TYPE', edge.sourceTypes[0]],
    ...topologyElementTraceAttributes(edge, from, to),
  );
  return attributes;
}

function serialize(attributes) {
  return attributes.map(([name, value]) => `${name}="${xmlAttribute(value)}"`).join(' ');
}

function restraintXml(restraint, support, index) {
  const type = cleanText(restraint.type || restraint.kind).toUpperCase();
  const code = RESTRAINT_CODE_MAP[type];
  if (!Number.isFinite(code)) throw new Error(`Unsupported CAESAR restraint type ${type || '(blank)'}.`);
  const cosine = type === '+X' ? [1, 0, 0] : type === '+Y' ? [0, 1, 0] : type === '+Z' ? [0, 0, 1] : [0, 0, 0];
  const attributes = [
    ['ID', `RESTRAINT:${support.id}:${index + 1}`],
    ['NUM', fixed(index + 1)],
    ['NODE', fixed(support.inputXmlNodeId)],
    ['TYPE', fixed(code)],
    ['STIFFNESS', fixed(restraint.stiffness)],
    ['GAP', fixed(restraint.gap)],
    ['FRIC_COEF', fixed(restraint.friction)],
    ['CNODE', SENTINEL],
    ['XCOSINE', fixed(cosine[0])],
    ['YCOSINE', fixed(cosine[1])],
    ['ZCOSINE', fixed(cosine[2])],
    ['TAG', support.tag],
    ['GUID', ''],
    ...topologyRestraintTraceAttributes(support),
  ];
  return `      <RESTRAINT ${serialize(attributes)}/>`;
}

function bendXml(bend, nodes) {
  const node = nodes.get(bend.nodeId);
  if (!node) throw new Error(`Bend ${bend.id} references missing canonical node ${bend.nodeId}.`);
  const halfAngle = finiteNumber(bend.angleDeg) === null ? null : Number(bend.angleDeg) / 2;
  const attributes = [
    ['ID', bend.id],
    ['RADIUS', fixed(bend.radiusMm)],
    ['TYPE', SENTINEL],
    ['ANGLE1', fixed(halfAngle)],
    ['NODE1', fixed(node.inputXmlNodeIds[0])],
    ['ANGLE2', SENTINEL],
    ['NODE2', SENTINEL],
    ['ANGLE3', SENTINEL],
    ['NODE3', SENTINEL],
    ['NUM_MITER', SENTINEL],
    ['FITTINGTHICKNESS', SENTINEL],
    ['KFACTOR', SENTINEL],
    ['RADIUS_AUTHORITY', cleanText(bend.radiusAuthority)],
  ];
  return `      <BEND ${serialize(attributes)}/>`;
}

function supportIndex(canonical) {
  const supportsByEdge = new Map();
  const namesByNode = new Map();
  for (const support of canonical.supports) {
    namesByNode.set(support.nodeId, support.tag);
    const incident = canonical.edges.filter((edge) => (
      (edge.fromNodeId === support.nodeId || edge.toNodeId === support.nodeId)
      && support.sourceEntityIds.some((id) => edge.sourceEntityIds.includes(id))
    ));
    const edge = incident.find((row) => row.toNodeId === support.nodeId) ?? incident[0];
    if (!edge) throw new Error(`Support ${support.id} has no incident InputXML element.`);
    supportsByEdge.set(edge.id, [...(supportsByEdge.get(edge.id) ?? []), support]);
  }
  return { supportsByEdge, namesByNode };
}

function elementXml(edge, nodes, values, supports, rigids, bends, names) {
  const from = nodes.get(edge.fromNodeId);
  const to = nodes.get(edge.toNodeId);
  if (!from || !to) throw new Error(`InputXML edge ${edge.id} references a missing canonical node.`);
  const attributes = nativeAttributes(
    edge,
    from,
    to,
    values,
    names.get(from.id) ?? '',
    names.get(to.id) ?? '',
  );
  const children = [];
  if (rigids.length) {
    const weight = rigids.reduce((sum, rigid) => sum + Number(rigid.weightKg || 0), 0);
    const types = [...new Set(rigids.map((rigid) => cleanText(rigid.componentType)).filter(Boolean))];
    children.push(`      <RIGID ${serialize([
      ['ID', `RIGID:${edge.id}`],
      ['WEIGHT', fixed(weight)],
      ['TYPE', types.join('+')],
      ['SOURCE_BODY_COUNT', rigids.length],
      ...topologyRigidTraceAttributes(edge, rigids),
    ])}/>`);
  }
  for (const bend of bends) children.push(bendXml(bend, nodes));
  for (const support of supports) {
    for (const [index, restraint] of support.restraints.entries()) {
      children.push(restraintXml(restraint, support, index));
    }
  }
  return `    <PIPINGELEMENT ${serialize(attributes)}>\n${children.join('\n')}${children.length ? '\n' : ''}    </PIPINGELEMENT>`;
}

function documentContext(options) {
  const version = cleanText(options.version);
  const jobName = cleanText(options.jobName);
  const north = Array.isArray(options.north) ? options.north.map(finiteNumber) : [];
  if (!version) throw new TypeError('Topology InputXML requires explicit version.');
  if (!jobName) throw new TypeError('Topology InputXML requires explicit jobName.');
  if (north.length !== 3 || north.some((value) => value === null)) {
    throw new TypeError('Topology InputXML requires an explicit finite north vector.');
  }
  return {
    version,
    jobName,
    north,
    time: cleanText(options.time),
    issueNo: cleanText(options.issueNo),
  };
}

export function buildTopologyInputXml(canonical, engineering, options) {
  if (!cleanText(canonical.canonicalTopologyHash)) {
    throw new Error('Topology InputXML requires a hashed CanonicalTopology.v1 snapshot.');
  }
  const context = documentContext(options);
  const nodes = nodeMap(canonical);
  const supportData = supportIndex(canonical);
  const engineeringByEdge = buildEdgeEngineeringValues(
    canonical.edges,
    engineering.recordBySourceEntityId,
  );
  const rigidByEdge = new Map();
  for (const rigid of canonical.rigids) {
    rigidByEdge.set(rigid.edgeId, [...(rigidByEdge.get(rigid.edgeId) ?? []), rigid]);
  }
  const bendByEdge = new Map();
  for (const bend of canonical.bends ?? []) {
    const edgeId = bend.edgeIds?.[0];
    if (!edgeId) throw new Error(`Bend ${bend.id} has no owning InputXML edge.`);
    bendByEdge.set(edgeId, [...(bendByEdge.get(edgeId) ?? []), bend]);
  }
  const elements = canonical.edges.map((edge) => elementXml(
    edge,
    nodes,
    engineeringByEdge.get(edge.id),
    supportData.supportsByEdge.get(edge.id) ?? [],
    rigidByEdge.get(edge.id) ?? [],
    bendByEdge.get(edge.id) ?? [],
    supportData.namesByNode,
  )).join('\n');
  const restraintOwnerCount = canonical.supports.filter(
    (support) => (support.restraints ?? []).length > 0,
  ).length;
  const bendCount = (canonical.bends ?? []).length;
  const modelAttributes = [
    ['JOBNAME', context.jobName],
    ['NUMELT', canonical.edges.length],
    ['NUMNOZ', 0],
    ['NOHGRS', 0],
    ['NUMBEND', bendCount],
    ['NUMRIGID', rigidByEdge.size],
    ['NUMEXPJNT', 0],
    ['NUMREST', restraintOwnerCount],
    ['NUMFORCMNT', 0],
    ['NUMUNFLOAD', 0],
    ['NUMWIND', 0],
    ['NUMELEOFF', 0],
    ['NUMALLOW', 0],
    ['NUMISECT', 0],
    ['NORTH_X', context.north[0]],
    ['NORTH_Y', context.north[1]],
    ['NORTH_Z', context.north[2]],
    ['CANONICAL_TOPOLOGY_HASH', canonical.canonicalTopologyHash],
    ['TOPOLOGY_TRACE_LEDGER_HASH', cleanText(options.topologyTraceLedgerHash)],
  ];
  if (context.time) modelAttributes.push(['TIME', context.time]);
  if (context.issueNo) modelAttributes.push(['ISSUE_NO', context.issueNo]);
  if (cleanText(options.topologyEditDraftHash)) {
    modelAttributes.push(['TOPOLOGY_EDIT_DRAFT_HASH', cleanText(options.topologyEditDraftHash)]);
  }
  if (cleanText(options.topologyEditLedgerHash)) {
    modelAttributes.push(['TOPOLOGY_EDIT_LEDGER_HASH', cleanText(options.topologyEditLedgerHash)]);
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<CAESARII xmlns="COADE" VERSION="${xmlAttribute(context.version)}" XML_TYPE="Input">`,
    `  <PIPINGMODEL xmlns="" ${serialize(modelAttributes)}>`,
    elements,
    '  </PIPINGMODEL>',
    '</CAESARII>',
    '',
  ].join('\n');
}

export const _test = Object.freeze({
  finiteNumber,
  fixed,
  globalFixed,
  physicalWall,
  nodeMap,
  engineeringRecord,
  engineeringValues,
  nativeAttributes,
  serialize,
  supportIndex,
  bendXml,
  elementXml,
  documentContext,
});
