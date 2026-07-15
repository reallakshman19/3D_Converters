/**
 * Native CAESAR II 11 InputXML writer for component topology.
 * Inputs: canonical topology, resolved engineering projection, and job name.
 * Output: globally numbered PIPINGELEMENT records with physical attributes,
 * global coordinates, rigids, restraints, support names, and source lineage.
 * Missing source engineering values remain the native -1.010100 sentinel.
 */

import { RESTRAINT_CODE_MAP } from '../../../stagedjson-to-enrichxml/sj-restraint-resolver.js';
import { isSupportType } from '../../../stagedjson-to-enrichxml/sj-type-mapper.js';
import { resolveMaterialCodeFromLineMaterial } from '../../../../converters/xml-cii2019-core/branch-process-resolver.js';
import { DEFAULT_MATERIAL_MAP_ROWS } from '../../../../converters/xml-cii2019-core/default-material-map-rows.js';
import { cleanText, xmlAttribute } from './topology-values.js';

const SENTINEL = '-1.010100';

/** @param {unknown} value @returns {number|null} */
function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

/** @param {unknown} value @returns {string} */
function fixed(value) {
  const number = finiteNumber(value);
  return number === null ? SENTINEL : number.toFixed(6);
}

/** @param {unknown} value @returns {string} */
function globalFixed(value) {
  const number = finiteNumber(value);
  if (number === null) throw new TypeError(`Invalid canonical global coordinate: ${value}.`);
  return number.toFixed(3);
}

/** @param {number|null} diameter @param {unknown[]} candidates @returns {number|null} */
function physicalWall(diameter, candidates) {
  return candidates.map(finiteNumber).find((wall) => (
    wall !== null && wall > 0 && diameter !== null && wall * 2 < diameter
  )) ?? null;
}

/** @param {Record<string, unknown>} canonical @returns {Map<string,Record<string,unknown>>} */
function nodeMap(canonical) {
  return new Map(canonical.nodes.map((node) => [node.id, node]));
}

/** @param {Record<string, unknown>} edge @param {Map<string,Record<string,unknown>>} records @returns {Record<string,unknown>|null} */
function engineeringRecord(edge, records) {
  return edge.sourceEntityIds.map((id) => records.get(id)).find((record) => (
    record && !isSupportType(record.componentType)
  )) ?? null;
}

/** @param {Record<string, unknown>|null} record @returns {Record<string,unknown>} */
function engineeringValues(record) {
  const resolved = record?.resolved ?? {};
  const enriched = record?.enrichedAttributes ?? {};
  const attrs = record?.attrs ?? {};
  const diameter = finiteNumber(enriched.pipeOdMm ?? resolved.odMm);
  const pressure = enriched.designPressureMpa ?? enriched.designPressure ?? attrs.ITEMPRES1 ?? attrs.PRES1;
  const hydro = enriched.hydroPressure ?? attrs.HPRES;
  const materialDensity = finiteNumber(enriched.materialDensityKgM3 ?? attrs.MDEN);
  const insulationDensity = finiteNumber(enriched.insulationDensityKgM3 ?? attrs.IDEN);
  const fluidDensity = finiteNumber(enriched.fluidDensityOpeKgM3 ?? attrs.FDENSITY ?? attrs.FLDEN);
  const directMaterialCode = enriched.materialCode ?? attrs.MESC;
  const mappedMaterial = directMaterialCode ? null : [enriched.material, attrs.MTXX].map((material) => (
    resolveMaterialCodeFromLineMaterial({
      lineRow: { material }, materialMap: DEFAULT_MATERIAL_MAP_ROWS, pipingClassRow: null,
      pipingClass: enriched.pipingClass ?? attrs.SPRE,
      overrides: {}, overrideKeys: [], xmlNode: null, xmlBranch: null,
      config: { useDefaultPipingClassMaterialCodeMap: true },
    })
  )).find((result) => result.materialCode) ?? null;
  return {
    diameter,
    wall: physicalWall(diameter, [resolved.wallMm, enriched.wallThicknessMm, attrs.WTHK, attrs.WTXX]),
    insulation: finiteNumber(enriched.insulationThicknessMm ?? record?.insuMm) ?? 0,
    corrosion: finiteNumber(enriched.corrosionAllowanceMm ?? resolved.corrMm) ?? 0,
    temperature: enriched.designTemperatureC ?? attrs.ITEMTEMP1 ?? attrs.TEMP1,
    pressure,
    hydro,
    modulus: enriched.modulusMpa ?? attrs.YMOD ?? attrs.EMOD,
    poisson: enriched.poissonsRatio ?? attrs.PRAT,
    pipeDensity: materialDensity === null ? null : materialDensity / 1_000_000,
    insulationDensity: insulationDensity === null ? null : insulationDensity / 1_000_000,
    fluidDensity: fluidDensity === null ? null : fluidDensity / 1_000_000,
    materialNumber: directMaterialCode ?? mappedMaterial?.materialCode,
    materialName: mappedMaterial?.material ?? enriched.material ?? attrs.MTXX ?? attrs.MESC,
    lineId: enriched.lineNo ?? record?.branchName,
    name: record?.name,
  };
}

