# PR #464 Work Report — AIV EI `.eit` compatibility export

## Status

- PR: #464
- Branch: `agent/aiv-eit-export-rebased`
- Base: `main` at `07622243f143696c123c3643c7467ab928cc94c1`
- State: DRAFT
- Merge: NOT REQUESTED / NOT PERFORMED
- Numerical kernel changes: NONE
- Screening/design authority changes: NONE

## User outcome

Add a common EI `.eit` export button beside the existing AIV screening JSON export, compatible with the controlled `Energy-Institute-AVIFF---Worked-Examples.eit` v5 structure while preserving current assessment-level AIV screening authority.

## Controlled reference

```text
Common commit  3c8ddb89044061dd26f593604d4b547438c006f0
file           Energy-Institute-AVIFF---Worked-Examples.eit
Git blob       aaf3afe262b19f927fe05e0c44f07f08167fbfa0
size           10414 bytes
shape          12 lines / 7 pipes / 15 streams / 3 AIV lines
```

Historical source anchors include AIV `0.29` and `1.48`. They are compatibility evidence, not current authority definitions.

## Authority invariant

```text
Assessment screening LOF          authoritative
configured Line/Case LOF          non-authoritative trace
.eit lines[].aiv                   Assessment LOF only
.eit lines[].maxLof                Assessment AIV LOF only in AIV-only export
configured Line/Case 1.48          additive trace only; never promoted
screeningResultScope               ASSESSMENT
designAuthority                    false
```

The exporter hard-fails if the domain result claims line/case screening authority.

## Implementation

New production modules:

- `converters/vibration/aiv/aiv-eit-contract.js`
- `converters/vibration/aiv/aiv-eit-units.js`
- `converters/vibration/aiv/aiv-eit-records.js`
- `converters/vibration/aiv/aiv-eit-authority.js`
- `converters/vibration/aiv/aiv-eit-document.js`
- `converters/vibration/aiv/aiv-eit-export.js`

New verifier:

- `scripts/verify-aiv-eit-v5-reference.mjs`

Updated UI/execution:

- `tabs/vibration-aiv-result-view.js`
- `tabs/vibration-aiv-execution.js`
- `tabs/vibration-aiv-qualification-tab.js`

The result card now shows:

```text
[ Export screening result JSON ] [ Export EI .eit ]
```

## Compatibility model

Top-level output remains historical v5 JSON:

```text
options
lines[]
pipes[]
streams[]
mats[]
```

`aiv_data` remains a JSON-stringified array. Modern AIV identity/path evidence is additive inside each item.

For multi-source flare networks the export retains:

```text
sourceCanonicalId
assessmentCanonicalId
caseId
sourcePwl
pointPwl
combinedPointPwl
distance
distanceUnit
distanceAuthority
simultaneousSourceGroup
segmentIds[]
```

SVG presentation geometry never supplies engineering distance.

## Unit policy

Converter-only normalization:

- mass flow → kg/h;
- pressure → bar absolute;
- temperature → °C;
- low-noise trim → dB.

Gauge pressure requires explicit reference-pressure value and source/revision evidence. No fallback atmospheric value is invented.

## Focused validation

Local pre-publication execution after the final serializer split:

```text
node --test tests/vibration-aiv-eit-export.test.mjs \
  tests/vibration-aiv-eit-reference.test.mjs

10 tests / 10 PASS
```

Syntax checks PASS for all new/modified JS modules.

Permanent focused seams include:

1. Assessment LOF `0.29` populates `.eit` authority field;
2. configured trace `1.48` cannot populate `.eit.lines[].aiv`;
3. two-RV source PWLs `160` and `154` retained;
4. point contributions and combined `149.56302572849327` retained;
5. path lengths `38 m` and `41 m` retained;
6. `aiv_data` remains stringified;
7. kg/h, bar abs, °C conversion behavior;
8. controlled Common reference identity pinned;
9. v5 collection counts pinned;
10. historical `0.29` / `1.48` reference anchors and drift failures pinned.

`package.json` adds `verify:aiv-eit-export` and includes it in `verify:aiv-canvas-release`.

## Not run / remaining gates

- full `npm run verify:aiv-canvas-release`: NOT_RUN in the partial local reconstruction;
- exact controlled `.eit` verifier against a mounted Common checkout: NOT_RUN locally; connector source identity/blob/size were fetched and pinned;
- real-browser click/download acceptance: NOT_RUN;
- external consumer import/round-trip of emitted `.eit`: NOT_RUN.

These remain explicit release evidence gaps and do not alter AIV screening authority.

## Anti-drift controls

- exact Common commit/path/blob/size pinned;
- v5 counts and historical AIV anchors pinned;
- wrong source bytes fail verifier;
- changed reference shape fails tests;
- `aiv_data` string contract pinned;
- non-authoritative line/case promotion hard-fails;
- unit conversion uses the central engineering unit converter outside UI code;
- exporter consumes the existing screening package/domain result only.

## Scope exclusions

No changes to:

- `aiv-calculator.js`;
- AIV source PWL equations;
- attenuation equations;
- simultaneous-source equations;
- discontinuity equations;
- flare-network path resolver;
- AIV screening authority;
- `designAuthority=false`;
- XML/CII work.
