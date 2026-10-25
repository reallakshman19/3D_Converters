# Native CII 2019 short-element simplification — engineering draft

## Python deployment-surface parity (non-release)

For the Python docs-served converter, the following files are required **together**, not just the wrapper: `docs/converters/scripts/xml_to_cii2019_patched.py`, `cii2019_short_simplify.py`, `xml_to_cii2019.py`, `cii_syntax_check_2019.py`, and `cii2019_section_rules.py`. These five files must be byte-identical to their `converters/scripts/` counterparts. Copying the opt-in wrapper without the simplifier would produce a broken served-path option even though the wrapper mirrors correctly.

The opt-in is a Python CLI feature only, default OFF on **both** paths; it is not a browser GUI control or a deployed engineering release authorization. The dedicated nonrelease CI must execute both `python converters/scripts/xml_to_cii2019_patched.py` and `python docs/converters/scripts/xml_to_cii2019_patched.py` against synthetic real-writer XML, proving default-OFF baseline equality, one true emitted 6 mm merge, one genuine noncollinear HOLD with no published candidate, and that neither source XML is changed. The native Final-mass workflow must also verify its preexisting exact served/source mirror invariant and run the complete native mass regression steps. These are *packaging and scoped geometry tests*, not independently accepted CAESAR II engineering equivalence.


This prototype operates on the **emitted CII ELEMENTS graph**, not original XML node spacing. It is deliberately **opt-in**, default OFF, and is **not** authorization for CAESAR II engineering release. It does not change PR #334's display-only AutoFilter or Hide ≤6 mm behavior.

## First one-command reproduction

```bash
python converters/scripts/cii2019_short_simplify.py --mode simplify --input model.cii --output model.candidate.cii --report short-element-simplification-report.json
```

For source provenance, add `--source-xml path/to/verified-original.xml`. Never edit that original; the tool only reads the input CII and optional source XML. The JSON and sibling TXT contain before/after element counts, candidate IDs, CII length/unit provenance, protection reasons, source/CII hashes, old→new node/element mapping, topology, auxiliary-reference, property and mass scopes, pre/post parser results and explicit HOLD/FAIL states. On any **HOLD or FAIL** (exit code 2), the standalone command removes an existing output candidate and does not publish a new one. This includes an overlapping short chain where a partial merger was otherwise geometrically valid. JSON/TXT audit reports survive; `output_cii_sha256` and `output_elements` are null. A possible partial transformation is recorded only as an **unpublished proposal** (`proposed_elements`, `proposed_output_cii_sha256`, `proposed_element_mapping`, `topology.proposed`); its candidate dispositions are blocked, not claimed as physical deletions. PASS_SCOPED output uses a staged file and atomic rename. A PASS_SCOPED prototype is not a Final-mass or CAESAR II release approval.

```bash
python converters/scripts/cii2019_short_simplify.py --mode audit --input model.cii --output model.unchanged.cii
python converters/scripts/cii2019_short_simplify.py --mode validate --input model.cii --output model.candidate.cii
python -m unittest discover -s tests -p test_cii2019_short_simplify.py -v
```

Validation mode regenerates the expected candidate from the original and requires an exact-byte, exact-hash match. A purportedly matching syntax pass is **not** independent solver verification.

The wrapper's CLI opt-in is:

```bash
python converters/scripts/xml_to_cii2019_patched.py --input original.xml --output native.cii --simplify-eligible-short-cii --short-element-report short-element-simplification-report.json
```

Without `--simplify-eligible-short-cii`, the pre-existing writing path remains unchanged. When enabled, the wrapper stages the original native CII in a temporary directory, calls this same tested simplifier, and withholds the requested output on nonzero/HOLD/FAIL. A supplied `--xml229-native-final-packet` forces all short links to be protected pending approved original-owner mapping; no accepted Final mass is coerced to zero.

## Strictly limited safe transformation

The prototype merges one nonzero, ≤6 mm, unnamed and unowned straight-run element into a collinear, compatible neighboring element only if:
- CII UNITS confirms the native SI(mm) numerical and text basis;
- both elements have zero engineering pointers, no attached names or node references, and identical non-geometry ELEMENTS rows, material array entries and line label;
- no potentially owning auxiliary section has any payload anywhere in the file;
- there is no branch/junction at either endpoint, absolute COORDS anchor to the candidate, self-loop, duplicate endpoint ambiguity, inconsistent node geometry, coordinate displacement or total length change;
- original and rewritten CII pass the repository's CII 2019 syntax and section validators; graph components, retained terminals and node coordinates, non-target section bytes, MISCEL material ownership and element fields remain consistent.

This is intentionally **more conservative** than arbitrary edge contraction. Geometry with a zero-length link, unknown length units, a chain requiring overlapping transformations, unverified auxiliary ownership or unsupported indexed data is unresolved/protected and not silently deleted. Candidate IDs are 1-based *emitted CII* element indices; source XML branch identity is only as precise as the native emitted line label.

The parser currently restricts MISCEL_1 to the writer's known no-hanger/no-nozzle layout, and conservatively protects **all** candidates when any known owning auxiliary section is populated, even if that owner is on another branch. This restriction may produce valid no-ops and must not be weakened without independently checking every reverse reference.

## Evidence and gaps

- The repository's `converters/scripts/inputxml_profile_bm_cii_2019.cii` has 40 emitted rows and zero parsed Δxyz spans ≤6 mm (minimum ~23.5996 mm); `converters/scripts/output.cii` has 65 and zero (minimum ~101.5923 mm). These are GitHub-source inspections, **not executions of the simplifier**.
- EF-05-PRO.TEST.xml is not committed in the accessible tested paths. The canonical 2573883480af904096dea2663c9cf585be2db28dd047785397b4d61edee0a030 SHA-256, its generated CII SHA-256 and current emitted-element count are **NOT_RUN**. Do not substitute an arbitrary example or treat historical XML-short-span counts as CII element counts.
- CAESAR II importer/solver, native final-mass release attestation, end-to-end GUI output switching, and independently sourced original-to-native lineage equivalence remain **HOLD / NOT_RUN** until they have separate witnesses. No engineering Final release may be inferred from this prototype.

The noncollinearity negative test uses two nonzero vectors (3 mm in X, then 4 mm in Y). The surviving-error challenge rejects an incorrect straight-run contraction; the existing overlapping-chain and stale-artifact tests reject accidental publication under HOLD. At pre-packaging head `90a1d6865f70cd8a70093c38940e87eb9ce4bd19`, builder executed audit and simplify on two SHA-256-verified historical EF-05 XML-only CII files: direct 600 and browser 599 elements, zero emitted ≤6 mm candidates, both outputs byte-identical across four runs. Oracle accepted the builder-reported PASS_SCOPED no-op execution, explicitly not a second independent execution or an engineering release approval. The original CII/XML files remain private and are **not committed to the repository**. The actual governed Final-mass and solver equivalence gates remain HOLD.

A separate independent reviewer should challenge a surviving failure (e.g. unenumerated attachment references or covert material-owner drift) with a *real* engineering CII fixture, prove owner-level mass conservation and signed source custody, then decide whether additional transformations or UI exposure are justified.
