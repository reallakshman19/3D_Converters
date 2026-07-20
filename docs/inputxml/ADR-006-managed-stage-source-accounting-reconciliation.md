# ADR-006 — Managed-Stage Source-Accounting Reconciliation

## Status

Proposed for Agent IXCC-07 / PR-7 implementation. The characterization table below was committed before production changes.

## Scope

This decision governs only:

- `managed-stage-json`;
- `managed-stage-to-canonical`;
- result policy `COMPONENT_TOPOLOGY_SOURCE_MODEL_TRACE_LEDGER_AND_FAIL_CLOSED_CII_PROJECTION`.

All other InputXML profiles, PR-8, PR-9, PR-10, migration, production activation, browser redesign, serialization policy, publication protocol, and the production CII writer are outside scope.

## Binding statements

> Source inventory is not source-accounting authority.

> Every source port requires an explicit topological or intentional-nonprojection disposition.

> A producer hash is evidence only after independent recomputation.

> Compatibility InputXML cannot repair disagreement between source, canonical topology, and trace evidence.

> Safe non-restraint deferral is not the same as unresolved support ownership.

> Managed-stage source, canonical topology, and trace evidence are authorities that must reconcile; none may silently compensate for another.

## Governing precedence

1. Raw managed-stage source bytes and strict JSON occurrence identity.
2. `SourceEnvelope.v1`.
3. `ComponentTopologySourceModel.v1`.
4. Producer-owned source-port identities.
5. Explicit connectivity evidence.
6. `CanonicalTopology.v1`.
7. `TopologyTraceLedger.v1`.
8. Topology engineering projection.
9. `ParsedInputXmlTopology.v1`.
10. `TopologyParityReport.v1`.
11. Canonical InputXML contract.
12. Unchanged production-writer projection behavior.
13. Compatibility topology InputXML.

