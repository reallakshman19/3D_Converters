# PR503 — AIV Readiness-to-Screening Runtime Bridge Fix

## Recovery header

| Field | Current state |
|---|---|
| Mission | Fix `Run AIV screening` failure `Cannot read properties of null (reading 'caseId')` after readiness. |
| Work intent | IMPLEMENT |
| Criticality | ENGINEERING_CRITICAL |
| PR | `#503` — DRAFT / OPEN / NOT MERGED |
| Branch | `agent/aiv-screening-caseid-null-fix` |
| Grounded base | `main@b13797d23db1f01200a2349e77f39c883e62a84c` |
| Authority impact | NONE |
| Merge authority | NOT AUTHORIZED |
| Exact next action | Re-check the final documentation-only head for drift/hosted execution, then retain the PR for owner browser validation. |

## User-observed failure

AIV readiness completed and exposed the screening action, but pressing `Run AIV screening` produced:

`Cannot read properties of null (reading 'caseId')`

The production action is expected to execute the readiness-qualified records through the registered `VIB.AIV.ACOUSTIC` Engineering Calculation API.

## Isolation

### Production trace

`Run AIV screening`
→ `createAivExecutionActions.runScreening()`
→ readiness-envelope Sources / Assessments / Source→Assessment / topology
→ registered `calculateEngineering()`
→ `VIB.AIV.ACOUSTIC` adapter
→ `calculateAiv()`
→ source / point-contribution / simultaneous-source / discontinuity / result aggregation stages.

### Findings

- Current-source AIV kernel joins are already fail-closed at the obvious source/assessment boundaries; missing source/assessment joins raise AIV candidate errors rather than intentionally dereferencing nullable `caseId` values.
- Readiness must already have completed for the reported action to become enabled.
- PR498's controlled two-RV `.eit`/mock round-trip test used direct `calculateAiv()` execution and did not cover the browser's readiness-envelope→registered Engineering API bridge.
- Existing registered-API tests cover D.2.3 and synthetic simultaneous-source vectors, but not the controlled PR498 mock through the exact browser request shape.
- The click path used the fixed dynamic import revision `aiv-screening-1`; PR503 refreshes it to `aiv-screening-2` while adding an explicit request contract.

## Implemented fix

### 1. Explicit fail-closed screening request bridge

New `tabs/vibration-aiv-screening-request.js` validates before central API execution:

- readiness envelope schema exists;
- at least one `READY_FOR_QUALIFICATION` relationship exists;
- no `NOT_READY` or `METHOD_GAP` blocker exists;
- readiness/source/assessment/relationship record arrays are non-empty;
- no null/non-object record is accepted;
- required Source/Assessment/Operating Case identities are nonblank;
- topology exchange is present;
- every Source→Assessment relationship still joins an exact Source+case and Assessment identity from the readiness envelope.

Violations fail closed with `AIV_SCREENING_REQUEST_*` errors. No record is filtered, defaulted, invented, or dropped.

### 2. Browser action uses the same bridge

`tabs/vibration-aiv-execution.js` now builds the request through `buildAivEngineeringScreeningRequest()` and then calls the registered `calculateEngineering()` API.

The central Engineering Calculation API remains the execution authority; no direct `calculateAiv()` bypass was introduced.

The dynamic catalogue import revision changes from `aiv-screening-1` to `aiv-screening-2` and directly thrown bridge codes are preserved in the UI error message.

### 3. Exact controlled-mock regression

New `tests/vibration-aiv-screening-runtime-bridge.test.mjs` reproduces the product data path:

`two-RV controlled flare mock`
→ generated visible tables
→ assumption resolution
→ FLARE_NETWORK readiness
→ exact screening request bridge
→ registered `calculateEngineering(VIB.AIV.ACOUSTIC)`.

Assertions pin:

- two readiness rows are `READY_FOR_QUALIFICATION` with zero blockers;
- registered result succeeds;
- Source results remain `RV-101` and `RV-102` in `RELIEF-COMBINED`;
- one Assessment result remains in `RELIEF-COMBINED` and retains both source IDs;
- `screeningResultScope=ASSESSMENT`;
- complete kernel stage count remains 10;
- Line/Case remains non-authoritative for screening;
- `designAuthority=false`.

A second regression injects a null Source→Assessment record and requires `AIV_SCREENING_REQUEST_RECORD_INVALID`, preventing a raw nullable `caseId` dereference at the browser→API boundary.

### 4. Release wiring

The new regression is wired into:

- `verify:aiv-screening-release`;
- `verify:aiv-input-model`, and therefore the full AIV canvas release chain.

## Changed-file ledger

