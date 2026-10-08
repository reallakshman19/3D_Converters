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

test('Regex and Preview share ordered Format 1 / Format 2 branch extraction authority', () => withDeclaredBranches(() => {
  const result = runStandaloneRegexTester({
    sourceText,
    sourceKind: 'xml',
    extractionConfig,
    supportConfigJson: '{}',
  });

  assert.equal(result.matchedRows.length, 2);
  const dominant = result.matchedRows.find((row) => row.branchName === dominantBranch);
  const alternative = result.matchedRows.find((row) => row.branchName === alternativeBranch);

  assert.equal(dominant?.matchedFormatIndex, 0);
  assert.equal(dominant?.lineKey, 'S8811000');
  assert.equal(dominant?.pipingClass, '91261M7');

  assert.equal(alternative?.matchedFormatIndex, 1);
  assert.equal(alternative?.lineKey, 'S8822000');
  assert.equal(alternative?.pipingClass, '91261M7');

  const supportConfig = JSON.parse(result.supportConfigJson);
  assert.equal(supportConfig.regexTester.formats.length, 2);
  assert.equal(
    _derivePipingClassFromBranchName(alternativeBranch, supportConfig),
    '91261M7',
    'Preview may coincidentally infer this class from legacy token 5; it is not proof of Format 2',
  );
  assert.equal(
    deriveLineKeyFromBranchName(alternativeBranch, supportConfig),
    'S8822000',
    'Preview must not return the legacy Format-1 token HOT where Regex Format 2 selects S8822000',
  );
}));
