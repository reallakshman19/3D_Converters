# TE-014 — Strict PSI116 Canonical Intake and CII(2019) Proof

## Authority boundary

TE-014 consumes exactly one accepted `TopoEnrichedXmlProductionResult.v1` in `ENFORCED` mode. The selected production bundle must be explicitly `selectable=true` both at the production-result root and inside the accepted selection artifact. TE-014 never invokes the TE-013 writer and never treats caller-supplied hashes as proof.

```text
accepted selectable TE-013 production result
→ recompute TE-013 result, bundle, XML, trace, node-plan, topology-index,
  audit, parity, selection and registry-reference hashes
→ exact selected PSI116 UTF-8 bytes
→ registered pipesstressexport-psi116-xml compiler profile
→ strict PSI116 intake and complete source accounting
→ policy-hashed occurrence/section ownership
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

```text
profileId = pipesstressexport-psi116-xml
adapterId = psi116-to-canonical-v1
```

## Occurrence and section ownership

Adjacent source nodes define one canonical `PIPINGELEMENT`; engineering ownership is not inferred from proximity or source order alone. Every emitted occurrence receives one explicit role:

```text
OUTGOING_ENDPOINT_OWNER
INCOMING_ELEMENT_OWNER
TOPOLOGY_ONLY_ENDPOINT
```

The incoming occurrence owns the base element and its `TO_NODE` engineering fields. A branch-start occurrence may own the outgoing element only when all of these are true:

- it is the first node in the source branch;
- `Endpoint=0`;
- the accepted TE-013 projection role is `ARRIVE`;
- its component has an accepted section rule.

Section claims are explicit:

```text
ELEMENTS_FROM
ELEMENTS_TO
BEND
RIGID
RESTRANT
```

Two occurrences may reference the same canonical/CII element only when their section claims do not conflict. This permits, for example, a branch-start `ELBO` to own `BEND + ELEMENTS_FROM` while the following `VALV` owns `RIGID + ELEMENTS_TO`. There must be exactly one incoming/base owner per element and at most one owner for each singleton auxiliary section.

An emitted occurrence may be intentionally omitted only as `INTENTIONALLY_OMITTED_PAYLOAD_FREE_ENDPOINT`, and only when it is an isolated topology endpoint of an approved payload-free type. `ELBO`, `VALV`, `FLAN`, `ATTA`, bend, rigid, restraint/support, non-zero SIF, weight, bend radius or other mandatory engineering content without an element/section claim blocks with `PSI116_UNPROJECTABLE_ENGINEERING_CONTENT`.

## Projection policy

`psi116-canonical-projection-policy.json` is included in the proof chain by canonical JSON SHA-256. It fixes:

- exact PSI116 namespace and root;
- identity XYZ and millimetre coordinate mapping;
- adjacent-node element formation and exact `to - from` deltas;
- explicit outgoing and incoming occurrence roles;
- section-scoped shared-element ownership;
- exact nine temperature and pressure cases;
- supported component types and required projection sections;
- bend ownership (`ELBO`, endpoint `0`, positive radius);
- rigid ownership (`Rigid=2` and explicit weight);
- exact restraint type-code mapping and explicit gap, stiffness and friction;
- no synthetic open-end restraints;
- no node allocation, topology repair, coordinate inference, short-element contraction, component substitution or wall-clock fallback.

## HYDRO_PRESSURE authority

PSI116 does not contain a hydrostatic-test pressure field. Canonical `HYDRO_PRESSURE="0"` is therefore not a parser fallback. It is a policy-normalized explicit absence with all of the following evidence:

```text
canonical value:       0 pascal
authority:             TE014_POLICY_EXPLICIT_ABSENCE_OF_HYDROSTATIC_TEST_CASE
source disposition:    PSI116_SOURCE_CONTRACT_HAS_NO_HYDRO_PRESSURE_FIELD
projection disposition: NORMALIZE_EXPLICIT_ABSENCE
fallbackAllowed:       false
CII section:           ELEMENTS
```

The policy hash, authority, value and disposition are recorded for every canonical element in the compiler decision ledger, assurance ledger and TE-014 loss accounting. Missing or altered policy evidence blocks before canonical acceptance.

## Source and loss accounting

Every source container, branch, node, field, restraint and trace field receives an explicit decision-ledger disposition. Every emitted occurrence receives a projection or payload-free omission row. Reserved TE-013 occurrences remain absent from PSI and CII and receive explicit `RESERVED` evidence.

PASS requires:

```text
nodeNumberMismatches = 0
unaccountedOccurrences = 0
lossAccounting.unexplained = []
no conflicting element/section claims
```

## Canonical and CII proof

The profile emits canonical InputXML only through the existing compiler. The frozen canonical XSD and Schematron must pass, and the compiler ledger binds the exact source and canonical byte hashes.

The proof calls the accepted assured InputXML-to-CII boundary. It does not import or execute the legacy `xml_to_cii2019.py` converter. Generated CII bytes are written to and read from a temporary file before the accepted independent reparser runs.

The projection ledger binds each occurrence to identity, node number, source entity/ports, PSI position, role, section claims, canonical element, CII element, governing policy and independently reparsed evidence.

## Required regression evidence

The focused and adversarial suites prove:

- the accepted real fixture blocks because its isolated emitted `FLAN` has no valid element projection;
- a TE-013-regenerated Branch A fixture projects the real `ELBO` as canonical `BEND` and independently reparsed CII evidence;
- the adjacent `VALV` projects `RIGID` on the same element without section conflict;
- branch-start bend, rigid, restraint and support ownership;
- isolated `ELBO`, `VALV`, `FLAN` and `ATTA` rejection;
- omission only for a payload-free topology endpoint;
- explicit hydro-pressure policy evidence;
- rejection of `selectable=false` even though TE-013's historical bundle hash excludes that field.

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
