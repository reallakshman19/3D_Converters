/**
 * Native CAESAR engineering projection for component topology.
 * Inputs: real managed-stage JSON, identified source model, and explicit
 * projection tolerance. Outputs: resolved component records, grouped supports,
 * split edge specifications, and one rigid assignment per rigid source object.
 * Invalid lineage or an unprojectable engineering object raises explicitly.
 */

import { runEnrichment } from '../../../stagedjson-to-enrichxml/sj-enrichment-engine.js';
import { bestPosition, formatPosition } from '../../../stagedjson-to-enrichxml/sj-point-resolver.js';
import { isRigidType, isSupportType } from '../../../stagedjson-to-enrichxml/sj-type-mapper.js';
import { portForRole } from './topology-connectivity.js';
import { pointSegmentDistance } from './topology-geometry-distance.js';
import { splitEdgeSpecsAtSupports } from './topology-support-edge-splitter.js';
import { cleanText, pointDistance, uniqueText } from './topology-values.js';

/** @param {unknown[]} path @returns {string} */
function componentKey(path) {
  const branchIndex = Number(path[0]);
  const childrenIndex = path.indexOf('children');
  const sourceIndex = Number(path[childrenIndex + 1]);
  if (!Number.isInteger(branchIndex) || !Number.isInteger(sourceIndex)) {
    throw new TypeError(`Enrichment record has an invalid source path: ${JSON.stringify(path)}.`);
  }
  return `${branchIndex}:${sourceIndex}`;
}

/** @param {Record<string, unknown>} component @returns {Record<string, unknown>|null} */
function supportPortOrNull(component) {
  return portForRole(component, 'P') ?? portForRole(component, 'A') ?? portForRole(component, 'L') ?? null;
}

/** @param {Record<string, unknown>} component @returns {Record<string, unknown>} */
function supportPort(component) {
  const port = supportPortOrNull(component);
  if (!port) throw new Error(`Support ${component.sourcePath} has no usable source position port.`);
  return port;
}

/** @param {Record<string, unknown>} model @param {Record<string, unknown>[]} records @returns {Record<string, unknown>} */
function componentRecordIndex(model, records) {
  const byPath = new Map(model.components.map((component) => [`${component.branchIndex}:${component.sourceIndex}`, component]));
  const entries = records.map((record) => {
    const path = componentKey(record.path);
    const component = byPath.get(path);
    if (!component) throw new Error(`Enrichment record ${path} has no source-model component.`);
    return { component, record };
  });
  return {
    entries,
    recordBySourceEntityId: new Map(entries.map(({ component, record }) => [component.sourceEntityId, record])),
  };
}

/** @param {Record<string, unknown>} component @returns {boolean} */
function isProjectedSupport(component) {
  return isSupportType(component.sourceType)
    && cleanText(component.supportProjection?.disposition) !== 'DEFER_SUPPORT';
}

/** @param {Record<string, unknown>} model @param {Record<string, unknown>[]} supportEntries @returns {Record<string, unknown>[]} */
function buildSupportAnchors(model, supportEntries) {
  const anchors = supportEntries.map(({ component, record }, order) => {
    const port = supportPort(component);
    const enrichmentPosition = bestPosition(record.attrs);
    return {
      id: `SA-${String(order + 1).padStart(6, '0')}`,
      order,
      component,
      record,
      port,
      position: port.position,
      positionAuthority: `SOURCE_PORT:${port.role}`,
      positionAuthorityResidualMm: enrichmentPosition
        ? pointDistance(enrichmentPosition, port.position) : null,
      sourceEntityIds: [component.sourceEntityId],
      sourceBranchEntityIds: [component.sourceBranchEntityId],
      sourceBranchNames: [component.sourceBranchName],
      sourcePaths: [component.sourcePath],
      tag: cleanText(record.supportTag || record.cmpSupRefN || record.name),
      restraints: Array.isArray(record.resolved?.restraint)
        ? record.resolved.restraint : [record.resolved?.restraint].filter(Boolean),
    };
  });
  const byPosition = new Map(anchors.map((anchor) => [formatPosition(anchor.position), anchor]));
  const supportComponents = model.components.filter(isProjectedSupport);
  const byName = new Map(model.components.map((component) => [
    cleanText(component.attributes.NAME || component.name), component,
  ]));
  for (const component of supportComponents) {
    const anchor = findSupportAnchor(component, byPosition, byName);
    if (!anchor) throw new Error(`Support ${component.sourcePath} was not retained by the engineering grouping contract.`);
    anchor.sourceEntityIds.push(component.sourceEntityId);
    anchor.sourceBranchEntityIds.push(component.sourceBranchEntityId);
    anchor.sourceBranchNames.push(component.sourceBranchName);
    anchor.sourcePaths.push(component.sourcePath);
  }
  return anchors.map((anchor) => ({
    ...anchor,
    sourceEntityIds: uniqueText(anchor.sourceEntityIds),
    sourceBranchEntityIds: uniqueText(anchor.sourceBranchEntityIds),
    sourceBranchNames: uniqueText(anchor.sourceBranchNames),
    sourcePaths: uniqueText(anchor.sourcePaths),
  }));
}

