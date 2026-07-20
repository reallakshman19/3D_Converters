# PR-7 — Managed-Stage Implementation Evidence

## Stack

| Batch | Pull request | Authority boundary |
|---|---|---|
| PR-7A | #234 | strict intake, bridge contracts, independent artifact closure, candidate construction, source-accounting implementation |
| PR-7B | #235 | source/entity/port/artifact/accounting tamper proof, process determinism, blocked-writer proof |
| PR-7C | #236 | focused managed-stage corpus and profile/InputXML tamper gates |
| PR-7D | #237 | workflow closure, ADR-006, implementation evidence, final validation gate |

Starting dependency: PR #225, merge SHA `17d4b94ff6dd2f5a8d5b8b2354d2f324319d0220`.

## Material claims

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| Managed-stage media is parsed in Python before Node execution with strict UTF-8, duplicate-key, non-finite, trailing-data, source-size, and root-shape enforcement. | IMPLEMENTED_AND_TESTED | PR-7 intake contract | `ManagedStageIntake.v1` | `managed_stage_intake.py`; intake tests | `managed-stage-json` | HIGH | Retain as media/profile authority. |
| Top-level array and exactly one `objects`, `hierarchy`, or `branches` collection are the only accepted root forms. | IMPLEMENTED_AND_TESTED | ADR-006 and corpus | PR-7 | intake and corpus | managed-stage root classification | HIGH | Reject ambiguity, emptiness, unrelated objects, and incompatible overrides. |
| Raw source SHA-256 is calculated before transformation and echoed exactly by the bridge. | IMPLEMENTED_AND_TESTED | request/result contract | v1 | bridge I/O and identity verifier | source identity | HIGH | Block mismatch before artifact use. |
| Bridge context is carried in `InputXmlManagedStageBridgeRequest.v1`, not in process environment authority. | IMPLEMENTED_AND_TESTED | bridge contract | v1 | `managed_stage_bridge_io.py`; Node bridge | version/job/north/revision | HIGH | Preserve reduced deterministic environment. |
| Bridge execution has timeout, request/stdout/stderr/diagnostic and artifact-population limits with `shell=False` and fixed script resolution. | IMPLEMENTED_AND_TESTED | containment policy | PR-7 | bridge I/O | subprocess safety | HIGH | Keep PR-10 resource characterization deferred. |
| `InputXmlManagedStageBridgeResult.v1` is closed and returns source, topology, engineering, trace, InputXML, parsed topology, SVG, parity, metrics, issues, and diagnostics. | IMPLEMENTED_AND_TESTED | bridge result contract | v1 | Node bridge and Python verifier | artifact closure | HIGH | Reject missing or unknown fields. |
| SourceEnvelope content hash, file ID, name, kind, revision, entity schema, profile, and adapter close across all artifacts. | IMPLEMENTED_AND_TESTED | source identity contract | SourceEnvelope.v1 | `managed_stage_identity.py` | artifact identity | HIGH | Block any disagreement. |
| Source entity and source-port IDs are independently derived from exact occurrence paths and duplicate/collision checked before indexing. | IMPLEMENTED_AND_TESTED | UniversalSourceGraph identity | v1 | `managed_stage_entities.py` | source model | HIGH | Preserve source-array order and exact owner relationships. |
| Every producer-owned source port receives an explicit topology or intentional-nonprojection disposition. | IMPLEMENTED_AND_TESTED | ADR-006 port policy | PR-7 | topology verifier and source decisions | all managed-stage ports | HIGH | Generic preservation alone cannot certify coverage. |
| Mapped source ports are bound to exact incident `PE-*` InputXML elements derived from verified canonical incidence. | IMPLEMENTED_AND_TESTED | canonical incidence and assurance mapping | PR-7A final | `managed_stage_port_coverage.py` | mapped ports | HIGH | Block mapped nodes with no incident element. |
| Canonical topology is independently checked for schemas, hashes, unique IDs, incidence, coordinates, ancestry, zero length, merges, junctions, boundaries, supports, rigids, and build issues. | IMPLEMENTED_AND_TESTED | CanonicalTopology.v1 | v1 | `managed_stage_topology.py` | topology authority | HIGH | Do not rebuild topology in Python. |
| Trace records require exact one-per-source-entity closure, duplicate-before-index detection, exact target identities, cardinality, merge, operation, loss, deferred properties, and port manifest. | IMPLEMENTED_AND_TESTED | TopologyTraceLedger.v1 | v1 | topology verifier and artifact tamper tests | trace authority | HIGH | Missing, duplicate, extra, or contradictory records block. |
| Producer semantic hashes are independently recomputed with `fnv1a64-canonical-json-v1`. | IMPLEMENTED_AND_TESTED | producer hash contract | v1 | `managed_stage_hashes.py` | canonical, trace, parsed, SVG, parity | HIGH | Reject stale or altered objects despite plausible hashes. |
| Engineering records reconcile by exact source component and cannot leak state by geometry or line text. | IMPLEMENTED_AND_TESTED | managed-stage engineering policy | PR-7 | `managed_stage_engineering.py` | dimensions/material/cases/support/rigid | HIGH | Missing or conflicting required state blocks. |
| Component disposition is explicit for branch, pipe, bend, Tee/Olet, inline components, support, rigid, point features, and unknown types. | IMPLEMENTED_AND_TESTED | component policy | PR-7 | `managed_stage_policy.py` | candidate and production eligibility | HIGH | Retain unsupported meaningful evidence and block. |
| Safe non-restraint deferral is distinct from unresolved support ownership. | IMPLEMENTED_AND_TESTED | support policy | current producer + PR-7 verifier | support policy and corpus | support/ATTA | HIGH | Accept only explicit non-restraint evidence with no stress semantics. |
| Rigids require explicit positive weight, exact source and owner edge, trace/InputXML child closure, and non-proximity authority. | IMPLEMENTED_AND_TESTED | rigid policy | PR-7 | engineering/topology/InputXML verifiers | rigid projection | HIGH | Missing weight or global proximity fallback blocks. |
| Complete topology InputXML is securely parsed; trace attributes are verified and removed individually into extension evidence. | IMPLEMENTED_AND_TESTED | topology InputXML policy | PR-7 | inputxml modules and tamper tests | candidate construction | HIGH | Regex XML mutation is removed from the managed-stage path. |
| Producer `NUM*` values are assertions and are compared against PR-5 canonical owner/count authority without silent rewrite. | IMPLEMENTED_AND_TESTED | PR-5 count authority | canonical contract v1 | inputxml control module and tamper tests | control counts | HIGH | Mismatch blocks and records asserted/actual evidence. |
| Required geometry/engineering sentinels block; optional absence is represented by removal plus explicit evidence. | IMPLEMENTED_AND_TESTED | sentinel policy | PR-7 | inputxml modules and tamper tests | candidate values | HIGH | Generic family inheritance is bypassed. |
| Parsed InputXML topology, SVG scene, parity report, and metrics are independently reconciled from returned arrays. | IMPLEMENTED_AND_TESTED | parity/metric policy | v1 | `managed_stage_parity.py` | artifact acceptance | HIGH | Failed, missing, stale, forged, or inconsistent evidence blocks. |
| `InputXmlManagedStageSourceAccountingProof.v1` permits COMPLETE only when every registered invariant is zero. | IMPLEMENTED_AND_TESTED | accounting contract | v1 | `managed_stage_accounting.py` | source accounting | HIGH | Inventory, digest, document, extension, and index records cannot self-certify. |
| Accepted, blocked-with-candidate, and blocked-without-candidate results are deterministic across processes and hash seeds. | IMPLEMENTED_AND_TESTED | PR-4 serialization plus PR-7 process proof | current | managed-stage determinism tests | compiler artifacts | HIGH | Run on Ubuntu and Windows in Canonical Compiler. |
| Blocked managed-stage bundles never load or invoke the production CII writer. | IMPLEMENTED_AND_TESTED | assured projection gate | current | blocked-publication test | production containment | HIGH | Preserve writer as read-only downstream authority. |
| Shared producer behavior remains protected by static, parity, support, ASIM-1835, 1885_NC, and PSI116 tests. | WORKFLOW_GATED | component-topology contracts | current | Canonical Compiler and component workflows | shared producer | HIGH | Do not weaken aggregate gates. |
| Production CII writer, deterministic serialization, publication protocol, browser UI, and other profile semantics are unchanged. | VERIFIED_SCOPE_BOUNDARY | repository diff and governing ADRs | current | PR-7 stack | repository | HIGH | Treat any contrary diff as a scope blocker. |

