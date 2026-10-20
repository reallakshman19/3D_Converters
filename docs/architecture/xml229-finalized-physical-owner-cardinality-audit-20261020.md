# XML229 EF-05 native mass-owner cardinality: source audit (2026-10-20)

## Scope and authority

This is a **read-only source-geometry diagnostic** for `Benchmarks/EF-05-PRO.TEST.xml`, using the normal Preview removal of `GASK` nodes and explicit `ElementLengthMm <= 6` cleanup. It is NOT evidence of accepted mass, authorization of the native CII model, or an instruction to assign source weights to different components. The Worker continues to preserve all original node facts and original source ordinals.

An original XML **node occurrence** is not necessarily a distinct physical **component**. A consecutive `Endpoint=1` / `Endpoint=2` pair with the same component type and reference identifies two source witnesses of a candidate single physical part. The proper physical owner of a mass must be determined **before** the Weight Match decision. No accepted masses may be summed, duplicated, split, migrated, or otherwise reassigned by Run.

| Reviewed source type | XML physical node occurrences | Contiguous same-reference endpoint pairs | Distinct component *candidates* |
| --- | ---: | ---: | ---: |
| RIGID | 198 | 0 | 198 |
| FLAN | 138 | 12 | 126 |
| VALV | 59 | 25 | 34 |
| INST | 28 | 14 | 14 |
| **Total** | **423** | **51** | **372** |

A count of 372 is a **grouping hypothesis based on the existing source topology**, not an independently signed component identity census or an approval to rewrite current review decisions. Other source cases may require splits or different physical interpretations.

## Native encoding blockers

* The existing writer emits accepted discrete component mass through actual CII `ELEMENTS -> RIGID` pointers. The unmodified EF-05 source carries explicit `Rigid=2` on 198 physical occurrences only. The other **225** node occurrences (138 FLAN, 59 VALV and 28 INST) have no matching source-authorized rigid mass owner under the current converter rules. The existing rigid-to-same-reference-FLAN exception does not resolve these 225 occurrences in this fixture.
* 168 of the reviewed physical occurrences have nonpositive node numbers, primarily repeated `-1` placeholders. Such placeholders are not stable, unique connected-node identities and cannot be treated as one shared structural node. Their geometry-normalized node IDs must be established **before Weight Match**.
* Some successive original node positions coincide. Automatically creating a positive-length CII element to carry their mass, or moving the mass to a neighboring pipe edge, would change the mechanical model and is not authorized by weight acceptance.
* CAESAR II models real valves and flanges with appropriate rigid elements and uses the `RIGID` auxiliary entry for their weight, but that **does not authorize** inferring which element represents each reviewed EF-05 physical component without a validated component-to-element mapping. Manufacturer data and actual geometry remain authoritative.

## Implementation on PR #320

1. The verified Preview produces a source-bound, hashed cleaned-XML geometry snapshot and now includes a **pre-acceptance endpoint-pair cardinality manifest**. It does not automatically collapse, weight or reclassify either endpoint.
2. Native staging independently detects consecutive, same-type, same-reference `1 -> 2` physical endpoints and blocks `NATIVE_DOUBLE_ENDPOINT_MASS_OWNER` if both source occurrences have separately accepted masses, **including two accepted zeros**.
3. Regression tests check the public EF-05 423/51/372 population and the two-endpoint duplicate-owner refusal.
4. Existing strict one-to-one native CII mass and emitted-byte reconciliation remains mandatory for every supported owner.


## Implemented pre-acceptance correction on PR #320

The source-bound Worker now distinguishes **423 source XML node occurrences** from **372 canonical physical part weight owners**. The exact 51 consecutive matching 1->2 endpoint pairs retain both geometry nodes, but only the second endpoint is the GC-PW mass owner. The independent original-source census recomputes the same selection; no two masses are distributed or combined after acceptance. Historical 423-row reviews are **not** proof of an accepted 372-component Final population; any affected weight decisions need the new verified review basis.

All retained nonpositive `NodeNumber` placeholders get deterministic globally unique positive IDs **before** the Worker opens Weight Match. The Worker packet includes the exact original source ordinals, before/after node IDs, and finalized XML SHA. The Python stage re-derives every assigned ID from the untouched original source and refuses unauthorized renumbering or invented edges. This is a node **identifier** normalization, not a change to coordinates, materials or pipe lengths.

For a same-reference **valve or flange** with two adjacent endpoints, a finite existing 1->2 segment longer than 6 mm, and no original rigid classification on endpoint 2, the Worker records an explicit pre-Final `Rigid=2` classification on that existing element. Python separately verifies the exact source endpoints, distance, component type/reference, and serialized geometry. The native CII then uses that element's own `RIGID` auxiliary slot to consume the accepted component mass. This follows Hexagon's CAESAR II guidance that valves and flanges can be modeled as rigid elements with weights associated with their from/to node segment: https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/1428346 and https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/15/927201.

On the EF-05 candidate topology, **25 paired valves and 12 paired flanges** qualify for this existing-edge classification. Combined with the 198 source-rigid nodes, that is at most **235 candidates with a supported native RIGID mass owner** once each has an actually accepted Final mass. **137 candidate physical components remain unresolved**: 114 single-ended flanges, 9 single-ended valves, and 14 paired instruments. The source does not independently establish a safe isolated rigid segment for the single-ended parts; instrument stiffness and mass-element classification are not inferred. They remain fail-closed pending source-authoritative pre-weight geometry or a separately verified engineering rule. No production 372-part governed CII download is authorized by this audit alone.

## Next required engineering work

Establish the **finalized physical-component identity and actual CII element topology before Weight Match**: decide which paired endpoints witness one part, ensure unique positive engine node IDs and valid connecting element geometry, and explicitly validate CAESAR II rigid classification for each valve/flange/instrument. Carry a verifiable source-to-finalized-part manifest into the Worker basis. Then open or rebuild the Weight Match review against **those final component owners**. Previously accepted per-node masses may only be adopted into a new basis with independently demonstrated identical physical ownership and explicit approved review policy; never silently transfer them.

Do not lift the governed output HOLD or call the 423-physical source reviewed merely because a synthetic 423-mass capacity test passes. The actual Owner source has unresolved weights and unresolved geometry ownership.
