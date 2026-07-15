import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_MATERIAL_MAP_ROWS } from '../converters/xml-cii2019-core/default-material-map-rows.js';
import { DEFAULT_WEIGHT_MASTER_ROWS } from '../converters/xml-cii2019-core/default-weight-master-rows.js';
import { DEFAULT_VISIBLE_STAGEDJSON_CONFIG } from '../tabs/xml-cii-2019-standalone/stagedjson-enrichment/stagedjson-enrichment-contract.js';
import { enrichStagedJson } from '../tabs/xml-cii-2019-standalone/stagedjson-enrichment/stagedjson-enrichment-engine.js';
import { runEnrichment } from '../tabs/stagedjson-to-enrichxml/sj-enrichment-engine.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BENCHMARK_ROOT = join(REPO_ROOT, 'Benchmarks', '1885Sjson');
const FIXED_EVALUATED_AT = '2026-07-15T08:30:00.000Z';
const FIXED_XML_DATETIME = '15/07/2026, 12:30:00';

const OUTPUT_PATHS = Object.freeze({
  enrichedStagedJson: join(BENCHMARK_ROOT, 'EnrichedSjson'),
  audit: join(BENCHMARK_ROOT, 'EnrichedSjson.audit.json'),
  unresolvedCsv: join(BENCHMARK_ROOT, 'EnrichedSjson.unresolved.csv'),
  enrichedXml: join(BENCHMARK_ROOT, 'ExpectedCondensedEnrichedXML'),
  manifest: join(BENCHMARK_ROOT, 'fixture-manifest.json'),
});

export function generate1885Fixtures() {
  const stagedJson = readJson(join(BENCHMARK_ROOT, 'Sjson'));
  const lineList = readJson(join(BENCHMARK_ROOT, 'Masters', 'line-list.json'));
  const pipingClass = readJson(join(BENCHMARK_ROOT, 'Masters', 'piping-class.json'));

  const enrichment = enrichStagedJson({
    stagedJson,
    masters: {
      lineList,
      pipingClass,
      materialMap: DEFAULT_MATERIAL_MAP_ROWS,
      weight: DEFAULT_WEIGHT_MASTER_ROWS,
      files: {
        lineList: 'Benchmarks/1885Sjson/Masters/line-list.json',
        pipingClass: 'Benchmarks/1885Sjson/Masters/piping-class.json',
        materialMap: 'built-in default material map',
        weight: 'built-in default weight master',
      },
    },
    config: DEFAULT_VISIBLE_STAGEDJSON_CONFIG,
    sourceFileName: 'Benchmarks/1885Sjson/Sjson',
    evaluatedAt: FIXED_EVALUATED_AT,
  });

  const stage2 = runEnrichment({
    stagedJsonText: enrichment.enrichedStagedJson,
    config: {
      projectName: 'ASIM-1885',
      pipeName: '/ASIM-1885-STAGEDJSON-BENCHMARK',
    },
  });

  const artifactText = {
    enrichedStagedJson: jsonText(enrichment.enrichedStagedJson),
    audit: jsonText(enrichment.audit),
    unresolvedCsv: normalizeText(enrichment.unresolvedCsv),
    enrichedXml: normalizeXmlDate(stage2.xmlText),
  };

  const manifest = {
    schema: 'stagedjson-1885-fixture-manifest/v1',
    source: 'Benchmarks/1885Sjson/Sjson',
    generatedBy: 'tools/generate-1885-stagedjson-fixtures.mjs',
    evaluatedAt: FIXED_EVALUATED_AT,
    xmlDateTime: FIXED_XML_DATETIME,
    masters: {
      lineList: 'Benchmarks/1885Sjson/Masters/line-list.json',
      pipingClass: 'Benchmarks/1885Sjson/Masters/piping-class.json',
      materialMap: 'converters/xml-cii2019-core/default-material-map-rows.js',
      weight: 'converters/xml-cii2019-core/default-weight-master-rows.js',
    },
    summary: {
      sourceNodes: countNodes(stagedJson),
      enrichedNodes: countNodes(enrichment.enrichedStagedJson),
      audit: enrichment.audit?.summary || null,
      stage2Records: stage2.records?.length || 0,
      stage2Branches: stage2.audit?.totalBranches || 0,
    },
    artifacts: Object.fromEntries(
      Object.entries(artifactText).map(([key, text]) => [key, {
        path: relativePath(OUTPUT_PATHS[key]),
        bytes: Buffer.byteLength(text, 'utf8'),
        sha256: sha256(text),
      }]),
    ),
  };

  return {
    ...artifactText,
    manifest: jsonText(manifest),
    enrichment,
    stage2,
  };
}

export function write1885Fixtures() {
  const generated = generate1885Fixtures();
  for (const [key, path] of Object.entries(OUTPUT_PATHS)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, generated[key], 'utf8');
  }
  return generated;
}

export function check1885Fixtures() {
  const generated = generate1885Fixtures();
  const mismatches = [];
  for (const [key, path] of Object.entries(OUTPUT_PATHS)) {
    if (!existsSync(path)) {
      mismatches.push(`${relativePath(path)} is missing`);
      continue;
    }
    const actual = readFileSync(path, 'utf8');
    if (actual !== generated[key]) mismatches.push(`${relativePath(path)} is stale`);
  }
  if (mismatches.length) {
    throw new Error(`1885 stagedJson fixtures are not reproducible:\n- ${mismatches.join('\n- ')}\nRun the generator with --write.`);
  }
  return generated;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeText(value) {
  return `${String(value ?? '').replace(/\r\n/g, '\n').replace(/\n+$/g, '')}\n`;
}

function normalizeXmlDate(value) {
  return `${String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<DateTime>[^<]*<\/DateTime>/, `<DateTime>${FIXED_XML_DATETIME}</DateTime>`)
    .replace(/\n+$/g, '')}\n`;
}

function countNodes(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countNodes(item), 0);
  if (!value || typeof value !== 'object') return 0;
  return 1 + countNodes(value.children || []);
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function relativePath(path) {
  return path.slice(REPO_ROOT.length + 1).replaceAll('\\', '/');
}

const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const mode = process.argv.includes('--write') ? 'write' : 'check';
  const generated = mode === 'write' ? write1885Fixtures() : check1885Fixtures();
  const summary = generated.manifest ? JSON.parse(generated.manifest).summary : {};
  console.log(`1885 stagedJson fixture ${mode} completed: ${JSON.stringify(summary)}`);
}