## Pre-change behavior characterization

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| JSON media is decoded with ordinary `json.loads`; duplicate keys overwrite and non-finite constants are accepted by Python defaults. | VERIFIED_REPOSITORY_FACT | Current compiler source | `17d4b94f` | `compiler.py::_json_dialect` | managed-stage and JSON detection | HIGH | Replace with bounded strict UTF-8 and duplicate-key/trailing/non-finite rejection before Node execution. |
| Any JSON not positively recognized as UXML/RVM defaults to managed-stage. | VERIFIED_REPOSITORY_FACT | Current compiler source | `17d4b94f` | `compiler.py::_json_dialect` | managed-stage selection | HIGH | Require a positive managed-stage root predicate; unrelated JSON must block. |
| Top-level array, `objects`, `hierarchy`, and `branches` collections are accepted by first-match precedence. | VERIFIED_REPOSITORY_FACT | Producer source model | `ComponentTopologySourceModel.v1` | `topology-source-model.js:136-144` | managed-stage root forms | HIGH | Register explicit forms and reject objects containing more than one competing collection. |
| Source context is carried in `INPUTXML_COMPILER_MANAGED_STAGE_CONTEXT`. | VERIFIED_REPOSITORY_FACT | Current bridge | pre-PR-7 | `managed_stage.py`; `node_managed_stage_bridge.mjs` | bridge execution | HIGH | Move all context into `InputXmlManagedStageBridgeRequest.v1`; reduce child environment. |
| Job name falls back to source-name stem and then `MANAGED_STAGE_CANONICAL`. | VERIFIED_REPOSITORY_FACT | Current compiler/bridge | pre-PR-7 | both managed-stage bridge modules | canonical wrapper | HIGH | Require explicit nonblank `jobName` before bridge execution. |
| Writer hardcodes CAESAR version `11.00` and north `(0,1,0)`. | VERIFIED_REPOSITORY_FACT | Producer topology writer | current | `topology-inputxml-writer.js` | managed-stage topology InputXML | HIGH | Parameterize through explicit request context and independently verify emitted values. |
| Bridge stdin is raw source; result has no explicit schema, engine identity, or closed field set. | VERIFIED_REPOSITORY_FACT | Current bridge | pre-PR-7 | `node_managed_stage_bridge.mjs` | bridge contract | HIGH | Introduce versioned request/result contracts and exact field closure. |
| Bridge subprocess duration and streams are unbounded and inherits the full process environment. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `managed_stage.py::_run_managed_stage_bridge` | containment | HIGH | Add source/request/stdout/stderr/diagnostic/object limits, timeout, `shell=False`, reduced environment, and fixed script path. |
| Expected producer failures return `ok=false`, a stack trace, and nonzero exit. | VERIFIED_REPOSITORY_FACT | Current bridge | pre-PR-7 | `node_managed_stage_bridge.mjs` | failure semantics | HIGH | Expected source/topology failures return structured `BLOCKED` with zero exit; nonzero exit is internal only; no stack evidence. |
| Trace records are indexed by overwrite-capable dictionary construction before duplicate detection. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `managed_stage.py::_import_topology_ledger` | trace reconciliation | HIGH | Detect duplicates before indexing and require exact one-record-per-source-entity closure. |
| Source ports receive only generic `PRESERVE_EXTENSION` records. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `managed_stage.py::_import_topology_ledger` | port accounting | HIGH | Require one explicit port disposition tied to canonical/trace ownership or intentional nonprojection. |
| Managed-stage source accounting is returned as `COMPLETE` without a profile proof. | VERIFIED_REPOSITORY_FACT | Dispatcher | pre-PR-7 | `dispatcher.py:212-228` | resolver outcome | HIGH | Implement `InputXmlManagedStageSourceAccountingProof.v1`; return COMPLETE only when every invariant is zero. |
| Python recomputes local JSON digests but does not verify producer FNV hashes. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `managed_stage.py::_sanitize_topology_inputxml` | artifact closure | HIGH | Reimplement `fnv1a64-canonical-json-v1` exactly and reject stale/missing producer hashes. |
| Source identity equality is not proved across source model, canonical topology, trace ledger, parsed InputXML, parity report, bridge result, and compiler ledger. | VERIFIED_REPOSITORY_FACT | Current bridge/compiler | pre-PR-7 | managed-stage path | HIGH | Require exact identity closure for source hash, source file ID, kind, revision, name, profile, adapter, and identity schema. |
| Parsed InputXML topology, SVG scene, parity report, and engineering projection are built but omitted from the bridge result. | VERIFIED_REPOSITORY_FACT | Producer exporter versus bridge | current | `topology-artifact-exporter.js`; bridge | HIGH | Return all artifacts and verify before consuming topology InputXML. |
| Producer metrics are trusted rather than independently recomputed. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `managed_stage.py` | evidence metrics | HIGH | Recompute every required metric from arrays and mappings; mismatch blocks despite valid hashes. |
| Topology trace attributes are removed by JavaScript regular-expression replacement before Python sees them. | VERIFIED_REPOSITORY_FACT | Current bridge | pre-PR-7 | `stripTopologyTraceAttributes` | topology InputXML | HIGH | Return complete XML; parse securely; reconcile and remove each approved attribute individually. |
| Coordinate aliases are renamed in Python, but lineage attributes are accepted through a small whitelist without relational proof. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `_sanitize_topology_inputxml` | canonical candidate | HIGH | Verify every trace attribute against canonical, trace, parsed, and parity artifacts before removal. |
| Producer `NUM*` assertions are silently rewritten to computed values. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `_sanitize_topology_inputxml` | control counts | HIGH | Treat source values as assertions; mismatch is classified and blocks unless exact authority says representation-only. |
| Compatibility sentinels enter the generic family normalizer, which can inherit or normalize values. | VERIFIED_REPOSITORY_FACT | Dispatcher and family path | pre-PR-7 | `dispatcher.py:119-141` | managed-stage canonicalization | HIGH | Bypass generic family assumptions; profile-specific sanitization must prove every absence/sentinel disposition. |
| Component acceptance uses a small type whitelist and prefix tests. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `_ALLOWED_SOURCE_TYPES`; `_source_type_blocking` | component disposition | HIGH | Register explicit component policy for branch, route, bend, junction, inline, support, rigid, point, and unknown families. |
| `DEFER_SUPPORT` is treated as blocking without separating proven non-restraint attachment from unresolved support ownership. | VERIFIED_REPOSITORY_FACT | Current compiler | pre-PR-7 | `_BLOCKING_PRIMARY_DISPOSITIONS` | support policy | HIGH | Accept only explicit `DEFERRED_NON_RESTRAINT_ATTACHMENT` with no stress evidence; unresolved support remains blocking. |
| Canonical rigid assignment can report `GLOBAL_PROXIMITY_FALLBACK`. | VERIFIED_REPOSITORY_FACT | Producer identity enrichment | current | `topology-artifact-identity.js` | rigid ownership | HIGH | Block proximity-only rigid assignment; require source/component or source/branch ownership. |
| Producer artifact hashes use sorted-key, array-order-preserving canonical JSON with self-hash omission and FNV-1a 64. | VERIFIED_REPOSITORY_FACT | Hash module | `fnv1a64-canonical-json-v1` | `topology-deterministic-hash.js` | canonical, trace, parsed, SVG, parity | HIGH | Recompute byte-equivalent canonical JSON and FNV hash in Python before artifact use. |
| Source content hash is SHA-256 of normalized text; source file ID is first 32 hex characters of SHA-256 over `stagedjson + NUL + normalizedText`. | VERIFIED_REPOSITORY_FACT | Source-envelope module | `SourceEnvelope.v1` | `source-envelope.js`; `source-text.js` | source identity | HIGH | Recompute exactly, document normalization, and bind both raw-byte SHA-256 and normalized source identity. |
| Source entity/port ID is first 32 hex characters of SHA-256 over source file ID, kind, exact source path, and `json-object`, separated by NUL. | VERIFIED_REPOSITORY_FACT | Universal graph identity | `UniversalSourceGraph.v1` | `graph-identity.js`; `topology-source-model.js` | entity and port identity | HIGH | Independently recompute every ID and block duplicates/collisions. |
| Branch child order, reciprocal references, and producer-owned ports are existing connectivity authorities; coordinates only verify them. | VERIFIED_PROJECT_CONTRACT | Component topology docs and source | current | `docs/component-topology-artifacts.md`; connectivity modules | managed-stage topology | HIGH | Verify declared authority; do not rebuild connectivity in Python. |
| Canonical topology and trace ledger already contain source-port ancestry, merge cardinality, support/rigid/junction/boundary objects, and deterministic IDs. | VERIFIED_REPOSITORY_FACT | Producer artifacts | v1 | component-topology modules | artifact closure | HIGH | Verify schemas, identities, uniqueness, references, hashes, and actual cardinality independently. |
| Topology parity is fail-closed in the producer exporter but is not independently verified by the compiler. | VERIFIED_REPOSITORY_FACT | Producer exporter | `TopologyParityReport.v1` | artifact exporter/parity modules | compiler acceptance | HIGH | Require present PASS report, independently verify hashes/populations/incidence/metrics, and reject forged success. |
| Canonical InputXML serialization and CII writer gates are already independent authorities. | ARCHITECTURE_INVARIANT | ADR-002, ADR-003, compiler state machine | current | publication/serialization/assured projection | repository | HIGH | Do not modify these boundaries; blocked managed-stage results never invoke the writer. |

