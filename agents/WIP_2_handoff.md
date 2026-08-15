# WIP 2 — SBC Type-3 Production Freeze PF-002

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
BRANCH: agent/sbc-pf-002-master-derivation
BASE_MAIN: 731655e27cc76fbc8455c36b98f95dfa7602c8b9
GROUNDING_EPOCH: 2026-08-15T14:38Z
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: proceed next phase
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-002 master-assisted physical-input derivation only
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Progression Boundary

PF-001 / PR #520 remains blocked/not frozen because official browser BEFORE/AFTER evidence is still NOT_RUN. The owner's progression direction permits starting the next isolated slice; it does not convert PF-001 to PASS and does not grant merge authority.

PF-002 is deliberately independent of PR #520's unmerged Type-3 combination seam. It stops before final SBC LOF calculation.

## Live Grounding

```text
main                  731655e27cc76fbc8455c36b98f95dfa7602c8b9
main advance          5ad2288d... -> 731655e2... via merged AIV PF-03 #518
advance overlap       NONE with PF-002 SBC paths (AIV records/kernel/test only)
PR #511               MERGED -> fbcf1b8680c3e69844cfb35675ecf15047134ba5
PR #512               MERGED -> 5ad2288d41e031ef23df0cb3e600763081b4ac62
PR #520 / PF-001      OPEN / DRAFT / blocked browser gate
PR #508               OPEN / DRAFT / salvage evidence only
AIV / #513            OUT OF SCOPE
```

No competing PF-002 SBC PR was found before branch creation. PF-002 initially grounded at `5ad2288d...`; before any production code landed, main advanced one disjoint AIV commit. The WIP branch was reset to exact current main and this handoff was recreated, so no stale-base production mutation occurred.

## PF-002 Hypothesis

Current production has candidate T3-1/T3-2/T3-3 table masters and a controlled Common-backed non-curve candidate evidence set, but no current-main SBC runtime module that deterministically converts physical Type-3 inputs into the candidate-only derived terms and exact manual curve coordinates needed by the next product slice.

A bounded derivation layer can be added without final LOF composition, curve activation, facility caching, UI/shared-shell changes, or authority promotion.

### Falsifier

Stop if current main already contains an equivalent runtime derivation path, if the committed candidate score rows disagree with the controlled validation record, or if reproducing D7 requires activating/reconstructing quarantined T3 curves or importing stale #508 shared-shell/controller behavior.

## Protected Invariants

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterDataAuthority  = false
curve runtime activation = false
master publication = false

D7 derived target:
C=.68
E=.70
LOFLOC=1.00
mainlineLofForAssessment=1.00
mainlineMultiplier=1.42
D request: T3-1 x=1.5 in y=0.9/0.7 m
F request: T3-3 x=1.5 in y=2.3 m
G request: T3-4 x=1.5 in y=1.4 m
```

PF-002 must not calculate or claim the final `.70` candidate result; that composition belongs behind the separate fail-closed combination seam after integration is authorized.

## Source / Candidate Custody

Controlled Common-backed candidate set:

```text
ValidationRecords/VibrationMasters/ei-aviff-t3-sbc-non-curve-candidate-v1.json
candidateSetId: EI_AVIFF.T3.SBC.NON_CURVE_MASTERS.v1
source repo: reallaksh19/Common
source commit: fb549185b9b27edc2379734240320a85c5bef9f6
PDF: EI - AVIFF Guidelines 2nd Edition.pdf
PDF blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
publicationState: CANDIDATE
qualificationStatus: NOT_QUALIFIED
masterValuesPublished: false
```

The 1.42 rule is custody-linked to the controlled Common worked examples (`EI - AVIFF Guidelines 2nd Edition_Examples.pdf`, blob `3e2517d0df527a051084fc02e69cb7afa31f8d47`) and PR505's retained D5-D7 qualification evidence.

Merged table candidate runtime remains `converters/vibration/masters/ei-aviff-sbc-t3-candidate.js`. Geometry/location score rows are consumed as candidate-only data with exact committed-row parity; they are not promoted to active master authority.

T3-1..T3-4 remain `BLOCKED_SOURCE_DATA_CONFLICT` with `runtimeCurveActivation=false` and `masterPublicationAuthorized=false`.

## Planned Files

New SBC-specific files only for this slice:

```text
converters/vibration/sbc/type3-noncurve-candidate-data.js
converters/vibration/sbc/type3-master-assisted-derivation.js
tests/vibration-sbc-type3-master-assisted-derivation.test.mjs
```

No existing-file edit is planned, so no pre-edit backup is required unless scope changes. If any existing file becomes necessary, stop first and record immutable blob custody before editing.

## Validation Plan

- exact D7 C/E/location/multiplier derivation;
- exact D/F/G figure + x/y/unit request custody;
- full parity between embedded geometry/location candidate rows and committed candidate CSVs;
- schedule-lowering rule including 120 -> 80;
- no-mass C=0 only after explicit false mass state;
- invalid/missing physical inputs fail closed;
- all curve requests visibly carry blocked-source status and publication prohibition;
- derived arithmetic compared at `1e-12` tolerance while retaining full precision internally;
- no final LOF calculation present;
- no authority promotion.

Local reconstructed current-production module gate before GitHub code write: `PASS 8/8`; syntax checks PASS. Browser evidence remains separately blocked in this execution environment and will not be represented as PASS.
