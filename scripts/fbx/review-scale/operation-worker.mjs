#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { buildReviewBundleFiles } from '../build-mapping-review-bundle.mjs';
import { assembleDecisionFragmentsFiles } from '../assemble-mapping-decision-fragments.mjs';
import { buildBoundedReviewBundle } from '../../../tabs/model-converters/converters/fbx/review-execution/bounded-bundle.js';
import { assembleBoundedFragments } from '../../../tabs/model-converters/converters/fbx/review-execution/bounded-assembly.js';
import { directoryBytes, startResourceSampler } from './resource-metrics.mjs';

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

async function fragmentPaths(directory) {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith('.json'))
    .sort(compareText)
    .reverse();
  return names.map((name) => join(directory, name));
}

async function inputBytes(config, fragments) {
  let total = (await stat(config.worklistPath)).size;
  if (config.bundlePath) total += (await stat(config.bundlePath)).size;
  if (fragments) total += await directoryBytes(config.fragmentDir);
  return total;
}

async function runBundle(config, bounded) {
  if (bounded) return buildBoundedReviewBundle({
    worklistPath: config.worklistPath,
    outputDir: config.outputPath,
    maxItemsPerShard: config.maxItemsPerShard,
    sortRunItems: config.sortRunItems,
    inputChunkBytes: config.inputChunkBytes,
  });
  return buildReviewBundleFiles({
    worklistPath: config.worklistPath,
    outputDir: config.outputPath,
    maxItems: config.maxItemsPerShard,
  });
}

async function runAssembly(config, bounded, fragments) {
  if (bounded) return assembleBoundedFragments({
    worklistPath: config.worklistPath,
    bundlePath: config.bundlePath,
    fragmentPaths: fragments,
    outputPath: config.outputPath,
    sortRunItems: config.sortRunItems,
    inputChunkBytes: config.inputChunkBytes,
  });
  return assembleDecisionFragmentsFiles({
    worklistPath: config.worklistPath,
    bundlePath: config.bundlePath,
    fragmentPaths: fragments,
    outputPath: config.outputPath,
  });
}

function operationKind(operation) {
  const bounded = operation.startsWith('bounded-');
  const kind = operation.replace(/^(bounded|reference)-/, '');
  if (!['bundle', 'assembly'].includes(kind)) throw new Error(`Unsupported operation ${operation}.`);
  return { bounded, kind };
}

async function execute(config) {
  const { bounded, kind } = operationKind(config.operation);
  const fragments = kind === 'assembly' ? await fragmentPaths(config.fragmentDir) : null;
  const canonicalInputBytes = await inputBytes(config, fragments);
  const result = kind === 'bundle'
    ? await runBundle(config, bounded)
    : await runAssembly(config, bounded, fragments);
  const canonicalOutputBytes = await directoryBytes(config.outputPath);
  return {
    canonicalInputBytes,
    canonicalOutputBytes,
    fragmentCount: fragments?.length || 0,
    executionMetrics: result?.metrics || null,
  };
}

async function main(configPath) {
  const config = JSON.parse(await readFile(resolve(configPath), 'utf8'));
  const stop = await startResourceSampler(config.monitorRoot);
  try {
    const execution = await execute(config);
    const resources = await stop();
    process.stdout.write(`${JSON.stringify({ operation: config.operation, ...execution, resources })}\n`);
  } catch (error) {
    await stop();
    throw error;
  }
}

main(process.argv[2]).catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