/** @param {Record<string, unknown>} component @param {Map<string,Record<string,unknown>>} byPosition @param {Map<string,Record<string,unknown>>} byName @returns {Record<string,unknown>|null} */
function findSupportAnchor(component, byPosition, byName) {
  let current = component;
  const visited = new Set();
  while (current && !visited.has(current.sourceEntityId)) {
    visited.add(current.sourceEntityId);
    const position = supportPortOrNull(current)?.position ?? null;
    const direct = position ? byPosition.get(formatPosition(position)) : null;
    if (direct) return direct;
    const currentName = cleanText(current.attributes.NAME || current.name);
    const reference = ['MDSSREF', 'MDSGUIDEREF', 'PREV-NAME']
      .map((field) => cleanText(current.attributes[field]))
      .find((value) => value && value !== currentName && byName.has(value));
    current = reference ? byName.get(reference) : null;
  }
  return null;
}

/** @param {Record<string, unknown>[]} edges @param {Record<string, unknown>[]} nodes @param {Record<string, unknown>[]} rigids @param {number} toleranceMm @returns {Record<string, unknown>[]} */
export function assignRigidEdges(edges, nodes, rigids, toleranceMm) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return rigids.map((rigid) => {
    const natural = edges.filter((edge) => edge.sourceEntityIds.includes(rigid.component.sourceEntityId));
    const branch = edges.filter((edge) => edge.sourceEntityIds.includes(rigid.component.sourceBranchEntityId));
    const naturalIds = new Set(natural.map((edge) => edge.id));
    const branchIds = new Set(branch.map((edge) => edge.id));
    const pool = [
      ...natural,
      ...branch.filter((edge) => !naturalIds.has(edge.id)),
      ...edges.filter((edge) => !naturalIds.has(edge.id) && !branchIds.has(edge.id)),
    ];
    const ranked = pool.map((edge) => ({
      edge,
      authorityRank: naturalIds.has(edge.id) ? 0 : branchIds.has(edge.id) ? 1 : 2,
      distanceMm: pointSegmentDistance(
        rigid.position,
        nodeById.get(edge.fromNodeId).position,
        nodeById.get(edge.toNodeId).position,
      ).distanceMm,
    })).sort((left, right) => left.authorityRank - right.authorityRank
      || left.distanceMm - right.distanceMm || left.edge.id.localeCompare(right.edge.id));
    const selected = ranked[0];
    if (!selected) throw new Error(`Rigid ${rigid.component.sourcePath} has no unique InputXML element assignment.`);
    if (selected.authorityRank === 2 && selected.distanceMm > toleranceMm) {
      throw new Error(`Rigid ${rigid.component.sourcePath} is ${selected.distanceMm} mm from the nearest connected InputXML element; limit is ${toleranceMm} mm.`);
    }
    return {
      sourceEntityId: rigid.component.sourceEntityId,
      sourcePath: rigid.component.sourcePath,
      edgeId: selected.edge.id,
      inputXmlElementId: selected.edge.inputXmlElementIds[0],
      inputXmlNodeId: nodeById.get(selected.edge.toNodeId).inputXmlNodeIds[0],
      connectionResidual: selected.distanceMm,
      componentType: rigid.record.componentType,
      weightKg: Number(rigid.record.resolved?.weightKg ?? rigid.record.sourceWeightKg ?? 0),
    };
  });
}

/** @param {string} sourceText @param {Record<string, unknown>} model @param {{enrichmentConfig:Record<string,unknown>}} options @returns {Readonly<Record<string, unknown>>} */
export function buildTopologyEngineeringProjection(sourceText, model, options) {
  const enrichment = runEnrichment({ stagedJsonText: sourceText, config: options.enrichmentConfig });
  const index = componentRecordIndex(model, enrichment.records);
  const supportEntries = index.entries.filter(({ component, record }) => (
    isSupportType(record.componentType) && isProjectedSupport(component)
  ));
  const supports = buildSupportAnchors(model, supportEntries);
  const deferredSupports = model.components.filter((component) => (
    isSupportType(component.sourceType)
    && cleanText(component.supportProjection?.disposition) === 'DEFER_SUPPORT'
  ));
  const rigids = index.entries.filter(({ record }) => isRigidType(record.componentType)).map(({ component, record }) => ({
    component,
    record,
    position: bestPosition(record.attrs),
  }));
  if (rigids.some((rigid) => !rigid.position)) throw new Error('At least one rigid source component has no valid position.');
  return Object.freeze({
    recordBySourceEntityId: index.recordBySourceEntityId,
    supports: Object.freeze(supports),
    deferredSupports: Object.freeze(deferredSupports.map((component) => Object.freeze({
      sourceEntityId: component.sourceEntityId,
      sourcePath: component.sourcePath,
      sourceBranchEntityId: component.sourceBranchEntityId,
      sourceBranchName: component.sourceBranchName,
      sourceRef: component.sourceRef,
      policy: component.supportProjection,
    }))),
    rigids: Object.freeze(rigids),
    metrics: Object.freeze({
      supports: supports.length,
      deferredSupports: deferredSupports.length,
      restraints: supports.reduce((sum, row) => sum + row.restraints.length, 0),
      rigids: rigids.length,
    }),
  });
}

export { splitEdgeSpecsAtSupports };
