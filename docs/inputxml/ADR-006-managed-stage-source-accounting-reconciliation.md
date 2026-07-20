# ADR-006 — Managed-Stage Source-Accounting Reconciliation

## Status

Accepted for PR-7 implementation review. Production activation and migration are not authorized.

## Scope

This decision governs only:

- profile `managed-stage-json`;
- adapter `managed-stage-to-canonical`;
- result policy `COMPONENT_TOPOLOGY_SOURCE_MODEL_TRACE_LEDGER_AND_FAIL_CLOSED_CII_PROJECTION`.

PDF, UXML/RVM, other InputXML-family profiles, browser redesign, resource characterization, migration, production activation, serialization policy, publication protocol, and the production CII writer are outside scope.

## Binding statements

> Source inventory is not source-accounting authority.

> Every source port requires an explicit topological or intentional-nonprojection disposition.

> A producer hash is evidence only after independent recomputation.

> Compatibility InputXML cannot repair disagreement between source, canonical topology, and trace evidence.

> Safe non-restraint deferral is not the same as unresolved support ownership.

> Managed-stage source, canonical topology, and trace evidence are authorities that must reconcile; none may silently compensate for another.

## Authority precedence

1. Raw managed-stage bytes and strict JSON occurrence identity.
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

## Pre-change characterization

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| Python used permissive JSON decoding and could overwrite duplicate keys or accept non-finite values. | VERIFIED_REPOSITORY_FACT | compiler source | PR-6 base | `compiler.py` | managed-stage intake | HIGH | Replace with strict bounded intake before Node execution. |
| Unrecognized JSON could fall through to managed-stage. | VERIFIED_REPOSITORY_FACT | compiler source | PR-6 base | dialect selection | profile selection | HIGH | Require a positive managed-stage predicate. |
| Root collections were selected by first-match precedence. | VERIFIED_REPOSITORY_FACT | producer source model | v1 | `topology-source-model.js` | source shape | HIGH | Register accepted forms and reject competing collections. |
| Bridge context was supplied through an environment variable and job name had hidden fallbacks. | VERIFIED_REPOSITORY_FACT | bridge/compiler | pre-PR-7 | managed-stage bridge | context authority | HIGH | Put validated context in a versioned request. |
| Bridge execution, streams, and diagnostics were unbounded. | VERIFIED_REPOSITORY_FACT | compiler | pre-PR-7 | subprocess path | containment | HIGH | Add explicit limits, timeout, fixed script, and reduced environment. |
| Bridge output omitted complete producer artifacts and had no closed result schema. | VERIFIED_REPOSITORY_FACT | bridge/exporter | pre-PR-7 | bridge result | artifact closure | HIGH | Return a closed versioned result with every artifact. |
| Trace records could be indexed before duplicate detection. | VERIFIED_REPOSITORY_FACT | compiler | pre-PR-7 | trace import | trace closure | HIGH | Detect duplicates before indexing and require exact cardinality. |
| Source ports had generic preservation records without complete topology proof. | VERIFIED_REPOSITORY_FACT | compiler | pre-PR-7 | source ledger | port accounting | HIGH | Reconcile every port and bind mapped ports to verified incidence. |
| Source accounting could report COMPLETE without an evidence-backed profile proof. | VERIFIED_REPOSITORY_FACT | dispatcher | pre-PR-7 | resolver outcome | accounting | HIGH | Add `InputXmlManagedStageSourceAccountingProof.v1`. |
| Producer semantic hashes, parity, and metrics were trusted. | VERIFIED_REPOSITORY_FACT | compiler | pre-PR-7 | managed-stage path | artifact acceptance | HIGH | Independently recompute and compare each authority. |
| Trace attributes were stripped by regular-expression replacement. | VERIFIED_REPOSITORY_FACT | bridge | pre-PR-7 | topology InputXML | XML semantics | HIGH | Securely parse, reconcile, preserve, and remove individually. |
| Producer counts were silently rewritten and sentinels could enter generic family normalization. | VERIFIED_REPOSITORY_FACT | compiler | pre-PR-7 | candidate sanitization | counts and values | HIGH | Treat counts as assertions and use profile-specific absence rules. |
| Component acceptance and support deferral were governed by incomplete type heuristics. | VERIFIED_REPOSITORY_FACT | compiler | pre-PR-7 | managed-stage policy | engineering eligibility | HIGH | Register explicit component/support/rigid/merge policies. |
| Serialization, publication, assurance, and CII projection were already independent gates. | ARCHITECTURE_INVARIANT | ADR-002/003 and workflows | current | compiler pipeline | repository | HIGH | Preserve these boundaries unchanged. |

## Accepted root forms

| Form | Predicate | Root identity | Branch collection | Source path | Status |
|---|---|---|---|---|---|
| top-level array | non-empty array of branch objects | `$` | `$` | `$[n]` | accepted legacy equivalent |
| `objects` wrapper | exactly one non-empty `objects` array | `$` | `$.objects` | `$.objects[n]` | accepted primary |
| `hierarchy` wrapper | exactly one non-empty `hierarchy` array | `$` | `$.hierarchy` | `$.hierarchy[n]` | accepted compatibility |
| `branches` wrapper | exactly one non-empty `branches` array | `$` | `$.branches` | `$.branches[n]` | accepted compatibility |

