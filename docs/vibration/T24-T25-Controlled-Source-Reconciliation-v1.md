# T2.4 / T2.5 Controlled-Source Reconciliation — v1

Issue: #652 · Parent: #450 · Family: #429

## Disposition

```text
T2.4 controlled-source qualification   NOT_QUALIFIED
T2.5 controlled-source qualification   NOT_QUALIFIED
controlled page execution              NOT_RUN / ENVIRONMENT_BLOCKED
production rule master                 FORBIDDEN
production calculator                  FORBIDDEN
engineeringAuthority                   NONE
screeningAuthority                     NOT_AUTHORIZED
designAuthority                        false
```

This record is source qualification evidence only. It does not implement a vibration calculation and does not promote any source-register state.

## Controlled object

```text
repository  reallaksh19/Common
commit      fb549185b9b27edc2379734240320a85c5bef9f6
path        EI - AVIFF Guidelines 2nd Edition.pdf
blob        9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size        10,348,594 bytes
edition     2nd Edition
T2.4        Flowchart T2-2 · printed page 55 · navigation only
T2.5        Flowchart T2-3 · printed page 56 · navigation only
```

The binary identity is pinned. The current connector cannot expose the PDF page bytes: exact-blob access reaches the binary object but fails while decoding the PDF as UTF-8. The web path likewise did not provide the pinned controlled page content. No page hash, section hash or controlled branch observation is claimed.

## Public corroboration boundary

Energy Institute publisher metadata confirms the 2nd edition, January 2008 publication and ISBN 9780852934630. Searchable public copies additionally corroborate the **high-level** T2.4/T2.5 decision topology. Those copies are uncontrolled and are not source authority.

The machine-readable candidate topology is retained in:

```text
ValidationRecords/VibrationMasters/t24-t25-source-qualification-blocked-v1.json
```

It is deliberately marked `NOT_QUALIFIED_PUBLIC_CORROBORATION_ONLY`.

### T2.4 candidate topology — not qualified

At a high level, the corroborated flow distinguishes:

1. whether specific reciprocating/positive-displacement equipment information is known;
2. whether both a 112 kW power threshold and 35 bar discharge-pressure threshold are satisfied;
3. otherwise, whether the referenced API 618/674 acoustic/mechanical study covers the operating envelope and resulting recommendations are implemented;
4. candidate LOF outcomes of 1.0 or 0.4 depending on those branches.

Exact equality direction, pressure basis/location, minimum evidence for “specific information”, and exact study wording remain controlled-source predicates.

### T2.5 candidate topology — not qualified

At a high level, the corroborated flow distinguishes:

1. whether specific centrifugal-compressor information is known;
2. whether the compressor displays a rotating-stall characteristic;
3. if so, whether it operates at low flow around the rotating-stall conditions;
4. candidate LOF outcomes 1.0, 0.2 or 0.4 depending on those branches.

The method does **not** gain a universal numeric compressor-map margin from this evidence package. OEM compressor maps/stall evidence remain project/OEM evidence.

## Secondary synthesis quarantine

`reallaksh19/Advanced_Analysis/docs/EI data/P2_Pulsation_and_Specialist_Mechanisms.md` is useful investigation material but not controlled authority. The following details stay quarantined until the exact EI pages prove them:

- named machine-data completeness fields such as speed/stroke/cylinder/bottle details;
- API 618 `Design Approach 3` wording;
- named aerodynamic/stage/diffuser/impeller fields for T2.5;
- a universal `Q <= 1.15 * Q_stall` rule;
- rotating-stall frequency percentage claims as an EI rule input.

No production constant, predicate, UI rule or benchmark may import these secondary-only details.

## Repository identity discrepancy

The source register currently records the T2.4 entry as:

```text
mechanismId = reciprocatingPositiveDisplacement
```

while the canonical mechanism registry uses:

```text
mechanismId = reciprocatingPulsation
```

This is `IDENTITY_RECONCILIATION_REQUIRED`. This blocked qualification slice does not guess whether the source-register field should be rewritten, aliased or treated as a source-target name. That decision should be made when the exact controlled rule package is reconciled.

## Required next evidence

Before any rule-master or calculator mutation:

1. execute the exact controlled binary in a binary/PDF-capable runtime;
2. render/inspect the exact T2.4 and T2.5 pages and capture page hashes;
3. reconcile every branch, label and equality boundary;
4. establish discharge-pressure basis/location semantics;
5. establish minimum project evidence for “specific information known”;
6. establish exact API 618/674 study and operating-envelope wording;
7. establish rotating-stall characteristic and low-flow evidence semantics;
8. prove whether any numeric stall margin exists in the controlled EI method;
9. distinguish universal EI rule data from OEM/project evidence;
10. resolve the T2.4 mechanism-ID discrepancy;
11. build independent boundary vectors before production activation;
12. perform a separate authority review.

Until then, T2.4/T2.5 remain source-gated and non-authorizing.
