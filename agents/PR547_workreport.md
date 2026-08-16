# PR547 Work Report — T2.9 Controlled-Source Reconciliation

## Recovery header

```text
WORK_INTENT: QUALIFICATION_EVIDENCE
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/3D_Converters
SOURCE_ISSUE: #545
PARENT_PROGRAMME: #450
ORIGINAL_BASE: main@d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
LATEST_MAIN_CHECKED: 9ac255a0664e54fb9ac6c6decb2a5adec8eeceec
BRANCH: agent/t29-pf01-controlled-source-reconciliation
PR: #547 / DRAFT / OPEN / UNMERGED
CURRENT_STAGE: T29-PF-01 source/method qualification
APPENDIX_A: 90/100 — NOT QUALIFIED
NUMERICAL_KERNEL: NOT AUTHORIZED
SCREENING_AUTHORITY: NOT_AUTHORIZED
DESIGN_AUTHORITY: false
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
EXACT_NEXT_ACTION: execute the exact controlled EI PDF against the provisional T2.9 source request, reconcile the T2.9.2 table/equation/Flowchart T2-9 predicates, freeze branch/boundary oracles, rescore A2/total, then and only then implement the pure candidate kernel.
```

## Mission

Qualify the EI AVIFF T2.9 Cavitation / Flashing method behind:

```text
VIB.CAVITATION.FLASHING
```

without deriving production equations or engineering acceptance from secondary synthesis material.

PF-01 is an evidence and contract slice. It does not activate a T2.9 master, implement a numerical regime/LOF kernel, or grant Screening/design authority.

---

## Current repository grounding

Work started on:

```text
d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
```

Current `main` later advanced to:

```text
9ac255a0664e54fb9ac6c6decb2a5adec8eeceec
```

The two intervening commits add then revert an HP UI placeholder and produce zero net tree changes relative to the original base. Current branch relation:

```text
ahead = 17
behind = 2
merge-base = d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
intervening-main net file changes = 0
```

No rebase is required for engineering scope at this checkpoint.

Active overlap boundaries retained:

```text
#539/#540 FIT        do not touch shared VIB family/console authority UI
#546 SBC AC1         separate mechanism; recheck shared master/release files before future edits
AIV work             separate equations and authority
T2.8 work            separate transient mechanism
```

---

## Controlled source identity

Pinned source:

```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10,348,594 bytes
edition    = 2nd Edition
```

GitHub repository metadata additionally confirms `Common` is public and exposes the exact pinned raw object URL. Runtime/network limitations still prevent this session from materializing the PDF bytes:

```text
GitHub text connector binary body     BLOCKED
web raw-PDF cache                      CACHE_MISS
container DNS/raw download             BLOCKED
GitHub Actions on PR heads             NOT_SCHEDULED
```

Therefore:

```text
controlledSourceGitIdentity = PASS
controlledSourceBytesExecuted = false
exact T2.9 PDF pages/hashes = UNVALIDATED
DocumentEvidence extraction = NOT_RUN / ENVIRONMENT_BLOCKED
```

No historical page hint is promoted to controlled evidence.

---

## Existing #481 evidence preserved

Four independent publication copies previously agreed on T2.9.2 printed page 69:

```text
Ball       FL = 0.60
Butterfly  FL = 0.62
Globe      FL = 0.90
Gate       FL = 0.60
```

Candidate relation recorded by #481:

```text
delta = FL^2 * (P1 - 0.96 * Pv)
```

Independent arithmetic vector retained:

```text
FL = 0.90
P1 = 13,789,500
Pv = 152,926

delta = 11,050,579.7424
```

Unit-invariance pair:

```text
P1 = 137.895 bar
Pv = 1.52926 bar
FL = 0.90

delta = 110.505797424 bar
```

These are qualification arithmetic only. Pressure basis and decision-branch meaning remain controlled-source questions.

Authority remains:

