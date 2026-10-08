import assert from 'node:assert/strict';
import test from 'node:test';

import { runStandaloneRegexTester, resetRegexTesterCacheForTests } from '../tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js';
import { _derivePipingClassFromBranchName } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js';
import { deriveLineKeyFromBranchName } from '../converters/xml-cii2019-core/regex-line-key.js';

const dominantBranch = '/ASIM-1885-3"-S8811000-91261M7-HC-01/B1';
const alternativeBranch = '/ASIM-1885-PL-HOT-S8822000-91261M7-HC-01/B2';

const extractionConfig = {
  activeFormatIndex: 0,
  ratingSequence: [],
  formats: [
    {
      tokenDelimiter: '-',
      lineKeyJoiner: '',
      lineKey: { regex: '^/ASIM-1885-[0-9]+(?:")?-(S[0-9]+)', group: 1, tokenPosition: '' },
      pipingClass: { regex: '^/ASIM-1885-[0-9]+(?:")?-S[0-9]+-([A-Z0-9]+)', group: 1, tokenPosition: '' },
      rating: { regex: '', group: 1, tokenPosition: '' },
      bore: { regex: '^/ASIM-1885-([0-9]+)(?:")?', group: 1, tokenPosition: '' },
    },
    {
      tokenDelimiter: '-',
      lineKeyJoiner: '',
      lineKey: { regex: '^/ASIM-1885-PL-HOT-(S[0-9]+)', group: 1, tokenPosition: '' },
      pipingClass: { regex: '^/ASIM-1885-PL-HOT-S[0-9]+-([A-Z0-9]+)', group: 1, tokenPosition: '' },
      rating: { regex: '', group: 1, tokenPosition: '' },
      bore: { regex: '', group: 1, tokenPosition: '' },
    },
  ],
};

const sourceText = [
  '<Plant>',
  '<Branch><Branchname>' + dominantBranch + '</Branchname></Branch>',
  '<Branch><Branchname>' + alternativeBranch + '</Branchname></Branch>',
  '</Plant>',
].join('');

function withDeclaredBranches(fn) {
  const previousParser = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString(xml, mediaType) {
      assert.equal(xml, sourceText);
      assert.equal(mediaType, 'application/xml');
      const branches = [dominantBranch, alternativeBranch].map((name) => ({
        getAttribute: () => '',
        children: [{ localName: 'Branchname', textContent: name }],
      }));
      return {
        querySelector: () => null,
        getElementsByTagNameNS: (_namespace, tag) => tag === 'Branch' ? branches : [],
        getElementsByTagName: (tag) => tag === 'Branch' ? branches : [],
      };
    }
  };
  resetRegexTesterCacheForTests();
  try { return fn(); }
  finally {
    resetRegexTesterCacheForTests();
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
  }
}

function inspectBothFormats() {
  return withDeclaredBranches(() => {
    const result = runStandaloneRegexTester({
      sourceText,
      sourceKind: 'xml',
      extractionConfig,
      supportConfigJson: '{}',
    });
    return { result, config: JSON.parse(result.supportConfigJson) };
  });
}

test('U1 Regex controls: Format 1 and 2 independently match expected engineering roles', () => {
  const { result, config } = inspectBothFormats();
  assert.equal(result.matchedRows.length, 2);
  assert.equal(config.regexTester.formats.length, 2);
  const dominant = result.matchedRows.find(row => row.branchName === dominantBranch);
  const alternative = result.matchedRows.find(row => row.branchName === alternativeBranch);
  assert.deepEqual(
    [dominant?.matchedFormatIndex, dominant?.lineKey, dominant?.pipingClass],
    [0, 'S8811000', '91261M7'],
  );
  assert.deepEqual(
    [alternative?.matchedFormatIndex, alternative?.lineKey, alternative?.pipingClass],
    [1, 'S8822000', '91261M7'],
  );
});

test('U1 RED: Preview derives the Format-2 piping class instead of the shifted Line Key', () => {
  const { config } = inspectBothFormats();
  assert.equal(
    _derivePipingClassFromBranchName(alternativeBranch, config),
    '91261M7',
    'Format 2 piping class must not silently fall back to the legacy shifted token',
  );
});

test('U1 RED: Preview derives the Format-2 line key instead of HOT', () => {
  const { config } = inspectBothFormats();
  assert.equal(
    deriveLineKeyFromBranchName(alternativeBranch, config),
    'S8822000',
    'Format 2 line key must not fall back to the legacy HOT token',
  );
});
