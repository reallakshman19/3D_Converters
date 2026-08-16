# WIP-sbc563 — SBC reserved vertical scaffold

## Mission

Implement issue #563: create a fail-closed SBC Type 1–4 scaffold and introduce the reusable lifecycle convention:

```text
RESERVED -> QUALIFIED -> ACTIVE -> DEPRECATED
```

Parent engineering gate: #429. Type-3 source/production-freeze evidence remains owned by #514. PR #546 is explicitly not an implementation baseline for this work.

## Classification

```text
ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY = IMPLEMENTATION_AUTHORIZED_BY_OWNER_FOR_SCAFFOLD_ONLY
MERGE_AUTHORITY = OWNER_ONLY
```

The approved scope is structural/guardrail code and UI-facing metadata only. No SBC numerical authority, curve publication, master activation, or screening promotion is authorized.

## Live grounding

```text
repository = reallaksh19/3D_Converters
base main = 042025bfe3f9c60ba11d8c653f98af78ac587a64
branch = agent/sbc-reserved-vertical-scaffold
source issue = #563
family issue = #429
type3 evidence issue = #514
roadmap PR = #560
```

Open SBC-related PRs inspected before mutation include #546, #508, #480, and master-framework PR #483. This scaffold will not edit the #546 AC1 validation/source-reconciliation files or Type-3 candidate kernel/master files.

## Authority invariants

1. Public ID remains `VIB.SBC.SMALL_BORE`.
2. Public execution remains fail-closed while lifecycle is `RESERVED`.
3. Type 1–4 are explicit independent implementation slots.
4. SBC consumes a qualified EI main-line assessment contract; FIT alone is not sufficient authority.
5. Existing Type-3 candidate code is not silently promoted.
6. T3 curves remain quarantined while source conflicts exist.
7. D5/D6/D7/D8 are published B1 benchmark families; each type still requires an independent B2 family.
8. Placeholder code/UI presence never implies engineering qualification or screening authority.
9. Lifecycle transitions are explicit and one-way: `RESERVED -> QUALIFIED -> ACTIVE -> DEPRECATED`.
10. Authority promotion is a separate reviewed change.

## Planned changed files

New:

```text
converters/engineering-calculations/lifecycle.js
converters/vibration/sbc/vertical-manifest.js
converters/vibration/sbc/reserved-kernel.js
converters/vibration/sbc/type1/reserved.js
converters/vibration/sbc/type2/reserved.js
converters/vibration/sbc/type3/reserved.js
converters/vibration/sbc/type4/reserved.js
converters/engineering-calculations/adapters/vibration-sbc-reserved.js
docs/vibration/SBC-Implementation-Scaffold-v1.md
tests/vibration-sbc-reserved-scaffold.test.mjs
```

Existing:

```text
converters/engineering-calculations/pending-definitions.js
```

The existing-file edit will only replace the generic SBC pending tuple with the specialized reserved SBC definition. No active registry or numerical kernel is changed.

## Existing-file backup custody

Repository backup CLI is unavailable in this connector-only runtime. Before editing `pending-definitions.js`, preserve:

```text
path = converters/engineering-calculations/pending-definitions.js
base commit = 042025bfe3f9c60ba11d8c653f98af78ac587a64
pre-edit blob = 8182b490f60343301e74fb56a717330109a8f612
```

A repository backup copy will be created before the edit. This is a connector-runtime fallback, not a claim that the normal `node utils/backup.js save ...` command executed.

## Validation plan

```text
lifecycle allowed transitions                        NOT_RUN
lifecycle forbidden skip/reversal transitions        NOT_RUN
reserved SBC definition visible/fail-closed          NOT_RUN
reserved Type 1–4 slots all present                  NOT_RUN
all type slots executionAllowed=false                NOT_RUN
D5/D6/D7/D8 + B2 requirements present                NOT_RUN
reserved kernel returns no numerical output          NOT_RUN
pending registry contains exactly one SBC definition NOT_RUN
```

No browser or production numerical qualification is required for this scaffold; any such result would remain `NOT_RUN`, never promoted to PASS by inspection.

## Highest risk

A future agent may mistake implementation code existence for permission to activate SBC. The scaffold must therefore make lifecycle/authority state a consumed runtime contract, not a comment-only convention.

## EXACT_NEXT_ACTION

Create the immutable pre-edit backup copy for `pending-definitions.js`, then add the lifecycle primitive and SBC Type 1–4 reserved manifest without touching any existing Type-3 candidate/PR #546 files.
