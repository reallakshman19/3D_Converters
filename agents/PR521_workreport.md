# PR521 Workreport — SBC Type-3 Production Freeze PF-002

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
PR: #521
BRANCH: agent/sbc-pf-002-master-derivation
BASE_MAIN: 731655e27cc76fbc8455c36b98f95dfa7602c8b9
GROUNDING_EPOCH: 2026-08-15T14:48Z
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: proceed next phase
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-002 master-assisted physical-input derivation only
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Progression Boundary

PF-001 / PR #520 remains open/draft and blocked on browser freeze evidence. Owner progression authorized the next isolated implementation slice; it did not convert PF-001 to PASS and did not grant merge authority.

PF-002 is deliberately independent of PR #520's unmerged Type-3 combination seam. It stops before final SBC LOF calculation and therefore cannot claim the frozen D7 final `.70` as an implementation output.

## Live Grounding / Reconciliation

PF-002 initially grounded on `5ad2288d41e031ef23df0cb3e600763081b4ac62`. Before production code landed, main advanced one commit through merged AIV PF-03 #518:

```text
from: 5ad2288d41e031ef23df0cb3e600763081b4ac62
to:   731655e27cc76fbc8455c36b98f95dfa7602c8b9
aheadBy: 1
classification: DISJOINT_FROM_PF002_SBC_PATHS
```

The advance touched AIV production-freeze records, AIV kernel code, AIV tests, and AIV agent records only. It touched no SBC/master path used by PF-002. Because no PF-002 production code had landed yet, the branch was reset to exact current main and the WIP handoff was recreated before code mutation.

Current allocation grounding:

```text
main                  731655e27cc76fbc8455c36b98f95dfa7602c8b9
PR #511               MERGED -> fbcf1b8680c3e69844cfb35675ecf15047134ba5
PR #512               MERGED -> 5ad2288d41e031ef23df0cb3e600763081b4ac62
PR #520 / PF-001      OPEN / DRAFT / blocked browser gate
PR #508               OPEN / DRAFT / salvage evidence only
AIV / #513            OUT OF SCOPE
```

No competing PF-002 SBC PR was found before implementation.

## PF-002 Hypothesis / Result

### Hypothesis

Current production contains candidate T3-1/T3-2/T3-3 table masters and controlled Common-backed non-curve candidate evidence, but no current-main SBC runtime module that converts Type-3 physical inputs into the candidate-only C/E/location/multiplier terms and exact manual D/F/G curve coordinates required for a later master-assisted product path.

### Result

SUPPORTED within the bounded slice. PF-002 adds a candidate-only derivation layer without final LOF composition, curve activation, facility caching, UI/shared-shell changes, or authority promotion.

## Implemented Slice

```text
NEW converters/vibration/sbc/type3-noncurve-candidate-data.js
    exact geometry/location candidate rows with committed CSV parity
    candidate governance and controlled-source custody
    span/location rules and worked-example-backed 1.42 evidence

NEW converters/vibration/sbc/type3-master-assisted-derivation.js
    geometry C derivation
    minimum-span E derivation using merged candidate T3-1/T3-2 tables
    first-location and mainline-assessment derivation
    schedule/category normalization
    exact manual curve requests for T3-1/T3-2, T3-3, T3-4
    fail-closed physical-input validation
    no final SBC LOF composition

NEW tests/vibration-sbc-type3-master-assisted-derivation.test.mjs
    controlled candidate-row parity
    D7 derivation oracle
    no-mass automatic-zero guard
    schedule lowering
    sub-unity mainline location rule
    invalid/missing input guards
    authority/governance non-promotion
```

No existing production file was edited. Therefore no pre-edit backup was required for production code in PF-002.

WIP handoff pre-delete custody:

```text
path: agents/WIP_2_handoff.md
blob: e62846558d6aa1a29fe6def1c1a1abad1b3dd79a
purpose: immutable recovery copy before WIP -> PR workreport transition
```

## Protected Engineering Invariants

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterDataAuthority  = false
publicationState     = CANDIDATE
qualificationStatus  = NOT_QUALIFIED
masterValuesPublished = false
runtimeCurveActivation = false
masterPublicationAuthorized = false
```

Only an explicit `firstSpanHasUnsupportedMass === false` state may produce automatic `C=0`. Missing/unknown mass state fails closed.

PF-002 contains no final Type-3 combination and no `lof` result field. It therefore cannot bypass PF-001's separate combination seam or couple itself to an unmerged branch.

## Controlled Source / Candidate Custody

Non-curve candidate set:

```text
candidateSetId: EI_AVIFF.T3.SBC.NON_CURVE_MASTERS.v1
record: ValidationRecords/VibrationMasters/ei-aviff-t3-sbc-non-curve-candidate-v1.json
source repository: reallaksh19/Common
source commit: fb549185b9b27edc2379734240320a85c5bef9f6
source path: EI - AVIFF Guidelines 2nd Edition.pdf
source blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

The 1.42 rule is linked to controlled worked-example custody:

