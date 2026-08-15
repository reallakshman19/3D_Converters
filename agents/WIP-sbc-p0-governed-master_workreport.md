# WIP-sbc-p0-governed-master — SBC P0 Governed Master

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
BASE_MAIN: 0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
BRANCH: agent/sbc-p0-governed-master
CRITICALITY: ENGINEERING_CRITICAL
MISSION: Reconcile Advanced_Analysis@6111ddbc P0 SBC Tables T3-1/T3-2/T3-3 and Figures T3-1..T3-4, add fail-closed master resolution, preserve manual project-input fallback, and do not promote SBC screening/design authority without independent qualification.
CURRENT_STAGE: source reconciliation / implementation planning
HIGHEST_RISK: supplied digitized curve thresholds contradict EI worked example D7; accidental publication would change SBC engineering results
EXACT_NEXT_ACTION: implement a candidate master qualification gate that proves table parity, proves final min-combination semantics from worked examples, rejects inconsistent T3-1..T3-4 curve points, and exposes only qualified governed terms to the existing Type-3 evaluator.
```

## Mission Control

- User supplied exact source snapshot: `reallaksh19/Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921/docs/EI data`.
- Current `main`: `0fb4be2a03aa455efe5d476c8a8ba4e82b732b95`.
- Current main already contains merged PR #484 non-curve T3 candidates and PR #485 curve-recovery hard stop, plus the merged facility Type-3 candidate path.
- Stale PR #480 remains open/draft source-inventory-only and is not the implementation branch for this work.

## Source Reconciliation Findings

### PASS — non-curve table parity

The supplied P0 dataset matches current candidate values for:

- Table T3-1 fitting span factors;
- Table T3-2 first-span minimum lengths;
- Table T3-3 between-main-lines minimum lengths.

### PASS — final SBC combination semantics

Pinned worked examples confirm:

```text
mainlineAdjusted = mainLineLOF * 1.42
SBC LOF = min(mainlineAdjusted, SBC Modifier)
```

This agrees with current `converters/vibration/sbc/type3-user-data.js` and contradicts the product-formula sentence in `P0_SBC_Master_Data.md`.

### FAIL — supplied curve pack against D7 independent oracle

Worked Example D7 requires:

```text
T3-1: D=1.5 in, modified first span=1.286 m -> LOFGEOM(D)=0.2
T3-3: D=1.5 in, mass span=2.3 m -> LOFGEOM(F)=0.6
T3-4: D=1.5 in, no-mass span=1.4 m -> LOFGEOM(G)=0.2
```

The supplied digitized thresholds in `P0_SBC_Master_Data.md` do not reproduce all three outcomes under its stated evaluator logic. Therefore the curve dataset is not eligible for governed publication in this work state.

## Authority / Invariants

```text
engineeringAuthority = NONE for new SBC masters until qualified
screeningAuthority   = NOT_AUTHORIZED
candidate curve data = fail closed if qualification fails
designAuthority      = false
manual project input = retained as fallback only when no governed value is available
governed value       = always outranks user value through existing resolver
```

Do not infer missing engineering data as zero. Do not interpolate or extrapolate an unqualified curve pack. Do not change the current final `min(mainlineAdjusted, SBC Modifier)` rule.

## Backup / Recovery Ledger

Connector-only runtime has no authenticated checkout, so repository-local `node utils/backup.js save` is environment-blocked. Before editing any existing file, preserve its exact pre-edit Git blob SHA here and use Git history/blob as recovery evidence; never claim the backup CLI ran.

Known current blobs:

```text
converters/vibration/sbc/type3-user-data.js 69215382db2fabaae8356370ca5760def19d4cba
converters/vibration/sbc/facility.js        f723aace9c7c7fcbedfcb0fcab64c528dcc1f046
```

## Validation Ledger

| Check | STATUS | OBSERVATION | ORACLE |
|---|---|---|---|
| live main grounding | PASS | GitHub main `0fb4be2a...` | repository |
| #484 non-curve table values vs supplied P0 | PASS | exact value comparison | cross-repo supplied dataset |
| final SBC LOF combination rule | PASS | D5/D6/D7 worked examples use `min(mainline*1.42, modifier)` | EI worked examples copy in supplied snapshot |
| supplied T3 curve pack vs D7 | FAIL | multiple D7 outcomes not reproduced | EI worked example D7 |
| repository-native tests | NOT_RUN | connector-only runtime | n/a |
| browser acceptance | NOT_RUN | no browser checkout | n/a |

## Appendix A — Implementation Takeover Qualification

### A1 Production Trace
`facility.js -> calculateSbcType3FromUserEngineeringData -> resolveBlockedVibrationData`; governed values already have precedence over exact-match user rows.

### A2 Current Failure Isolation
The blocker is not the Type-3 combination formula; it is the unqualified T3-1..T3-4 digitized threshold pack supplied in Advanced_Analysis.

### A3 Authority / Invariant
Never publish curve values that fail D7. Preserve `designAuthority=false`, `screeningAuthority=NOT_AUTHORIZED`, and governed-master precedence.

### A4 Independent Validation
Use worked examples D5/D6/D7 plus boundary probes around exact nominal sizes/thresholds. A production-derived expected value is not an independent oracle.

### A5 Next Minimal Patch
Add a small P0 qualification/master resolver module and focused tests. Only then wire qualified governed terms into the existing facility evaluation; leave rejected curve terms unresolved so manual project input remains explicit.
