# P8 PR #751 source-admission validation

VALIDATION_ID: P8-PR751-SOURCE-ADMISSION-20260906
PR: #751
PR_HEAD_VALIDATED: 8a4c42035a1b8f16eafd60bd8af82b1dc406cbbe
MAIN_OBSERVED: c5815ae827edc231b933f56554218e642e60c179
NODE_VERSION: v22.16.0

## Intended exact repository command

```bash
node --test \
  tests/flange-face-binding-source-admission.test.mjs \
  tests/flange-face-binding-source-register.test.mjs
```

STATUS: NOT_RUN
OBSERVATION: A native authenticated checkout of private repository `reallaksh19/3D_Converters` was unavailable in the current connector/container boundary. No GitHub PR-triggered workflow run was available to substitute for that execution.
ORACLE: exact repository checkout required for native PASS.

## Reconstructed focused execution

STATUS: PASS_SUPPORTING_RECONSTRUCTION
NODE_VERSION: v22.16.0
RESULT: 23 tests / 23 pass / 0 fail / 0 skipped
DURATION_REPORTED_BY_NODE: 97.639583 ms

The reconstruction used exact PR-head bytes for:

- `converters/engineering-calculations/flange/flange-face-binding-source-admission.js`;
- `converters/engineering-calculations/flange/flange-face-binding-source-register.js`;
- `converters/engineering-calculations/flange/advanced-analysis-semantic-hash.js`;
- `scripts/admit-flange-face-binding-source.mjs`;
- `tests/flange-face-binding-source-admission.test.mjs`;
- `tests/flange-face-binding-source-register.test.mjs`.

The imported `advanced-analysis-interface-adapter.js` was reduced only to its two exact pinned constants because neither focused test executes the adapter function. This makes the run supporting execution, not an exact-checkout result.

## Validation finding and repair

The first reconstructed run passed 21/21 but exposed a source-governance gap: review identity/evidence/disposition were not bound to the exact candidate semantics, so an accepted review token could be replayed against a changed valid record.

PR #751 now computes `reviewedSubmissionHash` over all record semantics except `recordState` and final `semanticHash`. This preserves the same review hash across the controlled `PROJECT_CONTROLLED -> INDEPENDENTLY_CHECKED` state transition while binding project/model/joint/face/frame/interface/provenance/tolerance semantics.

Negative verification now confirms that changing `selectedFaceId` while reusing the prior accepted review is rejected.

## Authority boundary

No result in this record establishes:

```text
codeCompliance            true
designAuthority           true
governingEligible         true
automaticBindingProducer  true
```

One real independently accepted controlled project source remains externally required by issue #750. Exact native PR-head test execution remains `NOT_RUN`; the supporting reconstruction must not be relabeled as native PASS.
