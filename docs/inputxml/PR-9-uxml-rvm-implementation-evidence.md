# PR-9 — UXML/RVM corrective implementation evidence

## Identity and containment

| Field | Value |
|---|---|
| Profile | `uxml-rvm-intake` / `uxml-rvm-to-canonical` |
| Branch | `fix/inputxml-pr9-uxml-rvm-exact-topology` |
| Starting main | `64b45ddd5f51a3df24315cd7e8dccfbd070fe665` |
| GitHub Actions | Not used by owner direction |
| Shared `uxml/**` | Unchanged |
| Shared `rvm-pcf-extract/**` | Unchanged |
| Schemas/registries | Unchanged |
| Production CII writer | Unchanged |
| Migration | Not authorized |
| PR-10 | Not started |

The exact final SHA is recorded in the PR conversation because a commit cannot contain its own resulting SHA.

## Material corrective claims

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| Manifest approval is outside caller context. | Implemented and focused-tested | PR-9 owner review | `UxmlRvmAuthorityManifest.v1` | `uxml_rvm_trust.py`, `uxml_rvm_manifest.py` | accepted compiles | High | Verify process-configured HMAC and key ID; missing trust blocks. |
| Accounting examines actual output surfaces. | Implemented and focused-tested | PR-9 owner review | `InputXmlUxmlRvmSourceAccountingProof.v1` | `uxml_rvm_accounting.py`, `uxml_rvm.py` | final candidate | High | Compare source-derived expectations with reparsed XML, actual ledger tuples, metadata and extension bindings. |
| Supports/restraints independently block. | Implemented and focused-tested | PR-9 boundary | PR-9 | `uxml_rvm_inventory.py`, `uxml_rvm.py` | `supports[]` | High | Validate owner/anchor and create blocking decisions independent of component type. |
| Direct UXML intake is closed and unit-aware. | Implemented and focused-tested | owner review | UXML topology v1 | `uxml_rvm_source_contract.py`, `uxml_rvm_inventory.py` | direct/adapted UXML | High | Require sections, units, source refs, mapping integrity, ownership, coordinate agreement and diagnostic closure. |
| Mapping evidence is internally valid. | Implemented and focused-tested | UXML mapping contract | UXML topology v1 | `uxml_rvm_source_contract.py` | `mappings[]` | High | Require profile/source format/source field/target field/confidence and bind source format to a received source. |
| Entity-local diagnostics are resolved. | Implemented and focused-tested | UXML diagnostic contract | UXML topology v1 | `uxml_rvm_source_contract.py` | entity `diagnostics[]` | High | Resolve diagnostic IDs, reject missing references, and propagate blocking severity. |
| Bridge JSON handling is loss-aware. | Implemented and focused-tested | owner review | bridge v1 | `uxml_rvm_json.py`, `node_uxml_rvm_bridge.mjs` | subprocess boundary | High | Reject unsafe integers and precision loss; preserve prototype keys; use deterministic code-point ordering. |
| Process limits are in-flight bounds. | Implemented and focused-tested | owner review | bridge v1 | `uxml_rvm_process.py` | bridge process | High | Stream bounded output and kill on timeout or limit breach. |
| Unsupported junctions fail closed. | Implemented and focused-tested | PR-9 projection boundary | PR-9 | `uxml_rvm_topology.py` | logical nodes | High | Block degree greater than two until a TEE/OLET/SIF contract exists. |
| Canonical metadata is explicit authority. | Implemented and focused-tested | owner review | `UxmlRvmCanonicalMetadata.v1` | `uxml_rvm_contracts.py`, `uxml_rvm.py` | model header | High | Remove generated fallbacks and reject adapter epoch metadata. |
| End-to-end matrix uses PR-9 contracts. | Implemented; complete execution pending | narrow matrix amendment | PR-9 | `scripts/inputxml_e2e_regression_matrix.py` | UXML/RVM matrix case | Medium | Use direct exact fixture and detached-approved context instead of tolerance configuration. |

## Detached trust boundary

Trusted process configuration:

```text
INPUTXML_UXML_RVM_APPROVAL_HMAC_KEY
INPUTXML_UXML_RVM_APPROVAL_KEY_ID
```

These values are not read from compiler `context`. The context carries candidate authority artifacts only. The manifest binds coordinate, topology, engineering and canonical-metadata hashes. A fully restamped candidate remains blocked unless the external approval holder signs the replacement manifest.

## Accounting surfaces

The final proof independently compares source and approved authority against:

- serialized and reparsed `PIPINGMODEL/PIPINGELEMENT` values;
- actual logical-node, line, engineering and PIPE ledger tuples;
- actual extension digest records;
- actual canonical model metadata;
- unsupported component and support dispositions;
- bridge request/result and inventory hashes.

The accounting proof is added after those comparisons. Its final XML extension and ledger binding is then verified separately.

## Focused local proof

Commands executed in the reconstructed connector-side proof checkout:

```text
python -m py_compile scripts/inputxml_compiler/*.py tests/test_inputxml_uxml_rvm_*.py
node --check scripts/inputxml_compiler/node_uxml_rvm_bridge.mjs
python -m unittest -q tests/test_inputxml_uxml_rvm_*.py
```

Result:

```text
112 discovered
109 passed
3 full-compiler integration tests skipped because the connector environment lacks the complete repository checkout
```

The 109 executed tests include:

- all retained numbered adversarial cases;
- detached-approval restamping;
- coordinated reparsed-XML and actual-ledger substitution;
- standalone and orphan support handling;
- unit and anchor/port contradictions;
- source-reference and mapping-source-format closure;
- missing mapping fields;
- inline and referenced entity diagnostics;
- unsafe integer and precision-loss rejection;
- prototype-key and non-BMP ordering checks;
- real subprocess output-overflow termination;
- unsupported junction blocking;
- generated metadata blocking;
- deterministic bridge output.

## Remaining independent owner gate

Before the PR is marked ready or merged, execute on the exact final head in a complete checkout:

- all three full-compiler UXML/RVM integration tests without skips;
- contract-bundle tests;
- compiler state-machine tests;
- PR-7 managed-stage regressions;
- PR-8 PDF Input Echo regressions;
- assurance-ledger tests;
- assured CII projection tests;
- complete end-to-end matrix;
- direct canonical compiler CLI smoke.

No cross-platform or Windows claim is made. The PR remains draft and unmerged until this independent gate passes.
