# T4 Thermowell Controlled-Source Reconciliation — v1

Issue #654 · Parent #450 · Family #429 · Candidate baseline PR #482

## Current disposition

```text
Table T4-1 candidate             RETAINED / NOT_QUALIFIED
controlled T4 page execution     NOT_RUN / ENVIRONMENT_BLOCKED
full T4 method qualification     NOT_QUALIFIED
production kernel                FORBIDDEN
engineeringAuthority             NONE
screeningAuthority               NOT_AUTHORIZED
designAuthority                  false
```

The merged Table T4-1 candidate is not changed by this record.

## Controlled source

```text
reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10,348,594 bytes
T4.2.2 / Table T4-1 / printed page 87 / navigation only
```

The current connector reaches the exact binary identity but cannot expose controlled PDF pages because the binary is decoded as UTF-8. No controlled page/section hash is claimed.

## What public corroboration establishes — and does not establish

Multiple searchable public copies agree with the four merged Table T4-1 candidate bands and the broad Flowchart T4-1 sequence. They are secondary navigation/reconciliation material only.

The broad candidate sequence is:

1. distinguish straight, tapered and stepped thermowell geometry;
2. evaluate structural natural frequency using the type-specific T4 equation;
3. apply the parent-pipe wall modifier candidate;
4. evaluate vortex-excitation frequency;
5. compare a frequency-ratio expression against a threshold reported around 0.8;
6. follow the source-defined LOF/corrective-action branch.

This record does **not** publish Equations (1)–(5), constants or geometry formulas. Their exact controlled wording, units, boundary semantics and applicability remain unresolved.

## EI T4 versus ASME PTC 19.3 TW

The source registry currently fails closed by marking the thermowell mechanism binding `CONFLICTED` between an EI T4 source and an ASME PTC 19.3 TW repository label. That conflict must not be “resolved” by combining data.

Required conceptual separation:

```text
EI AVIFF T4 thermowell assessment
ASME PTC 19.3 TW detailed thermowell assessment
```

A future ASME implementation requires its own controlled source, method ID, schemas, properties, benchmarks and authority review.

## Remaining controlled predicates

Before production T4 mutation, reconcile:

- exact Flowchart T4-1 branches and equality at the 0.8 criterion;
- exact Equations (1)–(5), constants and units;
- straight/tapered/stepped geometry and required dimensions;
- thermowell material-property custody;
- physical parent-wall-to-schedule-band semantics;
- four-way welded-gusset applicability;
- vortex-frequency / Reynolds / Strouhal method and domain;
- operating-case and fluid constraints;
- specialist escalation for pulsation or nearby mechanical excitation;
- LOF and corrective-action semantics;
- EI-vs-ASME method identity.

Unknown geometry, implicit `STD` mapping, nearest schedule band, interpolation and ASME-to-EI method substitution remain forbidden.
