import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSourceDocumentContext,
  resetSourceDocumentContextCache,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-derived-context.js';
import {
  resetXmlCiiPerfMetrics,
  snapshotXmlCiiPerfMetrics,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js';

class FakeDOMParser {
  static calls = [];

  parseFromString(sourceText, mediaType) {
    FakeDOMParser.calls.push([sourceText, mediaType]);
    return Object.freeze({ sourceText, mediaType, marker: `doc:${sourceText.length}` });
  }
}

function withFakeParser(fn) {
  const previousParser = globalThis.DOMParser;
  const previousPerf = globalThis.__XML_CII_PERF__;
  globalThis.DOMParser = FakeDOMParser;
  globalThis.__XML_CII_PERF__ = true;
  FakeDOMParser.calls = [];
  resetSourceDocumentContextCache();
  resetXmlCiiPerfMetrics();
  try {
    return fn();
  } finally {
    resetSourceDocumentContextCache();
    resetXmlCiiPerfMetrics();
    FakeDOMParser.calls = [];
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
    if (previousPerf === undefined) delete globalThis.__XML_CII_PERF__;
    else globalThis.__XML_CII_PERF__ = previousPerf;
  }
}

test('two consumers of the same authoritative source parse once and share one derived document', () => withFakeParser(() => {
  const source = '<ROOT><Branch NAME="B1"/></ROOT>';
  const validity = getSourceDocumentContext(source);
  const preview = getSourceDocumentContext(source);

  assert.equal(validity, preview);
  assert.equal(validity.sourceText, source);
  assert.equal(validity.document.marker, `doc:${source.length}`);
  assert.equal(validity.error, null);
  assert.equal(FakeDOMParser.calls.length, 1);

  const metrics = snapshotXmlCiiPerfMetrics();
  assert.equal(metrics.sourceParseCount, 1);
  assert.equal(metrics.sourceParseCacheHitCount, 1);
  assert.ok(metrics.sourceParseMs >= 0);
}));

test('revisiting the same source reuses the cache but an exact source change invalidates it', () => withFakeParser(() => {
  const sourceA = '<ROOT><Branch NAME="A"/></ROOT>';
  const sourceB = '<ROOT><Branch NAME="B"/></ROOT>';

  const first = getSourceDocumentContext(sourceA);
  const second = getSourceDocumentContext(sourceA);
  const changed = getSourceDocumentContext(sourceB);
  const changedAgain = getSourceDocumentContext(sourceB);

  assert.equal(first, second);
  assert.notEqual(changed, first);
  assert.equal(changed, changedAgain);
  assert.equal(FakeDOMParser.calls.length, 2);

  const metrics = snapshotXmlCiiPerfMetrics();
  assert.equal(metrics.sourceParseCount, 2);
  assert.equal(metrics.sourceParseCacheHitCount, 2);
}));

test('empty source produces no DOM parse and is not promoted to an authoritative cache entry', () => withFakeParser(() => {
  const empty = getSourceDocumentContext('');
  assert.equal(empty.sourceText, '');
  assert.equal(empty.document, null);
  assert.equal(empty.error, null);
  assert.equal(FakeDOMParser.calls.length, 0);
  assert.equal(snapshotXmlCiiPerfMetrics().sourceParseCount, 0);
}));

test('parse failure is cached only for the exact failing source basis', () => {
  class ThrowingParser {
    static calls = 0;
    parseFromString() {
      ThrowingParser.calls += 1;
      throw new Error('synthetic parse failure');
    }
  }

  const previousParser = globalThis.DOMParser;
  globalThis.DOMParser = ThrowingParser;
  resetSourceDocumentContextCache();
  try {
    const first = getSourceDocumentContext('<BAD>');
    const second = getSourceDocumentContext('<BAD>');
    assert.equal(first, second);
    assert.equal(first.document, null);
    assert.match(first.error.message, /synthetic parse failure/);
    assert.equal(ThrowingParser.calls, 1);
  } finally {
    resetSourceDocumentContextCache();
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
  }
});
