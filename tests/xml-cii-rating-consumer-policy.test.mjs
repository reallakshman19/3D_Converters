import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Preview exposes the explicit DTXR Rating fetch action', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-renderer-v7.js');
  assert.match(source, /Fetch Rating as per DTXR/);
  assert.match(source, /applyPreviewDtxrRatingOverrides/);
  assert.match(source, /forceBuild:\s*true/);
});

test('run review does not auto-populate Rating from DTXR or defaults', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js');
  assert.match(source, /standaloneRunReviewRatingFromConfig/);
  assert.doesNotMatch(source, /return[^;]*row\?\.dtxrRating/s);
  assert.doesNotMatch(source, /return[^;]*defaultRating/s);
  assert.match(source, /DTXR Rating is comparison evidence only/);
});

test('Weight Match does not use DTXR or default Rating as ranking authority', async () => {
  const source = await read('tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js');
  assert.match(source, /xmlCiiWeightMatchRatingFromConfig/);
  assert.doesNotMatch(source, /\|\|\s*clean\(row\?\.dtxrRating\)/);
  assert.doesNotMatch(source, /\|\|\s*extractXmlCiiRatingFromDtxr\(row\?\.dtxr\)/);
  assert.doesNotMatch(source, /\|\|\s*clean\(config\?\.rating\?\.defaultRating/);
  assert.match(source, /DTXR Rating remains comparison evidence/);
});

test('Piping Class import declares separate NPS and Bore mm columns', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-fields-config.js');
  assert.match(source, /name:\s*'nps',\s*label:\s*'NPS \(in\)'/);
  assert.match(source, /name:\s*'convertedBore',\s*label:\s*'Bore \(mm\)'/);
});

test('Preview cache schema invalidates pre-policy Rating rows', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-cache-v7.js');
  assert.match(source, /xml-cii-preview-cache\/v8-rating-policy/);
  assert.match(source, /xml-cii-pv-cache-v8-dtxr/);
});
