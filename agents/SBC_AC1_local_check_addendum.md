# SBC-AC1 — Owner-Directed Local Check Addendum

This addendum supersedes the earlier generic connector-runtime statement that real Chromium was unavailable.

## Owner direction

On 2026-08-16 the Owner directed:

```text
ignore workflow, proceed with local check
```

Hosted workflow state is therefore not used as validation evidence in this local-check slice.

## Current re-ground

During the local check, `main` advanced. AC1 was rebuilt cleanly on the then-current main:

```text
current main = 9ac255a0664e54fb9ac6c6decb2a5adec8eeceec
re-ground commit = c5977d4132c98fba1deaba9171c05d19a9b9780b
branch relation after re-ground = ahead 1 / behind 0
intended changed paths = 5
```

The re-ground did not change the frozen SBC arithmetic or curve quarantine. Exact executable blobs remain:

```text
type3-combination.js = 2c1212e67c8403e9dc55fe64a6f55a012cb57a33
ei-aviff-sbc-t3-candidate.js = 6b21ca138805c778d4ac15bac63a24782e48583f
```

## Local execution results

Environment:

```text
Node = v22.16.0
npm = 10.9.2
git = 2.47.3
Chromium = 144.0.7559.96
system Chromium executable = /usr/bin/chromium
Python Playwright = 1.57.0
```

Direct private checkout remains blocked:

```text
git clone -> Could not resolve host: github.com
```

Exact relevant repository blobs were reconstructed locally through the connected GitHub repository for executable source/kernel checks.

### PASS — Type-3 frozen kernel

Actual `combineSbcType3Terms()` produced:

```text
C=.68 D=.20 E=.70 F=.60 G=.20 LOFLOC=1.00
firstGeometry=.70
firstModifier=.70
subsequentGeometry=.60
subsequentModifier=.60
overallModifier=.70
mainlineAdjusted=1.42
final SBC LOF=.70
```

Missing D returned `NOT_READY / INPUT_REQUIRED / LOFGEOM(D)` and the no-mass special case set C to `0` only when `hasMass=false`.

### PASS — quarantine / candidate master boundary

The executable candidate master reproduced:

```text
T3 curve status = BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation = false
masterPublicationAuthorized = false
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
masterDataAuthority = false
Weldolet fitting span factor = .70
1.5 in first-span minimum = 1.30 m
```

The three failing worked-example probes remain exactly:

```text
T3-1 .20 expected / .40 supplied
T3-3 .60 expected / .70 supplied
T3-4 .20 expected / .30 supplied
```

### PASS — receipt fail-closed behavior

The local check exposed and fixed a gate-accounting defect: a static top-level `playwright` import could fail before receipt creation when the Node package was unavailable.

The freeze validator now:

- dynamically loads Playwright and records `NOT_RUN / ENVIRONMENT_BLOCKED / PLAYWRIGHT_IMPORT` when unavailable;
- accepts optional `VIBRATION_SBC_CHROMIUM_EXECUTABLE_PATH` and records it in the receipt;
- classifies blocked local served-app navigation as `NOT_RUN / ENVIRONMENT_BLOCKED / SERVED_APP_NAVIGATION` rather than product FAIL.

### PASS — real Chromium launch

Using the local Playwright driver with:

```text
VIBRATION_SBC_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
```

real Chromium launched successfully and reported:

```text
browser.product = chromium
browser.version = 144.0.7559.96
```

### NOT_RUN — full served-app Production Freeze

The environment blocks Chromium navigation to local addresses with:

```text
net::ERR_BLOCKED_BY_ADMINISTRATOR
```

The hardened receipt therefore correctly records:

```text
schema = VibrationSbcType3ProductionFreezeReceipt.v1
status = NOT_RUN
reason = ENVIRONMENT_BLOCKED
phase = SERVED_APP_NAVIGATION
browser.version = 144.0.7559.96
```

This local classification receipt is **not** the official Production Freeze evidence because the exact-head full application user journey did not execute.

## Gate result

```text
LOCAL_KERNEL_AND_SOURCE_CHECKS = PASS
REAL_CHROMIUM_LAUNCH = PASS
FULL_SERVED_APP_CHROMIUM = NOT_RUN / ENVIRONMENT_BLOCKED
FREEZE_STATE = NOT_FROZEN
AUTHORITY_CONVERGENCE_PROMOTION = STOPPED
SCREENING_PROMOTION = FORBIDDEN
```

No SBC Screening, design, code or master-data authority is granted by these local checks.
