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

The compiler implements direct canonical validation and the InputXML-family adapters for:

- canonical InputXML v1;
- CAESAR InputXML using `PRESSURE1..9` and `LINE_ID`;
- CAESAR InputXML using canonical pressure names;
- enriched application InputXML;
- InputXML fragments with explicit context;
- reconciled `CategorizedInputXML` v3;
- CII14 InputXML intake;
- diagnostic InputXML sidecars as `DEFER_EXPLICITLY` and always blocked.

Complex topology-producing source dialects remain registered and recognized but return a precise `DEFERRED_BLOCKING` result until their existing specialized geometry/topology engines are connected through a reviewed adapter. The compiler never substitutes a sequential-node or nearest-geometry heuristic for those engines.

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

The following adapters are intentionally not claimed as complete in this foundation:

- XML Builder `Root/Branch/Node`;
- SelectionJSON custom `Root/Branch/Node`;
- managed-stage JSON;
- PDF Input Echo;
- UXML/RVM intake.

They require their authoritative topology/parser implementations and source ledgers to be bridged, not reimplemented with simplified heuristics.
