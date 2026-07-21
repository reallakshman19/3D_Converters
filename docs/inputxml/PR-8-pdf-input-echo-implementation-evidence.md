# PR-8 — PDF Input Echo implementation evidence

## Authority and scope

Issue #247 is the sole Work Pack. This implementation affects only dialect `pdf-input-echo` and adapter `pdf-input-echo-to-canonical`.

Base at implementation rebase: `ba8b4e43698e1bed8e30f25832659603b40e86b2`.

## Material claims

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| Raw PDFs are bound to source-byte SHA-256, byte length, ordered page texts, page hashes, complete extracted-text hash, extractor identity/version, and a deterministic provenance hash. | IMPLEMENTED_AND_TESTED | Issue #247 provenance requirement | `PdfInputEchoExtractionProvenance.v1` | `pdf_input_echo_provenance.py`; provenance tests | raw PDF Input Echo | HIGH | Reject missing, stale, reordered, empty, or contradictory extraction evidence. |
| Approved extracted text is accepted only with a closed immutable provenance manifest that exactly reconstructs the received normalized UTF-8 text. | IMPLEMENTED_AND_TESTED | ADR-007 | v1 | provenance module and tests | supplied extracted text | HIGH | Block bare text, generic extractor authority, invalid UTF-8, and manifest disagreement. |
| OCR and image-only fallback are absent. | VERIFIED_SCOPE_BOUNDARY | Issue #247 | PR-8 | provenance module; image-only test | PDF sources without text layer | HIGH | Block and require separately approved extracted-text evidence. |
| `lineScopes` is mandatory and `lineId`, `defaultLine`, filename, Job Name, nodes, coordinates, and state similarity are not scope authority. | IMPLEMENTED_AND_TESTED | Issue #247 line-scope rules | `PdfInputEchoLineScopeSet.v1` | `pdf_input_echo_scopes.py`; line-scope tests | all PDF Input Echo sources | HIGH | Require exact scope objects covering all blocks. |
| Scope membership must be unique, ordered, contiguous, non-overlapping, gap-free, and exactly cover source blocks `1..N`. | IMPLEMENTED_AND_TESTED | ADR-007 | v1 | scope verifier and adversarial tests | multi-line and one-line reports | HIGH | Block overlap, gaps, reordering, duplication, and nonexistent blocks. |
| The frozen parser is invoked once per isolated source block, preventing its legacy document-wide state chain from becoming authority. | IMPLEMENTED_AND_TESTED | source-reality audit and Issue #247 | PR-8 | `pdf_input_echo_state.py` | state decoding | HIGH | Keep `converters/scripts/pdf_to_inputxml.py` unchanged. |
| Every required state field must be explicit on the first block of each line scope. | IMPLEMENTED_AND_TESTED | `PdfInputEchoLineStartPolicy.v1` | v1 | state modules and line-start tests | line-scope starts | HIGH | Block missing, sentinel, unresolved, or cross-line values. |
| Optional material/mechanical state is also line-scoped and absence is explicit or same-line inherited. | IMPLEMENTED_AND_TESTED | ADR-007 | v1 | state-field registry and tests | material name, modulus, Poisson, density, hot moduli | HIGH | Prevent secondary-state leakage across lines. |
| Same-line inheritance records the exact predecessor block/element and explicit origin block/element. | IMPLEMENTED_AND_TESTED | Issue #247 predecessor evidence | v1 | state decisions and accounting tamper tests | inherited fields and absences | HIGH | Block changed predecessor scope or relation. |
| Duplicate source field markers and duplicate delta axes block before parser first-match behavior can silently choose a value. | IMPLEMENTED_AND_TESTED | fail-closed source occurrence policy | PR-8 | `pdf_input_echo_state_fields.py`; duplicate tests | PIPE DATA blocks | HIGH | Preserve no-overwrite semantics. |
| Omitted delta axes become zero only under explicit `OMITTED_AXIS_IS_ZERO_V1` evidence. | IMPLEMENTED_AND_TESTED | Issue #247 omitted-axis rule | v1 | element projection and accounting | geometry | HIGH | Block three-axis zero geometry and account every omitted axis. |
| Emitted `PIPINGELEMENT.LINE` always comes from the exact owning line scope. | IMPLEMENTED_AND_TESTED | line-scope authority | v1 | element projection and accounting | canonical elements | HIGH | Block wrong-valid-line substitutions even when ledger fields are altered. |
| `PdfInputEchoSourceAccountingProof.v1` closes document, provenance, pages, header, scopes, blocks, elements, state fields, omitted axes, auxiliaries, unsupported sections, and unparsed evidence. | IMPLEMENTED_AND_TESTED | Issue #247 source-accounting requirement | v1 | `pdf_input_echo_accounting.py`; accounting tests | PDF canonicalization | HIGH | Permit `COMPLETE` only when every invariant is zero. |
| Duplicate, missing, extra, altered, or cross-line decisions block accounting rather than using dictionary overwrite behavior. | IMPLEMENTED_AND_TESTED | accounting contract | v1 | accounting module and tamper tests | decision ledger | HIGH | Retain exact mismatch arrays and counts in the proof. |
| Meaningful incomplete restraints, SIF/Tee records, special rigid identities, unsupported sections, and post-`NODENAMES` evidence remain preserved and blocking. | IMPLEMENTED_AND_TESTED | pre-existing adapter containment | current | auxiliary module and adapter tests | unsupported engineering evidence | HIGH | Do not invent engineering projection authority in PR-8. |
| Missing report Date/Time blocks and no current-clock fallback remains. | IMPLEMENTED_AND_TESTED | Issue #247 anti-default rule | PR-8 | runtime and adapter tests | report metadata | HIGH | Require explicit report Job Name and Date/Time. |
| Raw-PDF processing is repeatable and approved extracted text emits equivalent canonical elements for the same extracted text. | IMPLEMENTED_AND_TESTED | deterministic provenance requirement | PR-8 | provenance tests | raw and extracted intake | HIGH | Compare exact element bytes and repeated ledgers. |
| Canonical XML, ledger, validation, and accounting proof are stable across subprocesses, hash seeds, Ubuntu, and Windows. | WORKFLOW_GATED | protected compiler workflow | current | determinism test and matrix jobs | deterministic artifacts | HIGH | Require both cross-platform jobs to pass on final head. |
| The existing 14-dialect full-chain matrix is preserved without editing its frozen source; a focused launcher supplies the newly required PDF evidence only. | IMPLEMENTED_AND_TESTED | Issue #247 protected regression rule | current | `test_inputxml_pdf_input_echo_e2e_matrix.py`; E2E workflow | all registered dialects | HIGH | Keep 14 cases, 12 full-chain passes, and 2 expected canonical blocks. |
| Frozen parser, compiler/dispatcher, schemas, registries, production CII writer, serialization, and publication are unchanged. | VERIFIED_SCOPE_BOUNDARY | Issue #247 ownership rules | current | final PR diff | repository | HIGH | Treat any contrary diff as a merge blocker. |

