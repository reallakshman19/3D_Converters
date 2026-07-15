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

The following adapters are intentionally not claimed as complete:

- managed-stage JSON;
- PDF Input Echo;
- UXML/RVM intake.

They require their authoritative topology/parser implementations and source ledgers to be bridged, not reimplemented with simplified heuristics.
