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
Source contract/data-type inspection completed. Held-out G5 GitHub Actions PASS, latest changed-test head 302341b288d4ad26cc0dc705ab7534d740762376, job 117847456397: 12 independent mass oracle tests + 12 G5/native-inventory tests PASS. Native actual Python CLI and owner-local report refusal/identifier confidentiality exercised. Latest PR CI check head 2735de81b55a92ab1c98378e53e37836cdc1192f: 39/39 checks completed, 37 PASS, 2 FAIL (`c05-5-4-final`, `c05-1-baseline`). These C05 workflow jobs enforce their own restricted diff baseline and rejected *all* of this PR's evidence-only script/test/docs/claim paths as out of scope. This is a scoped-workflow mismatch, not a failure of the held-out native mass oracle; do NOT change their guards merely to turn green. G5 itself PASS. Independent Appendix A scoring remains NOT_OBSERVED. No private Owner fixture loaded. Formal independent Appendix A score NOT_OBSERVED; v3.6 bound writer plan NOT_PRESENT, so this remains an unmerged evidence-only draft.

## 2026-10-19 next-stage verification

New fail-closed private diagnostic `--deny-unresolved-mass` distinguishes positive
original physicals without explicit native `Rigid=2` ownership hints.
No native slot, engineering weight, status or author is created. The ordinary
inventory records per-type unresolved kg and aggregate-versus-CII difference.
`aggregateBalanceIsNotLineageProof=true` is an invariant, even if one forged
RIGID slot numerically equals every original source kg.

Held-out exact G5 code-head `af1bdb8bc6a5f7c65f96311183cc5922f31575ce`
GitHub Actions job `117853850138`: PASS; 12 independent I03 mass
oracle tests plus 14 G5/inventory tests, including corrupt source hashes,
stale/bad synthetic R2, forged aggregate equality, CLI strict rejection before
private output, source-unit drift and orphan pointers. A prior job failed only
two decimal string-format assertions; numerical tests were corrected and rerun.
No production native converter logic changed. Remaining unrelated C05
restricted-diff jobs must not be waved or characterized as this tool's failure.
Independent Appendix A and v3.6 work-specific bound approval are NOT_OBSERVED.
All release flags remain false.

## 2026-10-19 source-exact native RIGID→FLAN reconciliation

The earlier strict option's “no Rigid=2 marker” heuristic was overly broad:
the actual native `_edge_is_rigid` predicate also accepts an arrival FLAN
immediately after a `Rigid=2` node with the **same nonblank normalized
ComponentRefNo**. `_rigid_weight_for_edge` uses the arrival FLAN's kg,
never borrows mass from the upstream RIGID. Branch-first `Rigid=2` does
not create an incoming edge by itself. All of these are only pre-conversion
hints: native cleanup/splits and per-original independent output lineage
are still unproved.

Updated nonreleasing inventory now separates direct-Rigid2 source kg,
same-reference RIGID→FLAN candidate kg, remaining positive source kg
without a known native edge predicate, and output native rigid kg-equivalent.
Its strict refusal now checks **both** native predicates; it does not
promote passing predicate checks into an approval.

Positive actual Python CLI synthetic fixture:
same-ref RIGID(35kg)→FLAN(70kg) emits **two** native CII RIGID slots
[350, 700] and output ELEMENTS pointers at arrival native nodes 20
(slot 1) and 30 (slot 2). Combined 105kg recognized preconversion,
with VALV(45kg)+INST(50kg) still needing an ownership decision (95kg).
The identical adjacent FLAN with **different component reference**
does not create the second native RIGID and remains in 165kg unknown
population. First-node Rigid2 marker alone cannot create a phantom
incoming CII element.

Independent G5 exact code-head
`c9176e7b9cccfb6de80d4dec1725238ed2f28921`, GitHub Actions
job `117879271710`: **12 I03 and 17 G5/inventory PASS**.
These are controlled synthetic node signatures, not Owner's private
423 physical mass records. Source-to-Final-to-output release flags remain
false. No Python native runtime writer, historical accepted masses,
UI approval controls or release gate changed. Historical C05
restricted-scope CI failures remain separate.

## EXACT_NEXT_ACTION
Review the passing source-exact synthetic native per-slot witness, classify VALV/INST/unmatched FLAN and any split-child native mass ownership with an independently approved engineering rule, then build a separate governed candidate exercising exact Owner-private original Final→engine→emitted native CII per-occurrence mass/units lineage. Run private local inventory without uploading source rows. Obtain formal independent Appendix A and v3.6 binding before merge/release; keep Native CII HOLD until Owner independently signs off.
