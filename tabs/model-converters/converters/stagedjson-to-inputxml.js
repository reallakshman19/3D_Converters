import { decodeTextUtf8, baseNameWithoutExtension } from '../core/output-utils.js';
import {
  buildComponentTopologyArtifacts,
  topologyArtifactOutputs,
} from './component-topology/topology-artifact-exporter.js';
import {
  SUPPORT_PROJECTION_TOLERANCE_MM,
  TOPOLOGY_TOLERANCE_MM,
} from './component-topology/topology-values.js';

async function buildTopologyOutputs(sourceText, sourceName, stem) {
  const artifacts = await buildComponentTopologyArtifacts(sourceText, {
    sourceName,
    jobName: stem,
    toleranceMm: TOPOLOGY_TOLERANCE_MM,
    supportProjectionToleranceMm: SUPPORT_PROJECTION_TOLERANCE_MM,
    enrichmentConfig: {},
  });
  const blocking = artifacts.buildIssues.filter((issue) => issue.blocking !== false);
  if (blocking.length) {
    throw new Error(`Component topology export has ${blocking.length} blocking finding(s).`);
  }
  return topologyArtifactOutputs(artifacts, { stem });
}

export async function run(context) {
  if (!context.workerRunner) {
    throw new Error('Python worker runtime is not available.');
  }
  const primary = context.inputFiles.find(f => f.role === 'primary');
  if (!primary || !primary.bytes) {
    throw new Error('Primary staged JSON input is required for StagedJSON -> InputXML conversion.');
  }

  const response = await context.workerRunner.runJob({
    converterId: context.converterId,
    inputFiles: context.inputFiles,
    options: context.options,
  });

  const stagedJsonPreviewText = decodeTextUtf8(primary.bytes);
  const stem = baseNameWithoutExtension(primary.name);
  const topologyOutputs = await buildTopologyOutputs(stagedJsonPreviewText, primary.name, stem);

  const outputs = Array.isArray(response.outputs) ? response.outputs : [];
  const previewOutputs = [
    {
      name: `${stem}_managed_stage_preview.json`,
      text: stagedJsonPreviewText,
      mime: 'application/json;charset=utf-8',
    },
    ...topologyOutputs,
    ...outputs,
  ];

  return {
    ...response,
    outputs: previewOutputs,
  };
}
