# InputXML Canonical Compiler — PR-D

## Scope

The compiler is a fail-closed intake boundary between registered source dialects and canonical InputXML v1:

```text
source dialect
→ dialect detection / explicit selection
→ structural intake checks
→ alias and value normalization
→ source-evidence reconciliation
→ canonical InputXML
→ canonical XSD + Schematron
→ canonicalization decision ledger
```

It does not call or modify the production CII writer.

## Implemented adapters

The compiler implements direct canonical validation and adapters for:

- canonical InputXML v1;
- CAESAR InputXML using `PRESSURE1..9` and `LINE_ID`;
- CAESAR InputXML using canonical pressure names;
- enriched application InputXML;
- InputXML fragments with explicit context;
- reconciled `CategorizedInputXML` v3;
- CII14 InputXML intake;
- XML Builder `Root/Branch/Node` through the existing authoritative node-to-InputXML topology engine;
- SelectionJSON custom `Root/Branch/Node` through the same authoritative topology engine with a distinct dialect and evidence identity;
- managed-stage JSON through `ComponentTopologySourceModel.v1`, `CanonicalTopology.v1`, and `TopologyTraceLedger.v1`;
- CAESAR Input Echo text-layer PDF or explicitly declared extracted text through the existing report grammar parser;
- diagnostic InputXML sidecars as `DEFER_EXPLICITLY` and always blocked.

Complex source dialects remain registered and recognized but return a precise `DEFERRED_BLOCKING` result until their existing specialized geometry/topology engines are connected through a reviewed adapter. The compiler never substitutes a simplified nearest-geometry implementation.

## Root/Branch/Node topology bridge

The XML Builder and SelectionJSON adapters invoke `tabs/model-converters/xml-cii-node-to-inputxml-core.js` through a controlled Node bridge. They use the existing `inputxml-topo` profile with:

- duplicate-coordinate coalescing disabled;
- short-filler generation disabled;
- ray-filler and second-pass filler generation disabled;
- application enrichment disabled;
- the existing project coordinate transformation retained and ledgered.

The adapter removes only fixed-slot records whose engineering payload is entirely blank or the InputXML missing sentinel. Compatibility values injected by the legacy writer but absent from source evidence are removed before canonicalization and recorded as `FILTER_COMPATIBILITY_DEFAULT`.

The complete source XML and generated element side-load evidence are retained in the extension namespace. Any real node drop, restraint truncation, unresolved restraint type, fabricated/defaulted engineering identity, bridge warning, or unsupported SIF/restraint semantics blocks production validation.

Both source dialects have the same XML root shape. Generic `Root` auto-detection selects `xml-builder-root-branch-node`; callers compiling output from `converters/seljson-to-inputxml.js` must explicitly select `seljson-custom-root`. The compiler then retains SelectionJSON-specific extension names and ledger identity.

## Managed-stage component-topology bridge

Managed-stage JSON is accepted directly at the compiler boundary. The adapter invokes the existing component-topology producer and imports:

- the producer-owned `SourceEnvelope.v1` identity;
- every branch and component with its complete source attributes and enriched attributes;
- every source port identity;
- every `TopologyTraceLedger.v1` record;
- `CanonicalTopology.v1` node and edge identities;
- component-topology metrics and build findings;
- the component-aware topology InputXML.

The trace ledger, not the compatibility InputXML alone, is the source-accounting authority. Producer lineage attributes are moved to the extension namespace. Global-coordinate aliases are renamed deterministically, CONTROL counts are recomputed from sanitized children, and a restraint `CNODE` compatibility sentinel is normalized to explicit zero only because the component-topology support model exposes no connecting-node relationship.

A managed-stage conversion may pass for component families with an approved canonical projection, such as explicit PIPE route edges and supported restraint attachments. It blocks on:

