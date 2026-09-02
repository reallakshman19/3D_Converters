import assert from 'node:assert/strict';
import test from 'node:test';

import { renderFlangeFamilyLanding } from '../tabs/engineering-calculation-flange-family.js';
import { renderEngineeringCalculationConsoleHtml } from '../tabs/engineering-calculation-console-view.js';
import { isEngineeringCalculationExecutable } from '../tabs/engineering-calculation-console-model.js';
import { definitionState } from '../tabs/engineering-calculation-console-sections.js';
import {
  getEngineeringCalculationDefinition,
  listEngineeringCalculationFamilies,
  listEngineeringCalculations,
} from '../converters/engineering-calculations/index.js';

const definitions = listEngineeringCalculations();
const flangeRows = definitions.filter((item) => item.family === 'FLANGE');

function renderLanding(rows = definitions) {
  return renderFlangeFamilyLanding(rows);
}

function renderThroughConsole(familyLanding) {
  return renderEngineeringCalculationConsoleHtml({
    definitions,
    families: listEngineeringCalculationFamilies(),
    definition: getEngineeringCalculationDefinition('FLANGE.RATED_LOAD.UG44B'),
    state: { selectedFamily: 'FLANGE', selectedId: null, familyLanding, activeView: 'results' },
  });
}

test('the family holds six calculations across three qualification states', () => {
  assert.equal(flangeRows.length, 6);
  const states = new Set(flangeRows.map((item) => definitionState(item)));
  assert.deepEqual([...states].sort(), ['BENCHMARK_ONLY', 'BLOCKED', 'IMPLEMENTED']);
});

test('the landing counts the family and its blocked entries', () => {
  const html = renderLanding();
  const blocked = flangeRows.filter((item) => !isEngineeringCalculationExecutable(item)).length;
  assert.match(html, new RegExp(`${flangeRows.length} calculations · ${blocked} blocked`, 'u'));
  assert.equal(blocked, 2);
});

test('every family member gets a card', () => {
  const html = renderLanding();
  for (const definition of flangeRows) {
    assert.ok(
      html.includes(`data-flange-calculation="${definition.id}"`),
      `${definition.id} is missing from the landing`,
    );
  }
  assert.equal([...html.matchAll(/data-flange-calculation="/gu)].length, flangeRows.length);
});

test('states are grouped separately so the family does not read as one state', () => {
  const html = renderLanding();
  const groups = [...html.matchAll(/data-flange-state="([A-Z_]+)"/gu)].map((match) => match[1]);

  assert.deepEqual(groups, ['IMPLEMENTED', 'BENCHMARK_ONLY', 'BLOCKED']);
  assert.match(html, /Executable reference kernels/u);
  assert.match(html, /Benchmark only/u);
  assert.match(html, /Blocked — not executable/u);
});

test('each state group says what that state does and does not permit', () => {
  const html = renderLanding();
  assert.match(html, /regression-bound to committed sources/u);
  assert.match(html, /primary Code source qualification is still open/u);
  assert.match(html, /No authorized numerical kernel is registered/u);
});

test('the authority banner denies family-level authority and names the state count', () => {
  const html = renderLanding();
  assert.match(html, /No calculation in this family carries Code compliance or design authority/u);
  assert.match(html, /The 3 states below are separate/u);
  assert.match(html, /sharing a family does not share qualification/u);
});

test('every card denies design authority and Code compliance individually', () => {
  const html = renderLanding();
  assert.equal([...html.matchAll(/Design authority: NO/gu)].length, flangeRows.length);
  assert.equal([...html.matchAll(/Code compliance: NO/gu)].length, flangeRows.length);
});

test('blocked entries are visibly non-executable rather than merely unlabelled', () => {
  const html = renderLanding();
  const blocked = flangeRows.filter((item) => !isEngineeringCalculationExecutable(item));

  assert.equal([...html.matchAll(/<strong>Execution blocked\.<\/strong>/gu)].length, blocked.length);
  for (const definition of blocked) {
    assert.match(html, new RegExp(`data-flange-calculation="${definition.id.replace(/\./gu, '\\.')}"`, 'u'));
  }
  assert.match(html, /View qualification basis/u);
});

test('the custody boundary states that a committed workbook grants no authority', () => {
  const html = renderLanding();
  assert.match(html, /SOURCE CUSTODY BOUNDARY/u);
  assert.match(html, /hash-pinned under docs\/flange/u);
  assert.match(html, /TEST_ONLY regression fixtures/u);
  assert.match(html, /never Code compliance, design authority, master-data authority or governing eligibility/u);
});

test('UG-44 offers the assessment surface and the others a plain open action', () => {
  const html = renderLanding();
  assert.match(html, /Open flange assessment/u);
  assert.match(html, /Open calculation/u);
  assert.equal([...html.matchAll(/Open flange assessment/gu)].length, 1);
});

test('a family whose entries all claimed authority would be flagged, not rendered normally', () => {
  const breached = [{
    id: 'FLANGE.FAKE', family: 'FLANGE', name: 'Fake', shortName: 'Fake', purpose: '',
    authority: { qualificationState: 'IMPLEMENTED', designAuthority: true },
    applicability: { limitations: [] }, inputs: [],
  }];
  const html = renderLanding(breached);
  assert.match(html, /Authority boundary breached/u);
  assert.doesNotMatch(html, /<strong>Authority boundary\.<\/strong>/u);
});

test('an empty family renders without throwing', () => {
  const html = renderLanding([]);
  assert.match(html, /0 calculations · 0 blocked/u);
  assert.match(html, /Flanges &amp; Joints/u);
});

// --- console routing --------------------------------------------------------

test('the console routes the FLANGE family landing to the flange landing', () => {
  const html = renderThroughConsole('FLANGE');
  assert.match(html, /Flanges &amp; Joints/u);
  assert.match(html, /SOURCE CUSTODY BOUNDARY/u);
  assert.doesNotMatch(html, /Vibration &amp; Dynamic Screening<\/h2>/u);
});

test('the VIB family landing is unchanged by the flange landing', () => {
  const html = renderThroughConsole('VIB');
  assert.match(html, /Vibration &amp; Dynamic Screening/u);
  assert.doesNotMatch(html, /SOURCE CUSTODY BOUNDARY/u);
});

test('selecting a calculation still renders the calculation, not a landing', () => {
  const html = renderEngineeringCalculationConsoleHtml({
    definitions,
    families: listEngineeringCalculationFamilies(),
    definition: getEngineeringCalculationDefinition('FLANGE.RATED_LOAD.UG44B'),
    state: {
      selectedFamily: 'FLANGE', selectedId: 'FLANGE.RATED_LOAD.UG44B', familyLanding: null,
      draft: { values: {}, units: {} }, editorErrors: [], activeView: 'basis',
      mode: 'single', qualificationMode: 'strict', result: null, validation: null, batchText: '',
    },
  });
  assert.doesNotMatch(html, /SOURCE CUSTODY BOUNDARY/u);
  assert.match(html, /FLANGE\.RATED_LOAD\.UG44B/u);
});