```text
publicationState      = CANDIDATE
qualificationStatus   = NOT_QUALIFIED
masterValuesPublished = false
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

Unknown valve type remains `NOT_READY`. Fuzzy, nearest and generic FL fallbacks remain prohibited.

---

## Conflicting synthesis — fully quarantined

Investigation source:

```text
repository = reallaksh19/Advanced_Analysis
commit     = 76eb4bd075ce2e8e2442d02b2798df7be491fb4b
path       = docs/EI data/P1_Valve_Transient_and_Cavitation.md
blob       = f27764534a9bee88e3b4e2d1b12da046ccfced5d
```

It claims sigma/Kc/FF equations, four cavitation regimes, LOFs and trim-specific FL values. These claims remain non-authoritative.

Key frozen conflicts:

```text
Ball       0.60 candidate vs 0.50/0.75 synthesis variants
Butterfly  0.62 candidate vs 0.55/0.68/0.70 synthesis variants
Globe      0.90 candidate vs one matching + other synthesis variants
Gate       0.60 candidate vs synthesis omission
Equation   0.96 Pv candidate relation vs pressure-dependent FF synthesis
Branches   no qualified #481 tree vs synthesis four-regime sigma/Kc tree
```

Required disposition:

```text
CONTROLLED EI SOURCE DECIDES
```

---

## PF-01 deliverables now on branch

```text
ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json
ValidationRecords/VibrationMasters/t29-pf01-source-extraction-request-v1.json
ValidationRecords/VibrationMasters/t29-pf01-reconciliation-matrix-v1.json
ValidationRecords/VibrationMasters/t29-pf01-benchmark-matrix-v1.json
ValidationRecords/VibrationMasters/t29-pf01-qualification-progress-v2.json
ValidationRecords/VibrationMasters/t29-pf01-candidate-contract-v1.json
scripts/locate-vibration-t29-controlled-source.mjs
tests/vibration-t29-pf01-contract.test.mjs
tests/vibration-t29-controlled-source-ci.test.mjs
agents/PR547_workreport.md
```

### Source locator

The locator verifies exact Git blob/size, uses existing `pdftotext` extraction primitives, identifies T2.9 navigation pages and emits hashes/counts only. It does not publish master values or source text.

### Provisional reviewer request

Current unexecuted navigation hypothesis:

```text
printed page = 69
provisional PDF page = 77
identifier = T2.9.2
```

Wrong page/anchors must fail closed.

### Reconciliation matrix

Separates controlled evidence, #481 candidate evidence and `Advanced_Analysis` hypotheses. It records every value/equation/branch conflict individually.

### Benchmark matrix

Frozen now:

- four candidate FL lookup vectors;
- unknown/blank valve fail-closed vectors;
- Globe arithmetic replay;
- Pa/bar unit invariance;
- reserved no-cavitation/cavitation/flashing/equality/below/above vectors.

Regime and LOF expected values remain `null` until controlled evidence exists.

### Qualification progress

```text
A1 source/production trace       19/20
A2 method isolation              15/20
A3 authority/invariants          20/20
A4 independent validation        17/20
A5 minimal implementation slice  19/20
TOTAL                            90/100
```

Required:

```text
total >= 92/100
minimum each >= 17/20
A1 >= 18
A2 >= 18
```

Disposition:

```text
NOT_QUALIFIED_FOR_T29_CANDIDATE_IMPLEMENTATION
```

A2 remains intentionally below gate because exact EI predicates/equalities are unexecuted.

### Candidate kernel contract

The future pure-kernel stages are frozen without executable unverified physics:

```text
validateInput
normalizeUnitsAndPressureEvidence
evaluateApplicability
resolveVapourPressureEvidence
resolveFL
calculateQualifiedIntermediates
evaluateQualifiedDecisionBranches
buildCandidateEvidence
```

Blocked until controlled source:

```text
sigma             BLOCKED_CONTROLLED_SOURCE
Kc                BLOCKED_CONTROLLED_SOURCE
FF                BLOCKED_CONTROLLED_SOURCE_CONFLICT
regime boundaries BLOCKED_CONTROLLED_SOURCE
LOF               BLOCKED_CONTROLLED_SOURCE
```

### Anti-drift tests

The contract regression prevents synthesis rules, candidate master activation, branch-oracle fabrication, qualification self-promotion and authority leakage.

The CI-only controlled-source test is skipped outside GitHub Actions. On a capable trusted runner it downloads the exact pinned public Common object, verifies the Git-object identity and byte size, runs the existing extractor and emits bounded review evidence.

A temporary new workflow file was created during execution-route probing and then removed from the net diff because new PR workflows cannot run before default-branch trust and would widen PF-01 scope unnecessarily.

---

## Validation truth

Reconciled/executed in this session:

```text
repository grounding                PASS
source Git identity                 PASS
#481 candidate custody              PASS
synthesis conflict mapping          PASS_SOURCE
independent arithmetic replay       PASS
unit-invariance arithmetic          PASS
branch-oracle reservation           PASS_SOURCE
candidate kernel contract           PASS_SOURCE
main-drift overlap                  PASS — two commits, zero net tree files
```

Not executed:

```text
repository-native Node tests        NOT_RUN / ENVIRONMENT_BLOCKED
trusted PR workflow                 NOT_RUN — zero workflow runs scheduled
controlled PDF pdftotext execution  NOT_RUN / ENVIRONMENT_BLOCKED
DocumentEvidence extraction         NOT_RUN / ENVIRONMENT_BLOCKED
browser/product validation          NOT_APPLICABLE at PF-01
```

No `NOT_RUN` item is represented as PASS.

---

## Remaining hard stops

```text
CONTROLLED_T29_DOCUMENT_EVIDENCE_NOT_EXECUTED
EXACT_T29_BRANCH_PREDICATES_UNRESOLVED
EXACT_EQUALITY_DIRECTIONS_UNRESOLVED
PRESSURE_BASIS_AND_TAPPING_LOCATIONS_UNRESOLVED
FL_TAXONOMY_CONFLICT_UNRESOLVED
PRESSURE_DROP_EQUATION_CONFLICT_UNRESOLVED
DECISION_BRANCH_ORACLES_PENDING_CONTROLLED_SOURCE
APPENDIX_A_BELOW_GATE
```

---

## Exact continuation

```text
exact pinned Common PDF
  -> locate T2.9 pages
  -> confirm/update reviewer page selection
  -> generic hash-bound source extraction
  -> reconcile T2.9.2 table/equation/Flowchart T2-9
  -> populate branch/boundary benchmark oracles
  -> rescore Appendix A
```

Only after:

```text
QUALIFIED_FOR_T29_CANDIDATE_IMPLEMENTATION
```

may a subsequent PR implement the pure candidate numerical kernel.

Screening promotion remains a later separate authority change.
