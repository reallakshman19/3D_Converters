# XML→CII 2019 Standalone Production Readiness

## Current architecture

The standalone workflow is a separate callable API and app-level tab path:

```text
Programmatic caller / adapted standalone UI
→ runXmlCii2019Workflow(job, runtime)
→ source detection + job normalization
→ workflow service
→ PSI116 XML branch or direct InputXML enrichment branch
→ enrichedXML / enrichedInputXML
→ optional CII compatibility route
→ normalized diagnostics, logs, and artifacts
```

The existing Model Converters XML→CII production route remains separate and is not replaced by this workflow.

## Adapted workflow UI

The standalone workflow has both:

1. an API callable by other apps, and
2. an adapted/configurable workflow UI for manual setup and proof.

The UI adapts the existing XML→CII 2019 workflow phase model. It is not a literal copy of the old popup implementation and does not import or execute the old Model Converters workflow runtime.

The adapted phase sequence is:

```text
1 Regex
2 Import Masters
3 JSON Trace
4 Preview
5 Diagnostics
5A Weight Match
6 Run
7 Support Types
8 Config
Custom Input
```

The old Model Converters workflow popup is unchanged. The standalone workflow can be called by other apps; it does not call other app workflows.

## InputXML UI coverage

The standalone-only InputXML controls are available in the adapted phase UI, especially `Custom Input` and `3 JSON Trace`:

```text
sourceKind: auto | xml | inputxml
InputXML file/text
elementSideLoadText
inputXmlOutputMode
pointPropertiesBasis
inputXmlRestraintPolicy
fillSentinelFromLineContext
normalizePressureCaseNames
```

These controls map into the public `runXmlCii2019Workflow(job, runtime)` job shape through `buildXmlCiiWorkflowJobFromUiState(state)`.

## Programmatic call pattern

```js
import { runXmlCii2019Workflow } from './tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js';

const result = await runXmlCii2019Workflow(job, runtime);
```

`runtime.engineRunner` is optional. Tests can pass an explicit fake engine runner to avoid Pyodide. Browser use can omit it and allow the standalone compatibility engine to load.

## XML example job

```js
const xmlJob = {
  sourceKind: 'auto',
  sourceName: 'psi116-basic-input.xml',
  sourceText: '<PipeStressExport>...</PipeStressExport>',
  supportConfigJson: '{}',
  options: { outputMode: 'enriched-only' }
};
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
  supportConfigJson: '{}',
  options: {
    outputMode: 'both',
    inputXmlOutputMode: 'full-document',
    pointPropertiesBasis: 'TO',
    inputXmlRestraintPolicy: 'replace-with-dtxr-derived-restraints',
    fillSentinelFromLineContext: true,
    normalizePressureCaseNames: true
  }
};
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

## Reference parity proof

Mission 03 adds a controlled reference parity harness:

```bash
node tests/xml-cii-standalone-parity.test.js
```

The harness intentionally does not click the old popup or invoke the production route. See `docs/xml-cii-2019-standalone-parity.md`.

## Live proof and switch-readiness decision

Mission 04 adds an automated smoke and repeatable manual live checklist:

```bash
node tests/xml-cii-standalone-live-smoke.test.js
```

The smoke proves app-path registration/static wiring plus XML and InputXML standalone API evidence. It deliberately returns `needs-more-proof` until manual browser/Pyodide evidence is captured using `docs/xml-cii-2019-standalone-live-proof.md`.

The conservative decision is:

```text
needs-more-proof
```

This is not a production switch and not a switch approval.

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

## Known limitations

- This phase does not switch the existing Model Converters XML→CII route.
- Mission 04 automated smoke is not a real browser/Pyodide run.
- Optional CII still uses the standalone compatibility Pyodide engine when no explicit `runtime.engineRunner` is supplied.
- Mission 03 parity is reference-fixture parity, not live production-route invocation.
- Worker isolation is not complete; the browser runtime still imports the standalone compatibility engine directly.
- The existing production Pyodide worker and legacy route remain intentionally unchanged.

## Blocked items before production switch

1. Complete manual browser proof for XML and InputXML fixtures.
2. Complete real browser/Pyodide compatibility proof.
3. Add live old-route parity proof if owner approves a safe harness outside the old popup/worker mutation path.
4. Decide whether the standalone compatibility engine must move behind a dedicated worker boundary.
5. Define rollback criteria and feature flag / controlled switch policy.

## Recommended next phase

Proceed with manual browser/Pyodide evidence capture:

```text
open app
→ run standalone XML fixture
→ run standalone InputXML fixture + side-load
→ capture output/log/diagnostics evidence
→ update decision evidence
→ switch/no-switch recommendation
```

Only after live proof should a separate runtime switch PR be proposed.
