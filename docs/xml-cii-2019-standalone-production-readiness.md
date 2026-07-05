# XML→CII 2019 Standalone Production Readiness

## Current architecture

The standalone workflow is a separate callable API and app-level tab path:

```text
Programmatic caller / standalone tab
→ runXmlCii2019Workflow(job, runtime)
→ source detection + job normalization
→ workflow service
→ PSI116 XML branch or direct InputXML enrichment branch
→ enrichedXML / enrichedInputXML
→ optional CII compatibility route
→ normalized diagnostics, logs, and artifacts
```

The existing Model Converters XML→CII production route remains separate and is not replaced by this workflow.

## What is production-ready in this phase

The standalone workflow is ready for shadow production proof as a callable module:

- `runXmlCii2019Workflow(job, runtime)` is the public API boundary.
- Source detection supports PSI116 XML, CAESARII InputXML, and `PIPINGELEMENT` fragments.
- Direct InputXML enrichment supports element side-load by `FROM_NODE→TO_NODE`.
- InputXML side-load can enrich `LINE_ID`, `DTXR_POS`, `DTXR_PS`, `PipingClass`, `Rating`, `Point_properties_basis`, and DTXR-derived restraints.
- The optional CII route is isolated behind `runtime.engineRunner` / standalone compatibility engine boundary.
- Workflow results now expose normalized diagnostics for XML and InputXML branches.
- Production isolation is guarded by tests that reject legacy handoff tokens and production worker/invocation imports from the standalone API/service.

Readiness status is represented by:

```js
createXmlCiiProductionReadinessReport(inputs)
```

with schema:

```text
xml-cii-2019-production-readiness/v1
```

The expected successful status is:

```text
ready-for-shadow-production-proof
```

## What is still shadow-only

This phase does not switch the existing Model Converters XML→CII route. The standalone workflow is ready only for shadow production proof until live browser/Pyodide and old-route parity are complete.

The standalone workflow should be used as a parallel API/tab path for proof collection, diagnostics comparison, and controlled fixture validation. It must not receive production traffic by replacing the existing `xml_to_cii` converter route until a later explicit switch approval.

## Programmatic call pattern

```js
import { runXmlCii2019Workflow } from './tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js';

const result = await runXmlCii2019Workflow(job, runtime);

if (!result.ok) {
  console.error(result.error, result.diagnostics);
}
```

`runtime.engineRunner` is optional. Tests can pass a fake engine runner to avoid Pyodide. Browser use can omit it and allow the standalone compatibility engine to load.

## XML example job

```js
const xmlJob = {
  sourceKind: 'auto',
  sourceName: 'psi116-basic-input.xml',
  sourceText: '<PipeStressExport>...</PipeStressExport>',
  supportConfigJson: '{}',
  options: {
    outputMode: 'enriched-only'
  }
};

const result = await runXmlCii2019Workflow(xmlJob, {
  engineRunner: async (job) => ({
    ok: true,
    sourceKind: 'xml',
    outputKind: 'enrichedXML',
    enrichedText: '<PipeStressExport>...</PipeStressExport>',
    enrichedName: 'psi116-basic-input_enriched.xml',
    ciiText: null,
    ciiName: null,
    diagnostics: { engine: 'fake-xml', warnings: [] },
    logs: [],
    error: null
  })
});
```

Expected behavior:

- `sourceKind: 'auto'` resolves to `xml` for `PipeStressExport`.
- XML branch calls the compatibility engine boundary.
- result `outputKind` is `enrichedXML`.
- diagnostics include `branch: 'psi116-xml-compatibility-engine'`.

## InputXML + side-load example job

```js
const inputXmlJob = {
  sourceKind: 'inputxml',
  sourceName: 'inputxml-side-load-input.xml',
  sourceText: '<PIPINGELEMENT FROM_NODE="20" TO_NODE="30" />...',
  elementSideLoadText: `ELEMENT 30-40
