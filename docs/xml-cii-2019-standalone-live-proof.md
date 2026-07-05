# XML→CII 2019 Standalone Live Proof Checklist

Mission: Issue #22 — Mission 04 live browser proof and switch-readiness decision.

## Proof method

This document is the repeatable manual live/browser proof checklist. The automated smoke command is:

```bash
node tests/xml-cii-standalone-live-smoke.test.js
```

The smoke command verifies app registration/static wiring, standalone XML and InputXML API outputs, diagnostics/log presence, forbidden handoff token absence, and the conservative switch-readiness decision. It is not a real browser/Pyodide execution.

## Manual browser setup

1. Open the app from a clean browser session.
2. Confirm the app-level tab `XML→CII 2019 Standalone` is visible.
3. Confirm the existing `Model Converters` tab remains visible.
4. Open the standalone tab.
5. Confirm the adapted phase rail is visible:
   - `1 Regex`
   - `2 Import Masters`
   - `3 JSON Trace`
   - `4 Preview`
   - `5 Diagnostics`
   - `5A Weight Match`
   - `6 Run`
   - `7 Support Types`
   - `8 Config`
   - `Custom Input`

Evidence fields:

```text
Browser/version:
App URL/commit:
Standalone tab visible: yes/no
Model Converters tab visible: yes/no
Phase rail visible: yes/no
Screenshot/evidence link:
```

## XML case

Fixture:

```text
tests/fixtures/xml-cii-standalone/psi116-benchmark-validation.xml
```

Steps:

1. Set source kind to `auto` or `xml`.
2. Load or paste the benchmark XML.
3. Use `outputMode: enriched-only`.
4. Run the standalone workflow.
5. Confirm result output kind is `enrichedXML`.
6. Confirm diagnostics branch is `psi116-xml-compatibility-engine`.
7. Confirm output text is non-empty and includes `BenchmarkValidation` or equivalent enriched fixture evidence.
8. Confirm logs/diagnostics panel is non-empty.

Evidence fields:

```text
XML run ok: yes/no
Output kind:
Diagnostics branch:
Output text non-empty: yes/no
Logs non-empty: yes/no
Diagnostics non-empty: yes/no
Observed warning/error:
Screenshot/evidence link:
```

## InputXML + side-load case

Fixtures:

```text
tests/fixtures/xml-cii-standalone/inputxml-element-benchmark.xml
tests/fixtures/xml-cii-standalone/inputxml-element-side-load.txt
```

Steps:

1. Set source kind to `inputxml`.
2. Load or paste the InputXML fixture.
3. Paste the element side-load text.
4. Use:
   - `inputXmlOutputMode: full-document`
   - `pointPropertiesBasis: TO`
   - `inputXmlRestraintPolicy: replace-with-dtxr-derived-restraints`
   - `fillSentinelFromLineContext: true`
   - `normalizePressureCaseNames: true`
5. Run the standalone workflow.
6. Confirm result output kind is `enrichedInputXML`.
7. Confirm diagnostics branch is `direct-inputxml-enrichment`.
8. Confirm output contains:
   - `LINE_ID="/ASIM-1836-6&quot;-S8810010-91261M7-HC/B1"`
   - `<PipingClass>91261</PipingClass>`
   - `<Rating>900</Rating>`
   - `TYPE="14"`, `TYPE="9"`, and `TYPE="8"`
9. Confirm logs/diagnostics panel is non-empty.

Evidence fields:

```text
InputXML run ok: yes/no
Output kind:
Diagnostics branch:
PipingClass/Rating visible: yes/no
TYPE 14/9/8 visible: yes/no
Logs non-empty: yes/no
Diagnostics non-empty: yes/no
Observed warning/error:
Screenshot/evidence link:
```

## Switch-readiness decision

Current conservative decision until this checklist is completed:

```text
needs-more-proof
```

A future decision may become `ready-for-controlled-switch-proposal` only when:

1. automated smoke commands pass,
2. manual browser proof evidence is captured,
3. real browser/Pyodide execution is confirmed, and
4. owner accepts reference/live parity limitations.

## Non-goals preserved

- No production switch.
- No old Model Converters popup rewrite.
- No Pyodide worker redesign.
- No CII writer rewrite.
- No large real plant sample ingestion.
- No hidden mocks.
