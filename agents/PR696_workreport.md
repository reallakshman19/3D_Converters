# PR696 — HP Review Disposition Custody — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #696
BRANCH: agent/hp-review-disposition-custody
BASE: main
BASE_SHA_AFTER_REPLAY: 55eade922b061830db70b45a22e8f328ef005e02
PREDECESSOR_PR: 694 (MERGED)
PREDECESSOR_MERGE: c5c3fa6f1c20ad3e0d046b8e2b9565569600d425
CURRENT_STAGE: DRAFT_READY_FOR_NATIVE_VALIDATION
MERGE_AUTHORITY: NOT_GRANTED_FOR_PR696

## Mission

Add report-level engineering-review disposition custody without changing HP calculation inputs, numerical authority, Code authority or design-release authority.

```text
canonical HpPipingClassProject/v2
  -> canonical HP orchestrator
  -> hp-piping-class-engineering-review-report/v1
  -> exact serialized report JSON
  -> SHA-256 report binding
  -> append-only review disposition ledger
  -> verified review-disposition package JSON
```

## Dispositions

Only these states exist:

```text
NO_OBJECTION_FOR_ENGINEERING_REVIEW
COMMENTS_RECORDED
REJECTED_FOR_ENGINEERING_REVIEW
```

There is intentionally no `APPROVED`, `APPROVED_FOR_DESIGN`, `RELEASED`, or equivalent authority state.

`NO_OBJECTION_FOR_ENGINEERING_REVIEW` is review custody only.

## Exact-report binding

Each entry records:

- contiguous append-only sequence;
- deterministic entry ID;
- exact report schema;
- SHA-256 of the exact serialized engineering-review report JSON;
- project ID / class ID / revision;
- CHECKER or REVIEWER role;
- declared actor identity;
- disposition;
- comment;
- timestamp;
- non-authorizing authority metadata.

Any canonical report change produces a different SHA-256. Prior records remain in the ledger but become historical relative to the new report. Reverting to byte-identical report content intentionally restores the same content binding.

## Identity-authentication boundary

SHA-256 is content binding only.

```text
actorIdentityAuthority = USER_DECLARED
digitalSignature = false
```

This is not PKI, e-signature, authenticated identity, or a cryptographic approval signature. The UI and exported package state that limitation explicitly.

## Authority boundary

Ledger, entries and export package retain:

```text
purpose = REVIEW_CUSTODY_ONLY
calculationMode = USER_CALCULATED_KD3
nativeCoreKd3Qualified = false
codeCompliance = false
canUseForDesignAuthority = false
canAuthorizeRelease = false
actorIdentityAuthority = USER_DECLARED
digitalSignature = false
```

Review custody is stored separately from `HpPipingClassProject/v2` and never mutates engineering input state.

## UI

The active HP route composes a new additive disposition enhancer after the engineering-review report enhancer.

The Review Envelope exposes:

- current report SHA-256 prefix;
- current vs historical disposition counts;
- reviewer/checker identity;
- role;
- disposition;
- comment;
- append-only `Record disposition` action;
- verified `Export review package JSON` action;
- explicit declared-identity / no-digital-signature warning.

The enhancer re-runs production-review validation, the canonical HP orchestrator and the existing review-report builder. It does not scrape visible UI numerical text and contains no Chapter IX/KD formula path.

## Storage custody

Review ledger key:

```text
format-converters.hpPipingClassEngineeringReviewDisposition.v1
```

It is separate from the HP engineering project storage key.

Stored-project custody is preferred. `options.context.hpPipingClassProject` is fallback only before stored state exists and is retired when engineering project fields or project file state change.

Malformed stored review custody blocks disposition use; it is not silently reset or overwritten.

## Export package

Schema:

```text
hp-piping-class-engineering-review-disposition-package/v1
```

Contains:

- embedded exact engineering-review report;
- report SHA-256;
- append-only review ledger;
- current/historical summary;
- non-authorizing limitations.

Package verification recomputes SHA-256 from the embedded report and validates ledger structure/authority. This is self-consistency/content-integrity verification, not reviewer identity authentication.

## Authored focused tests

`tests/hp-piping-class-engineering-review-disposition.test.mjs` covers:

1. approval/release semantics absent from allowed dispositions;
2. exact report SHA-256 binding;
3. append-only sequence and entry custody;
4. changed report returns to PENDING_REVIEW and prior custody becomes historical;
5. comment requirement for comments/rejection;
6. authority promotion blocked;
7. fake digital-signature authority blocked;
8. non-contiguous sequence blocked;
9. package verification PASS path;
10. embedded-report tamper falsifier.

`tests/hp-piping-class-engineering-review-disposition-ui.test.mjs` covers:

- active route composition and cleanup;
- canonical re-evaluation instead of UI scraping;
- review ledger separate from engineering project;
- context fallback retirement;
- only non-authorizing disposition wording;
- append-only language;
- declared-identity / no-digital-signature disclosure;
- SHA-256/Web Crypto ownership;
- absence of duplicate pressure formulae.

## Validation truth

```text
current-main replay                         PASS
branch ancestry                             PASS (behind 0 before PR open)
changed implementation/test/CI paths        PASS (6 intended before recovery)
source-level numerical ownership audit      PASS
source-level authority audit                PASS
source-level content-vs-identity audit       PASS
focused disposition tests                   AUTHORED_NOT_EXECUTED
native disposition Node suite               NOT_RUN
HP Real Workbench PR workflow               PENDING_RECONCILIATION
FULL_APP disposition interaction            NOT_RUN
full repository regression                  NOT_RUN
```

Do not promote authored tests to PASS without execution.

## Changed-file ledger

Engineering/test/CI:

```text
.github/workflows/hp-piping-class-real-workbench.yml
tabs/engineering-workspace-tab.js
tabs/hp-piping-class-engineering-review-disposition.js
tabs/hp-piping-class-engineering-review-disposition-enhancer.js
tests/hp-piping-class-engineering-review-disposition.test.mjs
tests/hp-piping-class-engineering-review-disposition-ui.test.mjs
```

Recovery:

```text
agents/PR696_workreport.md
agents/status/PR696.yaml
agents/claims/PR696.yaml
```

## Next action

1. Mark PR ready and inspect the existing HP Real Workbench workflow.
2. If a native run appears, inspect the exact disposition test step and fix any failures.
3. FULL_APP check: calculate -> report matrix -> disposition -> mutate engineering input -> verify prior record becomes historical/PENDING -> restore -> export review package.
4. Reconcile exact head/current main/statuses/reviews.
5. Do not merge without explicit owner authorization for PR696.

## Appendix A — takeover qualification

1. Why does SHA-256 binding not authenticate the reviewer identity?
2. What values can a review disposition take, and why is APPROVED absent?
3. What happens to a recorded no-objection when one engineering input changes?
4. What authority flags must remain false?
5. Why is the disposition ledger separate from the engineering project?
6. What makes the ledger append-only?
7. What does package verification prove, and what does it not prove?
8. Which validations remain NOT_RUN?
