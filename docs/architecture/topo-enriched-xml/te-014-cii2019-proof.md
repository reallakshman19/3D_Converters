# TE-014 — Strict PSI116 Canonical Intake and CII(2019) Proof

## Authority boundary

TE-014 consumes exactly one accepted `TopoEnrichedXmlProductionResult.v1` in `ENFORCED` mode. It never invokes the TE-013 writer and never treats caller-supplied hashes as proof.

```text
accepted TE-013 production result
→ recompute TE-013 result, bundle, XML, trace, node-plan, topology-index,
  audit, parity, selection and registry-reference hashes
→ exact selected PSI116 UTF-8 bytes
→ registered pipesstressexport-psi116-xml compiler profile
→ strict PSI116 intake and source accounting
→ deterministic canonical {COADE}CAESARII InputXML
→ frozen canonical XSD and Schematron
→ accepted InputXML assurance ledger
→ unchanged assured InputXML→CII(2019) writer
→ save/read generated CII bytes
→ independent accepted CII reparser
→ TopoEnrichedXmlCiiProjectionLedger.v1
→ TopoEnrichedXmlCiiProofResult.v1
```

A blocker at any stage clears `acceptedCiiArtifact` and `acceptedCiiBytes`.

## Registered profile

The compiler registry identifies only the exact root:

```text
{http://aveva.com/pipeStress116.xsd}PipeStressExport
```

The profile accepts one context key only: `te013ProductionResult`. Runtime switches, alternate implementations, hidden defaults, namespace aliases and unregistered children or attributes are prohibited.

The compiler records the profile and adapter identities:

```text
profileId = pipesstressexport-psi116-xml
adapterId = psi116-to-canonical-v1
```

## Projection policy

`psi116-canonical-projection-policy.json` is included in the proof chain by its canonical JSON SHA-256. It fixes:

- exact PSI116 namespace and root;
- identity XYZ and millimetre coordinate mapping;
- `TO_NODE` element ownership and exact `to - from` deltas;
- exact nine temperature and pressure cases;
- supported component types and blocking types;
- bend ownership (`ELBO`, endpoint `0`, positive radius);
- rigid ownership (`Rigid=2` and explicit weight);
- exact restraint type-code mapping and explicit gap, stiffness and friction;
- no synthetic open-end restraints;
- no node allocation, topology repair, coordinate inference, short-element contraction, component substitution, field defaulting or wall-clock fallback.

## Source accounting

Every source container, branch, node, field, restraint and trace field receives an explicit decision-ledger disposition. Consecutive traced source nodes form one canonical `PIPINGELEMENT`, owned by the `TO_NODE` occurrence.

A branch-start node has no incoming canonical element and is recorded as `INTENTIONALLY_OMITTED_BRANCH_BOUNDARY`. A one-node branch is recorded as `INTENTIONALLY_OMITTED_ISOLATED_NODE`. Reserved TE-013 occurrences remain absent from PSI and CII and receive explicit `RESERVED` evidence rows.

No occurrence may disappear silently. PASS requires:

```text
nodeNumberMismatches = 0
unaccountedOccurrences = 0
lossAccounting.unexplained = []
```

## Canonical and CII proof

The profile emits canonical InputXML only through the existing compiler. The frozen canonical XSD and Schematron must pass, and the compiler ledger binds the exact source and canonical byte hashes.

The proof then calls the accepted assured InputXML-to-CII boundary. It does not import or execute the legacy `xml_to_cii2019.py` converter. Generated CII bytes are written to and read from a temporary file before the accepted independent reparser runs.

The TE-014 projection ledger binds each emitted occurrence to:

- occurrence, logical-node and history-node identities;
- exact engineering node number;
- source entity and source-port ownership;
- PSI branch and node positions;
- canonical element ID and ordinal;
- CII element ordinal;
- projected, intentionally omitted, reserved or blocked disposition;
- governing projection rule and policy hash.

## Determinism

No TE-014 module reads the wall clock, random state or mutable global configuration. Identical production-result bytes and repository contracts produce identical canonical XML, CII bytes, ledgers and proof-result bytes.

## Validation commands

```bash
python -m pytest tests/test_topo_enriched_xml_cii2019_proof.py
python -m pytest tests/test_topo_enriched_xml_cii2019_adversarial.py
python -m pytest tests/test_inputxml_cii_assured_projection.py
python -m pytest tests/test_inputxml_cii_reparse_proof.py
python -m pytest tests/test_inputxml_assurance_integration.py
python -m pytest tests/test_inputxml_contract_bundle_gate.py
python -m pytest tests/test_inputxml_canonical_compiler.py
python -m pytest tests/test_inputxml_compiler_state_machine.py
node tests/topo-enriched-xml-production.test.mjs
node tests/topo-enriched-xml-production-adversarial.test.mjs
```