Multiple competing branch collections, empty collections, unrelated objects, scalar roots, nested inference, malformed JSON, duplicate keys, non-finite values, trailing data, invalid UTF-8, incompatible overrides, and misleading filenames do not legalize managed-stage input.

## Strict intake

Python owns media and profile intake. It enforces a source-byte limit, strict UTF-8, duplicate-key rejection at every object depth, non-finite rejection, one complete JSON value, positive root classification, deterministic occurrence paths, and raw SHA-256 before transformation. The strict inventory is immutable data; it is not accounting authority.

## Bridge contracts and containment

`InputXmlManagedStageBridgeRequest.v1` carries schema, profile, adapter, raw source hash, source text, source name, validated context, producer policy, and requested artifacts.

`InputXmlManagedStageBridgeResult.v1` carries resolution status, engine identity/version, echoed profile/adapter/hash, source identity/model/entities/ports, canonical topology, engineering projection, trace ledger, complete topology InputXML, parsed topology, SVG scene, parity report, metrics, build issues, and stable diagnostics.

Unknown or missing fields block. Expected source/topology failures return a structured blocked result; nonzero exit is reserved for internal bridge failure. Execution uses `shell=False`, a resolved Node executable, a fixed script, reduced environment, timeout, bounded request/stdout/stderr, bounded diagnostics, and bounded artifact populations. Host paths, PIDs, random IDs, temporary paths, clocks, and stack traces are excluded from evidence.

## Source identity and deterministic hashes

The compiler independently verifies:

- raw-byte SHA-256;
- normalized SourceEnvelope content hash;
- source file ID, kind, name, and explicit revision;
- entity identity schema;
- exact profile and adapter echoes;
- source identity equality across all returned artifacts.

Producer semantic hashes use `fnv1a64-canonical-json-v1`: sorted object keys, preserved array order, finite JSON numbers, self-hash omission, UTF-8 canonical JSON, and FNV-1a 64. Python recomputes the same bytes and rejects missing, stale, or altered hashes.

## Source entities and ports

Every branch and child component has one exact source path and independently derived source entity ID. IDs, paths, order, names, types, references, owner branches, source attributes, and enriched attributes must match the strict source. Duplicate IDs, duplicate paths, collisions, missing entities, extra entities, and unknown unsafe component types block.

Source ports reconcile across `sourceModel.sourcePorts`, entity-owned ports, bridge port arrays, the trace-ledger manifest, canonical ancestry, and compiler decisions. Each port verifies ID, owner, path, field, role, type, finite position, units, and frame.

Each port receives one disposition:

- `MAP_TO_CANONICAL_NODE`;
- `MAP_TO_EDGE_ENDPOINT`;
- `MAP_TO_JUNCTION`;
- `MAP_TO_BOUNDARY`;
- `MAP_TO_SUPPORT_ATTACHMENT`;
- `MAP_TO_POINT_FEATURE`;
- `INTENTIONALLY_UNUSED_WITH_AUTHORITY`;
- `DEFER_EXPLICITLY`;
- `REJECT_INVALID`.

Mapped node ports are bound to the exact incident `PE-*` InputXML elements derived from verified canonical incidence. Point-feature and intentional-nonprojection ports remain explicit evidence-only records. Generic preservation alone cannot certify coverage.

## Canonical topology and trace ledger

Python verifies schema, source identity, coordinate frame/unit/tolerance, semantic hash, unique canonical/InputXML IDs, endpoint existence, finite coordinates, nonzero route length, source-port and source-entity ancestry, merge authority, junctions, boundaries, point features, supports, rigids, and blocking build issues.

Every canonical node has source-port ancestry. Every canonical edge has valid source-entity ancestry, two valid endpoints, source-port groups, and exact InputXML element identity. Supports and rigids retain exact owner nodes/edges and source identities.

`TopologyTraceLedger.v1` must contain exactly one primary record per source entity. Duplicate, missing, or extra records block before indexing. Paths, types, references, target IDs, child IDs, cardinality, merge authority, operation, loss classification, deferred properties, status, and source-port manifest must agree with verified artifacts.

## Engineering projection and component policy

Engineering records reconcile by exact source entity and path; no geometry- or line-text-based state transfer is permitted. Conflicting source/enriched values block unless a registered authority resolves them. Required dimensions, material, process cases, density, line identity, weight, support/restraint state, and review status must be complete for accepted projection. Missing values do not become sentinels.

Registered component families include BRANCH, PIPE, ELBO/BEND, TEE, OLET, VALVE, FLANGE, GASK, INSTRUMENT, REDUCER, RIGID, SUPPORT/ATTA, point features, and unknown. PIPE requires exact edge and engineering ancestry. Managed many-to-one overlaps require explicit producer authority and separate accounting of every source entity. Bend topology without an authorized BEND child, Tee/Olet topology without SIF authority, and meaningful unsupported inline components retain candidates but block production.

## Supports and rigids

