# XML→CII 2019 Standalone Reference Parity Proof

Mission: Issue #20 — Mission 03 reference parity proof.

## Purpose

This proof compares the standalone XML→CII 2019 API path with small frozen current-route reference fixtures. It does not switch production traffic and does not invoke the old Model Converters popup.

## Why frozen references are used

The current Model Converters XML→CII route is coupled to the existing popup, worker, invocation builder, and production Python scripts. Mission 03 forbids modifying or triggering those files. Therefore this proof uses small captured reference fixtures and labels them as references, not live production calls.

## Parity cases

| Fixture | Source kind | Standalone branch | Expected output | Reference | Known divergence |
|---|---|---|---|---|---|
| `psi116-benchmark-validation.xml` | `xml` | `psi116-xml-compatibility-engine` | `enrichedXML` | `parity-current-route-psi116-reference.enriched.xml` | Frozen reference fixture; old route not invoked. |
| `inputxml-element-benchmark.xml` | `inputxml` | `direct-inputxml-enrichment` | `enrichedInputXML` | `parity-current-route-inputxml-reference.enriched.input.xml` | InputXML reference is frozen because legacy route invocation is outside mission scope. |

## Semantic comparison

The test compares load-bearing tokens instead of whitespace-only formatting:

- fixture/source kind
- output kind
- diagnostics branch
- line id with escaped inch quote
- element node identity
- derived `PipingClass` and `Rating`
- DTXR-derived restraint types and friction values
- expected element counts where applicable

## Command

```bash
node tests/xml-cii-standalone-parity.test.js
```

The existing proof commands remain relevant:

```bash
node tests/xml-cii-standalone-workflow-api.test.js
node tests/xml-cii-standalone-benchmark-validation.test.js
node tests/xml-cii-standalone-static.test.js
```

## Non-goals preserved

- No production route switch.
- No old Model Converters popup rewrite.
- No Pyodide worker redesign.
- No CII writer rewrite.
- No live browser proof.
- No UI feature expansion.
- No production Python converter changes.
