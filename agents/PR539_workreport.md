# PR539 — FIT Production Authorization — Recovery Work Report

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: EXISTING_PR
MUTATION_AUTHORITY: WRITE_ALLOWED_AFTER_TAKEOVER_QUALIFICATION
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: FIT_PRODUCTION_LIFECYCLE_ONLY
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_PR539
PR: 539
BRANCH: agent/fit-production-authorized-freeze
LIVE_MAIN_BASIS: 3c3a01ebe00abaa739252c2e67bacb5126540182
OLD_PR_HEAD: 3093fd12923815247c8104349c0f0a83a77de056
REGROUND_COMMIT: 9888de64b329e787ab7b87ff81ab88f4c1acc3a6
GROUNDING_EPOCH: PR539-GE-20260819-AUTO-01
TAKEOVER_DISPOSITION: SALVAGE_PARTIAL
APPENDIX_A_STATUS: PASS_96_OF_100
```

## Handover in 60 seconds

PR539 remains the FIT product-lifecycle transition:

```text
method lifecycle       PRODUCTION_AUTHORIZED
screening data         SCREENING
effective authority    SCREENING
screening authority    AUTHORIZED_BOUNDED
design authority       false
code compliance        false
```

The old 2026-08-16 product blobs were **not** replayed. Current main has newer FIT source/provenance custody, including `FIT_METHOD_SOURCE_BASIS` and `FIT_WORKBOOK_REFERENCE_AUTHORITY`; the old adapter imports `FIT_REFERENCE_AUTHORITY` and would regress current provenance if overlaid byte-for-byte.

The branch was therefore reconciled with a two-parent commit whose tree is current main plus this handover only. Old PR history remains reachable as the second parent. Product/test files are now current-main bytes before the fresh semantic patch.

## Current production trace

```text
VIB.FIV.FLOW_TURBULENCE definition
  -> authority.qualificationState
  -> console model executable gate
  -> required qualificationMode=screening
  -> adapter qualification(mode)
  -> composeEngineeringQualification(method, data=SCREENING)
  -> effective SCREENING
  -> calculateFit() existing bounded envelope
  -> screeningCandidate.screeningAuthorized
  -> result assessment screeningAuthority
  -> Vibration Integrity table workspace / family presentation
```

Current `composeEngineeringQualification()` orders `PRODUCTION_AUTHORIZED` above `SCREENING`, then clamps by data qualification. Therefore `method=PRODUCTION_AUTHORIZED` plus `data=SCREENING` remains `effective=SCREENING` and cannot grant design authority when `designAuthority=false`.

## Takeover diagnosis

### First wrong boundary in the stale PR

The stale PR blob itself is no longer a safe patch unit. Current main evolved the FIT source/provenance contract after PR539 allocation:

```text
current main adapter
  FIT_METHOD_SOURCE_BASIS
  FIT_WORKBOOK_REFERENCE_AUTHORITY
  richer method-source provenance/evidence

old PR539 adapter
  FIT_REFERENCE_AUTHORITY
  older source provenance envelope
```

Replaying the old adapter would silently discard newer engineering provenance while trying to change lifecycle metadata. That is forbidden.

### Minimal current-main patch

Allowed:
- change screening method lifecycle metadata to `PRODUCTION_AUTHORIZED`;
- keep screening data at `SCREENING`;
- add explicit definition `engineeringAuthority=SCREENING` and `screeningAuthority=AUTHORIZED_BOUNDED`;
- keep `designAuthority=false`, `codeCompliance=false`;
- expose product lifecycle separately from screening authority in current family/selected UI;
- update focused regression to pin that separation.

Forbidden:
- equations, correlations, coefficients, tolerances, masters;
- `methodRevision`;
- source/provenance identities;
- FIT input/output contracts;
- applicability widening, including QST-003;
- AIV/SBC/other mechanism authority;
- workflow/runtime/writer/canvas switches.

## Appendix A — implementation takeover qualification

Basis: current main `3c3a01eb...`, old PR head `3093fd12...`, current FIT adapter/qualification/UI/test, stale PR adapter/workreport.

```text
A1 Production Trace               20/20
   Traced definition -> shared qualification -> bounded calculateFit -> result authority -> table workspace.

A2 Current Failure Isolation      20/20
   Isolated stale-blob replay as the first wrong boundary; predicted loss of current method-source provenance and identified current-main semantic replay as the falsifier/minimal correction.

A3 Authority / Invariant          20/20
   Production lifecycle remains separate from SCREENING engineering authority; design/code remain false; QST-003 and current applicability/source custody are protected.

A4 Independent Validation         18/20
   Existing qualified bounded-screening evidence is unchanged; current shared qualification composition independently constrains lifecycle to effective SCREENING. Full current-head release/browser/XLSX execution is still pending and is not credited as PASS.

A5 Next Commit / Minimal Patch    18/20
   Exact patch boundary limited to current adapter lifecycle metadata, truthful family/selected presentation, and focused regression; all numerical/provenance files outside that seam are prohibited.

TOTAL                              96/100
DISPOSITION                        QUALIFIED_FOR_CURRENT_MAIN_FIT_LIFECYCLE_REPLAY
```

No score converts release gates to PASS.

## Validation ledger

```text
live main grounding                         PASS / SOURCE_INSPECTION
stale PR divergence                         PASS / GitHub compare: old PR 88 behind before re-ground
stale adapter incompatibility               PASS / SOURCE_INSPECTION
current qualification composition trace     PASS / SOURCE_INSPECTION
current-main semantic patch                 NOT_STARTED
focused current-head regression             NOT_RUN
verify:vibration-fit-release                NOT_RUN
served Chromium Production Freeze           NOT_RUN
real five-sheet XLSX E2E                    NOT_RUN
independent numerical verification          NOT_APPLICABLE / no numerical change
```

Native `git clone` from the execution container remains blocked by DNS. Exact GitHub-blob reconstruction may be used for focused supporting execution, but it will not be mislabeled as a full repository-native checkout or browser PASS.

## Coordination

- #517 AIV PF-02 owns AIV readiness/executable parity; no FIT patch may enter that authority domain.
- #540 is stacked on the old #539 adapter and must not be merged independently; its useful design/code boundary semantics may be reassessed only after this current-main replay.
- #665 Project-v2 is persistence/currentness and has no intended FIT adapter overlap.
- #649 benchmark-only workbench is not part of the FIT Production Freeze.
- #671 is merged right-rail scope navigation and is current-main basis.

Coordination state for the bounded FIT lifecycle replay: `SAFE`, subject to final changed-file reconciliation.

## Exact next action

1. retain exact current-main rollback copies of every existing JS/test file before edit;
2. apply the minimal current-main lifecycle/UI/test patch without replacing current provenance code;
3. execute focused exact-byte validation feasible in this environment;
4. attempt the release manifest and classify unexecuted browser/XLSX gates truthfully;
5. update PR body/status/claim and keep draft/unmerged until the owner separately grants merge authority after release evidence is acceptable.
