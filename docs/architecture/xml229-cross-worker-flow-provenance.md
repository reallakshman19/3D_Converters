# XML229 — cross-Worker causal flow and state provenance

Status: DRAFT. Read-only, engineering-critical observability. Owner reported identical red Output/Run state over ten cycles on 2026-10-17.

## Factual diagnosis

Screenshot: 41/41 selected branches, four masters loaded, 423 original physicals and 2,961 verified FactRecords. Weight Match has zero original Source mass, zero accepted Match-1, zero Final, and 423 unresolved. The red xml229-original-json-engineering-authority row is a deliberate native CII release HOLD, not evidence of a Worker crash: xml-cii-output-run-readiness.js sets it whenever governed original-JSON output is selected. The Run preflight enforces it separately. Even a perfect Preview and Weight session does not prove actual native emitted-CII Final-mass physical-slot consumption.

## Causal graph (read-only observers, not another data authority)

1. 4 Preview UI resolves original XML, indexed O1 Blob, 41 selected branch scope and four current masters into one InputBasis.
2. UI invokes independent original XML census Worker; result includes physical population.
3. UI launches source-bound GC-PW Worker. It verifies original JSON Blob SHA and full current Source/Master InputBasis.
4. GC-PW Worker invokes a separate engineering Preview child Worker; child returns actual-JSON dryrun; GC-PW opens one complete original physical FactRecord model.
5. GC-PW starts sole authoritative scorer, Match-1 and Final CAS decision review. Candidate != explicitly accepted Match-1 != separately accepted Final.
6. Weight Match UI reads the same live Worker; no localStorage review is silently authoritative.
7. Output/Run UI reads same verified G4 RunAdvisory and projects one canonical checklist and native release HOLD.
8. The independent emitted-CII physical-slot mass/unit/split consumer oracle is NOT IMPLEMENTED or VERIFIED. Native JSON-governed Run MUST stay HELD.

## Instrumentation contract

New contracts/xml229-flow-trace-v1/trace.mjs is a 256-event ephemeral bounded ring with a source-independent correlation trace ID, increasing event sequence, relative elapsedMs, RPC sequence, typed actor and transition, safe code, and whitelisted numeric counters. No source IDs, original JSON SHA, generation, physical IDs, proposed kg, freeform Worker message/error, raw XML, or master rows may enter the exported trace. Actor/type are strict enums, source+served twin modules must match byte-for-byte. Ring overflow is counted; no remote telemetry or localStorage persistence. All trace exports report nativeCiiReleaseAuthorized=false and independentSourceVerified=false.

Both UI-to-Worker facade and actual GC-PW Worker emit categorical transitions for census dispatch/return, Preview child dispatch/return, facts creation, Worker readiness, RPC send/result/error. 4 Preview starts a fresh per-stable-stateRef trace; 6 Weight Match provides an explicit private flow trace download; 10 Output/Run records live read/held gate separately. A native-gate HOLD is classified as NATIVE_RELEASE_HOLD_EXPECTED rather than an unhandled Worker fault. ENGINEERING_MASS_UNRESOLVED is separately classified.

## Acceptance and failure modes

Qualify with Node 22/24 contract tests (privacy, bounds, event order, 7x facts, error/hold distinction) and real original-Blob Chromium 4 Preview -> 6 Weight Match download; test every expected census/child/facts/RPC actor, then capture 10 Output/Run gate. If any actor or required event is missing, do not claim complete end-to-end trace. An exact Owner 41/423/2961 run and 100MiB/2m performance are NOT_RUN; native G5 physical-slot oracle and G7 acceptance are NOT_RUN. Owner must retain private source, masters and trace. Do not merge without explicit approval; do not relax native Run.

## Coordination

PR #273 remains a separate overlapping draft; coordinate before merging this diagnostic. Backups exist for every changed production file. Rollback removes trace modules/observer ports/button; the scorer, accepted kg and native output are unchanged.