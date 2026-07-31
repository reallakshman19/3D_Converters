# FBX2 small complete benchmark

## Scope

The benchmark compares the governed archives:

- source FBX archive: `Benchmarks/FBX2/STF_2026Jul23-1554_binary.zip`
- managed StagedJSON reference: `Benchmarks/FBX2/ATTRIBUTE_GL_managed_stage.zip`

The selected FBX scope is `/GLRD-1000-CU-PI-P`. Exact archive and extracted-file SHA-256 identities are mandatory.

## Acceptance model

The primary target is **100% terminal-disposition coverage**. Every managed component and every selected FBX occurrence receives exactly one terminal disposition. Coverage and parity remain separate:

```text
coverage ratio = terminally disposed records / all in-scope records
parity ratio   = exact PASS records / all in-scope managed records
```

A complete benchmark may report parity below 100%. Candidate bindings, unresolved generated provenance and unsupported families are never promoted to parity passes. A source-export omission is explicit rather than treated as a parser miss.

## Identity and association scopes

Selected-zone geometry scope remains unchanged. The benchmark adds two evidence-only layers:

1. `FbxGlobalOccurrenceIndex.v1` preserves source occurrence ancestry, source object identity, assigned zone, geometry identity, source properties, exact tags, governed transforms, world bounds and centroids.
2. `FbxCrossZoneSupportAssociationEvidence.v1` searches eligible support hierarchies globally but does not import sibling geometry into the selected zone.

Cross-zone support association is fail-closed. A pass requires:

- the governed coordinate profile `FbxBenchmarkCoordinateProfile.v1`;
- one unique support candidate at the transformed managed position;
- exact tag corroboration when available;
- one unique managed PIPE host in the same branch;
- one-to-one source occurrence claiming.

`PS` and `SL` remain structural context. They are not restraint-subtype authority. `REST`, `GUIDE`, `STOP`, `WP`, `BP` and `SPR` identify generic support candidates only.

## Explicit terminal dispositions

The reconciliation ledger distinguishes:

```text
MATCHED_SOURCE_COMPONENT
MATCHED_CROSS_ZONE_SUPPORT
SOURCE_NOT_EXPORTED_AS_STANDALONE_GEOMETRY
NORMALIZED_SOURCE_TAXONOMY
AMBIGUOUS_MATCH
SOURCE_RECORD_NOT_FOUND
COORDINATE_PROFILE_MISMATCH
```

`FBLIND → FLAN` is accepted only when an exact source occurrence is bound and current inline-assembly geometry evidence is admitted. Missing standalone `GASK` geometry receives `SOURCE_NOT_EXPORTED_AS_STANDALONE_GEOMETRY` and does not become a generic unmatched-parser record.

## Authority boundaries

An exact parity pass requires an exact selected source-occurrence binding or a governed, unique cross-zone support association. Names are corroboration and candidate-discovery evidence, not independent binding authority. Generic proximity, defaulted identities and ambiguous claims are rejected.

The benchmark does not claim engineering-attribute parity, connectivity parity, restraint-subtype parity or SUPPORT publication to StagedJSON. Production selected-zone geometry behavior is unchanged.

## Execution

```bash
node scripts/fbx/run-fbx2-small-benchmark.mjs \
  --fbx .tmp/fbx2/input/<source>.fbx \
  --managed .tmp/fbx2/output/<managed>.json \
  --input-zip Benchmarks/FBX2/STF_2026Jul23-1554_binary.zip \
  --output-zip Benchmarks/FBX2/ATTRIBUTE_GL_managed_stage.zip \
  --zone /GLRD-1000-CU-PI-P \
  --output artifacts/fbx2-small-benchmark.json \
  --global-index-output artifacts/fbx2-global-occurrence-index.json \
  --support-association-output artifacts/fbx2-cross-zone-support-association.json
```

The runner performs two fresh parser, geometry, selected-zone analysis, family-evidence, global-index, cross-zone support-association, reconciliation and package-qualification runs. Deterministic identities must match across both runs.

The report schema remains `Fbx2SmallBenchmark.v1`. `COMPLETE_TARGET_MET` requires deterministic execution, 100% terminal coverage and 100% exact managed-component parity. `COMPLETE_TARGET_NOT_MET` remains a complete and valid result when coverage is 100% but exact parity is lower.
