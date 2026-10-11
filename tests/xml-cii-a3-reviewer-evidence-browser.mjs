import assert from 'node:assert/strict';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Synthetic evidence tests the actual authored docs/ browser UI; this is NOT
// an independently accepted Owner original file/engineering acceptance.
const origin = process.env.A3_209_ORIGIN || 'http://127.0.0.1:4201';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const receipt = await page.evaluate(async () => {
    const { renderStandaloneResolverJsonTracePanel } =
      await import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js');
    const evidence = Array.from({ length: 1004 }, (_, i) => ({
      branch: 'SELECTED_ZONE', bore: '100', sourceNodeNo: i % 3 ? -1 : i,
      position: 'E=0 N=0 EL=0', objectType: 'PIPE', dtxrPos: 'POS-' + i,
      name: 'PS-' + i, cmpSupGap: '', componentRefNo: '',
      sourcePath: '/ORIGINAL/SOURCE/' + i,
    }));
    const original = JSON.stringify(evidence);
    const state = {
      sourceKind: 'xml', stagedJsonText: '', jsonTraceActiveSubTabId: 'tree',
      resolverSourceMode: 'lfj-indexed-preview', resolverJsonTraceResult: null,
      lfjIndexedPreview: { evidenceTreeRows: evidence, nodeWiseRows: [] },
      lfjIndexedExportOptIn: false, lfjIndexedExportReceipt: null,
      resolverJsonTraceRunning: false,
    };
    const host = document.createElement('section');
    host.id = 'a3-209-native-reviewer-proof';
    document.body.appendChild(host);
    renderStandaloneResolverJsonTracePanel(host, state, { current: state }, () => {});
    const must = (condition, message) => { if (!condition) throw Error(message); };
    const input = host.querySelector('input[aria-label="Filter indexed evidence across all source paths and values"]');
    const range = host.querySelector('[data-field="table-visible-range"]');
    const next = host.querySelector('[data-action="table-next-page"]');
    const table = host.querySelector('table.xml-cii-resolver-table');
    const count = () => table.querySelectorAll('tbody tr').length;
    must(input && range && next && table, 'live docs renderer lacks search/pager');
    must(count() === 1000, 'first DOM page must have 1000 rows');
    must(range.textContent.includes('of 1004 original rows'), 'source total incorrect');
    next.click();
    must(count() === 4, 'last page should contain four original rows');
    must(table.textContent.includes('/ORIGINAL/SOURCE/1003'), 'tail occurrence inaccessible');
    input.value = 'source/1003';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    must(count() === 1 && table.textContent.includes('/ORIGINAL/SOURCE/1003'),
      'source-wide tail search failed');
    must(range.textContent.includes('filtered from 1004 original rows'), 'filtered census missing');
    input.value = 'IMPOSSIBLE-MISSING-PATH';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    must(count() === 0 && range.textContent.includes('no matching rows'), 'zero-match state unclear');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    must(count() === 1000 && JSON.stringify(evidence) === original,
      'filtering changed source rows or failed to restore total');
    const disabled = host.querySelector('[data-action="download-evidence-tree-csv"]');
    must(disabled && disabled.disabled, 'source-only preview must not authorize CSV exports');
    const result = {
      schema: 'A3_209_NATIVE_REVIEWER_UI_V1',
      sourceRows: evidence.length, initialVisibleRows: 1000, tailVisibleRows: 4,
      searchedTailPath: '/ORIGINAL/SOURCE/1003', searchedRows: 1,
      noMatchRows: 0, retainedOriginalOrderAndBytes: true,
      engineeringReady: false, exportButtonDisabled: true, passed: true,
    };
    host.remove();
    return result;
  });
  assert.equal(receipt.passed, true);
  console.log('A3_209_NATIVE_REVIEWER_PASS ' + JSON.stringify(receipt));
  await page.screenshot({
    path: join(process.env.RUNNER_TEMP || process.cwd(), 'a3-209-reviewer-ui-chromium.png'),
    fullPage: false,
  });
} finally {
  await browser.close();
}
