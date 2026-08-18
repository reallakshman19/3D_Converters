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

Each numerical oracle must retain the chain:

```text
Salt
  -> associated mean-stress quantity
  -> correction parameters
  -> Seq
  -> N
```

This is evidence custody only. The intake does not recompute Seq or N.

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
