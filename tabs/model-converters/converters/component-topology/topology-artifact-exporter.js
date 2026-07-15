/**
 * Component-topology artifact orchestrator.
 * Input: original managed JSON text plus explicit source/job/tolerance options.
 * Output: canonical topology, trace ledger, topology InputXML, and metrics.
 * Failures are explicit; the source object and all produced artifacts are separate.
 */

import { buildTopologySourceModel } from './topology-source-model.js';
import { buildExplicitConnectivity } from './topology-connectivity.js';
import { buildCanonicalTopology } from './topology-canonical-builder.js';
import { buildTopologyTraceLedger } from './topology-ledger-builder.js';
import { buildTopologyInputXml } from './topology-inputxml-writer.js';
import { buildTopologyEngineeringProjection } from './topology-engineering-projection.js';
import {
  cleanText,
  componentCategory,
  pointDistance,
} from './topology-values.js';

/** @param {Record<string, unknown>} model @returns {Record<string, number>} */
function componentCounts(model) {
  const counts = {};
  for (const component of model.components) {
    const category = componentCategory(component.sourceType);
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

/** @param {Record<string, unknown>} model @returns {Record<string, number>} */
function referenceCounts(model) {
  const branchNames = new Set(model.branches.map((branch) => cleanText(branch.name)));
  const componentAliases = new Set(model.components.flatMap((component) => [component.sourceRef, component.name]).map(cleanText).filter(Boolean));
  const branchReferences = model.branches.flatMap((branch) => ['HREF', 'TREF'].flatMap((field) => {
    const value = cleanText(branch.attributes[field]);
    return value ? [{ value, resolved: branchNames.has(value) || componentAliases.has(value) }] : [];
  }));
  const crefReferences = model.components.flatMap((component) => {
    const value = cleanText(component.attributes.CREF);
    return value ? [{ value, resolved: branchNames.has(value) }] : [];
  });
  return {
    cref: crefReferences.length,
    resolvedCref: crefReferences.filter((row) => row.resolved).length,
    hrefTref: branchReferences.length,
    resolvedHrefTref: branchReferences.filter((row) => row.resolved).length,
    externalReferences: branchReferences.filter((row) => !row.resolved).length,
  };
}

/** @param {Record<string, unknown>} model @param {Record<string, unknown>} canonical @param {Record<string, unknown>} ledger @param {number} toleranceMm @returns {Readonly<Record<string, unknown>>} */
function artifactMetrics(model, canonical, ledger, engineering, toleranceMm) {
  const nodes = new Map(canonical.nodes.map((node) => [node.id, node]));
  const zeroLengthEdges = canonical.edges.filter((edge) => pointDistance(
    nodes.get(edge.fromNodeId)?.position ?? null,
    nodes.get(edge.toNodeId)?.position ?? null,
  ) <= toleranceMm).length;
  return Object.freeze({
    source: Object.freeze({
      branches: model.branches.length,
      childRecords: model.components.length,
      routeComponents: model.components.filter((component) => component.isRouteComponent).length,
      supports: model.components.filter((component) => componentCategory(component.sourceType) === 'SUPPORT').length,
      componentCounts: Object.freeze(componentCounts(model)),
    }),
    references: Object.freeze(referenceCounts(model)),
    canonical: Object.freeze({
      nodes: canonical.nodes.length,
      edges: canonical.edges.length,
      pointFeatures: canonical.pointFeatures.length,
      junctions: canonical.junctions.length,
      boundaries: canonical.boundaries.length,
      supports: canonical.supports.length,
      rigids: canonical.rigids.length,
      zeroLengthEdges,
    }),
    ledger: Object.freeze({
      records: ledger.records.length,
      routeRecords: ledger.summary.routeRecords,
      blockedRecords: ledger.summary.blockedRecords,
      deferredSupports: ledger.records.filter((row) => row.primaryDisposition === 'DEFER_SUPPORT').length,
    }),
    engineering: engineering.metrics,
    inputXml: Object.freeze({
      elements: canonical.edges.length,
      restraints: canonical.supports.reduce((sum, support) => sum + support.restraints.length, 0),
      rigids: new Set(canonical.rigids.map((rigid) => rigid.edgeId)).size,
      rigidBodies: canonical.rigids.length,
    }),
  });
}

/** @param {string} sourceText @param {{sourceName:string,jobName:string,toleranceMm:number,supportProjectionToleranceMm:number,enrichmentConfig:Record<string,unknown>}} options @returns {Promise<Readonly<Record<string, unknown>>>} */
export async function buildComponentTopologyArtifacts(sourceText, options) {
  const model = await buildTopologySourceModel(sourceText, {
    sourceName: options.sourceName,
    toleranceMm: options.toleranceMm,
  });
  const engineering = buildTopologyEngineeringProjection(sourceText, model, {
    enrichmentConfig: options.enrichmentConfig,
  });
  const connectivity = buildExplicitConnectivity(model, options.toleranceMm);
  const canonicalTopology = buildCanonicalTopology(
    model, connectivity, engineering, options.toleranceMm, options.supportProjectionToleranceMm,
  );
  const traceLedger = buildTopologyTraceLedger(model, canonicalTopology);
  const topologyInputXml = buildTopologyInputXml(canonicalTopology, engineering, { jobName: options.jobName });
  const metrics = artifactMetrics(model, canonicalTopology, traceLedger, engineering, options.toleranceMm);
  return Object.freeze({
    sourceIdentity: model.sourceIdentity,
    canonicalTopology,
    traceLedger,
    topologyInputXml,
    metrics,
    buildIssues: canonicalTopology.buildIssues,
  });
}

/** @param {Readonly<Record<string, unknown>>} artifacts @param {{stem:string}} options @returns {ReadonlyArray<Readonly<Record<string, string>>>} */
export function topologyArtifactOutputs(artifacts, options) {
  return Object.freeze([
    Object.freeze({
      name: `${options.stem}.canonical-topology.json`,
      text: `${JSON.stringify(artifacts.canonicalTopology, null, 2)}\n`,
      mime: 'application/json;charset=utf-8',
    }),
    Object.freeze({
      name: `${options.stem}.topology-trace-ledger.json`,
      text: `${JSON.stringify(artifacts.traceLedger, null, 2)}\n`,
      mime: 'application/json;charset=utf-8',
    }),
    Object.freeze({
      name: `${options.stem}.topology.input.xml`,
      text: artifacts.topologyInputXml,
      mime: 'application/xml;charset=utf-8',
    }),
  ]);
}
