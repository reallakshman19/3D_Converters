/**
 * Component-topology artifact orchestrator.
 * CanonicalTopology.v1 is built once, stamped, and used unchanged by the
 * topology InputXML writer and TopologySvgScene.v1 builder. Generated InputXML
 * is parsed back and exact three-way topology parity is a fail-closed gate.
 */

import { buildTopologySourceModel } from './topology-source-model.js';
import { buildExplicitConnectivity } from './topology-connectivity.js';
import { buildCanonicalTopology } from './topology-canonical-builder.js';
import { buildTopologyTraceLedger } from './topology-ledger-builder.js';
import { buildTopologyInputXml } from './topology-inputxml-writer.js';
import { buildTopologyEngineeringProjection } from './topology-engineering-projection.js';
import { enrichCanonicalTopologyIdentity, enrichTopologyTraceLedgerIdentity } from './topology-artifact-identity.js';
import { stampArtifactHash } from './topology-deterministic-hash.js';
import { buildTopologySvgScene } from './topology-svg-scene-builder.js';
import { parseTopologyInputXml } from './topology-inputxml-topology-parser.js';
import {
  buildTopologyParityReport,
  topologyParityMismatchesCsv,
  TopologyParityError,
} from './topology-parity-engine.js';
import { cleanText, componentCategory, pointDistance } from './topology-values.js';

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

/** @param {Record<string, unknown>} model @param {Record<string, unknown>} canonical @param {Record<string, unknown>} ledger @param {Record<string, unknown>} engineering @param {Record<string, unknown>} parsed @param {Record<string, unknown>} scene @param {Record<string, unknown>} parity @param {number} toleranceMm @returns {Readonly<Record<string, unknown>>} */
function artifactMetrics(model, canonical, ledger, engineering, parsed, scene, parity, toleranceMm) {
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
      elements: parsed.elements.length,
      nodes: parsed.nodes.length,
      restraints: parsed.restraints.length,
      rigids: parsed.rigids.length,
      parseIssues: parsed.issues.length,
    }),
    svgScene: scene.summary,
    parity: parity.summary,
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
  const builtCanonical = buildCanonicalTopology(
    model, connectivity, engineering, options.toleranceMm, options.supportProjectionToleranceMm,
  );
  const canonicalTopology = stampArtifactHash(
    enrichCanonicalTopologyIdentity(builtCanonical, model), 'canonicalTopologyHash',
  );
  const builtLedger = buildTopologyTraceLedger(model, canonicalTopology);
  const traceLedger = stampArtifactHash(enrichTopologyTraceLedgerIdentity(
    builtLedger, canonicalTopology, model, engineering, {
      sourceName: options.sourceName,
      topologyToleranceMm: options.toleranceMm,
      supportProjectionToleranceMm: options.supportProjectionToleranceMm,
    },
  ), 'topologyTraceLedgerHash');
  const topologyInputXml = buildTopologyInputXml(canonicalTopology, engineering, {
    jobName: options.jobName,
    topologyTraceLedgerHash: traceLedger.topologyTraceLedgerHash,
  });
  const parsedInputXmlTopology = parseTopologyInputXml(topologyInputXml);
  const topologySvgScene = buildTopologySvgScene(canonicalTopology, traceLedger, canonicalTopology.buildIssues);
  const topologyParityReport = buildTopologyParityReport({
    canonicalTopology,
    traceLedger,
    parsedInputXmlTopology,
    topologySvgScene,
  });
  const metrics = artifactMetrics(
    model, canonicalTopology, traceLedger, engineering,
    parsedInputXmlTopology, topologySvgScene, topologyParityReport, options.toleranceMm,
  );
  const artifacts = Object.freeze({
    sourceIdentity: model.sourceIdentity,
    canonicalTopology,
    traceLedger,
    topologyInputXml,
    parsedInputXmlTopology,
    topologySvgScene,
    topologyParityReport,
    topologyParityMismatchesCsv: topologyParityMismatchesCsv(topologyParityReport),
    metrics,
    buildIssues: canonicalTopology.buildIssues,
  });
  if (!topologyParityReport.ok) throw new TopologyParityError(topologyParityReport);
  return artifacts;
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
    Object.freeze({
      name: `${options.stem}.topology-svg-scene.json`,
      text: `${JSON.stringify(artifacts.topologySvgScene, null, 2)}\n`,
      mime: 'application/json;charset=utf-8',
    }),
    Object.freeze({
      name: `${options.stem}.parsed-inputxml-topology.json`,
      text: `${JSON.stringify(artifacts.parsedInputXmlTopology, null, 2)}\n`,
      mime: 'application/json;charset=utf-8',
    }),
    Object.freeze({
      name: `${options.stem}.topology-parity-report.json`,
      text: `${JSON.stringify(artifacts.topologyParityReport, null, 2)}\n`,
      mime: 'application/json;charset=utf-8',
    }),
    Object.freeze({
      name: `${options.stem}.topology-parity-mismatches.csv`,
      text: artifacts.topologyParityMismatchesCsv,
      mime: 'text/csv;charset=utf-8',
    }),
  ]);
}

export const _test = Object.freeze({ componentCounts, referenceCounts, artifactMetrics });
