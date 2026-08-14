# PR498 — AIV Mock Flare + EI .eit Work Report

## Recovery Header

| Field | Current state |
|---|---|
| Mission | Wire the controlled two-RV / sub-flare-header example into the AIV UI as **Load mock flare network** and make the resulting screened case exportable through the existing EI `.eit` v5 writer. |
| WORK_INTENT | IMPLEMENT |
| REPOSITORY_STATE | EXISTING_PR |
| MUTATION_AUTHORITY | WRITE_ALLOWED — owner explicitly requested implementation on 2026-08-14 |
| CRITICALITY | ENGINEERING_CRITICAL — topology-generated AIV inputs and engineering export are involved |
| PR | `#498` — DRAFT / OPEN |
| Branch | `agent/aiv-mock-flare-eit` |
| Grounded base | `main@ffbbecdadf83a16ef4e48e62946cea05d1a4e8c6` |
| Predecessors | merged #456 flare-network graph; merged #464 EI `.eit` export; merged #469 EI `.eit` import/workbench; merged #491 AIV UI hardening |
| External controlled example | `reallaksh19/Common` PR #3, `SMALL-FLARE-2RV-SUBHEADER-001` |
| Coordination | SAFE WITH PATH AVOIDANCE — open #497 is assumption-layout only; avoid its `package.json`, qualification CSS, workspace-browser paths |
| Merge authority | NOT AUTHORIZED |
| Runtime | Connector-only; native backup CLI/tests/browser unavailable unless hosted jobs execute |
| EXACT_NEXT_ACTION | Extend existing module-boundary regression over the two new production helpers, then reconcile exact diff/head and hosted validation state. |

## Handover in 60 Seconds

The existing application already has an EI `.eit` v5 exporter. `tabs/vibration-aiv-result-view.js` exposes **Export EI .eit** after a successful registered screening run, and `tabs/vibration-aiv-execution.js` serializes through `converters/vibration/aiv/aiv-eit-export.js`. No second writer is being created.

Implemented on this PR branch: a controlled `AivFlareNetwork.v1` mock carries RV-101/RV-102, the 6 m and 9 m source branches, 12 m subheader, 20 m header and welded-tee assessment. The start panel exposes **Load mock flare network** and a fail-closed **Export current EI .eit** action. Loading the mock resets the controlled assumption profile and routes through the existing `projectAivFlareNetworkIntoWorkspace()` graph → generated tables/topology path. Export still routes through readiness → registered screening → existing `.eit` writer.

Controlled example:

```text
RV-101 · RELIEVING · SONIC · 160 dB target · branch 6 m
                                         \
                                          -> subheader 12 m -> header 20 m -> welded tee assessment
                                         /
RV-102 · RELIEVING · SONIC · 154 dB target · branch 9 m

RV-101 path = 38 m
RV-102 path = 41 m
case = RELIEF-COMBINED
assessment = AIV-ASSESS-HDR-001 / WELDED_TEE / 8IN-FLARE-HEADER
```

Important qualification boundary retained from Common PR #3 / repository validation record: this is an **integration mock**, not independent arbitrary-geometry Stage-8 qualification; the configured-vs-geometry FLM1 mismatch remains visible evidence and is not changed in this PR.

## Scope / Acceptance

### In scope
1. Add a visible **Load mock flare network** UI action.
2. Load the exact two-RV/subheader/header graph with explicit engineering segment lengths and source/assessment inputs.
3. Route it through existing `projectAivFlareNetworkIntoWorkspace()` so generated Sources/Assessments/Relationships/topology remain authoritative.
4. Preserve SVG-presentation-only distance policy.
5. Reuse existing readiness → registered screening → `.eit` export path.
6. Add regression proving two source paths are 38 m / 41 m and retain expected segment IDs.
7. Add UI/action regression proving the mock is wired and existing `.eit` export action remains available after screening.

### Out of scope / hard stops
- no AIV equations, coefficients, FLM mechanics, thresholds or master data changes;
- no new `.eit` writer or format semantics unless an actual incompatibility is reproduced;
- no line/case authority promotion; Assessment remains screening scope;
- no SVG/pixel-derived distance;
- no workflow-file change;
- no merge without owner authorization.

