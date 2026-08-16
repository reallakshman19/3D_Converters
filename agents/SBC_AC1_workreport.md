# SBC-AC1 — Production Freeze & Source Reconciliation Work Report

## Assignment

Work pack: **SBC Type-3 Production Freeze & Authority Convergence**  
Phase: **SBC-AC1 — Production Freeze closure + controlled EI source reconciliation**

Owner/reviewer qualification is recorded on issue #514 as:

```text
QUALIFIED_FOR_SBC_AUTHORITY_CONVERGENCE
```

Qualification does not grant Screening authority or merge authority.

## Re-grounded base

```text
repository = reallaksh19/3D_Converters
main at work start = d2293410679935f935fd0a8cdc0bd668f92cd492
prior SBC baseline = 19cf1f0a6f3f0f88ca983ced3b2606041adeab4c
```

The new main commit is the AIV cache-custody merge #543 and is a direct child of the prior SBC work-pack baseline.

FIT overlap remains unresolved:

```text
PR #539 = OPEN / DRAFT
PR #540 = OPEN / DRAFT, stacked on #539
```

Therefore this AC1 does **not** modify:

```text
tabs/engineering-calculation-vibration-family.js
```

## Controlled EI source package

The supplied controlled source package is pinned exactly:

```text
repository = reallaksh19/Advanced_Analysis
commit = 76eb4bd075ce2e8e2442d02b2798df7be491fb4b
path = docs/EI data

P0 SBC master:
  path = docs/EI data/P0_SBC_Master_Data.md
  blob = 5312c9e2cf86af9e940ba722fcbee64702aeccd3

Worked examples:
  path = docs/EI data/EI_AVIFF_Guidelines_2nd_Edition_Examples.md
  blob = c050cd90802c27241c510c6f0ac43bfaf7a89e9d

Complete master register:
  path = docs/EI data/EI_AVIFF_Complete_Master_Register.md
  blob = 51bca43473be8018d4ce48fb440ee4d7bd0abc82
```

The P0 SBC master blob is the same blob already implicated by the current SBC T3 curve quarantine. Merely changing the source commit pointer cannot resolve the numerical conflict.

Detailed reconciliation evidence is recorded in:

```text
ValidationRecords/VibrationSBC/SourceReconciliation/
  SBC-T3-AdvancedAnalysis-76eb-source-reconciliation-v1.json
```

## Frozen D7 oracle

No engineering result has been changed.

```text
C = 0.68
D = 0.20
E = 0.70
F = 0.60
G = 0.20
LOFLOC = 1.00

firstGeometry = 0.70
firstModifier = 0.70
subsequentGeometry = 0.60
subsequentModifier = 0.60
overallModifier = 0.70
mainlineMultiplier = 1.42
mainlineAdjusted = 1.42
final SBC LOF = 0.70
```

D7 remains validation evidence, not a calibration input.

## Source reconciliation findings

The controlled EI package is available, but runtime curve authority remains blocked because the supplied digitization does not reproduce the worked-example probes at the current governed evaluator semantics:

```text
T3-1 @ 1.5 in, 0.9/0.7 m:
  D7 expected = 0.20
  digitized package = 0.40

T3-3 @ 1.5 in, 2.3 m:
  D7 expected = 0.60
  digitized package = 0.70

T3-4 @ 1.5 in, 1.4 m:
  D7 expected = 0.20
  digitized package = 0.30
```

The P0 generic Type-3 synthesis summary also contains wording/formulation inconsistent with the worked-example max/min sequence. The current production kernel is therefore not rewritten from that generic summary.

Required state remains:

```text
T3-1..T3-4 publication = BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation = false
masterDataAuthority = false
```

## AC1 source changes

1. Pin the exact Advanced_Analysis commit/blob identities in the browser fixture.
2. Use the exact worked-example source identity for D7 manual project evidence.
3. Add immutable source-reconciliation evidence recording all known D7/master conflicts.
4. Harden `VibrationSbcType3ProductionFreezeReceipt.v1` so a run records:
   - exact served-app commit SHA;
   - exact served build/deploy identity;
   - SBC runtime cache identity;
   - actual Chromium version;
   - controlled EI source package identities;
   - frozen physical/D7/project-curve snapshots;
   - facility scope IDs;
   - explicit candidate/NONE/NOT_AUTHORIZED authority boundary;
   - 1280 px and 1440 px usability screenshots.
5. If Playwright cannot import or Chromium cannot launch, classify the gate as `NOT_RUN / ENVIRONMENT_BLOCKED` rather than crashing before receipt creation or being reported as PASS.

## Validation truth in this connector runtime

A real served application + Playwright Chromium execution is not available in this connector-only environment. Therefore:

```text
SBC_SERVED_CHROMIUM = NOT_RUN / ENVIRONMENT_BLOCKED
FREEZE_STATE = NOT_FROZEN
AUTHORITY_CONVERGENCE_PROMOTION = STOPPED
```

