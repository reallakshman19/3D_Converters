import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLoadedAivD23Benchmark } from '../tabs/vibration-aiv-benchmarks.js';
import { renderAivQualificationWorkspaceHtml } from '../tabs/vibration-aiv-qualification-view.js';
import { renderAivFlareNetworkAuthoringHtml } from '../tabs/vibration-aiv-flare-network-view.js';
import { createInitialAivQualificationState } from '../tabs/vibration-aiv-state.js';
import {
  aivUiFocusKey,
  captureAivUiContext,
  restoreAivUiContext,
} from '../tabs/vibration-aiv-ui-context.js';

function benchmarkState() {
  const state = createInitialAivQualificationState();
  const loaded = buildLoadedAivD23Benchmark();
  state.benchmark.loaded = loaded.benchmark;
  state.tables = { ...loaded.tables };
  state.topology = loaded.topology;
  state.topologyInput = {
    format: 'PARSED_EXCHANGE',
    data: loaded.topology,
    sourceFileName: loaded.topology.sourceFileName,
  };
  return state;
}

function fakeContainer(groups, members = []) {
  return {
    querySelectorAll: (selector) => groups[selector] ?? [],
    contains: (element) => members.includes(element),
  };
}

function fakeTab(id, selected = false) {
  const attrs = new Map([['aria-selected', selected ? 'true' : 'false']]);
  return {
    dataset: { aivDetailTab: id },
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
  };
}

function fakeDetail(key, tabs = [], panels = []) {
  return {
    hidden: false,
    dataset: { aivCanvasAssumptionDetail: key },
    querySelectorAll: (selector) => selector === '[data-aiv-detail-tab]' ? tabs : panels,
  };
}

test('AIV workbench presents import/readiness/results before secondary qualification evidence', () => {
  const html = renderAivQualificationWorkspaceHtml(createInitialAivQualificationState());
  assert.match(html, /EI AVIFF · screening workbench/);
  assert.match(html, /SCREENING QUALIFIED/);
  assert.match(html, /aivq-banner is-qualified/);
  assert.match(html, /data-aiv-file="eit"/);
  assert.match(html, /Import EI \.eit/);
  assert.match(html, /Qualification evidence & method trace/);
  assert.doesNotMatch(html, /TABLE\/IMPORT MODE ACTIVE/);
  assert.ok(html.indexOf('Start an AIV assessment') < html.indexOf('AIV result scopes'));
  assert.ok(html.indexOf('AIV result scopes') < html.indexOf('Qualification evidence & method trace'));
});

test('relationship canvas is first-class for non-flare benchmark inputs', () => {
  const html = renderAivQualificationWorkspaceHtml(benchmarkState());
  const canvasIndex = html.indexOf('AIV relationship canvas');
  const flareIndex = html.indexOf('Flare network authoring');
  assert.ok(canvasIndex >= 0, 'benchmark input should render relationship canvas');
  assert.ok(flareIndex >= 0, 'optional flare authoring disclosure should remain available');
  assert.ok(canvasIndex < flareIndex, 'relationship canvas must not be nested under flare authoring');
  assert.match(html, /data-aiv-disclosure-key="flare-network-authoring"/);
});

test('secondary engineering tools are progressive disclosures rather than equal-weight page sections', () => {
  const html = renderAivQualificationWorkspaceHtml(createInitialAivQualificationState());
  assert.match(html, /data-aiv-disclosure-key="flare-network-authoring"/);
  assert.match(html, /data-aiv-disclosure-key="benchmark-assumptions"/);
  assert.match(html, /data-aiv-disclosure-key="working-data-tables"/);
  assert.match(html, /data-aiv-disclosure-key="advanced-imports"/);
  assert.match(html, /<details class="aivq-disclosure aivq-evidence-disclosure">/);
});

test('UI context preserves disclosure, table scroll, detail tab and edit focus', () => {
  const oldDisclosure = { dataset: { aivDisclosureKey: 'working-data-tables' }, open: true };
  const oldScroll = { dataset: { aivScrollKey: 'table-sources' }, scrollTop: 17, scrollLeft: 420 };
  const oldFocus = { dataset: { aivTableCell: 'sources', aivEditRow: '2', aivEditColumn: '5' } };
  const oldTabs = [fakeTab('summary'), fakeTab('calculation', true)];
  const oldDetail = fakeDetail('SOURCE:SRC-1:CASE-1', oldTabs, []);
  const oldContainer = fakeContainer({
    '[data-aiv-disclosure-key]': [oldDisclosure],
    '[data-aiv-scroll-key]': [oldScroll],
    '[data-aiv-canvas-assumption-detail]': [oldDetail],
  }, [oldFocus]);
  const context = captureAivUiContext(oldContainer, oldFocus);

  const newDisclosure = { dataset: { aivDisclosureKey: 'working-data-tables' }, open: false };
  const newScroll = { dataset: { aivScrollKey: 'table-sources' }, scrollTop: 0, scrollLeft: 0 };
  const newFocus = {
    dataset: { aivTableCell: 'sources', aivEditRow: '2', aivEditColumn: '5' },
    focusOptions: null,
    focus(options) { this.focusOptions = options ?? {}; },
  };
  const newTabs = [fakeTab('summary', true), fakeTab('calculation')];
  const newPanels = [
    { dataset: { aivDetailPanel: 'summary' }, hidden: false },
    { dataset: { aivDetailPanel: 'calculation' }, hidden: true },
  ];
  const newDetail = fakeDetail('SOURCE:SRC-1:CASE-1', newTabs, newPanels);
  const newContainer = fakeContainer({
    '[data-aiv-disclosure-key]': [newDisclosure],
    '[data-aiv-scroll-key]': [newScroll],
    '[data-aiv-canvas-assumption-detail]': [newDetail],
    '[data-aiv-table-cell],[data-aiv-assumption]': [newFocus],
  });

  restoreAivUiContext(newContainer, context);
  assert.equal(newDisclosure.open, true);
  assert.equal(newScroll.scrollTop, 17);
  assert.equal(newScroll.scrollLeft, 420);
  assert.deepEqual(newFocus.focusOptions, { preventScroll: true });
  assert.equal(newTabs[0].getAttribute('aria-selected'), 'false');
  assert.equal(newTabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(newPanels[0].hidden, true);
  assert.equal(newPanels[1].hidden, false);
  assert.equal(aivUiFocusKey(newFocus), 'table:sources:2:5');
});

test('flare authoring no longer injects a competing local style block', () => {
  const state = createInitialAivQualificationState();
  const html = renderAivFlareNetworkAuthoringHtml(state);
  assert.doesNotMatch(html, /<style>/);
  assert.match(html, /Working-table mode/);
  assert.match(html, /connectivity from graph/);
  assert.match(html, /explicit engineering length/);
});