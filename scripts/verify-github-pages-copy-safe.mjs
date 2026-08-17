import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_PAGES_SCAN_ROOTS = Object.freeze([
  'index.html',
  'main-rhbg-fitguard.js',
  'core',
  'tabs',
  'styles',
]);

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs']);
const HTML_RESOURCE_RE = /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/giu;
const CSS_RESOURCE_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/giu;
const JS_IMPORT_RE = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])([^"']+)\1/gu;
const JS_URL_CALL_RE = /\b(?:fetch|new\s+URL)\s*\(\s*(["'])([^"']+)\1/gu;

function isExternalProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value) && !/^https?:/iu.test(value);
}

export function classifyPagesResource(value) {
  const resource = String(value ?? '').trim();
  if (!resource || resource.startsWith('#') || resource.startsWith('//')) return 'SAFE';
  if (isExternalProtocol(resource)) return 'SAFE';
  if (resource.startsWith('/') && !resource.startsWith('//')) return 'ROOT_ABSOLUTE_LOCAL';
  if (/^https:\/\/[^/]+\.github\.io\/[^/?#]+(?:\/|$)/iu.test(resource)) {
    return 'GITHUB_PAGES_PROJECT_BOUND';
  }
  return 'SAFE';
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function collectMatches(source, regex, kind) {
  const matches = [];
  regex.lastIndex = 0;
  for (const match of source.matchAll(regex)) {
    const value = match[2];
    const classification = classifyPagesResource(value);
    if (classification === 'SAFE') continue;
    matches.push({ kind, value, classification, line: lineNumber(source, match.index) });
  }
  return matches;
}

function scanSource(source, extension) {
  if (extension === '.html') return collectMatches(source, HTML_RESOURCE_RE, 'HTML_RESOURCE');
  if (extension === '.css') return collectMatches(source, CSS_RESOURCE_RE, 'CSS_RESOURCE');
  if (extension === '.js' || extension === '.mjs') {
    return [
      ...collectMatches(source, JS_IMPORT_RE, 'JS_MODULE'),
      ...collectMatches(source, JS_URL_CALL_RE, 'JS_URL_CALL'),
    ];
  }
  return [];
}

function walkTextFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return TEXT_EXTENSIONS.has(path.extname(targetPath)) ? [targetPath] : [];
  return fs.readdirSync(targetPath, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .flatMap((entry) => walkTextFiles(path.join(targetPath, entry.name)));
}

export function scanPagesPortability({ rootDir = process.cwd(), scanRoots = DEFAULT_PAGES_SCAN_ROOTS } = {}) {
  const files = scanRoots.flatMap((entry) => walkTextFiles(path.join(rootDir, entry)));
  const uniqueFiles = [...new Set(files)].sort();
  const violations = uniqueFiles.flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const extension = path.extname(filePath);
    return scanSource(source, extension).map((violation) => ({
      file: path.relative(rootDir, filePath).split(path.sep).join('/'),
      ...violation,
    }));
  });
  return Object.freeze({ files: Object.freeze(uniqueFiles), violations: Object.freeze(violations) });
}

export function verifyPagesPortability(options = {}) {
  const result = scanPagesPortability(options);
  if (result.violations.length) {
    const detail = result.violations
      .map((row) => `${row.file}:${row.line} ${row.classification} ${row.value}`)
      .join('\n');
    const error = new Error(`GitHub Pages copy-safety verification failed:\n${detail}`);
    error.code = 'GITHUB_PAGES_COPY_SAFETY_VIOLATION';
    error.violations = result.violations;
    throw error;
  }
  return result;
}

function runCli() {
  try {
    const result = verifyPagesPortability();
    console.log(`GitHub Pages copy-safety verification PASS (${result.files.length} files scanned).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) runCli();
