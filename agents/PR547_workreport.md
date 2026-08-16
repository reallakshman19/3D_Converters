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

It claims, among other items:

```text
sigma index
Kc = 0.80 * FL^2
pressure-dependent FF relation
four sigma/Kc decision regimes
LOF values 1.0 / 1.0 / 0.5 / 0.2
trim/orientation-specific FL values
```

These claims are not production authority.

Key conflicts now frozen in `t29-pf01-reconciliation-matrix-v1.json`:

```text
Ball:
  #481 candidate 0.60
  synthesis full-bore 0.50 / V-notch 0.75

Butterfly:
  #481 candidate 0.62
  synthesis 0.55 / 0.68 / 0.70 variants

Globe:
  #481 candidate 0.90
  synthesis has one matching 0.90 variant plus different variants

Gate:
  #481 candidate 0.60
  synthesis omits Gate

Equation:
  #481 candidate: FL^2 * (P1 - 0.96 Pv)
  synthesis:      FL^2 * (P1 - FF Pv)
                  FF = 0.96 - 0.28 sqrt(Pv/Pc)

Decision tree:
  #481 did not qualify one
  synthesis supplies a four-regime sigma/Kc tree
```

Required disposition:

```text
CONTROLLED EI SOURCE DECIDES
```

not nearest match, normalization, engineering preference, or benchmark fitting.

---

## PF-01 deliverables now on branch

### 1. Source contract

```text
ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json
```

Freezes source identity, 17 pending controlled predicates, authority and hard stops.

### 2. Controlled-source locator

```text
scripts/locate-vibration-t29-controlled-source.mjs
```

Uses the existing qualified generic PDF extractor primitives. It:

- verifies exact Git blob and byte size;
- extracts layout text via `pdftotext`;
- locates T2.9 navigation candidates;
- emits page hashes/counts only;
- does not publish source text or engineering values;
- requires reviewer selection.

### 3. Provisional extraction request

```text
ValidationRecords/VibrationMasters/t29-pf01-source-extraction-request-v1.json
```

Current hypothesis:

```text
printed page = 69
provisional PDF page = 77
identifier = T2.9.2
```

This is deliberately **UNEXECUTED / NON-AUTHORITATIVE**. A mismatch must fail rather than silently adjust.

### 4. Source reconciliation matrix

```text
ValidationRecords/VibrationMasters/t29-pf01-reconciliation-matrix-v1.json
```

Separates controlled source, #481 candidate, synthesis hypotheses, and each unresolved conflict.

### 5. Qualification benchmark matrix

```text
ValidationRecords/VibrationMasters/t29-pf01-benchmark-matrix-v1.json
```

Frozen now:

- four candidate FL lookup vectors;
- unknown/blank valve fail-closed vectors;
- independent Globe arithmetic replay;
- Pa/bar unit-invariance pair;
- required no-cavitation/cavitation/flashing/boundary slots.

The branch/regime/LOF expected fields intentionally remain `null` until controlled source evidence exists.

### 6. Qualification progress checkpoint

```text
ValidationRecords/VibrationMasters/t29-pf01-qualification-progress-v2.json
```

Current score:

```text
A1 source/production trace       19/20
A2 method isolation              15/20
A3 authority/invariants          20/20
A4 independent validation        17/20
A5 minimal implementation slice  19/20
TOTAL                            90/100
```

Gate requires:

```text
total >= 92/100
minimum each >= 17/20
A1 >= 18
A2 >= 18
```

Current disposition:

```text
NOT_QUALIFIED_FOR_T29_CANDIDATE_IMPLEMENTATION
```

A2 is intentionally below threshold because exact EI predicates/equalities are still unexecuted.

### 7. Candidate kernel contract

```text
ValidationRecords/VibrationMasters/t29-pf01-candidate-contract-v1.json
```

Freezes the future pure-kernel API without executable unverified physics:

```text
validateInput
normalize pressure/unit evidence
evaluate applicability
resolve Pv evidence
resolve FL
calculate qualified intermediates
evaluate qualified decision branches
build candidate evidence
```

Explicitly blocked intermediates:

```text
sigma             BLOCKED_CONTROLLED_SOURCE
Kc                BLOCKED_CONTROLLED_SOURCE
FF                BLOCKED_CONTROLLED_SOURCE_CONFLICT
regime boundaries BLOCKED_CONTROLLED_SOURCE
LOF               BLOCKED_CONTROLLED_SOURCE
```

### 8. Permanent anti-drift tests

```text
tests/vibration-t29-pf01-contract.test.mjs
tests/vibration-t29-controlled-source-ci.test.mjs
```

The static contract regression prevents:

- synthesis rules becoming production authority;
- candidate FL rows becoming active master data;
- branch oracles being populated from synthesis;
- qualification score silently crossing the gate;
- Screening/design authority leakage.

The CI-only source test is designed for an Actions-capable runner. It downloads the exact public pinned Common object, verifies Git-object identity and byte size, runs the existing extractor, logs bounded review lines and builds the hash-bound manifest.

---

## Current validation truth

Executed/reconciled in this session:

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

## Net PR scope

Current net paths are ten files:

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

A temporary new workflow file was tested as an execution route and then removed from the net diff because new PR workflows cannot execute before default-branch trust and would unnecessarily widen PF-01 scope.

No family UI, active master resolver, T2.8, AIV, FIT, SBC, production calculator or authority code is changed.

---

## Remaining hard stops

Numerical implementation remains prohibited while any of these are unresolved:

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

In an Actions-capable or local environment with network + `pdftotext`:

```text
exact pinned Common PDF
  -> scripts/locate-vibration-t29-controlled-source.mjs
  -> confirm/update reviewer page selection
  -> scripts/extract-vibration-master-source.mjs
  -> hash-bound T2.9 evidence
  -> human reconciliation of table/equations/Flowchart T2-9
  -> populate branch and exact-boundary benchmark oracles
  -> rescore Appendix A
```

Only if the gate reaches the required threshold:

```text
QUALIFIED_FOR_T29_CANDIDATE_IMPLEMENTATION
```

may the next PR implement the pure candidate numerical kernel.

Screening promotion remains a later, separate authority change.
