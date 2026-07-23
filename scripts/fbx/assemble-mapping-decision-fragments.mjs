#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeCanonicalJson } from './worklist-cli-support.mjs';
import { assembleFragments } from '../../tabs/model-converters/converters/fbx/mapping-fragment-assembler.js';

function usage() {
  return 'Usage: node scripts/fbx/assemble-mapping-decision-fragments.mjs <worklist.json> <bundle.json> <fragment-1.json> [fragment-2.json ...] --output <decision-set.json>';
}

function parseArgs(args) {
  const outIndex = args.indexOf('--output');
  if (outIndex === -1 || outIndex !== args.length - 2 || outIndex < 3) {
    throw new Error(usage());
  }

  return {
    worklistPath: resolve(args[0]),
    bundlePath: resolve(args[1]),
    fragmentPaths: args.slice(2, outIndex).map((p) => resolve(p)),
    outputPath: resolve(args[outIndex + 1]),
  };
}

export async function assembleDecisionFragmentsFiles({ worklistPath, bundlePath, fragmentPaths, outputPath }) {
  const [worklist, bundle, ...fragments] = await Promise.all([
    readJson(worklistPath),
    readJson(bundlePath),
    ...fragmentPaths.map((p) => readJson(p)),
  ]);

  const decisionSet = await assembleFragments(worklist, bundle, fragments);
  await writeCanonicalJson(outputPath, decisionSet);
  return decisionSet;
}

async function main(args) {
  const config = parseArgs(args);
  await assembleDecisionFragmentsFiles(config);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
