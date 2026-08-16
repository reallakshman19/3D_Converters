# WIP-t29-pf01 — T2.9 Controlled-Source Reconciliation

## Recovery header

```text
WORK_INTENT: QUALIFICATION_EVIDENCE
CRITICALITY: ENGINEERING_CRITICAL
REPOSITORY: reallaksh19/3D_Converters
SOURCE_ISSUE: #545
PARENT_PROGRAMME: #450
BASE: main@d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
BRANCH: agent/t29-pf01-controlled-source-reconciliation
PR: NOT_ALLOCATED
TAKEOVER_AUTHORITY: READ_ONLY
CURRENT_STAGE: T29-PF-01 controlled source + decision-contract reconciliation
CURRENT_BLOCKER: CONTROLLED_T29_DOCUMENT_EVIDENCE_NOT_YET_EXECUTED
HIGHEST_RISK: implementing secondary/synthesized T2.9 equations or branch thresholds as EI authority
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
EXACT_NEXT_ACTION: execute the pinned EI PDF through the existing Stage5C/DocumentEvidence route for T2.9 pages, reconcile the exact FL table and decision-flow semantics, then rescore Appendix A before numerical production mutation.
```

## Mission

Qualify the controlled EI AVIFF T2.9 Cavitation / Flashing source contract behind stable calculation ID `VIB.CAVITATION.FLASHING` without guessing branch inequalities, pressure basis, vapour-pressure semantics, device scope, or engineering authority.

PF-01 is qualification evidence only. It does not add a production numerical kernel, does not activate a T2.9 master, and does not grant Screening/design authority.

## Live grounding

Observed `main` at start:

```text
d2d02ed56ee1c94d89ddc4c63fa58f0ce97a84df
qual(hp): establish controlled KD320 semantic contract Q1 (#544)
```

Main advanced from the earlier #545 issue-creation grounding `19cf1f0...`; this report uses the live `d2d02ed...` base.

Active overlap classification at start:

```text
#546 SBC AC1             SAFE for T2.9 domain; shared VibrationMasters/release infrastructure requires recheck before edits
#539 FIT lifecycle       COORDINATION_REQUIRED for tabs/engineering-calculation-vibration-family.js
#540 FIT authority       COORDINATION_REQUIRED for family/console authority presentation
#517/#506 AIV            SAFE for T2.9 numerical domain; do not mix AIV authority or equations
#508 SBC Stage2          SAFE for T2.9 numerical domain; master-framework lineage only
#483 master framework    historical/open draft lineage; current main already contains governed master infrastructure used by T2.9
```

No T2.9 production file mutation is authorized from this overlap audit alone.

## Current source truth

Controlled source pinned by #450/#481:

```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
git blob   = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594 bytes
section    = T2.9 / T2.9.2
```

Current source register state on main:

```text
masterId        = EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1
dataType        = TABLE
sourceState     = RECONCILIATION_REQUIRED
locator         = null
extractionReceipt = null
```

Existing Stage5C target already supports this exact master through `DOCUMENT_EVIDENCE_TABLE`.

## Recovered candidate — preserve, do not promote

Merged #481 candidate rows:

```text
Ball       FL = 0.60
Butterfly  FL = 0.62
Globe      FL = 0.90
Gate       FL = 0.60
```

Candidate relation recorded by #481 secondary corroboration:

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

`reallaksh19/Advanced_Analysis@76eb4bd075ce2e8e2442d02b2798df7be491fb4b` contains a richer T2.9 synthesis with sigma/Kc equations, additional valve/trim rows and regime thresholds. Some FL values conflict with the #481 four-row recovery.

Classification:

```text
SOURCE ROLE: CORROBORATION / INVESTIGATION ONLY
ENGINEERING AUTHORITY: NONE
PRODUCTION USE: PROHIBITED UNTIL CONTROLLED EI RECONCILIATION
```

No threshold, equation, LOF, action wording or additional FL row from that synthesis may be copied into production as EI authority before exact controlled-source reconciliation.

## Existing reusable property/master seam

Appendix-B water vapour pressure is available only as governed candidate/default evidence with exact-grid resolution. It must not silently become project Pv.

Precedence invariant:

```text
explicit project fluid property > separately accepted governed property > optional Appendix-B candidate/default
```

Missing project Pv is not zero and is not automatically resolved from Appendix B.

