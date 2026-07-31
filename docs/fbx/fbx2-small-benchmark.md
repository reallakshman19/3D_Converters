# FBX2 small complete benchmark

## Scope

The benchmark compares the governed archives:

- `Benchmarks/FBX2/STF_2026Jul23-1554_binary.zip`
- `Benchmarks/FBX2/ATTRIBUTE_GL_managed_stage.zip`

The selected FBX scope is `/GLRD-1000-CU-PI-P`. The benchmark uses the exact archive and extracted-file SHA-256 identities already governed by the repository.

## Acceptance model

The primary target is **100% terminal-disposition coverage**. Every managed component and every selected FBX occurrence must receive exactly one terminal disposition. Managed component dispositions are `PASS`, `BLOCKED`, or `UNRESOLVED`; selected FBX occurrence dispositions are `PASS` or `BLOCKED`.

Coverage and parity are deliberately separate:

```text
coverage ratio = terminally disposed records / all in-scope records
parity ratio   = exact PASS records / all in-scope managed records
```

A benchmark with 100% coverage can legitimately report parity below 100%. Candidate bindings, missing exact identities, unsupported families, and unresolved generated provenance remain `UNRESOLVED`; they are never promoted to parity passes.

## Authority boundaries

An exact parity pass requires an exact selected source-occurrence binding and current production evidence for the managed family. Source-model and geometry candidates are review evidence only. Names and proximity are not binding authority.

This small benchmark evaluates component and geometry parity for current PIPE, fitting, support-candidate, and support-host evidence. It does not claim engineering-attribute parity, connectivity parity, restraint-subtype parity, or SUPPORT publication to StagedJSON. The current selected-zone package qualification is included as an independent result and may remain blocked where approved mapped engineering inputs are unavailable.

## Execution

The runner performs two fresh parser, geometry, selected-zone analysis, family-evidence, support, reconciliation, and package-qualification runs. Sixteen artifact and inventory identities must match exactly.

```bash
node scripts/fbx/run-fbx2-small-benchmark.mjs \
  --fbx .tmp/fbx2/input/<source>.fbx \
  --managed .tmp/fbx2/output/<managed>.json \
  --input-zip Benchmarks/FBX2/STF_2026Jul23-1554_binary.zip \
  --output-zip Benchmarks/FBX2/ATTRIBUTE_GL_managed_stage.zip \
  --zone /GLRD-1000-CU-PI-P \
  --output artifacts/fbx2-small-benchmark.json
```

The output schema is `Fbx2SmallBenchmark.v1`. A target status of `COMPLETE_TARGET_MET` requires deterministic execution, 100% terminal coverage, and 100% exact managed-component parity. `COMPLETE_TARGET_NOT_MET` is a complete and valid benchmark result when coverage is 100% but exact parity is lower.
