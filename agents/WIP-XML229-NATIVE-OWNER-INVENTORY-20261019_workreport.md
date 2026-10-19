# WIP-XML229-NATIVE-OWNER-INVENTORY-20261019

## Mission
Owner requested continuation after successful public EF05/BC4 80% Apply acceptance. This work **does not duplicate or reopen** draft Weight Match PR #310. Create independent engineering read-only native mass-owner inventory: public controlled RIGID, VALV, INST, FLAN; explicit R2 original-physical→engine-XML custody and G5 native output pointer parsing; discover missing engineering ownership rules without auto-classifying or releasing native CII.

## Baseline / conflicts
Base exact current main 9785067f75e1a8898c744f64a831fe2d2ab8f0b0. PR #310 head e51c699507718d9cb5e215b5db43ed3f42bf2e9d remains draft, mergeable, unmerged. All outdated #272, #273, #308 remain excluded. New scoped branch investigate/xml229-native-mass-owner-inventory-20261019; no preexisting runtime source files edited. Existing G5 test backed up under .backups/20261019-xml229-native-inventory.

## Inspection
- `xml229-r2-physical-transfer-manifest.mjs` reads independently accepted Final masses and checks exactly matching enriched engine XML; explicitly `nativeCiiPhysicalSlotVerified=false`.
- `xml_to_cii2019.py` classifies native RIGID edges only when to-node `Rigid=2` or narrow same-ref RIGID→FLAN. Python writes node-owned rigid kg times one scale. Native CII ELEMENTS pointers are 1-based; G5 parser checks duplicates and orphaned rigid records.
- Controlled original-Blob Worker test on PR #310 used 3 synthetic Final approvals and 3 verified engine XML masses, but emitted 1 positive CII RIGID record. Counts alone cannot adjudicate whether VALV/INST are intended CII rigid owners.
- Production mass acceptance requires independent complete original occurrence index, Final decision authorship, native class ownership semantics, split child allocations, exact CII mass+unit and pointer lineage, then explicit Owner sign-off.

## Added nonreleasing inventory
`scripts/xml229-native-mass-owner-inventory.py` accepts **owner-local** R2 transfer JSON + byte-exact engine XML + byte-exact actual CII, verified SHA256s + explicit claimed weight_scale. Strict unique original occurrence, engine branch/node ordinal and type/ref/weight, native CII pointer uniqueness, finite mass and force unit check; exposes private aggregate counts by physical type and native CII total without treating numeric equality as proof of source identity.

`tests/xml229-g5-native-element-lineage.test.py` extends existing held-out G5 suite with a real Python native CLI test containing positive RIGID/VALV/INST/FLAN, 1 valid native RIGID and three unresolved class-specific ownership decisions. Rejection controls: spoofed release, incomplete population, duplicate source/engine, SHA drift, mass drift, invalid weight scale, force-unit drift, orphaned CII RIGID. The inventory never emits source identities or original rows in its report and prints no row content on CLI stdout.

## Authority / controls
The PR is ENGINEERING_CRITICAL evidence only. **No** Python runtime writer change, GC-PW Final writer or approval UI, original JSON/source/master edits, output/run gate, native release approval, historical 125 Match-1 decisions, CI workflow or website/served module changed. No merge is included. All external authenticated claims remain private and require independent engineering acceptance.

## Validation ledger
Source contract/data-type inspection completed. Held-out G5 GitHub Actions PASS, latest changed-test head 302341b288d4ad26cc0dc705ab7534d740762376, job 117847456397: 12 independent mass oracle tests + 12 G5/native-inventory tests PASS. Native actual Python CLI and owner-local report refusal/identifier confidentiality exercised. Other broad CI checks must not be assumed green; independent Appendix A scoring remains NOT_OBSERVED. No private Owner fixture loaded. Formal independent Appendix A score NOT_OBSERVED; v3.6 bound writer plan NOT_PRESENT, so this remains an unmerged evidence-only draft.

## EXACT_NEXT_ACTION
Run the held-out G5 Python negative/control suite in CI from the exact PR head; correct any test/runtime errors without expanding the writer surface. Produce a local Owner/private native inventory for a separately reviewed Final basis and actual CII bytes, then have engineering explicitly specify class-specific VALV/INST/FLAN ownership and 1-to-many allocation before implementing a governed native release path. Do not release based on inventory summaries.