/** @param {Record<string, unknown>} edge @param {Record<string, unknown>} from @param {Record<string, unknown>} to @param {Record<string,unknown>} values @param {string} fromName @param {string} toName @returns {Array<[string,unknown]>} */
function nativeAttributes(edge, from, to, values, fromName, toName) {
  const delta = { x: to.position.x - from.position.x, y: to.position.y - from.position.y, z: to.position.z - from.position.z };
  const attributes = [
    ['ID', edge.inputXmlElementIds[0]], ['FROM_NODE', fixed(from.inputXmlNodeIds[0])], ['TO_NODE', fixed(to.inputXmlNodeIds[0])],
    ['DELTA_X', fixed(delta.x)], ['DELTA_Y', fixed(delta.y)], ['DELTA_Z', fixed(delta.z)],
    ['DIAMETER', fixed(values.diameter)], ['WALL_THICK', fixed(values.wall)], ['INSUL_THICK', fixed(values.insulation)],
    ['CORR_ALLOW', fixed(values.corrosion)], ['TEMP_EXP_C1', fixed(values.temperature)],
  ];
  for (let index = 2; index <= 9; index += 1) attributes.push([`TEMP_EXP_C${index}`, SENTINEL]);
  attributes.push(['PRESSURE1', fixed(values.pressure)]);
  for (let index = 2; index <= 9; index += 1) attributes.push([`PRESSURE${index}`, SENTINEL]);
  attributes.push(
    ['HYDRO_PRESSURE', fixed(values.hydro)], ['MODULUS', fixed(values.modulus)],
    ['POISSONS', fixed(values.poisson)], ['PIPE_DENSITY', fixed(values.pipeDensity)],
    ['INSUL_DENSITY', fixed(values.insulationDensity)], ['FLUID_DENSITY', fixed(values.fluidDensity)],
    ['MATERIAL_NUM', fixed(values.materialNumber)], ['MATERIAL_NAME', cleanText(values.materialName)],
    ['NAME', cleanText(values.name)], ['LINE_ID', cleanText(values.lineId)],
    ['FROM_NAME', fromName], ['TO_NAME', toName],
    ['FROM_GLOBAL_X', globalFixed(from.position.x)], ['FROM_GLOBAL_Y', globalFixed(from.position.y)], ['FROM_GLOBAL_Z', globalFixed(from.position.z)],
    ['TO_GLOBAL_X', globalFixed(to.position.x)], ['TO_GLOBAL_Y', globalFixed(to.position.y)], ['TO_GLOBAL_Z', globalFixed(to.position.z)],
    ['GLOBAL_COORD_BASIS_NODE', from.inputXmlNodeIds[0]],
    ['SOURCE_TYPE', edge.sourceTypes[0]], ['SOURCE_ENTITY_IDS', edge.sourceEntityIds.join(',')],
    ['CANONICAL_EDGE_ID', edge.id], ['TOPOLOGY_OPERATION', edge.segmentRole],
  );
  return attributes;
}

/** @param {Record<string,unknown>} restraint @param {string} nodeId @param {number} index @param {string} supportId @param {string} tag @returns {string} */
function restraintXml(restraint, nodeId, index, supportId, tag) {
  const type = cleanText(restraint.type || restraint.kind).toUpperCase();
  const code = RESTRAINT_CODE_MAP[type];
  if (!Number.isFinite(code)) throw new Error(`Unsupported CAESAR restraint type ${type || '(blank)'}.`);
  const cosine = type === '+X' ? [1, 0, 0] : type === '+Y' ? [0, 1, 0] : type === '+Z' ? [0, 0, 1] : [0, 0, 0];
  const attributes = [
    ['NUM', fixed(index + 1)], ['NODE', fixed(nodeId)], ['TYPE', fixed(code)],
    ['STIFFNESS', fixed(restraint.stiffness)], ['GAP', fixed(restraint.gap)], ['FRIC_COEF', fixed(restraint.friction)],
    ['CNODE', SENTINEL], ['XCOSINE', fixed(cosine[0])], ['YCOSINE', fixed(cosine[1])], ['ZCOSINE', fixed(cosine[2])],
    ['TAG', tag], ['GUID', ''],
  ];
  attributes.unshift(['ID', `RESTRAINT:${supportId}:${index + 1}`]);
  return `      <RESTRAINT ${serialize(attributes)}/>`;
}

