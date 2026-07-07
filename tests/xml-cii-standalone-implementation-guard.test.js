const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scanFiles = [
  'tabs/xml-cii-2019-standalone-tab.js',
  'tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js',
  ...walk('tabs/xml-cii-2019-standalone/ui-adapted'),
];

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (rel.endsWith('.js')) out.push(rel);
  }
  return out;
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertFileLength(file, text) {
  const count = text.split(/\r\n|\r|\n/).length;
  assert(count <= 450, `${file} has ${count} lines; expected <= 450`);
}

function assertNamedExportsOnly(file, text) {
  assert(!/export\s+default\b/.test(text), `${file} must not use default exports`);
}

function assertNoRuntimeMutationTokens(file, text) {
  const forbidden = ['window.', 'globalThis.', '__xmlCii', '__XML_CII', 'prototype.', 'Object.defineProperty'];
  for (const token of forbidden) assert(!text.includes(token), `${file} contains runtime mutation token ${token}`);
}

function assertNoLegacyOrShimTokens(file, text) {
  const forbidden = ['legacy-adapter', '#model-converters-run', 'xmlCiiWorkflowRequestFinalRun', 'WorkflowRunHandoff', 'shim', 'mock'];
  for (const token of forbidden) assert(!text.includes(token), `${file} contains forbidden token ${token}`);
}

function assertFunctionLengths(file, text) {
  const lines = text.split(/\r\n|\r|\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*(export\s+)?(async\s+)?function\s+\w+\b/.test(lines[index])) continue;
    const length = countFunctionLines(lines, index);
    assert(length <= 150, `${file}:${index + 1} function has ${length} lines; expected <= 150 where practical`);
  }
}

function countFunctionLines(lines, startIndex) {
  let depth = 0;
  let seenOpen = false;
  for (let index = startIndex; index < lines.length; index += 1) {
    for (const char of lines[index]) {
      if (char === '{') { depth += 1; seenOpen = true; }
      if (char === '}') depth -= 1;
    }
    if (seenOpen && depth <= 0) return index - startIndex + 1;
  }
  return lines.length - startIndex;
}

for (const file of scanFiles) {
  const text = read(file);
  assertFileLength(file, text);
  assertNamedExportsOnly(file, text);
  assertNoRuntimeMutationTokens(file, text);
  assertNoLegacyOrShimTokens(file, text);
  assertFunctionLengths(file, text);
}

console.log('XML CII standalone implementation guard checks passed.');
