/**
 * Component-aware topology InputXML writer.
 * Inputs: CanonicalTopology.v1 and explicit job name. Output: paired
 * PIPINGELEMENT XML with node/vector/source lineage only. Engineering fields,
 * restraints, inferred anchors, weights, and SIF values are intentionally absent.
 */

import {
  formatNumber,
  xmlAttribute,
} from './topology-values.js';

/** @param {Record<string, unknown>} canonical @returns {Map<string,Record<string,unknown>>} */
function nodeMap(canonical) {
  return new Map(canonical.nodes.map((node) => [node.id, node]));
}

/** @param {Record<string, unknown>} edge @param {Map<string,Record<string,unknown>>} nodes @returns {string} */
function elementXml(edge, nodes) {
  const from = nodes.get(edge.fromNodeId), to = nodes.get(edge.toNodeId);
  if (!from || !to) throw new Error(`InputXML edge ${edge.id} references a missing canonical node.`);
  const delta = {
    x: to.position.x - from.position.x,
    y: to.position.y - from.position.y,
    z: to.position.z - from.position.z,
  };
  const attributes = [
    ['ID', edge.inputXmlElementIds[0]],
    ['FROM_NODE', from.inputXmlNodeIds[0]],
    ['TO_NODE', to.inputXmlNodeIds[0]],
    ['DELTA_X', formatNumber(delta.x)],
    ['DELTA_Y', formatNumber(delta.y)],
    ['DELTA_Z', formatNumber(delta.z)],
    ['SOURCE_TYPE', edge.sourceTypes[0]],
    ['SOURCE_ENTITY_IDS', edge.sourceEntityIds.join(',')],
    ['CANONICAL_EDGE_ID', edge.id],
    ['TOPOLOGY_OPERATION', edge.segmentRole],
  ];
  const serialized = attributes.map(([name, value]) => `${name}="${xmlAttribute(value)}"`).join(' ');
  return `    <PIPINGELEMENT ${serialized}>\n    </PIPINGELEMENT>`;
}

/** @param {Record<string, unknown>} canonical @param {{jobName:string}} options @returns {string} */
export function buildTopologyInputXml(canonical, options) {
  const nodes = nodeMap(canonical);
  const elements = canonical.edges.map((edge) => elementXml(edge, nodes)).join('\n');
  const jobName = xmlAttribute(options.jobName);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<CAESARII xmlns="COADE" VERSION="2019" XML_TYPE="Input">',
    `  <PIPINGMODEL xmlns="" JOBNAME="${jobName}" NUMELT="${canonical.edges.length}" NUMNOZ="0" NOHGRS="0" NUMBEND="0" NUMRIGID="0" NUMEXPJNT="0" NUMREST="0" NUMFORCMNT="0" NUMUNFLOAD="0" NUMWIND="0" NUMELEOFF="0" NUMALLOW="0" NUMISECT="0" NORTH_X="0" NORTH_Y="1" NORTH_Z="0">`,
    elements,
    '  </PIPINGMODEL>',
    '</CAESARII>',
    '',
  ].join('\n');
}
