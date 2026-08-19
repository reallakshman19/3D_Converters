# KD320 Q2 Controlled Evidence + Oracle Admission

This folder defines a **qualification-only intake contract** for the evidence required before any isolated native KD320 kernel may be authored.

It does not contain KD320 equations, Code text, fatigue-curve points, production calculation code, or authority-promotion logic.

## Candidate command

```bash
node scripts/verify-b313-ch9-kd320-q2-candidate.mjs <candidate.json>
```

Add `--require-ready` when the command should exit non-zero unless the candidate has reached:

```text
Q2_ORACLE_ADMISSION_READY
```

## Required sequence

The evaluator derives the sequence; it never trusts a caller-supplied readiness flag.

```text
controlled B31.3 + VIII-3 receipts
  -> all 14 Q1 semantic items independently checked
  -> Q1 complete
  -> independently checked project calculation (KD3-QF-023)
  -> primary published numerical example (KD3-QF-022)
  -> Q2_ORACLE_ADMISSION_READY
  -> Q3 isolated native-kernel implementation candidate
```

A project calculation by itself is useful evidence but does not satisfy the independent published-primary requirement.

## Numerical custody retained by each oracle

Each numerical oracle must retain the complete numerical chain:

```text
Salt
  -> associated mean-stress quantity
  -> correction parameters
  -> Seq
  -> N
```

Q1 still requires all `KD320-SEM-001...014`. Q2 oracle custody is narrower and method-specific: both QF022 and QF023 must explicitly cite every `KD320-SEM-002...013` semantic item. This keeps the numerical oracle tied to stress selection, mean-stress treatment, correction parameters, fatigue-curve selection/evaluation, material/temperature selection, applicability, and fail-closed limits.

The admission evaluator also exposes the required stage-to-semantic custody map:

```text
Salt                         -> KD320-SEM-003
associated mean stress       -> KD320-SEM-004
correction parameters        -> KD320-SEM-006
Seq                          -> KD320-SEM-007
fatigue-curve selection      -> KD320-SEM-008
fatigue-curve evaluation     -> KD320-SEM-009
N                            -> KD320-SEM-010
material / temperature       -> KD320-SEM-011
applicability envelope       -> KD320-SEM-012
fail-closed limits           -> KD320-SEM-013
```

`KD320-SEM-002` is additionally required because the numerical chain depends on the controlled governing stress-state/component selection.

Source-receipt custody is explicit:

- QF023 must reference both `Q1-SRC-B313-2024` and `Q1-SRC-VIII3-2025`;
- QF022 must reference `Q1-SRC-VIII3-2025` after direct 2025 sourcing or controlled edition reconciliation.

This is evidence custody only. The intake does not recompute Seq or N and does not encode Code equations or fatigue-curve data.

## Licensed-source boundary

Do not commit licensed ASME source text to this public repository.

Candidate files may remain outside the repository and reference secure controlled storage through:

- canonical document SHA-256;
- exact source locators;
- opaque controlled semantic references;
- extractor/verifier identity and timestamp;
- distinct independent-checker identity and timestamp.

The repository template contains placeholders only.

## Authority

Even a fully admitted candidate returns:

```text
nativeCoreKd3Qualified = false
codeCompliance = false
canUseForDesignAuthority = false
productionKernelAllowed = false
automaticPromotionAllowed = false
```

`Q2_ORACLE_ADMISSION_READY` authorizes only the next **qualification implementation stage**. It does not authorize production or design use.
