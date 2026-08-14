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
| EXACT_NEXT_ACTION | Add pure `vibration-aiv-mock-flare-network.js`; wire `load-mock-flare-network` through input view + qualification controller; add in-suite regressions for graph paths, registered calculation outputs and EI `.eit` serialization. |

## Handover in 60 Seconds

The existing application already has an EI `.eit` v5 exporter. `tabs/vibration-aiv-result-view.js` exposes **Export EI .eit** after a successful registered screening run, and `tabs/vibration-aiv-execution.js` serializes through `converters/vibration/aiv/aiv-eit-export.js`. Do **not** create a second writer.

Missing product capability: the controlled two-relief-valve small flare example exists only as external SVG/validation evidence and internal EIT tests; current AIV UI has no **Load mock flare network** action. Implement a production fixture that creates an `AivFlareNetwork.v1` graph using the historical engineering values, project it through the existing graph → tables/topology path, then use the existing readiness/screening/export route.

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

Important qualification boundary retained from Common PR #3 / repository validation record: this is an **integration mock**, not independent arbitrary-geometry Stage-8 qualification; the configured-vs-geometry FLM1 mismatch remains visible evidence and is not to be “fixed” in this PR.

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
- This work will avoid those paths and use tests already included in existing AIV verification scripts.
- Open PR #483 is vibration master-governance framework and does not overlap this UI/mock/export wiring.

## Pre-edit / Recovery Control

Repository policy requests `node utils/backup.js save <file> ...` before edits. Native checkout is unavailable in this connector runtime. Before each existing-file edit, exact Git blobs were fetched and recorded below; Git history plus this ledger is the rollback authority. If a native checkout becomes available, run the repository backup command before further existing-file mutation.

| Existing file | Pre-edit blob |
|---|---|
| `tabs/vibration-aiv-input-view.js` | `6f19c657d0834659b6ed7fe6bd2fd98d913829fb` |
| `tabs/vibration-aiv-qualification-tab.js` | `4b772cb6a25781da8e911d2054cf9d4e6368bce0` |
| `tests/vibration-aiv-flare-network-multisource.test.mjs` | `32a57d6be5eee16166efa53891c95e190fe84376` |
| `tests/vibration-aiv-eit-export.test.mjs` | `31aeec3741a1cf8066a7ad9cb560d147b472f42b` |
| `tests/vibration-aiv-workbench-ui.test.mjs` | `10f4867fa0a39381fd95ca908995b0ae87406a77` |

Local backup CLI: `NOT_RUN / connector-only runtime`.

## Validation Ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Live base grounding | PASS | SOURCE_INSPECTION | NONE | `main@ffbbecda…` |
| Existing EIT exporter presence | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Reuse PR464/469 implementation; result UI already has Export EI `.eit`. |
| Controlled 2-RV example recovery | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | Common PR #3 + `aiv-small-flare-eit-roundtrip-v1.json`. |
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
