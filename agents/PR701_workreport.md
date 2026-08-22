# PR701 — HP Tamper-Evident v2 Review Custody — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #701
BRANCH: agent/hp-review-ledger-v2-hash-chain
BASE: main
BASE_SHA_AT_START: da5dade3d19caba8ae2bd8015aeeae16ae28777a
PREDECESSOR_PR: 698 (MERGED)
CURRENT_STAGE: DRAFT_FOCUSED_EXACT_BLOB_QUALIFIED_NATIVE_AND_FULL_APP_PENDING
MERGE_AUTHORITY: NOT_GRANTED

## Mission

Close PR698's explicit `ledgerEntryCryptographicIntegrity=NOT_AVAILABLE_V1` gap without promoting reviewer identity or engineering authority.

New review custody uses a v2 SHA-256 entry chain. Legacy v1 remains readable/appendable as v1 and is never silently promoted to v2 integrity.

## v2 contract

```text
ledger schema  hp-piping-class-engineering-review-disposition-ledger/v2
package schema hp-piping-class-engineering-review-disposition-package/v2
entry fields   previousEntrySha256 + entrySha256
package field  ledgerHeadSha256
integrity      SHA256_HASH_CHAIN_SELF_CONSISTENCY_VERIFIED
```

The entry hash covers the canonical key-sorted entry payload excluding only the stored `entrySha256`. Every append verifies the existing v2 chain before adding a record.

## Legacy contract

```text
v1 ledger/package remains accepted
v1 append remains v1
v1 integrity = NOT_AVAILABLE_V1
no automatic v1 -> v2 migration
```

Storage is schema-separated:

```text
v2 format-converters.hpPipingClassEngineeringReviewDisposition.v2
v1 format-converters.hpPipingClassEngineeringReviewDisposition.v1
```

If both storage keys exist, custody is ambiguous and the enhancer fails closed rather than silently selecting/merging histories.

## Authority boundary

Unchanged:

```text
purpose = REVIEW_CUSTODY_ONLY
calculationMode = USER_CALCULATED_KD3
actorIdentityAuthority = USER_DECLARED
digitalSignature = false
nativeCoreKd3Qualified = false
codeCompliance = false
canUseForDesignAuthority = false
canAuthorizeRelease = false
independent designAuthority = false
independent releaseAuthority = false
```

The hash chain proves only package self-consistency/tamper evidence. It is not PKI/e-signature identity, a trusted timestamp, reviewer authentication, Code compliance, design approval, or release authorization.

No HP engineering equation, coefficient, pressure/fatigue calculation, or native KD320 implementation is changed.

## Implementation paths

```text
tabs/hp-piping-class-review-chain.js
tabs/hp-piping-class-engineering-review-disposition.js
tabs/hp-piping-class-engineering-review-disposition-enhancer.js
tabs/hp-piping-class-review-package-verifier.js
tabs/hp-piping-class-review-package-verifier-tab.js
tests/hp-piping-class-engineering-review-disposition.test.mjs
tests/hp-piping-class-engineering-review-disposition-ui.test.mjs
tests/hp-piping-class-review-package-verifier.test.mjs
tests/hp-piping-class-review-package-verifier-ui.test.mjs
```

Recovery files are additional PR-only paths.

## Exact committed implementation/test blobs

```text
review-chain.js                                      33673939105cb5e2344d0c1807d24cd1a4885fcc
engineering-review-disposition.js                   2eeb5c4b41cb2f1336b8f36f6d77d3f861a23162
review-package-verifier.js                          0e487e6e5bece1f2c1b923978bfa4d96c2861ab2
review-package-verifier-tab.js                      ebd5e631593c2ae31d6880a43c68b396532b55f4
engineering-review-disposition-enhancer.js          505496bc959e3bd441c964a576b32633fa949d8f
engineering-review-disposition.test.mjs             ed8fd50659d0f409f31613fcf7fe5514b5c7fd42
review-package-verifier.test.mjs                    96b44d91784e52d9794a9dc64ce4b9b70ff68bff
review-package-verifier-ui.test.mjs                 6534018d82d49e0cd3692e5de9a2e598b237d3f9
engineering-review-disposition-ui.test.mjs          5edc415e9c8860bc93fe2e88272d1080b9583d3d
```

All listed hashes were compared with the locally executed authored bytes via `git hash-object` / exact GitHub blob reads.

## Executed validation

A repository-shaped local reconstruction used the exact committed implementation/test blobs. The engineering-review-report dependency was a minimal faithful contract stub because a native repository checkout is unavailable in this runtime.

```text
main grounding                                      PASS / main@da5dade3d19caba8ae2bd8015aeeae16ae28777a
branch before recovery                              PASS / ahead 2, behind 0
implementation changed-path scope                   PASS / 9 intended
production enhancer syntax                          PASS
focused Node suite                                  PASS 29/29
storage-custody functional check                    PASS
exact implementation/test Git blobs                 PASS
```

Falsifiers covered:
- entry payload/actor mutation;
- prior-link mutation;
- stored entry hash mutation;
- package chain-head mutation;
- embedded report SHA tamper;
- stored summary tamper;
- non-contiguous sequence;
- authority/digital-signature promotion;
- forged reviewer-authentication receipt;
- legacy v1 compatibility without integrity promotion;
- v1/v2 storage separation;
- simultaneous v1+v2 storage ambiguity fails closed.

## NOT_RUN

```text
native-checkout focused Node suite                  NOT_RUN / checkout unavailable in current runtime
HP real-workbench hosted workflow                   NOT_RUN / reconcile after PR head settles
routed browser/FULL_APP disposition journey         NOT_RUN
full repository regression                          NOT_RUN
```

The 29/29 result must not be relabeled as native-checkout PASS.

## Next action

1. Reconcile exact PR head/base, changed paths, hosted checks/workflows/reviews/threads.
2. If a native checkout becomes available, run the four focused tests plus existing HP real-workbench suite.
3. Exercise v1 legacy-store and v2 fresh-store flows in the routed browser.
4. Keep actor identity USER_DECLARED and all engineering/release authority false.
5. Do not merge without explicit owner authorization for PR701.

## Appendix A — takeover qualification

1. Why must an existing v1 ledger remain v1 when appended rather than being silently converted to v2?
2. Which exact entry fields participate in the v2 SHA-256 digest, and which one is excluded?
3. What does `previousEntrySha256` prove, and what does it not prove?
4. Why is `ledgerHeadSha256` separately stored in the v2 package?
5. How does the verifier distinguish `SHA256_HASH_CHAIN_SELF_CONSISTENCY_VERIFIED` from reviewer authentication?
6. Why does simultaneous v1+v2 browser storage fail closed?
7. Which authority flags must remain false even after a v2 package verifies successfully?
8. Which evidence is still NOT_RUN before merge-quality release confidence?
