# CAESAR CII Ver14 → Ver11 Import RCA

## Status

Engineering repair branch: `agent/fix-cii-v14-v11-import-rca`

Baseline: `main` at `1cb28819e3dbb9ea204ad432f32b8bffffdfc6bb`.

The reported symptoms were:

1. generated Ver11 CII triggers a CAESAR irrecoverable import error;
2. Ver14 → Ver11 conversion reports many SIF&TEES loss events and the resulting tee/SIF data appears lost.

The symptoms were investigated independently and two concrete record-layout defects were found.

## RCA-1 — SIF&TEES record was flattened across two independent tee slots

The previous adapter used:

```text
Ver11 record = 10 rows
Ver14 record = 14 rows
Ver14 → Ver11 = keep record[0:10]
Ver11 → Ver14 = append four zero rows
```

That is structurally wrong.

CAESAR's neutral-file contract stores **two tee slots per SIF&TEES auxiliary**:

```text
Ver11: tee #1 = 5 rows / 30 values
       tee #2 = 5 rows / 30 values
       total   = 10 rows

Ver14: tee #1 = 7 rows / 42 values
       tee #2 = 7 rows / 42 values
       total   = 14 rows
```

Therefore the correct Ver14 → Ver11 projection is:

```text
rows 1-5  of tee #1
+
rows 1-5  of tee #2

physical row indexes: [0:5] + [7:12]
```

The old `record[:10]` projection retained all seven rows of tee #1 and only the first three rows of tee #2. That displaced Ver14-only tee #1 extension values into the legacy tee #2 slot.

The reverse conversion was also wrong: the four extension rows must be inserted as two rows after each five-row legacy tee slot, not appended after the complete ten-row record.

### Repair

`cii_v11_v14_records._convert_sif_tees()` now treats each tee slot independently:

```text
14 → 11: tee1[0:5] + tee2[0:5]
11 → 14: tee1[0:5] + zero-extension(2) + tee2[0:5] + zero-extension(2)
```

Ver14 items 31-42 are the extension region for each tee slot. Non-zero values remain an explicit lossy downgrade because Ver11 has no corresponding storage. The loss event now states that legacy items 1-30 for **both** tee slots were preserved.

## RCA-2 — ALLOWBLS row-count delta was not converted

The previous adapter had no ALLOWBLS-specific conversion and sent the section through generic numeric reformatting.

The neutral-file record sizes differ:

```text
Ver11: 153 values = 26 rows
Ver14: 168 values = 28 rows
```

A non-zero Ver14 allowable block could therefore remain 28 rows after the file was labelled Ver11. CONTROL still counts allowable **records**, so the target reader sees a record-envelope mismatch.

### Repair

`_convert_allowables()` now performs an explicit 168 ↔ 153 value projection:

```text
14 → 11: preserve items 1-153; remove items 154-168
11 → 14: preserve items 1-153; append zero items 154-168
```

Non-zero items 154-168 require the explicit lossy option and are listed in the audit.

## RCA-3 — generated target was not independently validated

The previous converter validated section order before conversion but did not independently validate the generated target before returning it to the browser.

The repair adds `cii_v11_v14_validate.py`:

- source v14 is checked against CONTROL-driven record counts with explicit Ver14 deltas;
- generated v11 is checked using the established `cii2019_section_rules.py` authority;
- generated output is blocked before download if target section counts/order/MISCEL_1/UNITS do not satisfy the target profile.

This is deliberately independent of the converter's own row-transform functions so a transform cannot self-certify its own malformed result.

## Browser custody

The worker now loads the independent target validator and `cii2019_section_rules.py`.

The worker URL and the full Model Converters parent cache chain are advanced so deployed browsers cannot legally retain the pre-RCA SIF mapper.

## Qualification tests

`test_cii_v11_v14.py` now includes regressions for:

1. paired benchmark conversion;
2. generated Ver11 independent structure validation;
3. exact SIF downgrade row identity `[1..5, 8..12]`;
4. exact SIF upgrade extension placement at rows 6-7 and 13-14;
5. non-zero Ver14 SIF extension fail-closed behavior;
6. ALLOWBLS 168 → 153 value preservation;
7. ALLOWBLS non-zero extension loss gate;
8. ALLOWBLS 153 → 168 extension placement;
9. malformed source Ver14 SIF record rejection;
10. existing reducer extension and restraint sentinel checks.

The UI static test also proves the repaired worker and validator scripts are present in the live cache chain.

## Qualification boundary

Repository-level fixed-record qualification and benchmark regression can establish that the generated neutral file has the expected target structure.

The final external acceptance gate remains:

```text
Ver14 source
  → repaired converter
  → generated Ver11
  → actual CAESAR Ver11 import
  → save/export from CAESAR
  → semantic/record comparison
```

That CAESAR runtime round-trip is `NOT_RUN` in the repository environment and must not be represented as passed until performed with the installed CAESAR application.

## References used for the record-layout RCA

- Hexagon CAESAR II Users Guide, Version 14 — Auxiliary Element Data (`SIF&TEES`, `ALLOWBLS`, `REDUCERS`).
- Hexagon CAESAR II Users Guide, Version 12 — Auxiliary Element Data (legacy 10-row SIF&TEES and 26-row ALLOWBLS profile).
- Repository paired benchmark: `Benchmarks/v11-v14.zip`.
- Repository target validator: `converters/scripts/cii2019_section_rules.py`.