## Appendix A — current qualification

Status at WIP creation:

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

### A1 evidence currently established

- stable public ID and blocked mechanism scope traced through #545/#450;
- #481 four-row candidate and provenance identified;
- source register current `RECONCILIATION_REQUIRED` state identified;
- existing Stage5C target identified;
- Appendix-B Pv candidate seam identified;
- active FIT UI overlap identified;
- controlled/candidate/corroborating roles separated.

Remaining A1 work: exact controlled page/section hashes and current branch diff/check state after evidence generation.

### A2 blockers

Controlled source must establish exactly:

1. required P1/P2 pressure locations and absolute/gauge basis;
2. flowing temperature semantics;
3. Pv semantics and permitted resolution source;
4. liquid/device applicability;
5. source role of FL;
6. every governing equation/constant;
7. cavitation definition;
8. flashing definition;
9. no-cavitation definition if present;
10. exact `<`, `<=`, `>`, `>=` branch boundaries;
11. whether incipient/severe subdivisions exist in EI or only synthesis;
12. exact T2.9 output/LOF/action semantics;
13. exclusions and specialist escalation;
14. separation from AIV/high-frequency noise assessment.

### A3 invariants

```text
PRESSURE_BASIS_UNKNOWN       -> NOT_READY
PV_MISSING                   -> NOT_READY
PV_DEFAULT_NOT_ACCEPTED      -> NOT_READY
FL_UNKNOWN_VALVE             -> NOT_READY
FL_CANDIDATE_NOT_ACTIVE      -> NOT_READY / CANDIDATE_ONLY
UNSUPPORTED_PHASE            -> UNSUPPORTED
UNSUPPORTED_DEVICE           -> UNSUPPORTED
SYNTHESIS_ONLY_RULE          -> BLOCKED_SOURCE
T29_AUTHORITY                -> NONE / NOT_AUTHORIZED
AIV_SEMANTIC_LEAKAGE         -> PROHIBITED
T28_SEMANTIC_LEAKAGE         -> PROHIBITED
```

### A4 independent validation plan

Required vectors, with expectations frozen independently of production output:

```text
no cavitation
cavitation
flashing
exact criterion equality
just below boundary
just above boundary
missing Pv
unknown valve
invalid/wrong pressure basis
invalid pressure ordering
unit invariance
single/batch parity if central adapter introduced
```

Current blocker: source-defined branch oracle and exact boundaries are not yet controlled.

### A5 minimal next commit

PF-01 first commit is evidence-only:

```text
agents/WIP-t29-pf01_workreport.md
ValidationRecords/VibrationMasters/<T29 controlled-source evidence/discrepancy artifact>
possibly reviewer selection input consumed by existing Stage5C route
focused source-contract test only if it can assert controlled evidence without inventing method semantics
```

Explicitly excluded from PF-01 first commit:

```text
production T2.9 numerical kernel
family landing UI
engineering calculation adapter
screening authority
master activation
T2.8 changes
AIV changes
unrelated master refactors
workflow-file changes
```

## Validation ledger

| Check | STATUS | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | GitHub commit inspection | repository state |
| active PR overlap | PASS | GitHub open-PR inspection | repository state |
| #481 candidate custody | PASS | source artifact inspection | repository evidence |
| source register T2.9 state | PASS | source-register inspection | repository evidence |
| Stage5C T2.9 target exists | PASS | script inspection | repository evidence |
| controlled EI T2.9 DocumentEvidence | NOT_RUN | exact PDF not yet executed through Stage5C | authoritative reference |
| exact T2.9 branch semantics | NOT_RUN | blocked on controlled evidence | authoritative reference |
| numerical T2.9 implementation | NOT_APPLICABLE | prohibited in PF-01 until qualification | qualification gate |

## Changed-file ledger

At WIP creation:

```text
agents/WIP-t29-pf01_workreport.md  durable recovery state only
```

## Hard stops

Stop numerical implementation if any of these remain unresolved:

- controlled T2.9 source pages cannot be obtained/reconciled;
- exact branch inequalities cannot be proven;
- pressure basis/location semantics remain ambiguous;
- `0.96` factor role is not reconciled;
- synthesis conflicts cannot be classified;
- Pv custody would require a silent default;
- supported valve/device scope is ambiguous;
- Appendix A remains below gate.
