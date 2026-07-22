# PR-9 — UXML/RVM exact-topology implementation evidence

## Authority and identity

| Field | Value |
|---|---|
| Governing concept | `docs/inputxml/InputXML-Compatibility-Adapter-Canonical-Resolver-Concept.md` |
| Starting `main` SHA | `64b45ddd5f51a3df24315cd7e8dccfbd070fe665` |
| PR-8 ancestry | merge commit `c23f49c6d5a0e2fab392c08a52d125966fd43fa9` confirmed in starting-main ancestry |
| Qualified implementation head before evidence-only commits | `14374561e95d111e27865f6fd29a3e9344a0f3ac` |
| Final PR head | recorded in the draft PR and final implementation report; a Git commit cannot contain its own resulting SHA |
| Affected profile | `uxml-rvm-intake` / `uxml-rvm-to-canonical` |
| Result policy | `VALIDATED_UXML_EXACT_TOPOLOGY_EXPLICIT_ENGINEERING_AND_COORDINATE_FRAME` |
| GitHub Actions | **NOT USED BY OWNER DIRECTION** |

## Material claims

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| Canonical topology is created only from direct registered exact-port declarations or an approved exact-topology plan. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 Work Pack | `UxmlRvmExactTopologyPlan.v1` | `uxml_rvm_authority.py`, topology tests 1-20 | UXML/RVM topology | HIGH | Reject coordinate-, tolerance-, ray-, proximity-, order-, and export-label-derived connectivity. |
| Coordinates are independent corroboration and never create logical-node membership. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 Work Pack | `UxmlRvmCoordinateContext.v1` | `uxml_rvm_contracts.py`, coordinate tests 21-35 | every endpoint | HIGH | Require exact transformed equality for ports in one declared node; allow equal coordinates across distinct nodes. |
| Coordinate transforms are exact signed-axis permutations with explicit registered scale, finite offset, named frames, and determinant-consistent handedness. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 Work Pack | v1 | `validate_coordinate_context` | coordinate authority | HIGH | Reject matrices, shear, arbitrary rotation, non-uniform scale, inferred units, unknown nested fields, and restamps. |
| Sorted graph-order node numbering is removed. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 Work Pack | v1 | `resolve_topology`, tests 36-42 | logical nodes | HIGH | Require source anchor number or approved plan number; enforce positive integer and one-to-one ownership. |
| Caller/default line fallback is removed and every line alias is reconciled. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 Work Pack | v1 | `resolve_lines`, tests 43-50 | component and node ownership | HIGH | Block missing, conflicting, overridden, or cross-line ownership. |
| Engineering lookup collects all aliases and external evidence cannot silently override source evidence. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 Work Pack | `UxmlRvmEngineeringContext.v1` | `resolve_engineering`, tests 51-60 | PIPE OD and wall thickness | HIGH | Block contradictions, stale context, missing fields, unsupported evidence, and bore-as-OD substitution. |
| The bridge is adaptation/inventory only; no UniversalTopoGraph, ray graph, graph comparison, decision gate, or accepted handoff is invoked. | IMPLEMENTED_AND_STATIC_VERIFIED | PR-9 isolation requirement | `InputXmlUxmlRvmBridgeRequest.v1` / `Result.v1` | `node_uxml_rvm_bridge.mjs` | bridge boundary | HIGH | Preserve shared runtime behavior unchanged and give graph/ray/proximity evidence zero canonical authority. |
| Bridge input and output are strict, bounded, deterministic, and hash verified independently by Python. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 bridge requirement | v1 | bridge, contracts, inventory; tests 61-71 | subprocess boundary | HIGH | Reject duplicate keys, invalid UTF-8, trailing data, wrong identity/hash, timeout, overflow, surrogates, and source mutation. |
| Authority decisions stored in the canonicalization ledger contain only strict JSON-native values. | IMPLEMENTED_AND_FOCUSED_TESTED | deterministic publication contract | v1 | `uxml_rvm_ledger.py`; positive ledger serialization test | ledger publication | HIGH | Convert Decimal decisions to canonical strings before ledger insertion. |
| Source accounting reconstructs expected relations from source and approved authority rather than candidate XML or ledger. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 accounting requirement | `InputXmlUxmlRvmSourceAccountingProof.v1` | `uxml_rvm_accounting.py`, tests 72-85 | source accounting | HIGH | Require every invariant to equal zero and block coordinated substitutions. |
| Unsupported engineering identities remain preserved and blocking. | IMPLEMENTED_AND_FOCUSED_TESTED | PR-9 compatibility boundary | PR-9 | `uxml_rvm.py`, tests 59-60 | non-PIPE and support evidence | HIGH | Emit no new projection; retain explicit blocking ledger records. |
| No shared UXML, shared RVM, workflow, schema, registry, serialization, publication, or production-writer file is changed. | VERIFIED_REMOTE_DIFF | PR-9 scope lock | current branch | GitHub compare result | repository | HIGH | Treat any contrary changed path as a PR blocker. |
| Full repository compiler regressions must be rerun by independent review on a complete checkout. | ENVIRONMENT_LIMITATION | owner local-proof policy | current | known limitations below | merge qualification | HIGH | Keep PR draft and unmerged until those commands pass on the exact final head. |

