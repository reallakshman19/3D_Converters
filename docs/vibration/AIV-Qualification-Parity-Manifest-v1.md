# AIV Qualification Parity Manifest v1

## Purpose

`AivQualificationParityManifest.v1` consolidates machine-reproducible AIV benchmark evidence into one deterministic review artifact.

It binds:

- the pinned EI T2.7 main-guidance source;
- the pinned worked-example DOCX;
- the corroborating worked-example PDF;
- the controlled DOCX→Markdown transcription;
- the D.2.3 qualification solve;
- the independent sonic and simultaneous-source qualification solve.

Implementation:

```text
scripts/build-aiv-qualification-parity-manifest.mjs
```

The manifest is machine evidence only. It is not an engineering signoff and cannot close any named `HUMAN_ENGINEER` gate.

## Source identities

```text
EI main guidance
  Common @ aef163a5def3bfe04ca0ba860da05728a27daf42
  blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5

Worked-example DOCX
  Common @ fb549185b9b27edc2379734240320a85c5bef9f6
  blob ceee15ed5f7f320045d5f3979024e2e8664613f2

Worked-example PDF
  Common @ fb549185b9b27edc2379734240320a85c5bef9f6
  blob 1ddef94f81bd30570d1b1f86b1d3e2acdcc17dec

Controlled Markdown
  3D_Converters @ 8f243592d73ccf4790d9e308a311003ce7d8f5bb
  blob 9f22d92eba8bdf3b67adc25a4c77a7f7d7211da8
```

## Solve identity

The manifest computes canonical SHA-256 identities for the complete machine solve objects:

```text
D.2.3 solve
Independent sonic / simultaneous-source solve
```

Object keys are sorted recursively before hashing; array order is preserved. The hashes therefore bind the numerical values, evidence state, unresolved items and blocked-authority metadata carried by those solve objects.

## Explicit parity checks

The current manifest contains 16 checks:

```text
D23_RELIEF_RAW_SOURCE_PWL
D23_RECYCLE_RAW_SOURCE_PWL
MARKDOWN_RECYCLE_DISCHARGE_PWL
MARKDOWN_RECYCLE_SUCTION_PWL
MARKDOWN_RELIEF_LINE_PWL
D23_ATTENUATION
D23_POINT_PWL
D23_ERRATA_LOG10_N
D23_FLM2
D23_LOF_PUBLISHED_FLM1_CHAIN
D23_LOF_RECALCULATED_FLM1_CHAIN
SONIC_NONSONIC_REFERENCE_PWL
SONIC_SFF6_PWL
SONIC_SFF6_DELTA
MULTI_SOURCE_EQUAL
MULTI_SOURCE_ASYMMETRIC
```

Each check records:

```text
actual
expected
toleranceAbs
absoluteDifference
status = PASS | FAIL
```

The overall machine state is:

```text
MACHINE_PARITY_PASS
```

only when every check is inside its explicit tolerance.

## What a PASS means

`MACHINE_PARITY_PASS` means the isolated qualification arithmetic reproduces the controlled displayed/reference benchmark values represented by the manifest.

It does **not** mean:

- T2.7 transcription has been human reconciled;
- the FLM1 discrepancy has been dispositioned;
- the relief-line `LOF=1.48` aggregation/scope has been reproduced;
- sonic or simultaneous-source vectors have received named human acceptance;
- retained workbooks have been reconciled;
- an independent vibration engineer has recommended promotion;
- production, screening or design authority has changed.

Those unresolved items are carried in the manifest itself.

## Authority invariant

Every manifest retains:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
authorityTransitionApplied = false
```

## Isolation

The parity manifest builder remains under `scripts/` and is not imported by:

```text
converters/vibration/aiv/index.js
tabs/vibration-aiv-qualification-tab.js
tabs/vibration-aiv-qualification-view.js
```

This keeps machine qualification arithmetic separate from product numerical execution while the method is blocked.

## Reviewer workflow

Recommended human review package:

```text
1. Controlled source/reconciliation artifacts
2. aiv-qualification-parity-manifest.json
3. D.2.3 qualification solve output
4. independent-vector solve output
5. named reconciliation/review records
```

The machine manifest reduces arithmetic checking burden; it does not fill reviewer names, dates, dispositions, trace transcription hashes or engineering rationale.

## Command

```bash
npm run build:aiv-qualification-parity-manifest > aiv-qualification-parity-manifest.json
```

Focused regressions are included in:

```bash
npm run verify:aiv-input-model
```
