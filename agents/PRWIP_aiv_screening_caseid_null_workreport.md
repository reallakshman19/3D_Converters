# PRWIP — AIV Screening `caseId` Null Failure

## Recovery header

| Field | Current state |
|---|---|
| Mission | Fix the AIV `Run AIV screening` product path that reports `Cannot read properties of null (reading 'caseId')` after readiness. |
| Work intent | IMPLEMENT |
| Criticality | ENGINEERING_CRITICAL |
| Branch | `agent/aiv-screening-caseid-null-fix` |
| Grounded base | `main@b13797d23db1f01200a2349e77f39c883e62a84c` |
| Authority impact | NONE intended; preserve Assessment-only screening authority and `designAuthority=false`. |
| Merge authority | NOT AUTHORIZED |
| Exact next action | Add a fail-closed readiness-envelope→Engineering-API request bridge and an exact controlled-mock regression matching the browser action. |

## Current state

- User-observed product failure occurs after AIV readiness enables `Run AIV screening`.
- UI error text: `Cannot read properties of null (reading 'caseId')`.
- Current `runScreening()` hands `readinessEnvelope.sources`, `.assessments`, `.sourceAssessments` and `.exchange` to registered `calculateEngineering({ calculationId: 'VIB.AIV.ACOUSTIC' })`.
- Static inspection of the current AIV kernel's source/relationship joins is fail-closed; obvious missing joined records raise AIV-coded errors rather than a raw `null.caseId` TypeError.
- PR498's controlled two-RV mock round-trip regression calls `calculateAiv()` directly and therefore does not cover the browser's readiness-envelope→registered-API bridge.
- Existing central-API tests cover D.2.3 and synthetic simultaneous-source vectors, but not the PR498 controlled mock through the exact browser request shape.
- The AIV product surface is mounted with a fixed `aiv-qualification-1` dynamic-import key and screening imports the catalogue with fixed `aiv-screening-1`; stale browser module graphs remain a deployment risk.
- Open PR499 has no overlap with the intended AIV execution/qualification/test paths.

## Recovery blobs

Connector-only runtime cannot execute the repository backup CLI. Immutable pre-edit Git blobs are the recovery authority:

| Path | Base blob |
|---|---|
| `tabs/vibration-aiv-execution.js` | `12ffe3f60544135e2853e779636749609d219239` |
| `tabs/engineering-calculations-tab.js` | `5d638f86197e5175faf14f7cace8cf92bf97537d` |
| `package.json` | `9d8feafb1c01de57738d7a6225239186c2668dd9` |

## Active items

- `ISS-001` OPEN — browser AIV screening action can surface a raw null `caseId` TypeError after readiness.
- `ISS-002` OPEN — controlled PR498 mock lacks exact registered-API browser-bridge regression.
- `RISK-001` OPEN — fixed AIV module cache keys can retain stale module graphs in a long-lived browser session.
- `DEC-001` ACTIVE — do not filter/drop malformed engineering records; fail closed with explicit AIV screening-request errors.
- `DEC-002` ACTIVE — keep execution through registered `VIB.AIV.ACOUSTIC`; do not bypass the Engineering Calculation API with a direct kernel call.
- `DEC-003` ACTIVE — preserve `screeningResultScope=ASSESSMENT`, Line/Case non-authoritative, `designAuthority=false`.
- `RISK-002` OPEN — native/browser execution may remain NOT_RUN in connector-only infrastructure.

## Planned patch

1. Add a small screening-request bridge that validates the current readiness envelope and record identities before central API execution.
2. Use that bridge from `runScreening()` and retain explicit error codes.
3. Refresh AIV qualification/screening import revisions to prevent stale product-module reuse after deployment.
4. Add a controlled two-RV mock regression that runs: flare-network projection → assumption resolution → readiness → exact screening request → registered `calculateEngineering`.
5. Wire the regression into AIV screening/input-model release scripts.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Live main grounding | PASS | GitHub ref inspection | GitHub |
| Open-PR overlap | PASS | PR499 changed-file inspection shows no intended-path overlap | GitHub |
| Current source trace | PASS | Browser action→readiness envelope→registered API traced | SOURCE_INSPECTION |
| Exact controlled-mock central-API regression | NOT_RUN | Not implemented yet | NONE |
| Native AIV release suite | NOT_RUN | Connector-only runtime | NONE |
| Real-browser reproduction/acceptance | NOT_RUN | Browser runtime unavailable here | NONE |

## Appendix A — critical takeover gate

### A1 Production trace
`Run AIV screening` → `createAivExecutionActions.runScreening()` → `calculateEngineering()` → registered `VIB.AIV.ACOUSTIC` adapter → `calculateAiv()` → AIV kernel candidate/source/point/combination stages.

### A2 Current failure isolation
Readiness itself completes and enables screening. Current-source static inspection does not identify an intentional nullable `caseId` at the AIV kernel join boundary. The missing exact browser-bridge test and stale fixed module revisions are the two actionable gaps being closed without altering equations.

### A3 Authority / invariant
Assessment LOF remains the only screening-authoritative result scope. Configured Line/Case output remains trace-only. `designAuthority=false`. Explicit user data remains higher precedence than visible assumptions. No record may be silently dropped to achieve a calculation.

### A4 Independent validation
Regression must build inputs independently from the controlled flare-network generator/readiness path and execute through the registered Engineering Calculation API, not call `calculateAiv()` directly.

### A5 Minimal next patch
Request-boundary validation + exact product-path regression + cache-revision refresh only. No numerical formula, tolerance, topology-distance, assumption, export-authority, or result-scope changes.
