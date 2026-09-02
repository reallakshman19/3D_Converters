# Bolted-joint / flange source archive

Status: `SOURCE_INVENTORY_LOCKED / ORIGINAL_BINARY_COPY_PENDING`

Tracking issue: #721

This directory is the controlled repository destination for the owner-supplied bolted-joint and flange reference package used during the `ENGCALC-BOLTED-JOINTS` programme.

The files in this package are **source evidence / migration material**. Archive presence does not establish Code compliance, design authority, governing eligibility, or master-data authority.

## Required original files

| File | Bytes | SHA-256 | Current role |
|---|---:|---|---|
| `Nozzle Flange MAWP Results-C101.pdf` | 501891 | `cabb4bb4b89f01574ff41f966a8523fc97d5f47e92c85f20d06d7100ee24a4ce` | `CROSS_SOLVER_BENCHMARK` — PV Elite C101 UG-44(b) benchmark; not Code authority. |
| `bolt Paper-65.pdf` | 937771 | `068224341eb05745d9907c0bf790d2ce49c8a6d0f85ac2ba9cafa2deb33e9a3e` | `SECONDARY_METHOD_EVIDENCE` — assembly method, preload scatter, elastic interaction and torsion context. |
| `Bolt Torque Calc.xls` | 22016 | `efba9f80138500464b38b773a53d6f524803513ca9453528c8e95d818493370f` | `LEGACY_CALCULATION` — detailed thread/bearing friction and bolt-stress migration reference. |
| `Bolt Torques.xls` | 28160 | `ac216a681f070d4795ebf9074efddc0fb5372dbc5d177a01b92d134c3ee459bf` | `LEGACY_CALCULATION` — short-form nut-factor/preload/torque reference. |
| `3427571_A Standard pipe supports Bolted.xls` | 5665280 | `122ec0f5ed53fc38cac2b103bf77839b4b90b9d54a555ebd457c45de20759a41` | `LEGACY_CALCULATION` — structural support/clamp/bolt load and torque reference. |
| `flange design to BS5500.xls` | 34816 | `1ffa1bbe061eca072834639177537c06c48b0f7e1e52033f39f3d2d45bc849a4` | `LEGACY_CALCULATION` — detailed flange-strength migration source; historical code basis. |
| `Integral-type Flange Rigidity Calc - ASME VIII Div 2 App M - UNCHECKED.xls` | 99328 | `b51c26baa76574cc0eda0cac1036978ca5cc9f4af505ffcfe0a51edac4123607` | `UNQUALIFIED_UNCHECKED_LEGACY_CALCULATION` — flange-rigidity evidence only. |
| `Flange UG 44.xlsx` | 15600 | `f0c2f005539f23ce738418cdb0c89d4ad0036fd35c5b300750750c0c7372ba46` | `LEGACY_CALCULATION_DATA` — UG-44/rating scenarios; not authoritative flange master data. |
| `FLANGE LEAKAGE CHECK GRE.xls` | 437760 | `44dd5e17daac62274f75bced45532b8c3344e293630c8a99226b996ca496d49f` | `LEGACY_CALCULATION` — GRE equivalent-pressure leakage screening reference; not physical leak-rate authority. |
| `Flange Rating Vs Nozzle loads -Rev.3.xlsx` | 1112985 | `d664bad746f39479a09ee9f126c39dd858822dfcb575f45d0a09152fa89e3b66` | `LEGACY_CALCULATION_DATA` — nozzle-load/rating scenarios; not authoritative rating master data. |

## Byte-custody rule

The final archive must contain the **original bytes without format conversion or workbook re-save**. After copying the source package into this directory, verify:

```bash
sha256sum -c SHA256SUMS.txt
```

A mismatched hash is a source-custody failure and must not be waived by visual similarity.

## Authority boundary

The archive is intentionally non-authorizing:

```text
codeCompliance       = false by archive presence
designAuthority      = false by archive presence
governingEligible    = false by archive presence
masterDataAuthority  = none by archive presence
```

Any value promoted from these files into governed master data or an executable method requires its own controlled source/revision, applicability, independent validation and review evidence.

## Engineering interpretation already established

- The PV Elite report is retained as cross-solver evidence for the UG-44(b)-form external-load check and Pmax behavior; it does not replace the governing ASME source.
- Torque/preload spreadsheets are migration references. Nut factor / friction values are condition-dependent inputs, not universal material constants.
- The tightening paper supports the importance of preload scatter, elastic interaction, gasket stress variation and torque-induced torsion; its study-specific values are not universal acceptance criteria.
- `Flange UG 44.xlsx` and `Flange Rating Vs Nozzle loads -Rev.3.xlsx` are scenario/regression evidence, not pressure-rating masters.
- The rigidity workbook is explicitly marked `UNCHECKED` and remains non-governing.
- The GRE workbook is an equivalent-pressure screening reference; no physical leak-rate claim is inferred.

See issue #721 for the complete pending engineering programme and release gates.