## Accepted root forms

PR-7 registers these compatibility forms only:

| Form | Predicate | Root identity | Branch collection identity | Source-path root | Compatibility status |
|---|---|---|---|---|---|
| top-level array | root is a non-empty array | `$` | `$` | `$[n]` | ACCEPTED_LEGACY_EQUIVALENT |
| objects wrapper | root object has exactly one branch collection, `objects`, containing a non-empty array | `$` | `$.objects` | `$.objects[n]` | ACCEPTED_PRIMARY |
| hierarchy wrapper | root object has exactly one branch collection, `hierarchy`, containing a non-empty array | `$` | `$.hierarchy` | `$.hierarchy[n]` | ACCEPTED_COMPATIBILITY |
| branches wrapper | root object has exactly one branch collection, `branches`, containing a non-empty array | `$` | `$.branches` | `$.branches[n]` | ACCEPTED_COMPATIBILITY |

An object containing more than one of `objects`, `hierarchy`, and `branches` is ambiguous and blocks. Empty collections, unrelated objects, scalar roots, and nested wrapper inference block.

## Target architecture

```text
strict Python managed-stage intake
  → InputXmlManagedStageBridgeRequest.v1
  → authoritative component-topology producer
  → InputXmlManagedStageBridgeResult.v1
  → independent Python artifact-closure verification
  → source/entity/port/accounting reconciliation
  → managed-stage canonical candidate
  → XSD → Schematron → ledger → production acceptance
```

Python verifies the producer; it does not construct managed-stage topology.

## Deferred authority

- Full resource/RSS characterization remains PR-10.
- Full fourteen-profile corpus remains later work.
- New bend, Tee/Olet SIF, valve/flange/gasket/reducer engineering projection is not authorized.
- Browser redesign and migration are not authorized.
- Production writer changes are not authorized.
