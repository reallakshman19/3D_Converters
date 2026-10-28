# XML229 native Run continuation — 28 October 2026

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED (direct Owner continuation; new follow-up, no takeover of an open PR)
REPORT_BASIS_HEAD: e83a7bae22a1ab91e671c56072c9777c86ba1477
MAIN_HEAD_LAST_CHECKED: e83a7bae22a1ab91e671c56072c9777c86ba1477
GROUNDING_EPOCH: GE-NATIVE-RUN-20261028-1
CURRENT_STAGE: BASELINE / INVESTIGATE
CURRENT_BLOCKER: Owner private source/session is not available; audit omits actual Run eligibility and the production action does not record candidate attempts.
HIGHEST_RISK: Mistaking completed Weight/Final review for verified native output.
EXACT_NEXT_ACTION: Exercise source-currentness and dispatch through the real wrapper modules; implement a bounded native Run action with observable attempts and explicit blocker presentation.

## Mission and authority

Owner reports 98 Final, 686 facts, zero unresolved, eligible Final intent, but disabled CII download. Continue the authorized robust fix through a reviewable draft PR. Generate output only through the existing native converter and independent reconciliation. Never manufacture CII or authorization from audit evidence. No merge, release-policy, mass, writer, classification, topology, original-fixture or workflow mutation.

## Ground truth and coordination

- PR347 is merged at main e83a7bae; its Final-intent observation correction is present. Historical Draft status is superseded.
- agents/MASTER_INDEX.md does not exist on current main (404); root AGENTS.md and .agents/AGENTS.md read.
- Open PR329 (90f8a7b1) and PR312 overlap output-run/native domain. Direct Owner follow-up is based on current main, does not mutate those branches and must be reconciled before either older branch integrates. PR315 owns weight-draft presentation; PR346 owns standalone topology and is excluded. Existing topology claim is for merged PR344, not an exclusive current Run claim. Coordination classification: COORDINATION_REQUIRED at integration; bounded current-main follow-up authorized by Owner.
- Git clone unavailable (403); exact-main files retrieved through GitHub connector. Local Git is a source-subset diff workspace, not the complete upstream history.

## Evidence and open items

- ISS-1 USER_SUPPLIED: audit validates all 98 Final masses and eligible intent; nativeCandidate null, no release proof. Trace is truncated, so absence of candidate events does not prove no earlier run.
- ISS-2 SOURCE_INSPECTION: output-run.js reads getXml229CandidateAttempt, but no production caller records attempts. Existing audit cannot distinguish unattempted from an unrecorded failure.
- ISS-3 SOURCE_INSPECTION: initial current() refusal silently returns; stale completion can leave running true. Object-reference checks can reject equivalent input replacements. Hypothesis that simple wrapper reads always replace masterContext was FALSIFIED by real-wrapper local execution; do not claim that as Owner-session root cause.
- ISS-4 SOURCE_INSPECTION: auto-run excludes all existing results, even enriched/topology-only results that have no native output. Execution eligibility blockers are not part of the supplied audit.
- QST-1: exact Owner-session Run blocker/attempt outcome is not established. The private model is NOT_RUN.

## Invariants and validation plan

1. Source/Worker generation, original bytes, options, scope and master changes invalidate execution; equivalent object replacement alone does not.
2. One current attempt; auto-run never retries failed attempts; explicit retry remains available.
3. Record IN_PROGRESS/FAILED/SUCCEEDED against the actual session. Publish CII only after existing independent native verification and a final currentness check.
4. Source replacement discards late output and cannot overwrite another attempt or its running state.
5. UI reports pre-conversion blockers separately from post-conversion release HOLD. Weight decisions are never changed by this work.

Validation ledger: current real-wrapper read reproduction PASS/LOCAL_EXECUTION/IMPLEMENTATION_COUPLED (master identity remained stable; hypothesis falsified). Private source/native CII NOT_RUN/NOT_OBSERVED/NONE. New dispatch/failure/drift/retry/auto-run tests and unchanged native-boundary regression pending.

## Recovery and Appendix A

Not a takeover of PR347: merged predecessor retained. New implementation uses exact-main source. A1 trace: Worker completion -> Final packet -> native converter -> independent emitted-byte reconciliation -> currentness -> publication. A2 falsifier: real wrapper showed no unconditional master churn; next isolates explicit equivalent replacement, source drift and no-op dispatch. A3 protect readNativeFinalPacket, independent reconciliation and native output re-attestation. A4 mocked converter responses are control-flow evidence only, never engineering acceptance. A5 surgical scope: output Run action wiring, a small action/context module, automatic scheduling diagnostics, paired docs and focused tests. Future incoming engineering implementer must re-ground and qualify independently; these notes are not model answers or delegated authority.

Changed-file ledger at this checkpoint: this unique report only. No implementation mutation yet.