## Corpus classification

The focused corpus is under `contracts/inputxml/v1/golden/managed-stage/` and includes straight PIPE, multiple branches, safe deferred attachment, bend projection gap, unsupported valve, duplicate key, ambiguous wrapper, and manifest references to artifact/accounting/benchmark proofs. Differences are classified as `NO_CHANGE`, `INTENDED_ACCOUNTING_CORRECTION`, `INTENDED_PROFILE_CORRECTION`, `REPRESENTATION_ONLY`, `ENGINEERING_CHANGE_WITH_AUTHORITY`, or `UNKNOWN — BLOCK MERGE`.

## Validation authority

The final PR-7D head must pass, without queued/skipped/cancelled/in-progress jobs:

- InputXML Schema Suite;
- InputXML Canonical Compiler, including Ubuntu and Windows deterministic jobs;
- InputXML Assurance Ledger;
- InputXML Assured CII Projection;
- InputXML End-to-End Regression Matrix;
- component-topology static/parity/support tests;
- ASIM-1835 and 1885_NC producer proofs;
- PSI116 component-topology regression.

Workflow run IDs and final head SHA are recorded in the PR-7D body after the final immutable validation head completes.

## Deferred

New bend engineering, Tee/Olet SIF projection, unsupported inline component engineering, full resource characterization, full-corpus expansion, migration, browser redesign, and production activation remain unauthorized. PR-8 is not started.

CII writer: **UNCHANGED**  
Serialization policy: **UNCHANGED**  
Publication protocol: **UNCHANGED**  
Migration: **NOT AUTHORIZED**  
PR-8: **NOT STARTED**  
Merge status: **NOT MERGED**
