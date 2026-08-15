# PR510 — Mechanical T2.3 Facility Candidate Workflow

Current recovery/validation truth is recorded in this report history at commit `f845d04b986d0f1006f3c8075a7be425bd5ca1b2`.

## Current checkpoint

```text
PR                       #510
BASE                     agent/ei-appendix-b-stage3@db64392374c198434c3a8a142fa33ab080160a0c
EXECUTED_VALIDATION_HEAD 133c7f9ededb873b16868203d8b0768220e10460
REPORT_SYNC_HEAD          f845d04b986d0f1006f3c8075a7be425bd5ca1b2
MERGE_AUTHORITY           NOT_GRANTED
```

### Executed validation

```text
Exact-blob Stage-4 facility Node test       PASS 4/4
Exact-blob Stage-4 module-boundary test     PASS 4/4
Exact-blob executable Mechanical UI tests   PASS 4/4
Chromium 144 Stage-4 module/UI acceptance   PASS
D2.4 governing Mechanical LOF               0.4
Governing source                            ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW
Mechanical screeningAuthority               NOT_AUTHORIZED
Mechanical designAuthority                  false
Shared-support direct input                 disabled / blocked
```

Chromium used exact Git-blob-verified Stage-4 modules. Because the managed browser has `URLBlocklist=["*"]`, localhost and file navigation are blocked. The permitted `about:blank` context lacks WebCrypto, so the validation harness redirected only the canonical SHA-256 binding to a test-only SHA-256 bridge that self-tested against the standard `abc` digest. Repository source was not modified for that bridge.

### Still not executed

```text
Full product Chromium navigation   NOT_RUN / MANAGED_URL_POLICY_BLOCKED
Full node --test tests/*.test.mjs  NOT_RUN / ENVIRONMENT_BLOCKED
```

A repository-native GitHub workflow was added to execute focused tests, the full Node suite and real Playwright Chromium product navigation. Run `31875120781` on head `133c7f9e...` did not start: GitHub annotation states `The job was not started because an Actions budget is preventing further use.` Job steps were `[]` and runner id was `0`. Classify this as `NOT_RUN / ACTIONS_BUDGET_BLOCKED`, not a test failure.

The local container cannot obtain a complete private-repository checkout because outbound GitHub network access is blocked. Therefore no full-suite PASS is claimed.

### Authority invariant

```text
FIT        = IMPLEMENTED_SCREENING / AUTHORIZED_BOUNDED
Mechanical = IMPLEMENTED_CANDIDATE_MASTER / NOT_AUTHORIZED
SBC        = IMPLEMENTED_CANDIDATE_USER_INPUT / NOT_AUTHORIZED
```

Mechanical/SBC cannot become `screeningGoverning`; design authority remains false. No T2.3 value duplication, candidate-master activation, TM-09 reduction, or invented shared-support LOF is introduced.

### Exact next action

Leave PR draft/unmerged. Once a complete-checkout runner is available (GitHub Actions budget restored or another approved runner), execute `.github/workflows/vibration-mechanical-stage4-validation.yml` and require both the full repository Node suite and real product Chromium path to PASS before upgrading those two NOT_RUN classifications.
