import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPreviewBoreWallAuthority,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-bore-wall-authority.js';

const branchName = '/HBMR-1000-24"-P2810042-61440-01/B9';

function leaf(name, value) {
  return {
    nodeType: 1,
    localName: name,
    nodeName: name,
    textContent: String(value),
    childNodes: [],
  };
}

function node(fields = {}) {
  return {
    nodeType: 1,
    localName: 'Node',
    nodeName: 'Node',
    textContent: '',
    childNodes: Object.entries(fields).map(([key, value]) => leaf(key, value)),
  };
}

function branchElement(nodes) {
  return {
    nodeType: 1,
    localName: 'Branch',
    nodeName: 'Branch',
    textContent: '',
    childNodes: [leaf('Branchname', branchName), ...nodes],
  };
}

function sourceXml({ position = '0 0 0', outsideDiameter = '' } = {}) {
  return `<Root><Branch><Branchname>${branchName}</Branchname><Node>
    <NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType>
    <Position>${position}</Position>
    ${outsideDiameter ? `<OutsideDiameter>${outsideDiameter}</OutsideDiameter>` : ''}
  </Node></Branch></Root>`;
}

function sourceDocument({ position = '0 0 0', outsideDiameter = '' } = {}) {
  const fields = {
    NodeNumber: 10,
    ComponentType: 'PIPE',
    Position: position,
  };
  if (outsideDiameter) fields.OutsideDiameter = outsideDiameter;
  const branch = branchElement([node(fields)]);
  return {
    getElementsByTagName(name) {
      if (name === 'Branch') return [branch];
      if (name === 'parsererror') return [];
      return [];
    },
  };
}

function stagedEntry({ bore, position = '0 0 0', name = 'trace-entry' }) {
  return {
    type: 'PIPE',
    name,
    attributes: {
      OWNER: branchName,
      POS: position,
      ABORE: String(bore),
      DTXR: 'SCH 80',
    },
  };
}

function stagedJson(entries) {
  return JSON.stringify([{
    type: 'BRANCH',
    name: branchName,
    children: entries,
  }]);
}

function preview({ entries = [], position = '0 0 0', outsideDiameter = '' } = {}) {
  return applyPreviewBoreWallAuthority({
    xmlText: sourceXml({ position, outsideDiameter }),
    stagedJsonText: stagedJson(entries),
    config: {},
    sourceDocument: sourceDocument({ position, outsideDiameter }),
    result: {
      branchRows: [{ branchName, sizeMm: 600, pipingClass: '' }],
      nodeRows: [],
    },
  });
}

test('resolved JSON-trace bore validates a matching Branchname fallback', () => {
  const result = preview({ entries: [stagedEntry({ bore: 600 })] });
  const row = result.nodeBoreWallRows[0];
  assert.equal(row.boreMm, 600);
  assert.equal(row.boreSource, 'branch-name-fallback');
  assert.equal(row.boreFallbackUsed, true);
  assert.equal(row.boreValidationTraceMm, 600);
  assert.equal(row.boreTraceMismatch, false);
  assert.equal(row.boreNeedsReview, false);
  assert.equal(row.boreTraceStatus, 'RESOLVED_POS');
});

test('resolved JSON-trace bore flags a Branchname fallback mismatch', () => {
  const result = preview({ entries: [stagedEntry({ bore: 50 })] });
  const row = result.nodeBoreWallRows[0];
  assert.equal(row.boreMm, 600);
  assert.equal(row.boreSource, 'branch-name-fallback');
  assert.equal(row.boreValidationTraceMm, 50);
  assert.equal(row.boreTraceMismatch, true);
  assert.equal(row.boreNeedsReview, true);
  assert.equal(row.boreTraceStatus, 'RESOLVED_POS');
  assert.ok(
    result.boreAuthorityDiagnostics.some((item) => item.type === 'bore-fallback-trace-mismatch'),
    'fallback/trace mismatch must be surfaced in Preview diagnostics',
  );
});

test('unresolved JSON trace makes an unvalidated Branchname fallback review-required', () => {
  const result = preview({ entries: [stagedEntry({ bore: 50, position: '100 0 0' })] });
  const row = result.nodeBoreWallRows[0];
  assert.equal(row.boreMm, 600);
  assert.equal(row.boreFallbackUsed, true);
  assert.equal(row.boreValidationTraceMm, null);
  assert.equal(row.boreTraceStatus, 'UNRESOLVED');
  assert.equal(row.boreNeedsReview, true);
  assert.ok(
    result.boreAuthorityDiagnostics.some((item) => item.type === 'bore-fallback-trace-unresolved'),
    'unresolved trace must flag an unvalidated Branchname fallback',
  );
});

test('ambiguous JSON trace preserves ledger ambiguity and blocks silent fallback acceptance', () => {
  const result = preview({
    entries: [
      stagedEntry({ bore: 50, position: '5 0 0', name: 'left' }),
      stagedEntry({ bore: 80, position: '-5 0 0', name: 'right' }),
    ],
  });
  const row = result.nodeBoreWallRows[0];
  assert.equal(row.boreMm, 600);
  assert.equal(row.boreFallbackUsed, true);
  assert.equal(row.boreTraceStatus, 'AMBIGUOUS_REVIEW');
  assert.equal(row.boreNeedsReview, true);
  assert.ok(
    result.boreAuthorityDiagnostics.some((item) => item.type === 'bore-fallback-trace-ambiguous'),
    'ambiguous trace must preserve review-required semantics',
  );
});

test('source XML geometry remains primary and does not emit fallback diagnostics', () => {
  const result = preview({
    outsideDiameter: '33.4',
    entries: [stagedEntry({ bore: 600 })],
  });
  const row = result.nodeBoreWallRows[0];
  assert.equal(row.boreMm, 25);
  assert.equal(row.boreSource, 'xml-outside-diameter');
  assert.equal(row.boreFallbackUsed, false);
  assert.equal(row.boreNeedsReview, false);
  assert.equal(
    result.boreAuthorityDiagnostics.filter((item) => item.type.startsWith('bore-fallback-trace-')).length,
    0,
  );
});
