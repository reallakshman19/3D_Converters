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

/** @param {{x:number,y:number,z:number}} point @param {{x:number,y:number,z:number}} start @param {{x:number,y:number,z:number}} end @returns {{distanceMm:number,parameter:number,projected:{x:number,y:number,z:number}}} */
function pointSegmentDistance(point, start, end) {
  const vector = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
  const offset = { x: point.x - start.x, y: point.y - start.y, z: point.z - start.z };
  const lengthSquared = vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
  const raw = lengthSquared
    ? (offset.x * vector.x + offset.y * vector.y + offset.z * vector.z) / lengthSquared : 0;
  const parameter = Math.max(0, Math.min(1, raw));
  const projected = {
    x: start.x + parameter * vector.x,
    y: start.y + parameter * vector.y,
    z: start.z + parameter * vector.z,
  };
  return { distanceMm: pointDistance(point, projected), parameter, projected };
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

/** @param {{x:number,y:number,z:number}|null} point @returns {string} */
function pointText(point) {
  if (!point) return '(none)';
  return `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
}

/** @param {number|undefined} value @returns {string} */
function distanceText(value) {
  return Number.isFinite(value) ? Number(value).toFixed(3) : 'unbounded';
}

/** @param {Record<string, unknown>[]} edgeSpecs @param {Record<string, unknown>} support @param {boolean} owningOnly @returns {Record<string, unknown>[]} */
function rankedSupportCandidates(edgeSpecs, support, owningOnly) {
  return edgeSpecs.flatMap((edge, index) => {
    const owns = support.sourceBranchEntityIds.some((id) => edge.sourceEntityIds.includes(id));
    if (owningOnly && !owns) return [];
    const proximity = pointSegmentDistance(support.position, edge.fromPort.position, edge.toPort.position);
    return [{ edge, index, owns, ...proximity }];
  }).sort((left, right) => left.distanceMm - right.distanceMm || left.index - right.index);
}

/** @param {Record<string, unknown>} support @param {Record<string, unknown>|undefined} owning @param {Record<string, unknown>|undefined} global @param {number} toleranceMm @returns {Error} */
function supportProjectionError(support, owning, global, toleranceMm) {
  const classification = global && global.distanceMm <= toleranceMm
    ? 'POSSIBLE_WRONG_BRANCH_OWNERSHIP' : 'SOURCE_SUPPORT_POSITION_OR_ROUTE_INVALID';
  const owningText = owning
    ? `${owning.edge.sourcePath}/${owning.edge.segmentRole}@${pointText(owning.projected)}` : '(none)';
  const globalText = global
    ? `${global.edge.sourcePath}/${global.edge.segmentRole}@${pointText(global.projected)}:${distanceText(global.distanceMm)}mm` : '(none)';
  return new Error(
    `Support ${support.tag || support.id} is ${distanceText(owning?.distanceMm)} mm from its owning branch; limit is ${distanceText(toleranceMm)} mm. `
    + `[${classification}] sourcePath=${support.sourcePaths.join('|')}; branches=${support.sourceBranchNames.join('|')}; `
    + `positionAuthority=${support.positionAuthority}; position=${pointText(support.position)}; nearestOwning=${owningText}; nearestAny=${globalText}.`,
  );
}

/** @param {Record<string, unknown>[]} edgeSpecs @param {Record<string, unknown>[]} supports @param {number} toleranceMm @returns {Map<number,Record<string, unknown>[]>} */
function matchSupportsToEdges(edgeSpecs, supports, toleranceMm) {
  const matches = new Map();
  for (const support of supports) {
    const owningCandidates = rankedSupportCandidates(edgeSpecs, support, true);
    const allCandidates = rankedSupportCandidates(edgeSpecs, support, false);
    const match = owningCandidates[0];
    if (!match || match.distanceMm > toleranceMm) {
      throw supportProjectionError(support, match, allCandidates[0], toleranceMm);
    }
    support.connectionResidual = match.distanceMm;
    support.edgeParameter = match.parameter;
    matches.set(match.index, [...(matches.get(match.index) ?? []), support]);
  }
  return matches;
}

/** @param {Record<string, unknown>} spec @param {Record<string, unknown>[]} supports @param {Readonly<Record<string, unknown>>} set @param {number} topologyToleranceMm @returns {Record<string, unknown>[]} */
function splitOneEdge(spec, supports, set, topologyToleranceMm) {
  const ordered = [...supports].sort((left, right) => left.edgeParameter - right.edgeParameter || left.order - right.order);
  const interior = [];
  const atStart = [], atEnd = [];
  for (const support of ordered) {
    if (pointDistance(support.position, spec.fromPort.position) <= topologyToleranceMm) {
      set.unite(support.port.key, spec.fromPort.key);
      atStart.push(support);
    } else if (pointDistance(support.position, spec.toPort.position) <= topologyToleranceMm) {
      set.unite(support.port.key, spec.toPort.key);
      atEnd.push(support);
    } else interior.push(support);
  }
  const interiorPoints = [];
  for (const support of interior) {
    const previous = interiorPoints.at(-1);
    if (previous && pointDistance(previous.port.position, support.position) <= topologyToleranceMm) {
      set.unite(previous.port.key, support.port.key);
      previous.supports.push(support);
    } else interiorPoints.push({ port: support.port, supports: [support] });
  }
  const points = [{ port: spec.fromPort, supports: atStart }, ...interiorPoints, { port: spec.toPort, supports: atEnd }];
  return points.slice(1).map((point, index) => {
    const attachments = uniqueText([...points[index].supports, ...point.supports].flatMap((row) => row.sourceEntityIds));
    return {
      ...spec,
      fromPort: points[index].port,
      toPort: point.port,
      sourceEntityIds: uniqueText([...spec.sourceEntityIds, ...attachments]),
      sourceTypes: attachments.length ? uniqueText([...spec.sourceTypes, 'SUPPORT']) : spec.sourceTypes,
      segmentRole: interior.length ? `${spec.segmentRole}_SUPPORT_SPLIT` : spec.segmentRole,
    };
  });
}

/** @param {Record<string, unknown>[]} specs @param {Record<string, unknown>[]} supports @param {Record<string, unknown>} connectivity @param {number} topologyToleranceMm @param {number} projectionToleranceMm @returns {Record<string, unknown>[]} */
export function splitEdgeSpecsAtSupports(specs, supports, connectivity, topologyToleranceMm, projectionToleranceMm) {
  const matches = matchSupportsToEdges(specs, supports, projectionToleranceMm);
  return specs.flatMap((spec, index) => {
    const assigned = matches.get(index) ?? [];
    return assigned.length ? splitOneEdge(spec, assigned, connectivity.set, topologyToleranceMm) : [spec];
  });
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