## Adversarial qualification

The focused qualification includes:

- absent or malformed extraction manifest;
- wrong source hash or full extracted-text hash;
- missing, reordered, duplicate, or altered page evidence after provenance restamping;
- invalid UTF-8 and image-only PDFs;
- missing, overlapping, reordered, duplicated, or gapped line scopes;
- same numeric values on a new line without explicit restatement;
- attempted line inference from filename, Job Name, node, or coordinate evidence;
- cross-line predecessor substitution;
- required line-start sentinel;
- duplicate field and duplicate delta-axis markers;
- wrong valid line assigned to an emitted element with corresponding ledger alteration;
- missing source-block record;
- source-block/emitted-element cardinality mismatch;
- duplicate state decision with conflicting value;
- altered provenance ledger record;
- unaccounted unsupported report section;
- repeated-process and hash-seed determinism;
- raw-PDF versus approved extracted-text element equivalence.

## Required final validation

The immutable final head must have completed successful runs for:

- InputXML Schema Suite;
- InputXML Canonical Compiler validate job;
- Ubuntu deterministic job;
- Windows deterministic job;
- InputXML Assurance Ledger;
- InputXML Assured CII Projection;
- InputXML End-to-End Regression Matrix using the PR-8 launcher.

Run IDs and the final head SHA are recorded in draft PR #248 after the final documentation head completes.

## Unchanged and deferred

Production CII writer: **UNCHANGED**  
Canonical serialization policy: **UNCHANGED**  
Publication protocol: **UNCHANGED**  
Frozen parser: **UNCHANGED**  
Schemas and registries: **UNCHANGED**  
OCR: **NOT IMPLEMENTED**  
Migration: **NOT AUTHORIZED**  
PR-9: **NOT STARTED**  
Merge status: **NOT MERGED**
