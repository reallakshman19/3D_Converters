import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.XML_CII_ISSUE_893_URL || 'http://127.0.0.1:4173';
const outputPath = process.env.XML_CII_ISSUE_893_OUTPUT || 'ValidationRecords/xml-cii-issue-893-consumer-authority.json';

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
      lastError = new Error('HTTP ' + response.status);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server unavailable at ' + url + ': ' + lastError);
}

const seedUrl = baseUrl + '/tests/browser/xml-cii-issue-892-three-master-cold-reload-e2e.html';
await waitForServer(seedUrl);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.on('console', (message) => console.log('[browser:' + message.type() + '] ' + message.text()));
  page.on('pageerror', (error) => console.error('[browser:pageerror] ' + (error.stack || error)));

  await page.goto(seedUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => globalThis.__XML_CII_ISSUE_892_DONE__ === true, null, { timeout: 300_000 });
  const seed = await page.evaluate(() => globalThis.__XML_CII_ISSUE_892_RESULT__);
  if (!seed?.ok) throw new Error(seed?.error || 'Issue 892 seed lifecycle failed');

  const result = await page.evaluate(async () => {
    const v = '20261007-c05-6-2-consumer-authority-1';
    const [
      hydration,
      configModule,
      regexModule,
      weightModule,
      runtime,
    ] = await Promise.all([
      import('../../tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js?v=' + v),
      import('../../tabs/xml-cii-2019-standalone/xml-cii-dataset-backed-config.js?v=' + v),
      import('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-smart-evidence.js?v=' + v),
      import('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js?v=' + v),
      import('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js?v=' + v),
    ]);

    function requireValue(condition, message) {
      if (!condition) throw new Error(message);
    }
    async function expectReject(fn, pattern, label) {
      try {
        await fn();
      } catch (error) {
        requireValue(pattern.test(String(error?.message || error)), label + ': unexpected error ' + String(error?.message || error));
        return String(error?.message || error);
      }
      throw new Error(label + ': expected rejection');
    }
    function blankContext() {
      return {
        config: {}, rawRows: {}, mappingRows: {}, datasetRefs: {}, rowCounts: {},
        previewRows: {}, sourceMetadata: {}, appliedMappingRevision: {},
      };
    }

    const stateRef = { current: { supportConfigJson: '{}', masterContext: blankContext() } };
    requireValue(await hydration.hydratePersistedMasterDatasets(stateRef) === true, 'consumer hydration reported no change');
    const context = stateRef.current.masterContext;
    const refs = context.datasetRefs || {};
    for (const key of ['pipingClass', 'materialMap', 'weight']) {
      requireValue(refs[key]?.datasetId, key + ' cold-hydrated ref missing');
    }
    const revisionsBefore = JSON.stringify(context.appliedMappingRevision || {});

    const sourceEntriesBefore = performance.getEntriesByType('resource')
      .filter((entry) => /Piping_class_master\.json|PCF_MAT_MAP\.TXT|wtValveweights\.json/.test(entry.name))
      .length;

    const generic = await configModule.materializeXmlCiiDatasetBackedConfig({}, stateRef.current);
    requireValue(generic.pipingClass?.masterRows?.length === 10699, 'Piping Class generic consumer row count mismatch');
    requireValue(generic.material?.mapRows?.length === 383, 'Mat_Map generic consumer row count mismatch');
    requireValue(generic.weight?.masterRows?.length === 1595, 'Weight generic consumer row count mismatch');
    requireValue(Number(generic.weight?.masterRevision) === Number(context.appliedMappingRevision.weight),
      'Weight generic consumer applied revision mismatch');
    requireValue(generic.weight?.masterFingerprint === refs.weight.masterFingerprint,
      'Weight generic consumer fingerprint mismatch');

    // Later bounded Regex evidence deliberately does NOT rehydrate 10,699
    // master rows without sample-derived queries. The old test expected the
    // deprecated full-array behavior; preserve the stronger no-bulk guarantee.
    const regex = await regexModule.materializeRegexSmartMasterContext(stateRef.current, {
      async search() { throw new Error('EMPTY_SAMPLE_MUST_NOT_SEARCH_MASTER'); },
      async getRowsByIndexes() { throw new Error('EMPTY_SAMPLE_MUST_NOT_READ_MASTER'); },
      async materializeRows() { throw new Error('UNBOUNDED_REGEX_MASTER_ROWS_FORBIDDEN'); },
    });
    requireValue(regex.pipingClassRowCount === 0,
      'Regex without branch samples must not hydrate the full Piping Class dataset');
    requireValue(regex.evidenceBasis.includes(refs.pipingClass.datasetId),
      'Regex/Piping Class evidence did not bind restored datasetId');
    requireValue(context.pipingClassRows.length === 0,
      'Regex evidence must not retain whole Piping Class rows in application state');

    // P07: derive a positive probe from the REAL checked-in 10,699-row
    // master already restored from IndexedDB. No synthetic golden or
    // author-picked nonmatching string may qualify positive native retrieval.
    const candidates = new Set();
    for (const row of generic.pipingClass.masterRows) {
      for (const [field, value] of Object.entries(row || {})) {
        if (/^(?:_|rowindex|rownumber|ordinal|sequence)$/i.test(field)) continue;
        if (typeof value !== 'string' && typeof value !== 'number') continue;
        for (const match of String(value).toUpperCase().matchAll(/\b[A-Z0-9]*\d{3,}[A-Z0-9]*\b/g)) {
          if (match[0].length >= 3 && match[0].length <= 36) candidates.add(match[0]);
        }
      }
      if (candidates.size >= 64) break;
    }

    let actualMatch = null;
    let positiveProbeAttempts = 0;
    for (const token of candidates) {
      if (positiveProbeAttempts >= 64) break;
      positiveProbeAttempts += 1;
      const result = await runtime.searchMasterDatasetRows('pipingClass', refs.pipingClass.datasetId, token);
      const indexes = Array.isArray(result?.indexes) ? result.indexes : [];
      if (indexes.some((index) => Number.isInteger(index) && index >= 0)) {
        actualMatch = { token, firstIndex: indexes[0], matchCount: indexes.length };
        break;
      }
    }
    requireValue(actualMatch,
      'No native positive Piping Class Worker search match in ' + positiveProbeAttempts
      + ' real row-derived candidates; do not certify indexed retrieval.');

    const searched = [];
    const rowFetches = [];
    const regexWithSamples = await regexModule.materializeRegexSmartMasterContext({
      ...stateRef.current,
      regexTesterResult: { branchSamples: [
        { branchName: '/LINE12345-' + actualMatch.token },
      ] },
    }, {
      async search(masterKey, datasetId, query) {
        searched.push({ masterKey, datasetId, query });
        requireValue(masterKey === 'pipingClass' && datasetId === refs.pipingClass.datasetId,
          'Regex bounded search used wrong master authority');
        return runtime.searchMasterDatasetRows(masterKey, datasetId, query);
      },
      async getRowsByIndexes(masterKey, datasetId, indexes, datasetRef) {
        rowFetches.push({ masterKey, datasetId, indexes, datasetRevision: datasetRef.datasetRevision });
        requireValue(masterKey === 'pipingClass' && datasetId === refs.pipingClass.datasetId,
          'Regex bounded row fetch used wrong master authority');
        requireValue(datasetRef.datasetRevision === refs.pipingClass.datasetRevision,
          'Regex bounded fetch lost the restored source revision');
        requireValue(indexes.length > 0 && indexes.length <= 8,
          'Regex bounded fetch must have positive indexes under maxTotalIndexes=8');
        requireValue(indexes.every((n) => Number.isInteger(n) && n >= 0),
          'Regex bounded fetch contained invalid worker row indexes');
        return runtime.getMasterDatasetRowsByIndexes(masterKey, datasetId, indexes, datasetRef);
      },
      maxIndexesPerQuery: 4,
      maxTotalIndexes: 8,
    });
    requireValue(searched.length > 0, 'Regex branch sample did not trigger indexed search');
    requireValue(searched.some((q) => q.query.toUpperCase() === actualMatch.token),
      'Regex plan dropped actual source row token');
    requireValue(rowFetches.length === 1,
      'Regex must perform exactly one bounded IndexedDB indexed-row fetch');
    requireValue(regexWithSamples.pipingClassRowCount > 0 &&
      regexWithSamples.pipingClassRowCount <= 8,
      'Regex positive native evidence must be nonempty and bounded to 8 rows');
    requireValue(regexWithSamples.masterContext.pipingClassRows.some((row) =>
      JSON.stringify(row).toUpperCase().includes(actualMatch.token)),
      'native indexed row must actually contain the positive source-derived token');
    requireValue(regexWithSamples.evidenceBasis.includes(refs.pipingClass.datasetId),
      'sampled Regex evidence lost Piping Class dataset identity');
    requireValue(regexWithSamples.evidenceBasis.includes('"mappingRevision"'),
      'positive Regex evidence lost applied mapping revision');
    requireValue(context.pipingClassRows.length === 0 &&
      (context.rawRows.pipingClass || []).length === 0,
      'transient sampled Regex rows leaked into durable application context');

    // P08: the indexed path, not just full-row materialization, must reject
    // wrong-master, stale revision, and Weight fingerprint substitutions.
    const wrongMasterIndexedError = await expectReject(
      () => runtime.getMasterDatasetRowsByIndexes(
        'pipingClass', refs.materialMap.datasetId, [0], refs.materialMap),
      /dataset belongs to materialMap/i, 'indexed wrong-master substitution');
    const staleIndexedError = await expectReject(
      () => runtime.getMasterDatasetRowsByIndexes(
        'pipingClass', refs.pipingClass.datasetId, [0], {
          ...refs.pipingClass,
          datasetRevision: Number(refs.pipingClass.datasetRevision) + 1,
        }),
      /Dataset revision mismatch for pipingClass/i, 'indexed stale revision');
    const fingerprintIndexedError = await expectReject(
      () => runtime.getMasterDatasetRowsByIndexes(
        'weight', refs.weight.datasetId, [0], {
          ...refs.weight, masterFingerprint: 'invalid-weight-fingerprint-203',
        }),
      /Dataset fingerprint mismatch for weight/i, 'indexed Weight fingerprint');

    const weightConfig = await weightModule.weightMatchConfigFromState(stateRef.current, {
      materializeRows: async () => { throw new Error('Weight Match compact authority must not trigger compatibility materialization'); },
    });
    requireValue(!('masterRows' in (weightConfig.weight || {})), 'Weight Match compact authority unexpectedly includes masterRows');
    requireValue(Number(weightConfig.weight?.masterRevision) === Number(context.appliedMappingRevision.weight),
      'Weight Match compact revision mismatch');
    requireValue(weightConfig.weight?.masterFingerprint === refs.weight.masterFingerprint,
      'Weight Match compact fingerprint mismatch');

    const rankResult = await runtime.rankMasterDatasetWeightIssues(
      'weight',
      refs.weight.datasetId,
      [],
      weightConfig,
      { ratingMode: 'preview', previewRatingSnapshot: {} },
    );
    weightModule.assertWeightDatasetResultAuthority(rankResult, refs.weight);

    const crossMasterError = await expectReject(
      () => runtime.materializeMasterDatasetRows('pipingClass', refs.materialMap),
      /dataset belongs to materialMap/i,
      'cross-master substitution',
    );
    const staleRevisionError = await expectReject(
      () => runtime.materializeMasterDatasetRows('materialMap', {
        ...refs.materialMap,
        datasetRevision: Number(refs.materialMap.datasetRevision) + 1,
      }),
      /Dataset revision mismatch for materialMap/i,
      'stale revision substitution',
    );
    const staleFingerprintError = await expectReject(
      () => runtime.materializeMasterDatasetRows('weight', {
        ...refs.weight,
        masterFingerprint: 'stale-fingerprint-893',
      }),
      /Dataset fingerprint mismatch for weight/i,
      'stale fingerprint substitution',
    );
    const nonWeightRankError = await expectReject(
      () => runtime.rankMasterDatasetWeightIssues('weight', refs.materialMap.datasetId, [], weightConfig, {
        ratingMode: 'preview',
        previewRatingSnapshot: {},
      }),
      /requires a weight dataset/i,
      'non-weight Weight Match substitution',
    );

    requireValue(JSON.stringify(context.appliedMappingRevision || {}) === revisionsBefore,
      'consumer operations mutated applied mapping revisions');

    const sourceEntriesAfter = performance.getEntriesByType('resource')
      .filter((entry) => /Piping_class_master\.json|PCF_MAT_MAP\.TXT|wtValveweights\.json/.test(entry.name))
      .length;
    requireValue(sourceEntriesAfter === sourceEntriesBefore,
      'consumer operations refetched master source files');

    return {
      schema: 'XMLCII_ISSUE_893_CONSUMER_AUTHORITY_V1',
      ok: true,
      refs: {
        pipingClass: {
          datasetId: refs.pipingClass.datasetId,
          datasetRevision: refs.pipingClass.datasetRevision,
          appliedRevision: context.appliedMappingRevision.pipingClass,
        },
        materialMap: {
          datasetId: refs.materialMap.datasetId,
          datasetRevision: refs.materialMap.datasetRevision,
          appliedRevision: context.appliedMappingRevision.materialMap,
        },
        weight: {
          datasetId: refs.weight.datasetId,
          datasetRevision: refs.weight.datasetRevision,
          appliedRevision: context.appliedMappingRevision.weight,
          masterFingerprint: refs.weight.masterFingerprint,
        },
      },
      consumers: {
        pipingClassRows: generic.pipingClass.masterRows.length,
        regexPipingClassRows: regex.pipingClassRowCount,
        regexSampledBoundedRows: regexWithSamples.pipingClassRowCount,
        regexSearches: searched.length,
        regexIndexedRowFetches: rowFetches.length,
        positiveSourceToken: actualMatch.token,
        positiveSourceProbeAttempts: positiveProbeAttempts,
        positiveWorkerMatchCount: actualMatch.matchCount,
        positiveWorkerFirstIndex: actualMatch.firstIndex,
        positiveIndexedRowCount: regexWithSamples.pipingClassRowCount,
        positiveIndexedRowIndexes: rowFetches[0]?.indexes || [],
        materialMapRows: generic.material.mapRows.length,
        weightRows: generic.weight.masterRows.length,
        weightRankDatasetId: rankResult.datasetId,
        weightRankDatasetRevision: rankResult.datasetRevision,
        weightRankFingerprint: rankResult.masterFingerprint,
      },
      guards: {
        crossMasterError,
        staleRevisionError,
        staleFingerprintError,
        nonWeightRankError,
        wrongMasterIndexedError,
        staleIndexedError,
        fingerprintIndexedError,
      },
      assertions: {
        correctConsumerBinding: true,
        crossMasterSubstitutionFailsClosed: true,
        staleRevisionSubstitutionFailsClosed: true,
        staleFingerprintSubstitutionFailsClosed: true,
        appliedRevisionsIndependent: true,
        noSecondMasterSourceImport: true,
        emptyRegexHasNoBulkHydration: true,
        nativeWorkerBoundedSearchQueriesObserved: searched.length > 0,
        nativeWorkerIndexedRowRetrievalObserved: rowFetches.length === 1 &&
          regexWithSamples.pipingClassRowCount > 0,
        positiveSourceTokenRecoveredInIndexedRows: true,
        positiveWorkerSearchMatches: actualMatch.matchCount > 0,
        indexedWrongMasterFailsClosed: true,
        indexedStaleRevisionFailsClosed: true,
        indexedWeightFingerprintFailsClosed: true,
        regexSourceRevisionPreserved: true,
      },
    };
  });

  await fs.mkdir('ValidationRecords', { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log('XML_CII_ISSUE_893_CONSUMER_AUTHORITY_RESULT');
  console.log(JSON.stringify(result, null, 2));
  if (!result?.ok) throw new Error(result?.error || 'C05.6.2 consumer authority lifecycle returned no result');
} finally {
  await browser.close();
}
