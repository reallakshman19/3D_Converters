# ADR-007 — PDF Input Echo provenance and line-scope authority

## Status

Accepted for PR-8 implementation review. Production activation, migration, OCR, writer changes, and PR-9 are not authorized.

## Scope

This decision governs only:

- dialect `pdf-input-echo`;
- adapter `pdf-input-echo-to-canonical`;
- the PDF Input Echo canonicalization ledger and source-accounting proof.

The production CII writer, canonical schemas, registries, compiler state machine, dispatcher, serialization policy, publication protocol, browser runtime, and the frozen Input Echo grammar parser remain unchanged.

## Binding statements

> A PDF filename, job name, node number, coordinate, or process default is not line-scope authority.

> Extracted text is authoritative only when it is bound to an immutable source-document and ordered page-text provenance manifest.

> State may carry only from an exact predecessor in the same proven line scope.

> A new line scope must establish every required line-state field explicitly, even when its values happen to equal the preceding line.

> OCR is outside PR-8. A PDF without an authoritative text layer blocks unless approved extracted-text evidence is supplied separately.

> Source accounting is complete only when document, provenance, pages, report header, scopes, source blocks, fields, omitted axes, auxiliaries, unsupported evidence, and emitted element line ownership reconcile exactly.

## Authority precedence

1. Raw source bytes.
2. `PdfInputEchoExtractionProvenance.v1`.
3. Ordered page-text manifest and complete extracted-text hash.
4. Explicit report Job Name and Date/Time.
5. `PdfInputEchoLineScopeSet.v1` supplied as immutable line-scope evidence.
6. Exact PIPE DATA source-block order and content.
7. Explicit field markers in each source block.
8. Same-line predecessor and explicit same-line origin evidence.
9. Profile-defined omitted-axis normalization.
10. Frozen parser values for one isolated source block.
11. Canonical InputXML and `PdfInputEchoSourceAccountingProof.v1`.

The frozen parser decodes one isolated source block at a time. Its legacy document-wide state chain is never accepted as PR-8 authority.

## Provenance contract

### Raw PDF

A raw PDF source records and verifies:

- source-document SHA-256 and byte length;
- document kind `PDF`;
- extractor identity `pypdf.PdfReader.extract_text`;
- installed extractor version;
- ordered page index and stable page identity;
- exact normalized page text;
- page-text SHA-256 and UTF-8 byte length;
- complete normalized extracted-text SHA-256 and byte length;
- deterministic provenance-object SHA-256.

The source is bounded to 64 MiB, extracted text to 32 MiB, and page count to 10,000. An empty or image-only text layer blocks. No OCR fallback exists.

### Approved extracted text

Non-PDF input is accepted only when:

- `sourceKind` is `extracted-text` or `pdf-extracted-text`;
- bytes are strict UTF-8;
- `extractionProvenance` has the exact closed v1 field set;
- the source-document hash, length, kind, extractor identity, and extractor version are explicit;
- `textLayerSourceKind` is `APPROVED_EXTRACTED_TEXT_MANIFEST`;
- page identities are unique and page indexes are contiguous and ordered;
- every page text, page hash, and page length verifies;
- joining page texts with the contract separator reproduces the received normalized text exactly;
- the complete extracted-text hash and provenance hash verify independently.

`unknown`, `default`, `filename`, and `caller-supplied` are not extractor authorities.

## Line-scope contract

`lineScopes` is mandatory. One line scope contains exactly:

- `lineScopeId`;
- `lineId`;
- `sourceAuthority`;
- ordered `blockMembership`;
- `firstBlock` and `lastBlock`;
- non-empty `sourceEvidenceReferences`.

Accepted authority labels are:

- `CALLER_SUPPLIED_SCOPE_MAP`;
- `REPORT_LINE_IDENTITY`.

The label does not infer scope. The complete scope object is still required and validated.

Scopes must have unique scope IDs and unique line IDs. Block memberships must be ordered, contiguous, non-duplicated, non-overlapping, and must cover source blocks `1..N` exactly. Inter-scope gaps, internal gaps, reordered membership, nonexistent blocks, and competing owners block.

