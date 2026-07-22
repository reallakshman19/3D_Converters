# PR-9 — UXML/RVM exact-topology corrective implementation evidence

## Identity

| Field | Value |
|---|---|
| Affected profile | `uxml-rvm-intake` / `uxml-rvm-to-canonical` |
| Starting main | `64b45ddd5f51a3df24315cd7e8dccfbd070fe665` |
| Corrected branch | `fix/inputxml-pr9-uxml-rvm-exact-topology` |
| GitHub Actions | Not used by owner direction |
| Production CII writer | Unchanged |
| Migration | Not authorized |
| PR-10 | Not started |

The exact final commit is recorded in the PR after publication because a commit cannot contain its own SHA.

## Owner-review correction claims

| Claim | Classification | Authority | Version | Location | Applicability | Confidence | Action |
|---|---|---|---|---|---|---|---|
| Manifest approval is external to caller context. | Implemented and focused-tested | PR-9 owner review | `UxmlRvmAuthorityManifest.v1` | `uxml_rvm_trust.py`, `uxml_rvm_manifest.py` | all accepted UXML/RVM compiles | High | Verify detached process-configured HMAC and key ID; missing trust blocks. |
| Accounting inspects actual XML and ledger surfaces. | Implemented and focused-tested | PR-9 owner review | `InputXmlUxmlRvmSourceAccountingProof.v1` | `uxml_rvm_accounting.py`, `uxml_rvm.py` | final canonical candidate | High | Serialize/reparse XML and compare actual ledger tuples plus extension bindings with source-derived expectations. |
| Supports and restraints independently block. | Implemented and focused-tested | PR-9 boundary | PR-9 | `uxml_rvm_inventory.py`, `uxml_rvm.py` | `supports[]` and unsupported components | High | Validate exact owner/anchor and create blocking decisions regardless of matching component type. |
| Direct UXML intake is closed and unit-aware. | Implemented and focused-tested | PR-9 owner review | UXML topology v1 | `uxml_rvm_inventory.py` | direct and adapted UXML | High | Require explicit units, references, ownership, coordinate agreement, and blocking diagnostics. |
| Bridge JSON handling is loss-aware. | Implemented and focused-tested | PR-9 owner review | bridge v1 | `uxml_rvm_json.py`, `node_uxml_rvm_bridge.mjs` | process boundary | High | Reject unsafe integers and precision loss; preserve prototype keys as own data; use deterministic code-point key ordering. |
| Process limits are in-flight bounds. | Implemented and focused-tested | PR-9 owner review | bridge v1 | `uxml_rvm_process.py` | bridge execution | High | Stream bounded output and kill the child on limit or timeout. |
| Unsupported junctions fail closed. | Implemented and focused-tested | PR-9 projection boundary | PR-9 | `uxml_rvm_topology.py` | logical nodes | High | Block degree greater than two until an approved junction contract exists. |
| Canonical metadata has explicit authority. | Implemented and focused-tested | PR-9 owner review | `UxmlRvmCanonicalMetadata.v1` | `uxml_rvm_contracts.py`, `uxml_rvm.py` | model header | High | Remove constant/header fallbacks and reject adapter-generated epoch time. |
| End-to-end UXML/RVM matrix uses PR-9 contracts. | Implemented; broader execution pending | owner-approved narrow matrix amendment | PR-9 | `scripts/inputxml_e2e_regression_matrix.py` | matrix UXML/RVM case | Medium | Replace obsolete tolerance context with direct exact fixture and detached-approved context. |

## Trust boundary

The trusted values are process configuration:

```text
INPUTXML_UXML_RVM_APPROVAL_HMAC_KEY
INPUTXML_UXML_RVM_APPROVAL_KEY_ID
```

They are not read from compiler `context`. The context carries candidate artifacts only. The manifest binds coordinate, topology, engineering, and canonical-metadata hashes. Full artifact and manifest restamping fails unless the external approval holder signs the replacement manifest.

## Accounting surfaces

The final proof compares independently reconstructed expected records with:

- reparsed `PIPINGMODEL/PIPINGELEMENT` attributes;
- actual `UXML_RVM_LOGICAL_NODE_DECISION`, line, engineering, and PIPE ledger records;
- actual extension digest records;
- actual model metadata;
- unsupported component/support dispositions;
- bridge request/result and source-inventory hashes.

The proof is inserted only after these comparisons and its final extension binding is checked separately.

## Focused local proof

Executed in the reconstructed connector-side proof checkout:

```text
python -m py_compile scripts/inputxml_compiler/*.py tests/test_inputxml_uxml_rvm_*.py
node --check scripts/inputxml_compiler/node_uxml_rvm_bridge.mjs
python -m unittest -v tests/test_inputxml_uxml_rvm_*.py
```

Result:

```text
107 discovered
104 passed
3 full-compiler integration tests skipped because the connector environment lacks the complete repository checkout
```

The 104 executed tests include the retained numbered adversarial suite and detached-approval restamping, reparsed XML plus actual-ledger substitution, standalone support blocking, orphan ownership, unit contradiction, anchor/port disagreement, unsafe integer and precision loss, prototype keys, non-BMP ordering, real output overflow termination, unsupported junctions, generated metadata, and deterministic bridge output.

## Remaining independent gate

Before the PR is marked ready or merged, run on the exact corrected head in a complete checkout:

- all three full-compiler integration tests without skips;
- contract-bundle tests;
- compiler state-machine tests;
- PR-7 managed-stage regressions;
- PR-8 PDF Input Echo regressions;
- assurance-ledger tests;
- assured CII projection tests;
- complete end-to-end matrix;
- direct canonical CLI smoke.

No cross-platform or Windows claim is made. The PR must remain draft until this independent gate passes.
