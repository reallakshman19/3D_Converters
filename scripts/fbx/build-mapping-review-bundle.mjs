#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { readJson, writeCanonicalJson } from './worklist-cli-support.mjs';
import { buildReviewBundle } from '../../tabs/model-converters/converters/fbx/mapping-review-bundle.js';

function usage() {
  return 'Usage: node scripts/fbx/build-mapping-review-bundle.mjs <worklist.json> <output-directory> --max-items <positive-integer>';
}

function parseArgs(args) {
  if (args.length !== 4 || args[2] !== '--max-items') throw new Error(usage());
  const maxItems = parseInt(args[3], 10);
  if (Number.isNaN(maxItems) || maxItems < 1) throw new Error('--max-items must be a positive integer.');
  return {
    worklistPath: resolve(args[0]),
    outputDir: resolve(args[1]),
    maxItems,
  };
}

function csvEscape(text) {
  if (!text) return '';
  const str = String(text);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(shard) {
  const header = ['workItemId', 'sourceModelObjectId', 'sourceOccurrenceId', 'displayName', 'geometryKind'];
  const rows = [header.join(',')];
  for (const item of shard.workItems) {
    const geom = item.geometryEvidence?.[0]?.kind || '';
    rows.push([
      item.workItemId,
      item.sourceModelObjectId,
      item.sourceOccurrenceId,
      csvEscape(item.nameEvidence?.displayName),
      geom,
    ].join(','));
  }
  return rows.join('\n') + '\n';
}

export async function buildReviewBundleFiles({ worklistPath, outputDir, maxItems }) {
  const worklist = await readJson(worklistPath);

  try {
    const existing = await readdir(outputDir);
    if (existing.length > 0) throw new Error(`Output directory ${outputDir} must be empty.`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await mkdir(outputDir, { recursive: true });
    } else {
      throw error;
    }
  }

  const { bundle, shards } = await buildReviewBundle(worklist, maxItems);

  try {
    for (const shard of shards) {
      const shardName = bundle.shards.find(s => s.shardId === shard.shardId).fileName;
      await writeCanonicalJson(join(outputDir, shardName), shard);
      const csvName = shardName.replace(/\.json$/, '.csv');
      const { writeFile } = await import('node:fs/promises');
      await writeFile(join(outputDir, csvName), writeCsv(shard), 'utf8');
    }
    await writeCanonicalJson(join(outputDir, 'manifest.json'), bundle);
  } catch (error) {
    await rm(outputDir, { recursive: true, force: true });
    throw new Error(`Failed to write bundle files: ${error.message}`);
  }
  return { bundle, shards };
}

async function main(args) {
  const config = parseArgs(args);
  await buildReviewBundleFiles(config);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
