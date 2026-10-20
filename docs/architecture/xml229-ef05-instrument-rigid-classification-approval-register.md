# EF-05 instrument element classification — engineering approval register

**Status: unresolved; no CII release approval.** The original 41-branch `Benchmarks/EF-05-PRO.TEST.xml` contains exactly **14** same-reference `INST` Endpoint 1→2 component pairs. They have a 305 mm source-coordinate span, `Weight=0` (not an explicitly accepted zero), and no source `Rigid=2` classification. The 14 records below are source evidence, **not** an instruction to classify them as rigid.

| Zero-based branch ordinal | Original source node ordinals | Original component reference | Span (mm) | Source Rigid on end | Engineering decision |
| --- | --- | --- | ---: | --- | --- |
| 2 | 105→106 | `=1006649732/121176` | 305.0 | unset | **Not approved** |
| 3 | 105→106 | `=1006649732/120435` | 305.0 | unset | **Not approved** |
| 4 | 107→108 | `=1006649732/120614` | 305.0 | unset | **Not approved** |
| 5 | 106→107 | `=1006649732/120524` | 305.0 | unset | **Not approved** |
| 7 | 1→2 | `=1006649732/121317` | 305.0 | unset | **Not approved** |
| 8 | 1→2 | `=1006649732/121207` | 305.0 | unset | **Not approved** |
| 9 | 1→2 | `=1006649732/121218` | 305.0 | unset | **Not approved** |
| 10 | 1→2 | `=1006649732/121229` | 305.0 | unset | **Not approved** |
| 15 | 1→2 | `=1006649732/121290` | 305.0 | unset | **Not approved** |
| 16 | 1→2 | `=1006649732/121249` | 305.0 | unset | **Not approved** |
| 17 | 1→2 | `=1006649732/121260` | 305.0 | unset | **Not approved** |
| 21 | 78→79 | `=1006649732/121078` | 305.0 | unset | **Not approved** |
| 23 | 104→105 | `=1006649732/120770` | 305.0 | unset | **Not approved** |
| 25 | 105→106 | `=1006649732/120860` | 305.0 | unset | **Not approved** |

## Required engineering decision for each row

An authorized engineer must determine whether the specific instrument is mechanically modeled as (a) a rigid element, (b) a flexible pipe/component element with separately supported concentrated mass, or (c) a configuration needing revised geometry or data. This determination must be supported by manufacturer specification, piping stress modeling basis, or another traceable source. The original `INST` label, 305 mm span, `WallThickness=0`, and a blank `Rigid` field are **not** sufficient approval.

For an approved **rigid** choice, supply an updated **original source XML revision** with the source-specific instrument `Endpoint=2` bearing explicit `Rigid=2`, preserve its exact component reference and topology, and establish a **new source/geometry SHA and GC-PW Weight Match basis** before accepting any weights. The converter's existing source-bound rigid owner path will consume that original classification, with exact source-occurrence lineage and independent emitted-CII mass reconciliation. The paired Endpoint=1 remains geometry evidence, never another mass owner.

For a **nonrigid** choice, keep governed output HOLD until there is an independently validated CII-native mass mechanism with exact physical ownership; do not silently add a rigid marker or transfer mass to a neighboring pipe. If the evidence is missing, remain **Not approved**.

## Important boundaries

- No engineering approval, instrument stiffness, or accepted mass was supplied in this change. The source `Weight=0` is not proof that 0 kg was intentionally accepted.
- The existing source-bound 249-candidate-part review cannot be released until *every* part's actual Final kg is accepted and *every* emitted CII mass reconciles. Historical 423-/372-row backups must not be restored into this changed physical owner basis.
- This register is a read-only aid for an engineering decision, not an additional Run-stage UI or authorization. Native Run must not generate geometry or reclassify these instruments after Final.
