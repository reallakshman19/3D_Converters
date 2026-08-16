# PR547 Work Report — T2.9 Controlled-Source Reconciliation

## Recovery header

```text
WORK_INTENT: QUALIFICATION_EVIDENCE
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/3D_Converters
SOURCE_ISSUE: #545
PARENT_PROGRAMME: #450
BASE: main@d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
BRANCH: agent/t29-pf01-controlled-source-reconciliation
PR: #547 / DRAFT / OPEN / UNMERGED / MERGEABLE
PR_HEAD_BEFORE_THIS_REFRESH: 99d7071a357adda81dc27bd27809ac5952e49096
TAKEOVER_AUTHORITY: READ_ONLY
CURRENT_STAGE: T29-PF-01 controlled source + decision-contract reconciliation
CURRENT_BLOCKER: CONTROLLED_T29_DOCUMENT_EVIDENCE_NOT_YET_EXECUTED
HIGHEST_RISK: implementing secondary/synthesized T2.9 equations or branch thresholds as EI authority
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
EXACT_NEXT_ACTION: materialize the pinned EI PDF in a capable runtime, execute reviewer-selected T2.9 source extraction/DocumentEvidence, reconcile exact FL rows and decision semantics, then rescore Appendix A before numerical production mutation.
```

## Mission

Qualify the controlled EI AVIFF T2.9 Cavitation / Flashing source contract behind stable calculation ID `VIB.CAVITATION.FLASHING` without guessing branch inequalities, pressure basis, vapour-pressure semantics, device scope, or engineering authority.

PF-01 is qualification evidence only. It does not add a production numerical kernel, activate a T2.9 master, or grant Screening/design authority.

## Live grounding and overlap

Live main was checked twice during this slice and remained:

```text
d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
qual(hp): establish controlled KD320 semantic contract Q1 (#544)
```

Final net branch relation before this report refresh:

```text
ahead = 4
behind = 0
net changed paths = 2
```

Active overlap classification:

```text
#546 SBC AC1             SAFE for T2.9 domain; recheck shared VibrationMasters/release paths before future edits
#539 FIT lifecycle       COORDINATION_REQUIRED for tabs/engineering-calculation-vibration-family.js
#540 FIT authority       COORDINATION_REQUIRED for family/console authority presentation
#517/#506 AIV            SAFE for T2.9 numerical domain; AIV authority/equations remain separate
#508 SBC Stage2          SAFE for T2.9 numerical domain; master-framework lineage only
#483 master framework    historical/open lineage; current main already exposes the governed framework used here
```

No shared family UI, workflow, master resolver or numerical production path is in the PR diff.

## Controlled source truth

```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
git blob   = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594 bytes
section    = T2.9 / T2.9.2
```

Current source-register state:

```text
masterId          = EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1
dataType          = TABLE
sourceState       = RECONCILIATION_REQUIRED
locator           = null
extractionReceipt = null
```

The merged Stage5C target set already routes this master through `DOCUMENT_EVIDENCE_TABLE`; no replacement source-extraction architecture is required.

## Source-materialization attempts in this slice

Observed truth:

1. GitHub connector can verify repository/commit/path/blob/size metadata.
2. `GitHub.fetch` rejects the private PDF body because it is binary/non-UTF-8.
3. Direct blob and contents API attempts through the connector fail for the same binary restriction.
4. The local runtime has no `gh` executable, so the authenticated CLI fallback is unavailable here.
5. No exact PDF page, page hash, section hash or source text was fabricated from historical hints, fixtures or secondary mirrors.

Classification:

```text
controlledSourceGitIdentity = PASS
controlledSourceBytesExecuted = false
T2.9 page selection = UNVALIDATED
T2.9 page/section hashes = UNVALIDATED
DocumentEvidence extraction = NOT_RUN / ENVIRONMENT_BLOCKED
```

PR #470 remains the controlling infrastructure precedent for this environment condition.

## PF-01 governed artifact

Added:

```text
ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json
schema = T29ControlledSourceContract.v1
```

It freezes:

- exact controlled-source identity and extraction blocker;
- source-register `RECONCILIATION_REQUIRED` state;
- merged #481 candidate rows and candidate-only authority;
- explicit quarantine of the conflicting Advanced_Analysis synthesis;
- four first-class conflict records covering ball FL, butterfly FL, vapour-pressure factor/equation basis and full decision tree;
- seventeen `T29-PRED-*` controlled predicates that remain pending;
- fail-closed vapour-pressure custody rules;
- implementation hard stops;
- current Appendix-A score/disposition.

## Preserved #481 candidate

```text
Ball       FL = 0.60
Butterfly  FL = 0.62
Globe      FL = 0.90
Gate       FL = 0.60
```

Recorded relation from #481 secondary corroboration:

