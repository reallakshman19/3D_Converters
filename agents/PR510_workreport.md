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
EXECUTED_VALIDATION_SOURCE_HEAD: 133c7f9ededb873b16868203d8b0768220e10460
REPORT_SYNC_HEAD: d77e58f555f5ca718d5ed42fe0ec0e5640f840d5
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

```text
run_id     = 31875120781
workflow   = Vibration Mechanical Stage 4 Validation
head       = 133c7f9ededb873b16868203d8b0768220e10460
job        = 94989590474
steps      = []
runner_id  = 0
```

GitHub annotation:

```text
The job was not started because an Actions budget is preventing further use.
```

Classification:

```text
GitHub workflow execution = NOT_RUN / ACTIONS_BUDGET_BLOCKED
```

No checkout or test step started, so this is not a code/test FAIL.

## Exact-blob local Node execution

The local container cannot clone the private repository because outbound GitHub network access is blocked. Exact Stage-4 files were materialized through the GitHub connector and verified with `git hash-object` against GitHub blob SHAs before execution.

Key verified blobs:

```text
facility.js                                  578d943a2435339e53c1d2e7083b74690c0116c3
appendix-b-data.js                           3ef76b1b997e29227bcef5af82f502e6f6d8e9cc
appendix-b-candidate.js                      8dbfbdfb9c2c95bdcdb506bb14aa7ab9b1b12368
appendix-b-evaluator.js                      7e5af2676952559e26d4131ffce31457566b17d2
canonical.js                                 d48c8d545b679247efc4ed455485255fae8f8594
registry.js                                  61e7250890ffe1c8b020d0672365a5608f5da6f1
validate.js                                  ba20656afc69b28f52d0f1e1baf702753398aa0c
mechanical controller                       2b9614274dc1c34126c36923d0ed1e64c249b042
mechanical view                             e2ab173d6279dcca0a876dd8f2a487b0e0bc30ce
facility Stage-4 test                        87cdd9f78b637f64dcb44b14188c16467c6de0c8
mechanical mechanism adapter                74339c2598dea9ed42b79f4f3aac885aaa8182bb
module-boundary Stage-4 test                 b8830126cd0ec481c64513dda408110f516b1bdc
UI Stage-4 test                              caad349a8e25dfdd28272e1ad2d33df65f66c48e
```

Executed:

```text
vibration-mechanical-t23-facility-stage4.test.mjs
  PASS 4/4
  real Stage-3 master evaluator D2.4 = 0.4
  exact scope / duplicate / unknown / shared-support hard-stop PASS

vibration-mechanical-t23-module-boundaries-stage4.test.mjs
  PASS 4/4
  evaluator reuse / <300 lines / no authority activation / shared-support hard-stop PASS

vibration-mechanical-t23-ui-stage4.test.mjs
  PASS 4/4 executed panel tests
  equipment controls / NOT APPLICABLE / shared-support disabled / candidate rendering PASS
  one separate source-routing test remains NOT_RUN because the full exact product checkout was unavailable
```

Classification is `PASS / EXACT_BLOB_BOUNDED_EXECUTION`, not a complete-repository claim.

## Chromium execution

Installed Chromium:

```text
Chromium 144.0.7559.96
HeadlessChrome/144.0.0.0
```

The managed browser policy is `URLBlocklist=["*"]`, so localhost and `file:` navigation are blocked before product code can load. `about:blank` is permitted but is an insecure context without native `crypto.subtle`.

A bounded Chromium module/UI acceptance was therefore run by loading the exact Git-blob-verified Stage-4 view/controller/domain/master modules as ES data modules. The harness redirected only the canonical module's crypto binding to a test-only SHA-256 bridge because the managed `about:blank` context lacks WebCrypto. The SHA-256 bridge self-tested against the standard `abc` digest before master-registry execution. No repository source file was changed for this bridge.

Executed Chromium result:

```text
status                  PASS
scope                   MECHANICAL-FACILITY/14-GAS-1001/NORMAL/CAN-K402
selected                 CENTRIFUGAL_COMPRESSOR
selected                 ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW
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

Do not broaden this bounded module/UI PASS into a full hosted-product browser PASS.

## Full repository-suite truth

```text
node --test tests/*.test.mjs = NOT_RUN / ENVIRONMENT_BLOCKED
```

Both complete-checkout routes are blocked:

1. local container: outbound private-GitHub checkout/archive access unavailable;
2. GitHub-hosted runner: Actions budget prevented job allocation before step 1.

No PASS is inferred.

## Validation Ledger

| Check | Status | Evidence |
|---|---|---|
| D2.4 exact-blob Node path | PASS | 4/4 facility tests |
| Stage-4 module boundaries | PASS | 4/4 |
| Stage-4 executable UI panel tests | PASS | 4/4 |
| Chromium Stage-4 module/UI path | PASS | Chromium 144, LOF 0.4, candidate authority retained |
| Full product Chromium navigation | NOT_RUN | managed URL block policy |
| Full repository Node suite | NOT_RUN | complete-checkout routes blocked |
| GitHub Actions attempt | NOT_RUN | Actions budget; job steps=[] |
| controlled EI PDF reconciliation | inherited NOT_RUN | #509 remains candidate |

## Protected invariants

No T2.3 value duplication, no candidate-master activation, no screening/design/master-data promotion, Mechanical excluded from screening governing, no TM-09 reduction, no invented shared-support LOF.

## Backup / rollback evidence

Repository backup CLI remains `NOT_RUN` because no complete local checkout exists. Exact pre-edit engineering blobs remain in prior PR510 history. Work-report rollback blobs:

```text
before validation reconciliation: cc00c4451011a952034d7eeca8460916f3cd8f8e
before this sync:                 dd992ab2dd94c182770a21bd5232e1cac1194bf9
```

## Changed-file boundary

At executed validation source head `133c7f9e...`:

```text
base    db64392374c198434c3a8a142fa33ab080160a0c
commits 29 ahead
behind  0
files   18
```

The two additional files are validation infrastructure requested after the original Stage-4 implementation.

## Next-agent handover

Recheck live PR/base/head before mutation. Leave draft/unmerged unless the Owner separately authorizes merge. When an Actions budget or another complete-checkout runner becomes available, run the committed validation workflow and require the full Node suite and full product Chromium navigation to PASS before upgrading those two NOT_RUN classifications.