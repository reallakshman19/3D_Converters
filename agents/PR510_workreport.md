# PR510 — Mechanical T2.3 Facility Candidate Workflow

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
PR: #510
BRANCH: agent/mechanical-t23-facility-stage4
BASE: agent/ei-appendix-b-stage3
BASE_SHA: db64392374c198434c3a8a142fa33ab080160a0c
VALIDATION_INFRA_HEAD: 133c7f9ededb873b16868203d8b0768220e10460
CURRENT_MAIN_LAST_CHECKED: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
DEPENDENCIES: PR #507 master registry + PR #509 Appendix-B/T2.3 candidate masters
MERGE_AUTHORITY: NOT_GRANTED
EXACT_NEXT_ACTION: leave draft/unmerged; if full-suite evidence is required, restore an available complete-checkout runner and execute the committed validation workflow/browser script without changing engineering authority
```

## Delivered Capability

Stage 4 makes EI AVIFF T2.3 Mechanical Excitation a facility-scoped master-backed candidate:

```text
facility row
  -> explicit applicability
  -> connected/adjacent equipment sources
  -> PR #509 T2.3 candidate evaluator
  -> maximum baseline LOF + governing source
  -> exact-scope cached result
  -> candidate governing tier
```

Authority remains:

```text
FIT        = IMPLEMENTED_SCREENING / SCREENING / AUTHORIZED_BOUNDED
Mechanical = IMPLEMENTED_CANDIDATE_MASTER / CANDIDATE_MASTER / NOT_AUTHORIZED
SBC        = IMPLEMENTED_CANDIDATE_USER_INPUT / CANDIDATE_USER_INPUT / NOT_AUTHORIZED
```

Mechanical/SBC may compete only in `candidateGoverning`; FIT remains the authorized screening tier. `fullScreeningGoverningEstablished=false`.

## Applicability / numerical custody

```text
no decision / no sources                -> APPLICABILITY_UNKNOWN
explicit no connected/adjacent source   -> NOT_APPLICABLE
sources chosen, evaluation absent/bad   -> APPLICABLE_INCOMPLETE
valid exact-scope candidate              -> CALCULATED_CANDIDATE
```

Stage 4 does not duplicate T2.3 master values. It calls `evaluateEiAviffMechanicalBaselineCandidate()` from PR #509.

Independent EI D2.4 constraint:

```text
centrifugal compressor                    0.2
electric motor / alternator >=15 kW      0.4
governing Mechanical T2.3 LOF            0.4
```

No TM-09/dynamic-study reduction is applied. Shared-support direct evaluation remains blocked by `MECHANICAL_T23_SHARED_SUPPORT_REQUIRES_ADJACENT_LOF` until an adjacent-line LOF is explicitly modeled.

## Scope / async integrity

```text
MECHANICAL-FACILITY/<encoded line>/<encoded case or ->/<encoded canonical ID>
```

Wrong-scope candidates fail with `FACILITY_SCOPE_MISMATCH`. Source/applicability changes invalidate cached and pending results using per-scope evaluation tokens.

## Validation infrastructure added after Owner request

The Owner requested repository-native and Chromium execution. Two validation artifacts were added:

```text
.github/workflows/vibration-mechanical-stage4-validation.yml
scripts/validate-vibration-mechanical-stage4-browser.mjs
```

The workflow is designed to run:

1. Stage-4/generic focused Node tests;
2. `node --test tests/*.test.mjs` full repository Node suite;
3. real app static server;
4. Playwright Chromium path: Engineering Calculations -> Vibration -> FIT benchmark -> run -> Mechanical inputs -> D2.4 sources -> LOF 0.4 -> authority checks.

## GitHub-hosted exact-head attempt

Workflow run:

```text
run_id     = 31875120781
workflow   = Vibration Mechanical Stage 4 Validation
head       = 133c7f9ededb873b16868203d8b0768220e10460
job        = 94989590474
steps      = []
runner_id  = 0
```

GitHub check annotation states exactly:

```text
The job was not started because an Actions budget is preventing further use.
```

Classification is therefore:

```text
GitHub workflow execution = NOT_RUN / ACTIONS_BUDGET_BLOCKED
```

It is not a code/test FAIL because no checkout or test step started.

## Exact-blob local Node execution

The local execution container cannot clone the private repository because outbound GitHub network access is blocked. For the bounded Stage-4 path, exact files were materialized through the GitHub connector and verified with `git hash-object` against GitHub blob SHAs before execution.

Verified examples:

```text
converters/vibration/mechanical/facility.js
  578d943a2435339e53c1d2e7083b74690c0116c3
converters/vibration/masters/ei-aviff-appendix-b-data.js
  3ef76b1b997e29227bcef5af82f502e6f6d8e9cc
converters/vibration/masters/ei-aviff-appendix-b-candidate.js
  8dbfbdfb9c2c95bdcdb506bb14aa7ab9b1b12368
converters/vibration/masters/ei-aviff-appendix-b-evaluator.js
  7e5af2676952559e26d4131ffce31457566b17d2
converters/vibration/masters/canonical.js
  d48c8d545b679247efc4ed455485255fae8f8594
converters/vibration/masters/registry.js
  61e7250890ffe1c8b020d0672365a5608f5da6f1
converters/vibration/masters/validate.js
  ba20656afc69b28f52d0f1e1baf702753398aa0c
tabs/vibration-integrity-mechanical-controller.js
  2b9614274dc1c34126c36923d0ed1e64c249b042
tabs/vibration-integrity-mechanical-view.js
  e2ab173d6279dcca0a876dd8f2a487b0e0bc30ce
tests/vibration-mechanical-t23-facility-stage4.test.mjs
  87cdd9f78b637f64dcb44b14188c16467c6de0c8
```

Executed results:

```text
vibration-mechanical-t23-facility-stage4.test.mjs
  4 tests / 4 PASS
  includes real Stage-3 master evaluator D2.4 = 0.4
  exact scope mismatch / duplicate / unknown / shared-support hard stop PASS

vibration-mechanical-t23-module-boundaries-stage4.test.mjs
  4 tests / 4 PASS
  evaluator reuse / <300 lines / no authority activation / shared-support hard stop PASS

vibration-mechanical-t23-ui-stage4.test.mjs
  4 executable panel tests / 4 PASS
  equipment controls / NOT APPLICABLE / shared-support disabled / calculated candidate rendering PASS
  final source-routing test not executed in the bounded reconstruction because complete product checkout was unavailable
```

These are `PASS / EXACT_BLOB_BOUNDED_EXECUTION`, not a claim that the complete repository suite ran.

## Chromium execution

Installed runtime:

```text
Chromium 144.0.7559.96
HeadlessChrome/144.0.0.0
```

The container's managed Chromium policy has `URLBlocklist=["*"]`, so localhost and `file:` product navigation are blocked before application code executes. `about:blank` is permitted but is not a secure context and has no native `crypto.subtle`.

A bounded Chromium module-runtime acceptance was therefore executed using the exact Git-blob-verified Stage-4 view/controller/domain/master modules loaded as ES data modules. The harness changed only the canonical module's crypto binding to a test-only `__testCrypto` SHA-256 bridge; the bridge self-tested against the standard SHA-256 `abc` digest before loading the master registry. No repository source file was modified for this bridge.

Executed Chromium result:

```text
status                  PASS
scope                   MECHANICAL-FACILITY/14-GAS-1001/NORMAL/CAN-K402
selected source 1       CENTRIFUGAL_COMPRESSOR
selected source 2       ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW
governing LOF           0.4
governing source        ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW
screeningAuthority      NOT_AUTHORIZED
designAuthority         false
shared-support disabled true
rendered authority      CANDIDATE
```

Classification:

```text
Chromium Stage-4 module/UI acceptance = PASS
Full product Chromium navigation      = NOT_RUN / MANAGED_URL_POLICY_BLOCKED
```

Do not broaden the module-level PASS into a full hosted product/browser PASS.

## Full repository-suite truth

The complete `node --test tests/*.test.mjs` suite remains:

```text
NOT_RUN / ENVIRONMENT_BLOCKED
```

Both available complete-checkout routes are blocked:

1. local execution container: outbound private-GitHub clone/archive access unavailable;
2. GitHub-hosted runner: Actions budget prevented job allocation before step 1.

No PASS is inferred from this absence.

## Appendix A / protected invariants

```text
A1 Production trace             20/20
A2 Failure isolation            20/20
A3 Authority / invariant        20/20
A4 Independent validation       19/20
A5 Minimal patch                19/20
TOTAL                            98/100
```

Protected invariants remain unchanged: no T2.3 value duplication, no candidate-master activation, no screening/design/master-data promotion, Mechanical excluded from screening governing, no TM-09 reduction, and no invented shared-support LOF.

## Backup / rollback evidence

Repository backup CLI remains `NOT_RUN` because there is no complete local checkout. Pre-edit engineering-file blobs remain recorded in earlier PR510 history. Before this work-report edit its exact blob was:

```text
agents/PR510_workreport.md = cc00c4451011a952034d7eeca8460916f3cd8f8e
```

## Current changed-file boundary at validation head

Parent comparison at `133c7f9e...`:

```text
base    db64392374c198434c3a8a142fa33ab080160a0c
status  ahead
commits 29
behind  0
files   18
```

New validation files account for the increase from the original 16-file Stage-4 engineering diff to 18 files.

## Next-agent handover

Recheck live PR/base/head before mutation. Leave draft/unmerged unless the Owner separately authorizes merge. If GitHub Actions budget or another complete-checkout runner becomes available, execute the committed workflow and require both the full Node suite and full product Chromium path to pass before upgrading those two `NOT_RUN` classifications.