/** @param {Array<[string,unknown]>} attributes @returns {string} */
function serialize(attributes) {
  return attributes.map(([name, value]) => `${name}="${xmlAttribute(value)}"`).join(' ');
}

/** @param {Record<string,unknown>} canonical @returns {{supportsByEdge:Map<string,Record<string,unknown>[]>,namesByNode:Map<string,string>}} */
function supportIndex(canonical) {
  const supportsByEdge = new Map(), namesByNode = new Map();
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

/** @param {Record<string, unknown>} edge @param {Map<string,Record<string,unknown>>} nodes @param {Record<string,unknown>|null} record @param {Record<string,unknown>[]} supports @param {Record<string,unknown>[]} rigids @param {Map<string,string>} names @returns {string} */
function elementXml(edge, nodes, record, supports, rigids, names) {
  const from = nodes.get(edge.fromNodeId), to = nodes.get(edge.toNodeId);
  if (!from || !to) throw new Error(`InputXML edge ${edge.id} references a missing canonical node.`);
  const attributes = nativeAttributes(edge, from, to, engineeringValues(record), names.get(from.id) ?? '', names.get(to.id) ?? '');
  const children = [];
  if (rigids.length) {
    const weight = rigids.reduce((sum, rigid) => sum + Number(rigid.weightKg || 0), 0);
    const types = [...new Set(rigids.map((rigid) => cleanText(rigid.componentType)).filter(Boolean))];
    const sourceIds = rigids.map((rigid) => rigid.sourceEntityId).join(',');
    children.push(`      <RIGID ID="RIGID:${xmlAttribute(edge.id)}" WEIGHT="${fixed(weight)}" TYPE="${xmlAttribute(types.join('+'))}" SOURCE_BODY_COUNT="${rigids.length}" SOURCE_ENTITY_IDS="${xmlAttribute(sourceIds)}"/>`);
  }
  for (const support of supports) for (const [index, restraint] of support.restraints.entries()) {
    children.push(restraintXml(restraint, support.inputXmlNodeId, index, support.id, support.tag));
  }
  return `    <PIPINGELEMENT ${serialize(attributes)}>\n${children.join('\n')}${children.length ? '\n' : ''}    </PIPINGELEMENT>`;
}

/** @param {Record<string, unknown>} canonical @param {Record<string,unknown>} engineering @param {{jobName:string}} options @returns {string} */
export function buildTopologyInputXml(canonical, engineering, options) {
  const nodes = nodeMap(canonical), supportData = supportIndex(canonical);
  const rigidByEdge = new Map();
  for (const rigid of canonical.rigids) rigidByEdge.set(rigid.edgeId, [...(rigidByEdge.get(rigid.edgeId) ?? []), rigid]);
  const elements = canonical.edges.map((edge) => elementXml(
    edge, nodes, engineeringRecord(edge, engineering.recordBySourceEntityId),
    supportData.supportsByEdge.get(edge.id) ?? [], rigidByEdge.get(edge.id) ?? [], supportData.namesByNode,
  )).join('\n');
  const restraintCount = canonical.supports.reduce((sum, support) => sum + support.restraints.length, 0);
  const bendCount = canonical.edges.filter((edge) => edge.segmentRole.includes('ELBO/BEND_RUN_IN')).length;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<CAESARII xmlns="COADE" VERSION="11.00" XML_TYPE="Input">',
    `  <PIPINGMODEL xmlns="" JOBNAME="${xmlAttribute(options.jobName)}" NUMELT="${canonical.edges.length}" NUMNOZ="0" NOHGRS="0" NUMBEND="${bendCount}" NUMRIGID="${rigidByEdge.size}" NUMEXPJNT="0" NUMREST="${restraintCount}" NUMFORCMNT="0" NUMUNFLOAD="0" NUMWIND="0" NUMELEOFF="0" NUMALLOW="0" NUMISECT="0" NORTH_X="0" NORTH_Y="1" NORTH_Z="0">`,
    elements,
    '  </PIPINGMODEL>',
    '</CAESARII>',
    '',
  ].join('\n');
}