Source/diff audit:

```text
base = d2293410679935f935fd0a8cdc0bd668f92cd492
branch relation = ahead only / behind 0
intended changed paths only = PASS_SOURCE
```

This is **not** a browser PASS.

## Owner-directed local check — 2026-08-16

The Owner directed that hosted workflow state be ignored and that the work pack proceed with local checks.

Local environment inventory:

```text
Node       = v22.16.0
npm        = 10.9.2
git        = 2.47.3
Chromium   = 144.0.7559.96
Playwright = NOT_INSTALLED
gh CLI     = NOT_INSTALLED
```

A direct exact-branch clone was attempted and failed because outbound GitHub DNS is blocked:

```text
fatal: unable to access 'https://github.com/reallaksh19/3D_Converters.git/':
Could not resolve host: github.com
```

The exact relevant repository blobs were therefore reconstructed locally from the connected GitHub repository for source/kernel validation. The local check is recorded in:

```text
ValidationRecords/VibrationSBC/ProductionFreeze/SBC-AC1-local-check.json
```

Observed local results:

```text
AC1-LOCAL-01 changed JS syntax + reconciliation JSON       PASS
AC1-LOCAL-02 frozen D7 through type3-combination kernel   PASS
AC1-LOCAL-03 missing D fail-closed                        PASS
AC1-LOCAL-04 no-mass automatic C=0                       PASS
AC1-LOCAL-05 T3 quarantine + authority boundary           PASS
AC1-LOCAL-06 candidate non-curve master values            PASS
AC1-LOCAL-07 reconciliation/kernel/quarantine parity       PASS
AC1-LOCAL-08 freeze receipt source contract                PASS
AC1-LOCAL-09 missing Playwright receipt classification     PASS
AC1-LOCAL-10 full served-app Chromium journey              NOT_RUN / ENVIRONMENT_BLOCKED
```

Frozen D7 observed through the actual Type-3 combination kernel:

```text
firstGeometry       = 0.70
firstModifier       = 0.70
subsequentGeometry  = 0.60
subsequentModifier  = 0.60
overallModifier     = 0.70
mainlineAdjusted    = 1.42
final SBC LOF       = 0.70
```

Missing D returned:

```text
status = NOT_READY
term = LOFGEOM(D)
problem status = INPUT_REQUIRED
reason = NON_NEGATIVE_NUMBER_REQUIRED
```

The exact candidate master/quarantine modules also reproduced:

```text
Weldolet fitting span factor = 0.70
1.5 in first-span limit      = 1.30 m
T3 curve status              = BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation       = false
screeningAuthority           = NOT_AUTHORIZED
```

### Local harness defect found and fixed

The local check exposed a gate-accounting defect: the browser validator had a static top-level `playwright` import, while repository `package.json` does not declare Playwright. When Playwright was unavailable, Node failed during module loading before `main()` could create the required `NOT_RUN / ENVIRONMENT_BLOCKED` receipt.

The validator now loads Playwright through a guarded dynamic import. A local minimal harness check with exact SHA/build identity verified that missing Playwright emits:

```text
schema = VibrationSbcType3ProductionFreezeReceipt.v1
status = NOT_RUN
reason = ENVIRONMENT_BLOCKED
phase = PLAYWRIGHT_IMPORT
```

This minimal receipt is a harness-classification test only. It is explicitly **not** the official Production Freeze receipt because the full exact-head served application was not available.

## Required exact-head browser invocation

When the branch is available in a capable served environment, build/serve the exact branch head and provide explicit identities:

```bash
VIBRATION_SBC_SERVED_APP_SHA="$(git rev-parse HEAD)" \
VIBRATION_SBC_SERVED_BUILD_ID="<exact-build-or-deploy-id>" \
VIBRATION_BROWSER_BASE_URL="http://127.0.0.1:4173" \
node scripts/validate-vibration-sbc-type3-production-freeze-browser.mjs
```

Required receipt:

```text
artifacts/vibration-sbc-type3-production-freeze/
  sbc-type3-production-freeze-receipt.json
```

Only a real receipt with:

```text
status = PASS
browser.product = chromium
browser.version = <actual version>
executionIdentity.servedAppSha = exact tested head
executionIdentity.servedBuildId = exact served build
authorityBoundary.screeningAuthority = NOT_AUTHORIZED
authorityBoundary.runtimeCurveActivation = false
```

may close the AC1 Production Freeze gate.

## Authority boundary

AC1 changes no engineering authority:

```text
calculation use = CANDIDATE_ASSESSMENT
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
codeCompliance = false
masterDataAuthority = false
```

SBC is not promoted to Screening in this PR.

## Next gate

Do not land the active central registry convergence while the full served Chromium gate is `NOT_RUN`.

After AC1 obtains exact-head Chromium PASS, proceed to SBC-AC2/AC3 with the single-domain-kernel adapter architecture and central parity tests defined in the qualified work pack.
