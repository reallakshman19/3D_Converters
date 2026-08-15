# WIP 5 — SBC Type-3 Production Freeze PF-005

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
BRANCH: agent/sbc-pf-005-runtime-cache-custody
STACK_BASE: PR #524 head 390aeb954f73eade6aa1f8344cd646d5c6048832
CURRENT_MAIN: 36f53018d5c1cf8bec609e39d6995a6067bb5d01
GROUNDING_EPOCH: 2026-08-15T21:12+04:00
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: proceed next
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-005 runtime ES-module cache custody / served-module identity
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Why this slice exists

Current production advanced to `main@36f53018...` through AIV PR #525 after a live browser proved a stale/mixed ES-module graph could execute old code even when current Git contained the correction. The accepted AIV recovery propagates cache key `20260815-aiv-pf01-cache-1` through its runtime chain.

PF-004 adds new SBC Type-3 product modules, but the Vibration Integrity entry still uses `vibration-integrity-fit-placeholder-1` and the new SBC children are imported through bare URLs. ES-module query identity on a parent does not automatically version child imports. Therefore an eventual served Chromium run could mix new and stale SBC bytes unless the changed SBC graph is explicitly versioned.

Hypothesis: a single SBC cache key on every changed/new SBC module edge will make the PF-004 served graph deterministic without altering any engineering calculation, authority, UI behavior, or state semantics.

Falsifier: stop if deterministic served identity requires changing calculation logic, shared workflow vocabulary, authority tiers, curve publication state, or unrelated AIV/FBX runtime behavior.

## Cache identities

```text
SBC_CACHE_KEY = 20260815-sbc-pf05-cache-1
CURRENT_MAIN_AIV_CACHE_KEY = 20260815-aiv-pf01-cache-1
FORBIDDEN_OLD_FIT_TOKEN = vibration-integrity-fit-placeholder-1
```

The shared Engineering Calculations entry must preserve the current-main AIV key while changing only the FIT/Vibration Integrity product import to the SBC key.

## Pre-edit custody

Repository backup CLI is `NOT_RUN / ENVIRONMENT_BLOCKED` because this connector environment has no authenticated native checkout. Immutable exact Git blobs were captured before mutation:

```text
tabs/engineering-calculations-tab.js                  04b5f1340b0300dd582a4d659af3079c2c847251
tabs/vibration-integrity-tab.js                       cc3ab1c219ed7f4c4efdbfbaab9a6fe716857067
tabs/vibration-integrity-user-data-shell.js           a5be41ce465fa561827e7e50643fa5016f5f7b3f
tabs/vibration-integrity-sbc-type3-controller.js      6346872d86e0ccf39b6328bba9167285d8793603
tabs/vibration-integrity-sbc-type3-state.js           5e81c826156c93a00c2c335ab307d79e215ee8e2
tabs/vibration-integrity-view.js                      e1a00053c14f133c6b1a3734220095a99cdefe47
tabs/vibration-integrity-mechanisms.js                dc1c9b4ae022b27fa9d1bde07899cf9c9979b084
converters/vibration/mechanisms/index.js              e19a1e0c82ae7e1edc557cff6e0112c2210fd8b1
converters/vibration/mechanisms/sbc.js                ccbf4155fa163303504d5e6371b0ea9bd036f049
converters/vibration/sbc/facility.js                  4aa59c49e9c8502b040322ab9d4424f2e22e8fb3
converters/vibration/sbc/type3-user-data.js           6a5766ab96c86ec3be3e69c2f9681c1fc10e126b
converters/vibration/sbc/type3-master-assisted-candidate.js fda1fdc7d444c5ce1965b12f834bfa65fbda6e6b
converters/vibration/sbc/type3-master-assisted-derivation.js 20498cc872681aadb436cc77cf491bca5c98fb0c
```

Current-main shared-entry reference was separately inspected at `36f53018...`; its AIV import is already `?v=20260815-aiv-pf01-cache-1` while its Vibration Integrity import remains the old placeholder token.

## Required tokenized graph

```text
engineering-calculations-tab
  -> vibration-integrity-tab

vibration-integrity-tab
  -> vibration-integrity-user-data-shell

vibration-integrity-user-data-shell
  -> type3-user-data
  -> vibration-integrity-sbc-type3-controller
  -> vibration-integrity-sbc-type3-state
  -> vibration-integrity-sbc-type3-view
  -> vibration-integrity-view

vibration-integrity-sbc-type3-controller
  -> type3-master-assisted-candidate
  -> type3-master-assisted-derivation
  -> vibration-integrity-sbc-candidate-currentness
  -> vibration-integrity-sbc-type3-state

vibration-integrity-sbc-type3-state
  -> type3-user-data
  -> vibration-integrity-sbc-candidate-currentness

type3-master-assisted-candidate
  -> type3-combination
  -> type3-master-assisted-derivation
  -> type3-user-data

type3-master-assisted-derivation
  -> type3-user-data
  -> type3-noncurve-candidate-data

type3-user-data
  -> type3-combination

vibration-integrity-view
  -> vibration-integrity-mechanisms

vibration-integrity-mechanisms
  -> sbc/facility
  -> vibration/mechanisms/index

vibration/mechanisms/index
  -> mechanisms/sbc

mechanisms/sbc
  -> sbc/facility

sbc/facility
  -> type3-user-data
```

Untouched FIT, Mechanical, master-registry, user-data-model, contracts, and generic UI imports remain unchanged/bare unless they are themselves a PF-004 changed SBC edge above.

## Protected invariants

PF-005 changes URL identity only. It must not change:

```text
D7 C=.68 D=.20 E=.70 F=.60 G=.20 LOFLOC=1 final=.70
no-mass target .284
missing/blank terms fail closed
only no-unsupported-mass may auto C=0
T3-1..T3-4 BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation=false
masterPublicationAuthorized=false
engineeringAuthority=NONE
screeningAuthority=NOT_AUTHORIZED
designAuthority=false
masterDataAuthority=false
FIT remains screeningGoverning; SBC candidate tier only
PF-003 scope/revision/token semantics
PF-004 UI/workflow behavior
```

## Validation plan

Add `tests/vibration-sbc-type3-runtime-cache-chain.test.mjs` to statically verify every required edge carries `20260815-sbc-pf05-cache-1`, the old FIT placeholder token is absent, and the current-main AIV key remains intact. The existing hosted production-freeze workflow already runs `node --test tests/*.test.mjs`, so no package/workflow mutation is required.

Official served-app Chromium remains `NOT_RUN` until the exact integrated candidate can actually be served and exercised. Static cache-chain proof is a prerequisite to that browser run, not a replacement for it.
