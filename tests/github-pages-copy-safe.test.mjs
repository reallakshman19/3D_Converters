import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  classifyPagesResource,
  verifyPagesPortability,
} from '../scripts/verify-github-pages-copy-safe.mjs';

function fixtureDir(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-copy-safe-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  return rootDir;
}

function write(rootDir, relativePath, content) {
  const target = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test('resource classifier distinguishes copy-safe and project-bound URLs', () => {
  assert.equal(classifyPagesResource('./assets/main.js'), 'SAFE');
  assert.equal(classifyPagesResource('styles/app.css'), 'SAFE');
  assert.equal(classifyPagesResource('../assets/icon.svg'), 'SAFE');
  assert.equal(classifyPagesResource('data:image/svg+xml;base64,AA=='), 'SAFE');
  assert.equal(classifyPagesResource('/Advanced_Analysis/assets/main.js'), 'ROOT_ABSOLUTE_LOCAL');
  assert.equal(
    classifyPagesResource('https://example.github.io/Advanced_Analysis/assets/main.js'),
    'GITHUB_PAGES_PROJECT_BOUND',
  );
});

test('reported copied-Vite failure class is rejected', (t) => {
  const rootDir = fixtureDir(t);
  write(rootDir, 'index.html', [
    '<link rel="stylesheet" href="/Advanced_Analysis/assets/main.css">',
    '<script type="module" src="/Advanced_Analysis/assets/main.js"></script>',
  ].join('\n'));

  assert.throws(
    () => verifyPagesPortability({ rootDir, scanRoots: ['index.html'] }),
    (error) => {
      assert.equal(error.code, 'GITHUB_PAGES_COPY_SAFETY_VIOLATION');
      assert.equal(error.violations.length, 2);
      assert(error.violations.every((row) => row.classification === 'ROOT_ABSOLUTE_LOCAL'));
      return true;
    },
  );
});

test('relative static assets and module graph remain copy/rename-safe', (t) => {
  const rootDir = fixtureDir(t);
  write(rootDir, 'index.html', [
    '<link rel="stylesheet" href="styles/app.css">',
    '<script type="module" src="./main.js"></script>',
  ].join('\n'));
  write(rootDir, 'main.js', "import './core/app.js';\n");
  write(rootDir, 'core/app.js', "import '../tabs/tool.js';\n");
  write(rootDir, 'tabs/tool.js', "export const ready = true;\n");
  write(rootDir, 'styles/app.css', ".icon { background: url('../assets/icon.svg'); }\n");

  const result = verifyPagesPortability({
    rootDir,
    scanRoots: ['index.html', 'main.js', 'core', 'tabs', 'styles'],
  });
  assert.equal(result.violations.length, 0);
});

test('root-absolute JS imports and fetches fail closed', (t) => {
  const rootDir = fixtureDir(t);
  write(rootDir, 'main.js', [
    "import '/OldRepo/core/app.js';",
    "fetch('/OldRepo/assets/data.json');",
  ].join('\n'));

  assert.throws(
    () => verifyPagesPortability({ rootDir, scanRoots: ['main.js'] }),
    (error) => error.code === 'GITHUB_PAGES_COPY_SAFETY_VIOLATION'
      && error.violations.length === 2,
  );
});

test('current 3D_Converters Pages source surface is copy-safe', () => {
  const result = verifyPagesPortability();
  assert.equal(result.violations.length, 0);
  assert(result.files.some((file) => file.endsWith('index.html')));
  assert(result.files.some((file) => file.endsWith('main-rhbg-fitguard.js')));
});
