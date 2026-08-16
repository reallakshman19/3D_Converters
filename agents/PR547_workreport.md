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
PR: #547 / DRAFT / OPEN / UNMERGED
PR_HEAD_LAST_RECORDED: 06c578d318717cb19bca1de74bd814712c35ce78
TAKEOVER_AUTHORITY: READ_ONLY
CURRENT_STAGE: T29-PF-01 controlled source + decision-contract reconciliation
CURRENT_BLOCKER: CONTROLLED_T29_DOCUMENT_EVIDENCE_NOT_YET_EXECUTED
HIGHEST_RISK: implementing secondary/synthesized T2.9 equations or branch thresholds as EI authority
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
EXACT_NEXT_ACTION: materialize the pinned EI PDF in a capable runtime, execute reviewer-selected T2.9 source extraction/DocumentEvidence, reconcile exact FL rows and decision semantics, then rescore Appendix A before any numerical production mutation.
```

## Mission

Qualify the controlled EI AVIFF T2.9 Cavitation / Flashing source contract behind stable calculation ID `VIB.CAVITATION.FLASHING` without guessing branch inequalities, pressure basis, vapour-pressure semantics, device scope, or engineering authority.

PF-01 is qualification evidence only. It does not add a production numerical kernel, activate a T2.9 master, or grant Screening/design authority.

## Live grounding and overlap

Observed live base at work start:

```text
d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
qual(hp): establish controlled KD320 semantic contract Q1 (#544)
```

Branch allocation and first audit:

```text
base relation = ahead-only / behind 0
initial changed paths = 2 evidence/handover files
```

Active overlap classification:

```text
#546 SBC AC1             SAFE for T2.9 domain; recheck shared VibrationMasters/release paths before edits
#539 FIT lifecycle       COORDINATION_REQUIRED for tabs/engineering-calculation-vibration-family.js
#540 FIT authority       COORDINATION_REQUIRED for family/console authority presentation
#517/#506 AIV            SAFE for T2.9 numerical domain; AIV authority/equations remain separate
#508 SBC Stage2          SAFE for T2.9 numerical domain; master-framework lineage only
#483 master framework    historical/open lineage; current main already exposes the governed framework used here
```

No shared family UI or numerical production path is in the current PR diff.

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

PR #470 remains the controlling environment precedent: the Git identity is observable, but this connector cannot materialize the private PDF binary. Do not infer exact PDF pages/values from historical hints or fixtures.

## First PF-01 artifact

Added:

```text
ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json
schema = T29ControlledSourceContract.v1
```

The artifact freezes:

- exact controlled-source identity and current extraction blocker;
- current source-register state;
- merged #481 candidate rows and candidate-only authority;
- explicit quarantine of conflicting Advanced_Analysis synthesis claims;
- four first-class conflict records covering ball FL, butterfly FL, vapour-pressure factor/equation basis and full decision tree;
- seventeen `T29-PRED-*` controlled predicates that remain pending;
- fail-closed Pv custody rules;
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

### A2 controlled-source questions still open

1. exact P1/P2 pressure locations;
2. absolute/gauge pressure basis;
3. flowing-temperature semantics;
4. Pv semantics and permitted source;
5. supported phase/device envelope;
6. exact FL applicability/taxonomy;
7. governing equations/constants;
8. cavitation/flashing/no-cavitation definitions;
9. exact equality direction at every boundary;
10. whether incipient/severe subdivisions are actually EI-defined;
11. exact T2.9 output/LOF/action semantics;
12. specialist exclusions/escalation;
13. separation from AIV and T2.8.

## Independent validation matrix reserved

Expected answers must be frozen from authoritative/reviewed evidence, never runtime output:

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
single/batch parity if central adapter is later introduced
```

## Validation ledger

| Check | STATUS | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | GitHub commit inspection | repository state |
| active PR overlap | PASS | GitHub open-PR inspection | repository state |
| branch diff before PR allocation | PASS | ahead 2 / behind 0; two intended files | repository state |
| #481 candidate custody | PASS | source artifact inspection | repository evidence |
| source register T2.9 state | PASS | source-register inspection | repository evidence |
| Stage5C T2.9 target exists | PASS | script inspection | repository evidence |
| PF-01 source-contract artifact | PASS_SOURCE | exact branch artifact committed | repository evidence |
| controlled EI T2.9 DocumentEvidence | NOT_RUN / ENVIRONMENT_BLOCKED | binary unavailable to text connector | authoritative reference |
| exact T2.9 branch semantics | NOT_RUN | blocked on controlled evidence | authoritative reference |
| numerical T2.9 implementation | NOT_APPLICABLE | prohibited by qualification gate | qualification gate |

## Changed-file ledger

Current intended PR content after handover promotion:

```text
ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json
agents/PR547_workreport.md
```

The pre-PR `agents/WIP-t29-pf01_workreport.md` is to be retired after this PR report is committed.

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
