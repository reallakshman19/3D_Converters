# Implementation Takeover Qualification

## 1. Purpose

Appendix A is not a textbook questionnaire. It is an implementation authorization gate.

The question is:

> Can this incoming agent safely make the next production commit?

On takeover, production mutation authority starts as `READ_ONLY` or `QUALIFICATION_PENDING`.

Investigation, inspection, reproduction, calculation, and evidence gathering are allowed before qualification. Engineering-critical production modification is not.

## 2. Qualification sequence

Before answering Appendix A, the incoming agent must:

1. read `agents/MASTER_INDEX.md`;
2. fetch live PR and current `main`;
3. inspect actual changed files/diff;
4. compare report state to live state;
5. inspect open reviews/checks;
6. inspect active claims/overlaps;
7. reproduce or independently inspect critical evidence;
8. record a new grounding epoch;
9. answer Appendix A from repository evidence.

Do not qualify by memorizing the outgoing agent's report.

## 3. Mandatory challenge archetypes

Normally use five 20-mark challenges:

### A1 — Production Trace Challenge
Trace one critical value/state end-to-end through actual production files/functions.

### A2 — Current Failure Isolation Challenge
Use an actual unresolved `ISS-*`/`QST-*`. Require minimum isolating experiment, prediction, falsifier, and first wrong boundary.

### A3 — Authority / Invariant Challenge
Identify authoritative source, ownership boundaries, what may change, what must not change, and what would create duplicate or false authority.

### A4 — Independent Validation Challenge
Require independent expected value or authoritative reference, provenance, units/sign convention, tolerance, actual observation, and limitations of current tests.

### A5 — Next-Commit / Minimal-Patch Challenge
Require exact production file/function, smallest legitimate change, tests, permitted/prohibited diff, rollback boundary, and required evidence.

Add more challenges only when the unresolved work genuinely requires them.

## 4. Question quality gate

Reject a challenge if any applies:

- it can be answered correctly from general subject knowledge without opening the current repository;
- it could be pasted unchanged into an unrelated PR;
- it requires no file/function/diff/benchmark/runtime/test evidence;
- it has no falsifiable expected result;
- it does not test knowledge needed for the next unresolved work.

Prefer verbs:

```text
trace, reproduce, locate, isolate, calculate, compare, predict,
falsify, prove, reconcile, design the test, identify the first wrong value,
define the minimal patch
```

Avoid generic `define`, `describe`, `discuss`, `list`, or `explain` unless inseparable from a concrete repository trace.

## 5. Do not provide model answers

Appendix A should contain:

- repository anchors;
- required evidence;
- minimum acceptance criteria;
- forbidden shortcuts;
- scoring rubric.

Do not disclose the diagnosis or full expected solution.

## 6. Standard challenge format

```text
### A# — <implementation title>

Repository anchors:
- file/function
- test/benchmark
- related ISS/RISK/DEC/QST

Challenge:
<repository-specific task>

Before execution state:
- current hypothesis
- predicted observation
- expected invariants

Required evidence:
- ...

Falsifier:
- what would prove the diagnosis wrong

Forbidden shortcuts:
- ...

Next-commit implication:
- ...

Score:
Repository evidence          /6
Correct implementation trace /5
Engineering reasoning        /4
Falsifiable validation       /3
Authority/scope protection   /2
Total                       __/20
```

## 7. Pass standard

For engineering-critical takeover:

```text
5 questions x 20 = 100
minimum total = 92/100
minimum any question = 17/20
```

Automatic failure may apply for fabricated evidence, invented repository objects, unsafe engineering claims, weakened tolerances to obtain PASS, expected-value replacement from production output, implementation-coupled "independent" oracles, silent fallback, NOT_RUN claimed as PASS, or multi-mechanism shotgun changes without isolation.

If qualification fails:

```text
TAKEOVER_AUTHORITY = READ_ONLY
```

A different agent may qualify. The failed agent may continue evidence gathering but not engineering-critical production modification.

## 8. Freshness

Appendix A records:

```text
qualification_basis_pr_head:
qualification_basis_main_head:
grounding_epoch:
generated_from_open_items:
next_intended_stage:
APPENDIX_A_STATUS:
```

When the hard unresolved problem changes materially, regenerate Appendix A.
