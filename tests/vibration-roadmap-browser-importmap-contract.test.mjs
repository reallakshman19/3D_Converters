import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../', import.meta.url);
const appShellUrl = new URL('index.html', repoRoot);
const roadmapFixtureUrl = new URL('tests/browser/vibration-roadmap-interaction.html', repoRoot);

async function readImportMap(fileUrl) {
  const html = await readFile(fileUrl, 'utf8');
  const match = html.match(/<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match, `expected import map in ${fileUrl.pathname}`);
  return JSON.parse(match[1]);
}

test('Roadmap Chromium fixture resolves node:crypto to the application browser module', async () => {
  const appMap = await readImportMap(appShellUrl);
  const fixtureMap = await readImportMap(roadmapFixtureUrl);
  const appTarget = new URL(appMap.imports?.['node:crypto'], appShellUrl);
  const fixtureTarget = new URL(fixtureMap.imports?.['node:crypto'], roadmapFixtureUrl);

  assert.equal(appTarget.pathname, '/core/browser-node-crypto.js');
  assert.equal(fixtureTarget.pathname, appTarget.pathname);
});
