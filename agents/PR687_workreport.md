# PR687 — HP Operating-State / Governed-Cycle Bulk Intake — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #687
BRANCH: agent/hp-transient-bulk-intake
BASE: main
BASE_SHA_AT_START: cd02030d7d28438ddda8e11ac92acb319cd06cd9
IMPLEMENTATION_HEAD_AT_PR_OPEN: d609de41c0501034d4ba17c0cc3fa409e0944a7d
PREDECESSOR_PR: 685 (MERGED)
PREDECESSOR_MERGE: cd02030d7d28438ddda8e11ac92acb319cd06cd9
CURRENT_STAGE: DRAFT_PR_HOSTED_RECONCILIATION
MERGE_AUTHORITY: NOT_GRANTED_FOR_PR687

## Mission

Complete the productive table-authoring chain for HP Piping Class by adding CSV/TSV intake for operating states and governed lifetime cycles:

```text
product matrix
-> operating states / governed cycles
-> external Seq / N
-> canonical review calculation
-> class-wide result matrix / export
```

This PR does not implement native KD320, Code authority, or source/evidence qualification.

## Bulk contracts

States:

```text
state_id,pressure_mpa,material_temperature_c,structural_temperature_c
```

Cycles:

```text
cycle_id,from_state_id,to_state_id,total_cycles,cycles_per_year,category,provenance_id
```

The existing `transient.spectrum.spectrumId` remains class authority and is stamped onto imported state/cycle rows. Design pressure and external KD quantities are not bulk-owned here.

Limits:
- 200 states
- 1000 cycles

## Fail-closed validation

- spectrum ID required before admission
- exact headers required
- required identities and numeric values cannot be blank
- state/cycle identities unique case-insensitively
- case-only state/cycle renames blocked
- pressure >= 0
- total_cycles >= 0
- cycles_per_year blank or >= 0
- state references exact and must exist in the same imported state table
- case-mismatched state references blocked
- CSV and TSV supported

## KD custody rule

Existing external Seq/N rows are retained only when all stress-basis custody remains exactly unchanged:

1. cycle ID
2. from-state ID
3. to-state ID
4. from/to state pressure
5. from/to state material temperature
6. from/to state structural temperature

Stale external rows are removed, never silently rewritten:

```text
CYCLE_REMOVED
STATE_PAIR_CHANGED
STATE_VALUE_CHANGED
```

If a previously populated KD package becomes empty after cleanup, the empty package is removed and must be re-added from KD Review when new external Seq/N results exist.

A newly introduced governed cycle is explicitly reported as missing from retained KD packages.

Changing only `total_cycles`, `cycles_per_year`, `category`, or `provenanceId` does not invalidate the stress basis. The canonical transient resolver consumes the new lifetime `n` for downstream damage bookkeeping.

## Existing production path retained

The active HP route composes:

```text
hp-piping-class-product-bulk-workbench-tab.js
+ hp-piping-class-transient-bulk-enhancer.js
```

The enhancer is additive in the Pressure Cycles panel. Apply uses:

```text
serializeHpPipingClassWorkspaceProject
-> hidden data-hpwb-file JSON import
-> existing workspace controller/storage
-> existing data-hpwb-action="calculate"
```

No parallel transient state store or engineering solver was introduced.

## Canonical integration check

Bulk-applied data was fed directly into existing `resolveChapterIxTransientSpectrum()`.

Input:

```text
LOW:  P=2 MPa, Tm=40 C, Ts=45 C
HIGH: P=20 MPa, Tm=80 C, Ts=75 C
C1: LOW -> HIGH, n=500, cycles/year=25
```

Canonical outputs:

```text
pressureRangeMpa              = 18
meanPressureMpa               = 11
materialTemperatureRangeC     = 40
structuralTemperatureRangeC   = 30
totalDeclaredCycles           = 500
cyclesPerYear                 = 25
canUseForDesignAuthority      = false
```

A second case changes lifetime cycles to 750 and cycles/year to 37.5; canonical pressure range and mean pressure remain 18/11 while the new lifetime counts are used.

## Exact-byte validation ledger

Exact Git blob reconstruction was used for the authored helper/tests and the existing canonical transient resolver.

```text
helper syntax                                      PASS
route syntax                                       PASS
enhancer syntax                                    PASS
parser / custody / normal cases                    PASS 7/7
fail-closed cases                                  PASS 7/7
route / UI ownership cases                         PASS 6/6
canonical transient resolver integration           PASS 2/2
focused total                                      PASS 22/22
```

Important falsifier:

```text
cycle ID = C1 unchanged
pair     = LOW -> HIGH unchanged
HIGH P   = 20 -> 21 MPa
HIGH Tm  = 80 -> 81 C
=> prior external Seq/N removed as STATE_VALUE_CHANGED
=> no stale fatigue package remains
```

PR681 base-browser source inventory compatibility is preserved by a truthful KD-bulk composition marker in the active route. PR685 product-matrix companion source gate still sees the actual product-bulk wrapper import.

## NOT_RUN

```text
routed FULL_APP browser journey for transient bulk editor     NOT_RUN
combined native-checkout npm run verify:hp-production-browser NOT_RUN
full repository regression                                    NOT_RUN
```

Do not promote source-level UI tests or exact-byte Node execution to routed FULL_APP browser PASS.

## Authority boundary

Unchanged:

```text
calculationMode = USER_CALCULATED_KD3
nativeCoreKd3Qualified = false
codeCompliance = false
canUseForDesignAuthority = false
```

## Changed-file ledger at PR open

```text
tabs/engineering-workspace-tab.js
tabs/hp-piping-class-transient-bulk-input.js
tabs/hp-piping-class-transient-bulk-enhancer.js
tests/hp-piping-class-transient-bulk-input.test.mjs
tests/hp-piping-class-transient-bulk-failclosed.test.mjs
tests/hp-piping-class-transient-bulk-ui.test.mjs
tests/hp-piping-class-transient-bulk-canonical.test.mjs
```

Recovery files are added after PR creation.

## Next action

1. Reconcile exact PR head/base after recovery commits.
2. Check hosted statuses, PR workflows, reviews and review threads.
3. If a native checkout is available, extend/execute the HP browser journey for the transient editor.
4. Do not merge PR687 without explicit owner merge authorization.

## Appendix A — takeover qualification

1. Why is Spectrum ID excluded from the two bulk tables?
2. Which exact six custody dimensions must remain unchanged before an external Seq/N row may be retained?
3. Why does changing only `total_cycles` not invalidate Seq/N stress-basis custody?
4. What happens to an external result when a referenced state pressure changes but cycle ID and pair do not?
5. Why are case-only state/cycle renames blocked?
6. Why does apply use the existing hidden JSON import/controller path rather than mutating localStorage directly?
7. Which values were independently confirmed through `resolveChapterIxTransientSpectrum()`?
8. Which validation claims remain NOT_RUN?