```text
delta = FL^2 * (P1 - 0.96 * Pv)
```

Authority remains:

```text
publicationState      = CANDIDATE
qualificationStatus   = NOT_QUALIFIED
masterValuesPublished = false
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

Unknown valve type remains `NOT_READY`; fuzzy/nearest/generic FL fallback is forbidden.

## Conflicting synthesis quarantine

Pinned investigation source:

```text
repository = reallaksh19/Advanced_Analysis
commit     = 76eb4bd075ce2e8e2442d02b2798df7be491fb4b
path       = docs/EI data/P1_Valve_Transient_and_Cavitation.md
blob       = f27764534a9bee88e3b4e2d1b12da046ccfced5d
```

It contains a sigma/Kc four-regime decision tree, a pressure-dependent FF expression and additional valve/trim FL rows. Some claims conflict with #481.

Classification:

```text
SOURCE ROLE: CORROBORATION / INVESTIGATION ONLY
ENGINEERING AUTHORITY: NONE
PRODUCTION USE: PROHIBITED UNTIL CONTROLLED EI RECONCILIATION
```

No threshold, equation, LOF, action wording or additional FL row from that synthesis may enter production as EI authority before controlled reconciliation.

## Property/master custody invariant

Appendix-B water vapour pressure remains candidate/default evidence only.

```text
explicit project fluid property > separately accepted governed property > optional Appendix-B candidate/default
```

Forbidden:

```text
missing Pv -> 0
missing Pv -> silent Appendix-B acceptance
unknown pressure basis -> assume absolute
unknown valve -> generic FL
```

## Appendix A — current qualification

```text
A1 Production/source trace      18/20
A2 Current method isolation     12/20
A3 Authority/invariant proof    18/20
A4 Independent validation       13/20
A5 Minimal next commit          16/20
TOTAL                           77/100
DISPOSITION                     NOT_QUALIFIED_FOR_T29_NUMERICAL_MUTATION
```

Required before numerical production mutation:

```text
total >= 92/100
minimum each >= 17/20
A1 >= 18
A2 >= 18
review disposition = QUALIFIED_FOR_T29_CANDIDATE_IMPLEMENTATION
```

A2 remains blocked on controlled source answers for pressure locations/basis, temperature/Pv semantics, phase/device envelope, FL taxonomy, governing equations/constants, exact cavitation/flashing/no-cavitation boundaries, output/LOF semantics, specialist exclusions and AIV/T2.8 separation.

## Independent validation matrix reserved

Expected answers must be frozen independently of runtime output:

```text
no cavitation
cavitation
flashing
criterion equality
just below / just above each boundary
missing Pv
unknown valve
invalid pressure basis
invalid pressure ordering
unit invariance
single/batch parity if a central adapter is later introduced
```

## Validation ledger

| Check | STATUS | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | checked twice; base unchanged | repository state |
| active PR overlap | PASS | current open-PR inspection | repository state |
| final net branch diff before refresh | PASS | ahead 4 / behind 0; exactly two intended paths | repository state |
| #481 candidate custody | PASS | candidate/provenance inspection | repository evidence |
| source register T2.9 state | PASS | source-register inspection | repository evidence |
| Stage5C T2.9 target exists | PASS | target script inspection | repository evidence |
| PF-01 source-contract artifact | PASS_SOURCE | exact branch artifact committed | repository evidence |
| controlled PDF Git identity | PASS | repo/commit/path/blob/size reconciled | repository evidence |
| connector binary materialization | NOT_RUN / ENVIRONMENT_BLOCKED | connector accepts UTF-8 only | execution environment |
| local GitHub CLI fallback | NOT_RUN / ENVIRONMENT_BLOCKED | `gh` executable absent | execution environment |
| controlled EI T2.9 DocumentEvidence | NOT_RUN / ENVIRONMENT_BLOCKED | exact bytes not materialized | authoritative reference |
| exact T2.9 branch semantics | NOT_RUN | blocked on controlled evidence | authoritative reference |
| numerical T2.9 implementation | NOT_APPLICABLE | prohibited by qualification gate | qualification gate |
| current-head PR-triggered workflows | NOT_RUN | zero runs returned for `99d7071...` | GitHub state |

## Changed-file ledger

Final intended net PR paths:

```text
ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json
agents/PR547_workreport.md
```

The pre-PR `agents/WIP-t29-pf01_workreport.md` has been retired from the net diff.

## Hard stops

Numerical implementation remains prohibited while any of these are unresolved:

- controlled T2.9 source pages/section hashes unavailable;
- exact branch inequalities/equalities unproven;
- pressure basis/location semantics ambiguous;
- role of the `0.96` factor vs FF unresolved;
- FL scope conflicts unresolved;
- Pv custody would require silent defaulting;
- supported valve/device scope ambiguous;
- Appendix A below gate.
