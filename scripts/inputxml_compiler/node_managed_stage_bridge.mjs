#!/usr/bin/env node

import fs from 'node:fs';
import {
  buildComponentTopologyArtifacts,
} from '../../tabs/model-converters/converters/component-topology/topology-artifact-exporter.js';
import { buildTopologySourceModel } from '../../tabs/model-converters/converters/component-topology/topology-source-model.js';
import {
  SUPPORT_PROJECTION_TOLERANCE_MM,
  TOPOLOGY_TOLERANCE_MM,
} from '../../tabs/model-converters/converters/component-topology/topology-values.js';

const sourceText = fs.readFileSync(0, 'utf8');
const context = JSON.parse(process.env.INPUTXML_COMPILER_MANAGED_STAGE_CONTEXT || '{}');
const sourceName = String(context.sourceName || 'managed-stage.json');
const jobName = String(context.jobName || sourceName.replace(/\.json$/i, '') || 'MANAGED_STAGE_CANONICAL');

try {
  const sourceModel = await buildTopologySourceModel(sourceText, {
    sourceName,
    toleranceMm: TOPOLOGY_TOLERANCE_MM,
  });
  const artifacts = await buildComponentTopologyArtifacts(sourceText, {
    sourceName,
    jobName,
    toleranceMm: TOPOLOGY_TOLERANCE_MM,
    supportProjectionToleranceMm: SUPPORT_PROJECTION_TOLERANCE_MM,
    enrichmentConfig: context.enrichmentConfig && typeof context.enrichmentConfig === 'object'
      ? context.enrichmentConfig : {},
  });
  const sourceEntities = sourceModel.entities.map((entity) => ({
    sourceEntityId: entity.sourceEntityId,
    sourcePath: entity.sourcePath,
    sourceType: entity.sourceType,
    name: entity.name,
    sourceRef: entity.sourceRef,
    sourceBranchEntityId: entity.sourceBranchEntityId || '',
    sourceBranchName: entity.sourceBranchName || '',
    attributes: entity.attributes || {},
    enrichedAttributes: entity.enrichedAttributes || {},
    geometryClassification: entity.geometryClassification || 'BRANCH',
    finiteSpan: entity.finiteSpan === true,
    spanLengthMm: Number.isFinite(entity.spanLengthMm) ? entity.spanLengthMm : null,
    supportProjection: entity.supportProjection || null,
    ports: (entity.ports || []).map((port) => ({
      sourcePortId: port.sourcePortId,
      sourceEntityId: port.sourceEntityId,
      sourcePath: port.sourcePath,
      field: port.field,
      role: port.role,
      position: port.position,
    })),
  }));
  process.stdout.write(JSON.stringify({
    ok: true,
    sourceIdentity: sourceModel.sourceIdentity,
    sourceEntities,
    sourcePorts: sourceModel.sourcePorts,
    canonicalTopology: artifacts.canonicalTopology,
    traceLedger: artifacts.traceLedger,
    topologyInputXml: artifacts.topologyInputXml,
    metrics: artifacts.metrics,
    buildIssues: artifacts.buildIssues,
  }));
} catch (error) {
  process.stdout.write(JSON.stringify({
    ok: false,
    error: error?.message || String(error),
    stack: error?.stack || '',
  }));
  process.exitCode = 2;
}
