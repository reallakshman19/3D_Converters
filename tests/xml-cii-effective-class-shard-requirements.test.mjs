import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectEffectivePipingClassRequirements,
  effectivePipingClassRequirementSignature,
  loadedPipingClassSet,
  matchPipingClassIndexRequirements,
} from '../converters/xml-cii2019-core/effective-piping-class-requirements.js';

test('collects branch, line-list, override and process-data effective classes', () => {
  const requirements = collectEffectivePipingClassRequirements({
    branchNames: ['/AREA-SERVICE-4-93834-TAIL/B1'],
    config: {
      rating: { pipingClassTokenIndex: 4, tokenDelimiter: '-' },
      linelist: {
        masterRows: [
          { 'Piping Class': '13421' },
          { pipingClass: '93834' },
          { Class: '900' },
        ],
      },
      overrides: {
        pipingClass: { '93834': '96620' },
        processData: { LINE_A: { pipingClass: '11000' } },
      },
    },
  });

  assert.deepEqual(
    requirements.map((item) => item.normalized),
    ['11000', '13421', '93834', '96620'],
  );
  assert.deepEqual(
    requirements.find((item) => item.normalized === '93834').sources,
    ['branch-name', 'line-list'],
  );
  assert.deepEqual(
    requirements.find((item) => item.normalized === '96620').sources,
    ['override'],
  );
  assert.equal(requirements.some((item) => item.normalized === '900'), false);
});

test('matches only exact class keys or declared index tokens', () => {
  const index = {
    classes: {
      '13421': { file: '13421.json', matchTokens: ['PC-13421'] },
      '93834': { file: '93834.json', matchTokens: ['93834'] },
    },
  };
  const requirements = [
    { value: 'PC-13421', normalized: 'PC13421', sources: ['override'] },
    { value: '93834', normalized: '93834', sources: ['line-list'] },
    { value: '9383', normalized: '9383', sources: ['override'] },
  ];
  const result = matchPipingClassIndexRequirements(index, requirements);

  assert.deepEqual(result.matched.map((item) => item.classKey), ['13421', '93834']);
  assert.deepEqual(result.unmatched.map((item) => item.normalized), ['9383']);
});

test('loaded class set ignores the on-demand placeholder', () => {
  const loaded = loadedPipingClassSet([
    { pipingClass: '__ON_DEMAND__', _smartMasterPlaceholder: true },
    { 'Piping Class': '13421' },
    { pipingClass: '93834' },
  ]);
  assert.deepEqual([...loaded].sort(), ['13421', '93834']);
});

test('requirement signature changes when an override introduces a class', () => {
  const before = collectEffectivePipingClassRequirements({
    config: { linelist: { masterRows: [{ pipingClass: '13421' }] } },
  });
  const after = collectEffectivePipingClassRequirements({
    config: {
      linelist: { masterRows: [{ pipingClass: '13421' }] },
      overrides: { pipingClass: { '13421': '93834' } },
    },
  });

  assert.equal(effectivePipingClassRequirementSignature(before), '13421');
  assert.equal(effectivePipingClassRequirementSignature(after), '13421|93834');
});