`lineId`, `defaultLine`, filename text, Job Name, coordinates, node identity, or numeric-state similarity cannot replace `lineScopes`.

## Line-state contract

### Required fields

The first source block of each line scope must explicitly establish:

- `DIAMETER`;
- `WALL_THICK`;
- `INSUL_THICK`;
- `CORR_ALLOW`;
- `TEMP_EXP_C1`;
- `PRESSURE_C1`;
- `HYDRO_PRESSURE`;
- `INSUL_DENSITY`;
- `FLUID_DENSITY`;
- `MATERIAL_NUM`.

Pressure and hydrostatic pressure are converted from report bar values to canonical kPa.

### Optional line state

The following are also line-scoped:

- material name;
- elastic modulus;
- Poisson ratio;
- pipe density;
- hot moduli 1–9.

An optional field absent at line start receives explicit absence evidence. Later blocks may inherit that absence only within the same scope.

### Decision records

Each state field on every source block has exactly one semantic decision:

- `PDF_INPUT_ECHO_EXPLICIT_FIELD`;
- `PDF_INPUT_ECHO_INHERITANCE`;
- `PDF_INPUT_ECHO_EXPLICIT_ABSENCE`;
- `PDF_INPUT_ECHO_INHERITED_ABSENCE`.

Inheritance records name:

- current source block and element;
- current line scope and line ID;
- exact predecessor block and element;
- predecessor line scope;
- explicit origin block and element;
- policy ID `PdfInputEchoLineStartPolicy.v1`.

A missing required line-start value, sentinel, duplicate source marker, duplicate delta axis, or cross-line predecessor blocks.

## Geometry and auxiliaries

Each source block emits at most one `PIPINGELEMENT` with its proven `LINE` value. Present delta axes are parsed. An omitted delta axis is normalized to zero only with a `PDF_OMITTED_DELTA_AXIS` record under `OMITTED_AXIS_IS_ZERO_V1`. Three zero axes block.

Bend and generic rigid behavior remains the established adapter behavior. Meaningful valve/flange/gasket/instrument/reducer rigid identity, incomplete restraints, SIF/Tee evidence, unsupported report sections, and unparsed post-`NODENAMES` evidence remain preserved and blocking. PR-8 does not add engineering projection authority.

## Source-accounting proof

`PdfInputEchoSourceAccountingProof.v1` independently reconciles:

- one document record;
- one provenance record;
- every ordered page record;
- the explicit report header;
- every line-scope record and scope hash;
- every raw PIPE DATA block and exact block content;
- one emitted element per source block;
- every required and optional state decision;
- every omitted-axis decision;
- exact emitted element-to-line ownership;
- ledger-to-element line agreement;
- cross-line inheritance count;
- bend, rigid, restraint, and SIF populations;
- unsupported-section and unparsed-tail evidence.

`COMPLETE` requires every invariant count to be zero. Missing, extra, duplicate, substituted, or contradictory records make the proof `BLOCKED` and add a blocking canonicalization decision.

## Determinism

Raw-PDF extraction and approved extracted-text processing use normalized `LF` text and strict UTF-8. Ordering follows page order, source-block order, line-scope order, field-policy order, and emitted element order. Tests compare exact canonical XML, canonicalization ledger, validation output, and accounting proof across processes, Python hash seeds, Ubuntu, and Windows.

## Compatibility impact

- Existing valid one-line Input Echo data remains representable when explicit extraction provenance and one exact line scope are supplied.
- `lineId` and `defaultLine` alone no longer legalize the profile.
- missing report Date/Time no longer uses the current clock;
- image-only PDFs no longer appear equivalent to parsed Input Echo sources;
- repeated state across lines must be explicitly restated at each line start;
- the full 14-dialect end-to-end matrix remains intact and supplies the new PDF evidence through a focused PR-8 launcher.

## Unchanged boundaries

- Frozen parser: unchanged.
- Production CII writer: unchanged.
- Canonical schemas and registries: unchanged.
- Compiler state machine and dispatcher: unchanged.
- Canonical serialization: unchanged.
- Publication protocol: unchanged.
- OCR: not implemented.
- Migration: not authorized.
- PR-9: not started.