- ambiguous topology or a producer blocking issue;
- deferred non-restraint attachments;
- point-only components that disappear from InputXML;
- TEE/OLET junctions without verified SIF/tee records;
- ELBO/BEND topology without `BEND` children;
- VALVE, FLANGE, GASKET, INSTRUMENT, REDUCER, or other component families whose PR-B contract remains `UNSUPPORTED_BLOCKING`;
- unresolved first-line engineering context;
- restraint capacity, type, or field failures.

The model extension stores source identity, topology and trace-ledger digests, and metrics. Full source fields remain in the canonicalization ledger sidecar, one record per source entity and source port.

## PDF Input Echo bridge

The PDF adapter accepts either:

- raw `%PDF` bytes with an extractable text layer; or
- strict UTF-8 Input Echo text only when the caller declares `sourceKind="extracted-text"`.

It reuses the report grammar in `converters/scripts/pdf_to_inputxml.py` for the `PIPE DATA` element blocks. It deliberately does not use that converter's internal profile/template substitution or generated fallback path.

The caller must supply explicit compiler context for:

- CAESAR version;
- north vector;
- piping line identity.

The report must contain an explicit Job Name and Date/Time. Current-clock substitution is forbidden. Pressure and hydro values parsed in bar are converted to canonical kPa. Omitted delta axes are ledgered as deterministic report-level zero components. Pipe-state carry-forward is ledgered per element and never crosses the explicit line scope.

The complete extracted report and extraction provenance are preserved in the extension namespace. Mechanical fields outside the current canonical projection are also preserved with units in their evidence names.

The PDF adapter blocks on:

- scanned/image-only or malformed PDF with no valid Input Echo text layer;
- missing report timestamp, explicit version, north vector, or line identity;
- block/accounting mismatch;
- zero-length element;
- unsupported report sections such as hangers, displacements, force/moment, uniform, wind, offsets, or allowable stress;
- restraints because the current report grammar does not recover stiffness, gap, friction, and connecting-node semantics;
- SIF/tee records until their full canonical field contract is verified;
- valve, flange, gasket, blind-flange, instrument, or reducer identities represented only as generic rigid records;
- more than six restraints or any other unresolved auxiliary capacity/ownership condition.

Bends with a positive radius and complete angle/node pairing can project. A generic rigid with explicit weight can project while its source type is preserved.

## Fail-closed rules

- exactly one direct unqualified `PIPINGMODEL` under `{COADE}CAESARII`;
- `XML_TYPE="Input"` is mandatory;
- source `NUM*` assertions are checked before recomputation;
- aliases are renamed only when collision-free;
- missing sentinels are resolved only by documented line-scoped inheritance or deterministic zero delta components;
- inheritance never crosses a `LINE` boundary;
- first element of each line requires explicit diameter and wall thickness;
- unknown engineering data becomes `UNSUPPORTED_BLOCKING` extension evidence;
- known nonprojected evidence is preserved explicitly;
- unsupported auxiliaries are preserved and block;
- no restraint, SIF, hanger, or nozzle compatibility default is silently inserted;
- `CategorizedInputXML` normalized blocks are reconciled against `OriginalElement`; both evidence forms are preserved;
- every output must pass canonical XSD and Schematron before `PASS`.

## Outputs

For input `<stem>`:

```text
<stem>.canonical.input.xml
<stem>.canonicalization-ledger.json
<stem>.canonical-validation.json
```

A blocked conversion still writes the ledger and validation report. A canonical XML file is written only when a structurally meaningful canonical document was produced; `UNSUPPORTED_BLOCKING` evidence keeps the status blocked.

## Ledger

`InputXmlCanonicalizationDecisionLedger.v1` records source identity, source fields, canonical nodes/elements, projection cardinality, disposition, evidence, confidence dimensions, and diagnostics. Generic `DROP` and `SKIP` dispositions are forbidden.

## Remaining PR-D completion work

The only registered source adapter intentionally not claimed as complete is:

- UXML/RVM intake.

It requires its authoritative engineering-identity and topology implementation to be bridged, not reimplemented with simplified heuristics.