## Implemented contracts

### Exact topology

- Direct UXML: `EXACT_LOGICAL_NODE` plus `EXACT_PORT_CONNECTION`, each `EXACT_SOURCE` and evidence-referenced.
- RVM: source-bound and adapted-UXML-bound `UxmlRvmExactTopologyPlan.v1`.
- Every required PIPE endpoint appears once; all references and ownership resolve before maps are authoritative.
- Connections are explicitly symmetric/undirected exact and remain within one declared node.
- Ray, proximity, tolerance, generic topology decisions, and accepted handoffs are not bridge outputs and cannot authorize canonical data.

### Coordinate context

`UxmlRvmCoordinateContext.v1` binds source hash/kind, authority identity/type, source/target frames and units, exact axis map, scale, offset, handedness, evidence, and semantic hash. An independently pinned authority manifest binds its hash.

### Node number

Source anchors and approved plan values are reconciled. Values are finite positive integers, globally unique, and owned by exactly one logical node. Missing, duplicate, fractional, substituted, reordered, or sorted-generated values block.

### Line identity

All component and matching pipeline `pipelineRef`, `lineKey`, and `lineNo` occurrences are retained. Equivalent values normalize; contradictory values block. Plan assignments may fill an absence but cannot override source evidence. Defaults and filenames are ignored as authority.

### Engineering context

`UxmlRvmEngineeringContext.v1` supplies source-bound per-component field decisions. Source and external values must agree. OD and wall thickness are mandatory for emitted PIPEs. Bore is not an OD alias.

### Bridge

The request binds dialect, adapter, source kind/hash/length/base64, three authority hashes, manifest hash, expected bridge identity, and request hash. The result binds request/source, adapted UXML, source inventory, collection hashes, diagnostic hash, bridge identity, and result hash.

### Source accounting

The proof accounts source/RVM rows, sources, mappings, pipelines, components, anchors, ports, segments, supports, topology hints, ray evidence, loss contract, diagnostics, authority artifacts, logical nodes, node numbers, lines, coordinates, engineering fields, canonical elements, and unsupported records. Relations and cardinalities are reconstructed before comparison.

## Compatibility changes and blockers

Coordinate-only exact coincidence and the previous 6 mm tolerance no longer pass. Caller-supplied tolerance, ray-only or face-proximity-only evidence, restamped `exportAllowed`, accepted handoff, loose `coordinateBasis`, arbitrary matrix, sorted numbering, `defaultLine`, caller `lineId`, first-value-wins engineering, bore substitution, and missing topology/coordinate/node/line/engineering authority all block with named codes.

## Focused tests

### Positive cases

The focused suite implements all 15 requested positive categories, plus one strict ledger-serialization regression:

1. direct exact UXML declarations;
2. RVM rows plus exact plan;
3. source anchor node numbers;
4. external node-number plan;
5. two isolated lines;
6. distinct nodes at identical coordinates;
7. exact equal connected coordinates;
8. signed-axis transform;
9. exact conversion to millimetres;
10. explicit offset;
11. agreeing source/external engineering;
12. shuffled object keys;
13. shuffled non-semantic evidence;
14. independent Node processes/hash seeds;
15. zero-invariant accounting proof;
16. ledger records are strict JSON serializable.

### Adversarial cases

All numbered Work Pack cases 1-85 are represented. Each authority failure asserts a named blocker code. Each coordinated accounting tamper asserts a specific nonzero invariant or exact duplicate/cardinality blocker.

## Local command evidence

| Command | Exit | Result |
|---|---:|---|
| `python -m py_compile scripts/inputxml_compiler/uxml_rvm*.py tests/test_inputxml_uxml_rvm_*.py` | 0 | syntax pass in reconstructed PR-9 proof checkout |
| `node --check scripts/inputxml_compiler/node_uxml_rvm_bridge.mjs` | 0 | syntax pass |
| `python -m unittest -v tests/test_inputxml_uxml_rvm_adapter.py` | 0 | 16 passed |
| `python -m unittest -v tests/test_inputxml_uxml_rvm_*.py` | 0 | 104 discovered; 101 passed, 3 full-compiler integration tests skipped because the execution environment did not contain the complete private repository checkout |
| explicit focused four-module command | 0 | 101 passed in 3.109 s |

Focused resource observation from `/usr/bin/time -v`:

```text
wall time: 0:03.70
maximum resident set size: 182780 kB
exit status: 0
```

