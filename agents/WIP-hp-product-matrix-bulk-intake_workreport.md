# WIP — HP Piping Class Product-Matrix Bulk Intake

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
BRANCH: agent/hp-product-matrix-bulk-intake
BASE: main
BASE_SHA_AFTER_REPLAY: 1f8f12daf3846780341ad34ab56f9dc0bde05593
IMPLEMENTATION_HEAD_AFTER_REPLAY: b1e330744596b931ce340c598da4abb269a3add4
CURRENT_STAGE: IMPLEMENTED_ON_BRANCH_PENDING_NATIVE_EXECUTION_AND_PR_AUTHORIZATION
PR_AUTHORITY: NOT_GRANTED
MERGE_AUTHORITY: NOT_GRANTED

## Mission

Turn the HP Piping Class production workbench from row-by-row product authoring into a practical class-matrix intake path without adding a second engineering engine or weakening authority boundaries.

```text
CSV / TSV direct-product matrix
-> deterministic preview
-> fail-closed class/product validation
-> existing project import/controller
-> existing canonical review calculation
-> existing class result matrix / CSV / JSON export
```

Evidence/source qualification and native KD320 remain outside this increment.

## Product bulk contract

Exact 12-column header:

```text
product_id
nominal_size
od_mm
allowable_stress_mpa
nominal_wall_mm
minus_tolerance_pct
internal_allowance_mm
external_allowance_mm
fatigue_wall_basis
measured_current_wall_mm
future_internal_loss_mm
future_external_loss_mm
```

CSV and TSV are supported. The intake is limited to 500 rows per operation.

## Engineering ownership rules

### Class-level custody

`internal_allowance_mm` and `external_allowance_mm` are repeated in each imported row for spreadsheet convenience but remain one class-level basis. Every row must contain the same pair or the entire import is blocked.

Design pressure remains the existing class-level input and is never inferred from product rows.

### Direct vs governed products

Bulk intake manages `DIRECT_ENGINEERING_INPUT` products only.

Existing `GOVERNED_BASIS_PACKAGE` products:

```text
preserved = true
overwritten = false
removed = false
```

Any imported row that targets a governed product identity is rejected.

### Identity / fatigue custody

Product identity matching is exact for custody. Duplicate imported IDs are checked case-insensitively, and a case-only rename of an existing direct product is blocked instead of silently detaching its fatigue package.

After a valid replacement:

- fatigue packages for retained product IDs are preserved byte-for-object through the clone/rebuild path;
- fatigue packages for intentionally removed direct products are removed with those products;
- governed-product fatigue packages remain retained because governed products remain present.

Reference-sample metadata is removed after a bulk mutation so an edited class cannot continue to claim the pristine reference identity.

## Fail-closed numerical intake checks

Required fields do not coerce blank text to zero.

Per direct product:

```text
OD > 0
S > 0
nominal wall > 0
0 <= minus tolerance < 100
internal allowance >= 0
external allowance >= 0
nominal wall < OD / 2
```

Derived preview checks:

```text
t_min,m = t_nom * (1 - tolerance/100)
t_eff   = t_min,m - c_i - c_o
require t_eff > 0
```

Brownfield/projected-EOL checks:

```text
measured current wall > 0 when supplied
future internal/external loss >= 0
measured wall requires both future-loss cells explicitly (0 allowed)
PROJECTED_END_OF_LIFE requires measured wall + future losses
projected EOL wall = measured - future internal - future external
require projected EOL wall > 0
```

These preview equations are intake consistency arithmetic only; static pressure/fatigue engineering calculations remain owned by the existing canonical evaluator.

## Independent hand arithmetic

Reference preview cases:

```text
NPS4 / 13.49 mm / 12.5% / ci=3 / co=0
minimum as-manufactured = 13.49 * 0.875 = 11.80375 mm
net effective            = 11.80375 - 3 = 8.80375 mm

NPS6 / 18.26 mm / 12.5% / ci=3 / co=0
minimum as-manufactured = 18.26 * 0.875 = 15.9775 mm
net effective            = 15.9775 - 3 = 12.9775 mm

brownfield measured 12 / future losses 1 + 0.5
projected EOL = 10.5 mm

negative wall falsifier: 3 * 0.875 - 3 = -0.375 mm -> BLOCK
```

Independent arithmetic status: PASS.

## UI integration

Active HP route now loads:

```text
tabs/hp-piping-class-product-bulk-workbench-tab.js
```

That wrapper retains the existing:

```text
hp-piping-class-kd-bulk-workbench-tab.js
-> base HP workbench
-> existing workspace controller
-> canonical HP orchestrator
-> KD Seq/N bulk input
-> production readiness/result ledger
-> class-wide result matrix
-> CSV/JSON result export
```

The Design Basis page gains:

```text
Paste / import direct-input product matrix
Load CSV / TSV
Validate matrix
Apply + batch calculate
```

The preview shows product/NPS/OD/S/wall/tolerance/minimum-manufactured/effective-net/fatigue-wall-basis/projected-EOL before mutation.

Nominal size is also visible/editable in the normal product matrix and persists through the existing relational binding path.

Apply deliberately reuses the existing JSON-import action and then the existing `Run review calculation` action. It does not instantiate or call a parallel calculation kernel.

## Authority boundary

Unchanged:

```text
calculationMode = USER_CALCULATED_KD3
nativeCoreKd3Qualified = false
codeCompliance = false
canUseForDesignAuthority = false
```

No native KD320 formula, Code equation, source qualification, evidence gate, or release authority is added.

## Exact implementation/test diff before this work report

```text
tabs/engineering-workspace-tab.js
tabs/hp-piping-class-product-bulk-input.js
tabs/hp-piping-class-product-bulk-workbench-tab.js
tests/hp-piping-class-product-bulk-input.test.mjs
tests/hp-piping-class-product-bulk-failclosed.test.mjs
tests/hp-piping-class-product-bulk-ui.test.mjs
```

The branch was initially created from PR681 merge `739f5313...`. Main advanced by two vibration-only commits while implementation was in progress. Exact HP blobs were replayed onto `main@1f8f12daf3846780341ad34ab56f9dc0bde05593`; the normalized implementation branch then showed ahead 1 / behind 0 with exactly the six HP paths above.

## Validation ledger

```text
current-main re-grounding                         PASS / GITHUB_SOURCE
main advancement HP-overlap                       PASS / NONE; vibration-only
normalized branch ancestry                        PASS / ahead 1, behind 0 before recovery
exact changed implementation paths                PASS / 6 intended
independent product-wall arithmetic               PASS
NPS4 minimum/effective wall                       PASS / 11.80375 / 8.80375 mm
NPS6 minimum/effective wall                       PASS / 15.9775 / 12.9775 mm
brownfield projected EOL                          PASS / 10.5 mm
negative effective-wall falsifier                 PASS / -0.375 mm -> blocked
source-level fail-closed cases                    ENCODED
repository-native Node tests                      NOT_RUN / NO_NATIVE_CHECKOUT
full repository regression                        NOT_RUN
Chromium full-product matrix journey              NOT_RUN
hosted PR checks                                  NOT_RUN / NO PR
```

Do not promote source-level test encoding to repository-native execution PASS.

## Tests authored

`tests/hp-piping-class-product-bulk-input.test.mjs`:

- 2-row direct matrix hand arithmetic;
- class allowance conflict;
- case-insensitive duplicate import ID;
- nonpositive effective wall;
- projected-EOL completeness and arithmetic;
- governed-product overwrite blocker;
- direct replacement + governed preservation + fatigue custody;
- failed apply no-mutation.

`tests/hp-piping-class-product-bulk-failclosed.test.mjs`:

- blank required numeric does not coerce to zero;
- case-only existing product rename is blocked.

`tests/hp-piping-class-product-bulk-ui.test.mjs`:

- active HP route uses new wrapper;
- wrapper layers on existing KD/result workbench;
- bulk controls/header visible;
- existing JSON import + calculation actions reused;
- nominal-size relational binding;
- governed/read-only and design-pressure ownership copy.

## Next action

1. In a native checkout, run the three focused Node test files.
2. Run the existing HP product/workbench/result regressions.
3. Extend `verify:hp-production-browser` with a two-product product-matrix journey and retain a FULL_APP receipt.
4. If all pass, request explicit PR creation authorization.
5. Do not merge without explicit merge authorization.

## Appendix A — Takeover questions

1. Why are internal/external allowance columns repeated in CSV but required to be identical across rows?
2. Why must product bulk intake refuse to overwrite `GOVERNED_BASIS_PACKAGE` rows?
3. Why is a case-only product-ID rename blocked instead of canonicalized?
4. Which exact objects are preserved when a direct product remains in the imported matrix?
5. Which exact objects are removed when a direct product disappears from the imported matrix?
6. Why does the UI feed the rebuilt project through the existing JSON import/controller rather than constructing a second workspace controller?
7. Which numerical arithmetic belongs to preview validation, and which engineering calculations remain exclusively in the canonical evaluator?
8. What evidence would be required before claiming the complete browser workflow PASS?