LINE_ID=/ASIM-1836-6"-S8810010-91261M7-HC/B1
DTXR_POS=Pipe Rest XRT01|PIPE SUPPORT TYPE-103|Directional Anchor On Shoe|GUIDE PDO-TYPE-603
DTXR_PS=Pipe Rest XRT01|PIPE SUPPORT TYPE-103`,
  supportConfigJson: JSON.stringify({
    defaultStiffness: 1751270000000,
    defaultGap: 0,
    defaultFriction: 0.3,
    inputXmlPipingClass: { tokenDelimiter: '-', tokenPosition: 5 },
    inputXmlRatingByPipingClass: { 91261: '900' },
    inputXmlDtxrRestraintRules: [
      { label: 'Y/restraint support', typeCode: 14, patterns: ['PIPE REST', 'SHOE', 'SUPPORT TYPE-103', 'REST'] },
      { label: 'guide restraint', typeCode: 9, friction: -1.0101, patterns: ['GUIDE', 'PDO-TYPE-603'] },
      { label: 'line stop / directional anchor', typeCode: 8, friction: -1.0101, patterns: ['DIRECTIONAL ANCHOR', 'ANCHOR', 'LINE STOP'] }
    ]
  }),
  options: {
    outputMode: 'both',
    inputXmlOutputMode: 'full-document',
    pointPropertiesBasis: 'TO',
    inputXmlRestraintPolicy: 'replace-with-dtxr-derived-restraints',
    fillSentinelFromLineContext: true,
    normalizePressureCaseNames: true
  }
};

const result = await runXmlCii2019Workflow(inputXmlJob, {
  engineRunner: async (job) => {
    // job.sourceText is enriched InputXML, not the raw InputXML fixture.
    return {
      ok: true,
      sourceKind: 'inputxml',
      outputKind: 'enrichedInputXML',
      enrichedText: '',
      enrichedName: '',
      ciiText: 'CII FROM ENRICHED INPUTXML',
      ciiName: 'inputxml-side-load-input.cii',
      diagnostics: { engine: 'fake-inputxml-cii', outputMode: 'cii-only', warnings: [] },
      logs: [],
      error: null
    };
  }
});
```

Expected behavior:

- direct InputXML enrichment runs first.
- `LINE_ID` is serialized safely as XML, including `6&quot;`.
- `PipingClass` derives as `91261`.
- `Rating` derives as `900`.
- `Point_properties_basis` is `TO`.
- existing node-40 `TYPE=17` restraint is replaced by `TYPE=14`, `TYPE=9`, and `TYPE=8`.
- optional CII engine receives enriched InputXML with `options.outputMode: 'cii-only'`.

## Diagnostics contract

Every normalized workflow result should expose:

```text
schema
sourceKind
outputKind
branch
elementCount
enrichedElementCount
restraintCount
sideLoadMatched
sideLoadUnmatched
inheritedFieldCount
sentinelFieldCount
engineDiagnostics
warnings
```

XML branch diagnostics use:

```text
branch: psi116-xml-compatibility-engine
```

InputXML enriched-only diagnostics use:

```text
branch: direct-inputxml-enrichment
```

InputXML optional CII diagnostics use:

```text
branch: direct-inputxml-enrichment-plus-cii-compatibility
```

## Production-readiness report

The readiness report is created by:

```js
import { createXmlCiiProductionReadinessReport } from './tabs/xml-cii-2019-standalone/xml-cii-production-readiness.js';
```

A successful report returns:

```js
{
  schema: 'xml-cii-2019-production-readiness/v1',
  ok: true,
  status: 'ready-for-shadow-production-proof',
  blockers: []
}
```

If any check fails, `ok` becomes `false`, `status` becomes `blocked`, and `blockers` lists the failed readiness checks.

## Known limitations

- This phase does not switch the existing Model Converters XML→CII route.
- The standalone workflow is ready only for shadow production proof until live browser/Pyodide and old-route parity are complete.
- Optional CII still uses the standalone compatibility Pyodide engine when no fake `runtime.engineRunner` is supplied.
- No golden parity against the old production XML→CII route is complete yet.
- Worker isolation is not complete; the browser runtime still imports the standalone compatibility engine directly.
- The existing production Pyodide worker and legacy route remain intentionally unchanged.

## Blocked items before production switch

Before switching production traffic, complete these items:

1. Run live browser/Pyodide proof for PSI116 XML and InputXML optional CII output.
2. Add old-route parity fixtures comparing current production XML→CII output against standalone output for representative jobs.
3. Decide whether the standalone compatibility engine must move behind a dedicated worker boundary.
4. Define rollback criteria and feature flag / controlled switch policy.
5. Review larger real plant samples, not only minimal fixtures.

## Recommended next phase

Proceed with a controlled shadow-production proof phase:

```text
real sample set
→ standalone API run
→ current production route run
→ diagnostics/artifact comparison
→ parity report
→ switch/no-switch recommendation
```

Only after parity and live browser/Pyodide proof should a separate runtime switch PR be proposed.