These are observations only. PR-10 resource characterization is not started.

## Process determinism

The accepted direct fixture was executed nine times in separate Python processes under `PYTHONHASHSEED=1,17,991` (three runs each). Exactly one hash tuple resulted:

```text
canonical XML SHA-256:       420b895712e446287b44bad6e8fe1b4ffe9d7ea1e54b13011b7ad08660ee8ecd
ledger JSON SHA-256:         7e9a8b7c4cd1b0509b410ce642bbfcec474ec90727adc9cd5e1d8edd486fed5a
validation JSON SHA-256:     311eaa63ba3bec6fb490ba25220853b221ff31eef12af4c2589cf3955ff470f5
accounting bytes SHA-256:    97d573af401c2782d54d13764ff17b2ffa472c9faa485390f5ca87c8080f2e9b
accounting semantic hash:    08e5ad5dcd091c04c9372d72f0e5af0adc49e882cfa2950ffcd61385f012ae67
diagnostic ordering SHA-256: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
```

Three independently launched Node bridge processes produced identical stdout hash:

```text
6b8755bf936553725eaeba5b41c3ee3489189bd382c650a7b45208eb93f331bc
```

No Windows or cross-platform claim is made.

## Broader regression command set discovered from current repository tests

The current repository test inventory establishes these local qualification groups:

```text
python -m unittest -v tests/test_inputxml_contract_bundle_gate.py
python -m unittest -v tests/test_inputxml_compiler_state_machine.py
python -m unittest -v tests/test_inputxml_managed_stage_*.py
python -m unittest -v tests/test_inputxml_pdf_input_echo_*.py
python -m unittest -v tests/test_inputxml_uxml_rvm_*.py
python -m unittest -v tests/test_inputxml_assurance_ledger.py tests/test_inputxml_assurance_integration.py
python -m unittest -v tests/test_inputxml_cii_assured_projection.py tests/test_inputxml_cii_assured_integration.py
python -m unittest -v tests/test_inputxml_e2e_regression_matrix.py
```

Direct canonical CLI smoke must use the repository CLI and the current golden minimal canonical fixture.

The connected GitHub environment exposed repository files but not an authenticated local clone, `gh`, or outbound GitHub network access. Therefore the non-PR-9 groups and direct CLI smoke were not executable in this agent process. They remain mandatory independent-review gates on the exact final PR head. GitHub Actions were intentionally not used.

## Changed files

Expected PR-9 paths only:

```text
scripts/inputxml_compiler/node_uxml_rvm_bridge.mjs
scripts/inputxml_compiler/uxml_rvm.py
scripts/inputxml_compiler/uxml_rvm_accounting.py
scripts/inputxml_compiler/uxml_rvm_authority.py
scripts/inputxml_compiler/uxml_rvm_contracts.py
scripts/inputxml_compiler/uxml_rvm_inventory.py
scripts/inputxml_compiler/uxml_rvm_ledger.py
scripts/inputxml_compiler/uxml_rvm_manifest.py
tests/test_inputxml_uxml_rvm_adapter.py
tests/test_inputxml_uxml_rvm_accounting.py
tests/test_inputxml_uxml_rvm_adversarial.py
tests/test_inputxml_uxml_rvm_bridge_security.py
tests/test_inputxml_uxml_rvm_compiler.py
tests/test_inputxml_uxml_rvm_support.py
tests/fixtures/inputxml/uxml-rvm/direct-exact.json
tests/fixtures/inputxml/uxml-rvm/rvm-rows.json
docs/inputxml/ADR-008-uxml-rvm-exact-topology-coordinate-context.md
docs/inputxml/PR-9-uxml-rvm-implementation-evidence.md
```

## Frozen-file confirmation

```text
shared uxml/**: unchanged
shared rvm-pcf-extract/**: unchanged
.github/workflows/**: unchanged
canonical XSD/Schematron: unchanged
dialect/adapter registries: unchanged
compiler/dispatcher/state machine: unchanged
serialization/publication: unchanged
production CII writer: unchanged
```

## Known limitations and disposition

- Full repository regressions and direct CLI smoke were not executable in the connector-only environment; independent owner review must run them locally before approval.
- Cross-platform behavior was not executed and is not claimed.
- Resource observations are focused measurements, not PR-10 characterization.
- Production writer activation and migration remain unauthorized.
- The PR must remain draft, open, unmerged, and unapproved by the implementation agent.

## Rollback scope

Revert only the PR-9 changed paths above. No shared runtime, workflow, registry, schema, publication, or production-writer rollback is required.

## Programme status

```text
Production CII writer: UNCHANGED
Migration:             NOT AUTHORIZED
PR-10:                 NOT STARTED
GitHub Actions:        NOT USED BY OWNER DIRECTION
Independent review:    REQUIRED ON EXACT FINAL HEAD
```