Stress supports require an explicit policy, source attachment references, exact carrier, canonical support/node/edge, retained source and projected datum, bounded residual, supported restraint types/cardinality, matching InputXML RESTRAINT ownership, and complete accounting.

Safe non-restraint deferral is accepted only for an explicitly classified floor, fence, sleeve, penetration, wall, roof, or slab-opening attachment with no stress/restraint evidence, no expected canonical object, no CII record, complete retained evidence, and intentional nonprojection accounting. Contradictory or unresolved support ownership blocks.

Rigids require exact source and engineering records, explicit positive weight and units, canonical rigid and owner edge, trace child ID, InputXML RIGID child, declared body/merge policy, bounded residual, and explicit owner authority. Global proximity fallback or missing-weight zero blocks.

## Topology InputXML, counts, and sentinels

The compiler receives complete trace-bearing topology InputXML and parses it securely. Every producer trace attribute is checked against canonical, trace, parsed, parity, support, and rigid evidence. Approved attributes are copied into registered extension records and removed individually. Missing, contradictory, or unknown trace attributes block.

Producer `NUM*` values are assertions. Canonical values are independently calculated under PR-5 count authority, including owner-element semantics for restraints and rigids. Mismatch blocks and is ledgered; values are never silently repaired.

Missing is absent, unresolved is structured blocking evidence, and actual zero is `0`. Required geometry or engineering sentinels block. Optional compatibility sentinels may be removed only with explicit absence evidence. `CNODE=0` represents absence only when the verified contract proves no connecting-node relation. Generic InputXML-family inheritance is bypassed for managed-stage.

## Parity and metrics

`ParsedInputXmlTopology.v1`, `TopologySvgScene.v1`, and `TopologyParityReport.v1` are mandatory. Python verifies schemas, identities, hashes, populations, incidence, coordinates under writer precision, source/merge ancestry, child ownership, support/restraint/rigid/junction/boundary evidence, and mismatch arrays. Failed, missing, stale, or forged-success parity blocks.

Metrics are recomputed from source and artifact arrays, including branch/component/reference populations, canonical objects, trace records, engineering supports/restraints/rigids, InputXML and parsed populations, zero-length edges, deferred supports, and parity mismatches. Metrics are evidence, not authority.

## Source-accounting proof

`InputXmlManagedStageSourceAccountingProof.v1` reconciles raw occurrences, branches, components, fields, ports, references, engineering records, topology objects, trace records, InputXML elements/children, extension evidence, and blockers.

Only `MANAGED_STAGE_SOURCE_DECISION` records created after artifact verification certify coverage. Inventory, full-source extensions, artifact digests, document-level projections, and accounting indexes cannot certify themselves. COMPLETE requires every registered invariant to be zero, including missing/duplicate/unexpected decisions, entity/port duplication, trace gaps, orphan topology, unmapped ports/elements/children, identity/hash/metric/parity mismatches, and self-certification.

## Diagnostics, stages, and candidates

Managed-stage diagnostics are registered with stage, severity, disposition, candidate policy, and production effect. Substring-based blocking is forbidden.

- invalid UTF-8/JSON → `MEDIA_INSPECTION_GATE`;
- root/profile/context ambiguity → `PROFILE_INTAKE_GATE`;
- bridge/schema/hash/identity/topology/trace/parity/metric failure → `PROFILE_RESOLVER_GATE`;
- accounting incompleteness → `SOURCE_ACCOUNTING_GATE`;
- canonical structure → `XSD_GATE` and `SCHEMATRON_GATE`;
- retained unsupported engineering → `LEDGER_GATE`;
- production eligibility → `PRODUCTION_ACCEPTANCE_GATE`.

Invalid intake, bridge-contract failure, identity/hash disagreement, missing topology/trace, failed parity, and nonconstructible accounting return no candidate. Complete topology with retained unsupported engineering may return a blocked candidate. Acceptance requires complete intake, closure, accounting, engineering, validation, and production gates.

## Determinism and compatibility impact

Ordering is source-array order followed by declared producer order for topology, trace, engineering, candidate, decisions, diagnostics, and extension evidence. Tests compare exact canonical, ledger, validation, bridge, hash, proof, diagnostic, and blocked-stage bytes across repeated Python and Node processes, multiple `PYTHONHASHSEED` values, Ubuntu, and Windows.

Compatibility topology InputXML is now lower authority and cannot repair source/topology/trace disagreement. Other profile semantics are unchanged. Shared producer changes are limited to artifact exposure and explicit source revision propagation and remain protected by static, parity, support, ASIM-1835, 1885_NC, and PSI116 tests.

## Unchanged boundaries

- Production CII writer: unchanged.
- Deterministic serialization policy: unchanged.
- Crash-consistent publication protocol: unchanged.
- Browser UI/runtime: unchanged.
- Migration: not authorized.
- PR-8: not started.

## Deferred findings

- New bend engineering, Tee/Olet SIF projection, and unsupported inline component engineering require separate authority.
- Full resource/RSS characterization remains PR-10.
- Full-corpus expansion and legacy migration are not authorized by PR-7.
- Production activation requires explicit owner approval after all stacked PR-7 checks pass.
