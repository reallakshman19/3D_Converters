# WIP-VIB-AIV-INTEGRATION-20260818 — AIV assessment-level Integrity integration

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: owner instruction 2026-08-18 — PR-C integrate qualified AIV assessment results into Vibration Integrity without line-level governing promotion
PR_OR_WIP: WIP-VIB-AIV-INTEGRATION-20260818
BRANCH: agent/vibration-aiv-assessment-integration-20260818
STACK_BASE_PR: 626
STACK_BASE_HEAD: afa6a9dfcb533abb312f30baba4ef5d8d039067f
MAIN_HEAD_LAST_CHECKED: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_BASIS_HEAD: afa6a9dfcb533abb312f30baba4ef5d8d039067f
CURRENT_STAGE: PLAN
CURRENT_BLOCKER: NONE
HIGHEST_RISK: exact assessment-level AIV LOF could accidentally become a mechanism-line or EI-main-line governing contributor
EXACT_NEXT_ACTION: add a fail-closed AIV assessment adapter and session-current bridge, then wire exact line/case/canonical matches into the Integrity matrix with governing eligibility false
```

## Mission / Scope

Deliver PR-C only. Consume the existing registered `VIB.AIV.ACOUSTIC` screening result at its qualified `ASSESSMENT` scope. Match by exact `line + caseId + assessmentCanonicalId == Integrity canonicalId`. Preserve the numerical assessment LOF for display/evidence and coverage, but do not manufacture a line/case LOF and do not consume the configured `AivLineCaseSummary.v1` as screening authority.

Authorized changes:
- AIV assessment-result -> VibrationMechanismAssessmentSet adapter;
- session-current in-memory AIV screening evidence bridge so a completed AIV run can be consumed after switching to Vibration Integrity;
- Vibration Integrity matrix dispatch/context integration;
- capability projection update from NOT_INTEGRATED to assessment-scope integrated;
- focused regressions and source assertions.

Explicit non-goals:
- no AIV equation/kernel/assumption changes;
- no AIV Stage-9 line aggregation qualification;
- no `AivLineCaseSummary.v1` authority change;
- no EI main-line policy/reducer change;
- no T1 identification automation;
- no design authority;
- no merge.

## Engineering invariants

1. Only `AivAssessmentResult.v1` with `resultScope=ASSESSMENT`, `status=SCREENING_CALCULATED`, `screeningAuthority=AUTHORIZED`, `qualificationState=SCREENING`, and `designAuthority=false` can become a current screening assessment item.
2. Exact line/case/canonical identity is required; no fuzzy or line-only matching.
3. AIV mechanism item stores numeric result as `assessmentLof`; `result.governingLof` remains null so the generic mechanism line reducer must report `VALID_GOVERNING_LOF_REQUIRED` / ineligible.
4. Matrix-level AIV presentation may expose the exact assessment LOF, but `governingEligible=false`; `screeningGoverning` must ignore it.
5. Configured line/case summaries are never consumed by this PR.
6. Session evidence is cleared on AIV readiness/input invalidation and only published after a successful current screening run.

## Grounding evidence

- PR626 is OPEN/DRAFT/mergeable at `afa6a9df...`; this branch is stacked on that exact head.
- AIV engineering adapter states `screeningResultScope=ASSESSMENT`, `lineCaseSummaryAuthoritativeForScreening=false`, `designAuthority=false`.
- AIV calculator emits `AivAssessmentResult.v1` with line, caseId, assessmentCanonicalId, LOF and screening authority; line summaries use `CONFIGURED_LINE_SCOPE_REFERENCE` and `authoritativeForScreening=false`.
- Existing generic reducer allows only a valid `result.governingLof`; this PR will intentionally not populate it for AIV.

## Validation truth at bootstrap

```text
source grounding                         PASS / SOURCE_INSPECTION
stack relationship to PR626              PASS
AIV assessment authority boundary        PASS / SOURCE_INSPECTION
AIV configured line summary nonauthority PASS / SOURCE_INSPECTION
implementation                           NOT_STARTED
repository-native tests                  NOT_RUN
browser acceptance                       NOT_RUN
```

Native backup command is unavailable in this connector-only environment; before editing existing files, exact branch blob SHAs will be recorded as immutable rollback evidence. This is not a backup PASS.