```text
repository: reallaksh19/Common
commit: fb549185b9b27edc2379734240320a85c5bef9f6
path: EI - AVIFF Guidelines 2nd Edition_Examples.pdf
blob: 3e2517d0df527a051084fc02e69cb7afa31f8d47
locator: Appendix D / worked examples D5-D7
```

Current merged candidate table runtime remains `converters/vibration/masters/ei-aviff-sbc-t3-candidate.js`. PF-002 inspects its CANDIDATE tables; it does not transition them to ACTIVE.

T3-1..T3-4 remain `BLOCKED_SOURCE_DATA_CONFLICT`. PF-002 asks for manual exact-coordinate evidence only and does not reconstruct, interpolate, extrapolate, tune, publish, or activate any curve.

## Frozen D7 Derivation Oracle

Input vector:

```text
firstSpanHasUnsupportedMass = true
fittingKey = WELDOLET
branchLengthMm = 700
valvePressureClass = 600
valveConfiguration = ONE_VALVE_OR_INTEGRAL_DBB
parentSchedule = 120
sbcMinDiameterIn = 1.5
firstSpanLengthM = .9
subsequentMassSpanM = 2.3
subsequentNoMassSpanM = 1.4
mainlineLof = unknown
```

Expected / observed derivation:

```text
fitting score       .9
branch score        .9
valve score         .5
schedule 120 -> 80  .5
diameter score      .6
C mean              .68

fitting factor      .7
modified first span .9 * .7 = .63 m
T3-2 minimum        1.3 m
E                   .70

LOFLOC              1.00
mainline assessment 1.00
multiplier          1.42

D request: T3-1 x=1.5 in y=.9/.7=1.285714285714... m
F request: T3-3 x=1.5 in y=2.3 m
G request: T3-4 x=1.5 in y=1.4 m
```

The actual five-score mean is retained at binary floating full precision (`0.6799999999999999` in Node). Regression comparison uses the approved derived-arithmetic tolerance `1e-12`; no production rounding or target change is introduced.

## Exact Payload Custody / Validation

Exact GitHub branch blobs were matched to the locally executed files using `git hash-object`:

```text
converters/vibration/sbc/type3-noncurve-candidate-data.js
3267534b7688906156bb30454d876a9c4b265614

converters/vibration/sbc/type3-master-assisted-derivation.js
20498cc872681aadb436cc77cf491bca5c98fb0c

tests/vibration-sbc-type3-master-assisted-derivation.test.mjs
0f34a4a625901bcdc4f9591e685dac81eec2b219
```

Local execution environment:

```text
node: v22.16.0
native authenticated checkout: unavailable
exact source reconstruction: PASS
browser: NOT_RUN
```

Validation ledger:

| Check | STATUS | Observation / oracle |
|---|---|---|
| current-main grounding | PASS | branch based on `731655e2...` after disjoint AIV reconciliation |
| exact GitHub/local blob identity | PASS | all three new code/test blobs match `git hash-object` |
| JS syntax checks | PASS | both modules + test parse |
| PF-002 focused Node suite | PASS 8/8 | exact branch payload |
| geometry/location CSV parity | PASS | embedded candidate score grids equal committed CSV rows |
| D7 C derivation | PASS | `.68` within `1e-12`, full precision retained |
| D7 E derivation | PASS | `.63 < 1.3 -> .70` |
| D7 location/mainline/multiplier | PASS | `1 / 1 / 1.42` |
| D/F/G coordinate requests | PASS | T3-1 `1.5, 1.285714...`; T3-3 `1.5, 2.3`; T3-4 `1.5, 1.4` |
| curve quarantine propagation | PASS | blocked source, runtime false, publication false |
| no-mass automatic zero | PASS | only explicit false yields `C=0`; D request becomes T3-2 |
| missing mass state | PASS_FAIL_CLOSED | returns `NOT_READY` |
| lower-standard schedule | PASS | 120->80, 60->40, 15->10S |
| invalid physical/candidate selectors | PASS_FAIL_CLOSED | no implicit fallback |
| final LOF surface | PASS_ABSENT | no `lof` field / no combination |
| authority/governance | PASS | NONE / NOT_AUTHORIZED / false / false / CANDIDATE / NOT_QUALIFIED |
| official served-app Chromium | NOT_RUN / ENVIRONMENT_BLOCKED | no false PASS |
| hosted CI | PENDING | inspect exact final PR head after handoff transition |

## Browser / Production-Freeze Status

PF-002 is a domain derivation slice; the connected execution environment still cannot produce the official served-app Chromium receipt. No browser policy, expected value, tolerance, or workflow is changed to bypass that limitation.

```text
official Chromium: NOT_RUN / ENVIRONMENT_BLOCKED
freeze state: BLOCKED / NOT_FROZEN
```

## Handover Boundary

PR #521 is code-complete for PF-002's bounded derivation hypothesis but is **not production-frozen and not merge-authorized**.

Do not widen #521 into:

- final Type-3 LOF composition or PR #520's combination seam;
- manual D/F/G value resolution;
- facility cache/currentness or async controller behavior;
- UI redesign/shared workflow/activity contract changes;
- curve reconstruction/publication/activation;
- AIV or other mechanism work.

Those are later focused #514 slices after the appropriate predecessor is accepted/reconciled.