## Authority / Negative Assurance

```text
AivFlareNetwork.v1 graph       = connectivity + explicit segment engineering length
SVG x/y                        = presentation only
Generated AIV tables           = deterministic graph projection
VIB.AIV.ACOUSTIC               = existing registered screening calculator
Assessment LOF                 = current screening result
Line/Case LOF                  = non-authoritative trace
EI .eit writer                 = existing aiv-eit-export.js
mock example qualification     = integration sample; not arbitrary-geometry qualification
designAuthority                = false
```

## Coordination

- Open PR #497: presentation-only Missing-data assumptions layout.
- It touches `package.json`, `tabs/vibration-aiv-qualification.css`, `tabs/vibration-aiv-workspace-browser.js`, new assumptions CSS/test.
- This work avoids those paths and uses tests already included in existing AIV verification scripts.
- Open PR #483 is vibration master-governance framework and does not overlap this UI/mock/export wiring.

## Pre-edit / Recovery Control

Repository policy requests `node utils/backup.js save <file> ...` before edits. Native checkout is unavailable in this connector runtime. Before each existing-file edit, exact Git blobs were fetched and recorded below; Git history plus this ledger is the rollback authority. If a native checkout becomes available, run the repository backup command before further existing-file mutation.

| Existing file | Pre-edit blob |
|---|---|
| `tabs/vibration-aiv-input-view.js` | `472b54a4ae2277da0bcb7bfdec557996fe550df2` |
| `tabs/vibration-aiv-qualification-tab.js` | `4b772cb6a25781da8e911d2054cf9d4e6368bce0` |
| `tests/vibration-aiv-flare-network-multisource.test.mjs` | `32a57d6be5eee16166efa53891c95e190fe84376` |
| `tests/vibration-aiv-eit-export.test.mjs` | `31aeec3741a1cf8066a7ad9cb560d147b472f42b` |
| `tests/vibration-aiv-workbench-ui.test.mjs` | `10f4867fa0a39381fd95ca908995b0ae87406a77` |
| `tests/vibration-module-boundaries.test.mjs` | `e9a53b270dcb77ca0dbf06e4e65062afe15b0ac1` |

Local backup CLI: `NOT_RUN / connector-only runtime`.

## Validation Ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Live base grounding | PASS | SOURCE_INSPECTION | NONE | `main@ffbbecda…` |
| Existing EIT exporter presence | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Reuse PR464/469 implementation; result UI already has Export EI `.eit`. |
| Controlled 2-RV example recovery | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Common PR #3 + `aiv-small-flare-eit-roundtrip-v1.json`. |
| Production mock inputs | IMPLEMENTED | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Inputs only; expected LOF/PWL remain tests/oracles. |
| Mock graph → calculator regression | ADDED / NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | Pins 38/41 m and external PR3 expected integration outputs. |
| Mock → production EIT writer regression | ADDED / NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | Pins Assessment LOF/IDs/distances/segment identity in serialized `.eit`. |
| Native focused tests | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED | Connector-only runtime. |
| Full AIV release | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED | Pending. |
| Real-browser mock-load/export | NOT_RUN | NOT_OBSERVED | NONE | Pending. |

## Appendix A — Current Implementation Qualification

Status: CURRENT. These repository-specific gates must remain answerable from live source/diff before any takeover continuation.

- **A1 Production Trace:** trace `Load mock flare network` → `AivFlareNetwork.v1` → generated tables/topology → readiness → registered calculation → screening package → `.eit` writer, naming exact current modules.
- **A2 Failure Isolation:** prove a node drag cannot change 38/41 m engineering paths or regenerate tables; identify the presentation vs engineering mutation callbacks.
- **A3 Authority / Invariant:** prove `.eit line.aiv` receives Assessment LOF and the configured Line/Case trace cannot become screening authority.
- **A4 Independent Validation:** compare loaded mock identity/lengths to Common PR #3 and repository validation record; keep FLM1 geometry mismatch as a qualification warning rather than adjusting production mechanics.
- **A5 Minimal Patch:** continue only with fixture/UI/action/regression paths; reject numerical-kernel or writer-semantic edits unless a reproduced failure requires them.