| Path | Change | Authority impact |
|---|---|---|
| `tabs/vibration-aiv-screening-request.js` | new fail-closed request bridge | No equation/result-authority change |
| `tabs/vibration-aiv-execution.js` | use bridge, preserve error code, refresh screening import revision | No equation/result-authority change |
| `tests/vibration-aiv-screening-runtime-bridge.test.mjs` | exact controlled-mock registered-API regression | Test only |
| `package.json` | release-test wiring | Test wiring only |
| `agents/PR503_workreport.md` | living handoff | None |

## Recovery blobs

Connector-only runtime cannot execute `.agents` backup CLI. Immutable base blobs are retained as recovery authority:

| Path | Base blob |
|---|---|
| `tabs/vibration-aiv-execution.js` | `12ffe3f60544135e2853e779636749609d219239` |
| `package.json` | `9d8feafb1c01de57738d7a6225239186c2668dd9` |

New files have no pre-edit blob.

## Authority boundary / negative assurance

Unchanged:

- AIV equations and numerical coefficients;
- stage-8/9/10 numerical mechanics;
- assumption profile values and precedence;
- topology connectivity authority;
- physical-distance engineering authority;
- readiness statuses and screening qualification rule;
- assessment screening authority;
- configured Line/Case non-authoritative status;
- exports/persistence contracts;
- `designAuthority=false`.

## Coordination

Open PR499 was inspected before mutation. It has no overlap with the five current PR503 paths.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Live main grounding | PASS | Branch created at `b13797d23db1f01200a2349e77f39c883e62a84c` | GitHub ref |
| Branch drift before PR | PASS | 5 ahead / 0 behind | GitHub compare |
| PR499 overlap | PASS | No intended-path overlap | GitHub changed-file list |
| Production action trace | PASS | Browser action→request bridge→registered API traced | SOURCE_INSPECTION |
| No direct-kernel bypass | PASS | `runScreening()` still invokes registered `calculateEngineering` | SOURCE_INSPECTION |
| Fail-closed null-record handling | PASS | Explicit record/identity/join guards present in request bridge | SOURCE_INSPECTION |
| Controlled-mock registered-API regression source | PASS | Exact PR498 mock/readiness/API test added | SOURCE_INSPECTION |
| Native focused test | NOT_RUN | Connector-only runtime | NONE |
| Native full AIV release suite | NOT_RUN | Connector-only runtime | NONE |
| Real-browser reproduction/acceptance | NOT_RUN | Browser runtime unavailable | NONE |
| Topology hosted workflow on `42bcfd9d…` | NOT_RUN / INFRASTRUCTURE_BLOCKED | Run `31858612872`, job `94947796201`: `steps=[]`, `runner_id=0`, empty runner name | NONE |
| AIV hosted workflow on `42bcfd9d…` | NOT_RUN / INFRASTRUCTURE_BLOCKED | Run `31858612943`, job `94947796499`: `steps=[]`, `runner_id=0`, empty runner name | NONE |

## Active items

- `ISS-001` FIXED_IN_SOURCE — nullable/malformed records cannot enter the central screening call through the AIV browser bridge without an explicit AIV error.
- `ISS-002` FIXED_IN_SOURCE — controlled PR498 mock now has exact readiness→registered-API regression coverage.
- `IMP-001` IMPLEMENTED — screening import revision refreshed to `aiv-screening-2`.
- `RISK-001` OPEN — native/browser execution still required before runtime PASS can be claimed.
- `RISK-002` OPEN — hosted workflow failures on the observed head are infrastructure-blocked; they are not product PASS or FAIL evidence.

## Appendix A — engineering-critical takeover gate

### A1 — Production trace — 19/20
The exact UI action, request boundary, registered API adapter and domain kernel are identified. One point is withheld because a live browser stack trace for the original exception is not available in this runtime.

### A2 — Failure isolation — 19/20
The patch closes the demonstrable unguarded browser→API contract gap and adds exact mock coverage without modifying equations. One point is withheld because the original runtime stack cannot be independently reproduced here.

### A3 — Authority / invariant — 20/20
Assessment-only screening authority, non-authoritative Line/Case status, explicit assumption precedence, physical-distance authority and `designAuthority=false` are preserved.

### A4 — Independent validation — 18/20
The regression uses controlled mock generation/readiness and the registered Engineering API instead of the direct kernel. Two points are withheld pending actual native/browser test execution.

### A5 — Minimal patch / next commit — 18/20
The patch is limited to request-boundary validation, execution wiring, one regression and release wiring. Two points are withheld pending actual runtime evidence.

**Current written takeover score: 94/100; each section >=18/20. Runtime qualification remains NOT_RUN until executed.**
