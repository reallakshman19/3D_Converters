import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MODE_PATH = new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-mode.js', import.meta.url);
const PREVIEW_PATH = new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-preview.js', import.meta.url);

test('Source Mode validity and hierarchy Preview both consume the shared source document context', async () => {
  const [mode, preview] = await Promise.all([
    readFile(MODE_PATH, 'utf8'),
    readFile(PREVIEW_PATH, 'utf8'),
  ]);

  for (const [name, source] of [['source-mode', mode], ['source-preview', preview]]) {
    assert.match(source, /getSourceDocumentContext/ , `${name} must use shared source parse context`);
    assert.doesNotMatch(source, /new\s+DOMParser\s*\(/, `${name} must not parse the authoritative source independently`);
  }
});
