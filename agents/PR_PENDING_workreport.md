# FIT Design / Code Authority Boundary — Living Work Report

## PR Mission Control

```text
Mission: make FIT design-authority / code-compliance semantics explicit and fail-closed without widening the FIT screening method
Source task / issue: Owner direction 2026-08-16; parent #429; stacked on PR #539
PR number: PENDING
Branch: agent/fit-design-code-authority-boundary
Base: PR #539 head 3093fd12923815247c8104349c0f0a83a77de056
Current HEAD: c2a28269e3aa4aa0c5b9c880d69e9b00b6d1a994 before this report update
PR status: NOT_CREATED
Current stage: Stage 5 — stacked draft PR allocation
Last completed stage: Stage 4 — regression hardening
Engineering status: FIT authority boundary locked: bounded screening only; not a design check; not a code-compliance check
Validation status: source/diff audit PASS; executable Node/release/browser validation NOT_RUN / ENVIRONMENT_BLOCKED
Current blocker: no runnable private checkout / browser path in this runtime; no separate qualified design/code assessment exists
Exact next action: open stacked draft PR against `agent/fit-production-authorized-freeze`, rename report, reconcile final diff/status
```

## Handover in 60 Seconds

What is now true:
- PR #539 proposes Production lifecycle while retaining bounded Screening authority.
- This successor prevents `designAuthority=false` / `codeCompliance=false` from being misread as unfinished Production gates.
- New frozen `FIT_AUTHORITY_BOUNDARY` states:
  - `engineeringUse=BOUNDED_SCREENING_ONLY`;
  - `designAuthority=false`, `designAuthorityDisposition=NOT_A_DESIGN_CHECK`;
  - `codeCompliance=false`, `codeComplianceDisposition=NOT_A_CODE_COMPLIANCE_CHECK`;
  - `futureAuthorityRoute=SEPARATE_QUALIFIED_ASSESSMENT_REQUIRED`.
- The boundary is carried into definition metadata, result assessment, provenance and evidence.
- The FIT family UI now says `Design use: SCREENING ONLY` and `Code compliance: NOT A CODE CHECK`.
- The selected FIT console adds `SCREENING USE ONLY` and `NOT A CODE CHECK`.
- FIT reference bands remain screening classifications; no code/design PASS/FAIL criterion was introduced.
- A dedicated regression is wired into `npm run verify:vibration-fit-release`.

What remains unfinished:
- executable focused regression and full release run;
- browser acceptance;
- PR allocation/report rename.

What must not be assumed:
- Production authorization is not design or code compliance.
- A future design/code assessment cannot be created by flipping these booleans; it needs its own governing basis, qualified acceptance criterion, evidence and review.

Highest risk: future in-place promotion of the current FIT ID/method into design/code authority.

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | FIT remains screening-only; Production lifecycle does not imply design/code compliance | yes |
| DEC-002 | Decision | P0 | ACCEPTED | In-place design/code promotion of current FIT ID/method is prohibited | yes |
| RISK-001 | Risk | P0 | MITIGATED_SOURCE | immutable metadata + release regression + visible UI semantics guard against boolean flip | yes |
| IMP-001 | Improvement | P0 | IMPLEMENTED | machine-readable reason/disposition for false design/code authority | yes |
| QST-001 | Question | P1 | RESOLVED | FIT itself should not become a code/design check; separate qualified assessment required | yes |

## Critical Invariants

1. FIT equations, correlations, coefficients, tolerances, method revision and numerical applicability are unchanged.
2. FIT remains `engineeringAuthority=SCREENING`, `screeningAuthority=AUTHORIZED_BOUNDED` on the PR #539 stack.
3. `designAuthority=false` and `codeCompliance=false` are required for the current FIT calculation ID/method.
4. No reference band becomes a code/design acceptance criterion.
5. Any future code/design assessment requires a separate qualified method/basis and independent review evidence.
6. No other VIB mechanism inherits FIT authority.

## Stage Execution Log

### Stage 1 — COMPLETE
Audited current main, PR #539, #429, `docs/APIEngineeringCalcContracts.md` and the FIT review package. The contract explicitly separates qualification from numerical execution and prohibits inferring design authority from numeric results. The FIT review package defines reference bands as screening classifications, not universal PASS/FAIL/safe decisions.

### Stage 2 — COMPLETE
Updated `converters/engineering-calculations/adapters/vibration-fit.js`:
- exported frozen `FIT_AUTHORITY_BOUNDARY`;
- definition authority object is frozen;
- result assessment/provenance/evidence carry the boundary;
- warning/limitations state separate design/code assessment is required;
- no numerical FIT function changed.

### Stage 3 — COMPLETE
Updated visible UI semantics:
- family card: `Design use: SCREENING ONLY`, `Code compliance: NOT A CODE CHECK`;
- family banner: Production lifecycle does not imply design/code authority;
- selected console: `SCREENING USE ONLY`, `NOT A CODE CHECK`.

### Stage 4 — COMPLETE
Added `tests/vibration-fit-design-code-authority-boundary.test.mjs` and wired it into `scripts/verify-vibration-fit-release.mjs`.
The regression checks immutable metadata, effective Screening authority, no `designAuthority:true` / `codeCompliance:true` path, no qualified code/design criterion, and visible UI semantics.
Executable test run: NOT_RUN / ENVIRONMENT_BLOCKED.

### Stage 5 — ACTIVE
Open stacked draft PR, rename work report, final diff/status reconciliation.

## Changed-File Ledger

| File | Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1/5 | living handover | no | current |
| `converters/engineering-calculations/adapters/vibration-fit.js` | 2 | immutable authority boundary + evidence | yes | PASS_SOURCE |
| `tabs/engineering-calculation-vibration-family.js` | 3 | visible authority semantics | presentational authority | PASS_SOURCE |
| `tabs/engineering-calculation-console-view.js` | 3 | selected FIT authority semantics | presentational authority | PASS_SOURCE |
| `tests/vibration-fit-design-code-authority-boundary.test.mjs` | 4 | permanent regression | no | PASS_SOURCE / NOT_RUN_EXECUTION |
| `scripts/verify-vibration-fit-release.mjs` | 4 | include new regression in release gate | no | PASS_SOURCE / NOT_RUN_EXECUTION |

## Validation Ledger

### Software Validation
- Current main / PR #539 / #429 / contract / review package audit: PASS_SOURCE.
- Stacked compare vs PR #539 head: PASS — ahead 7, behind 0, six intended paths.
- Focused new Node regression: NOT_RUN / ENVIRONMENT_BLOCKED.
- Full `npm run verify:vibration-fit-release`: NOT_RUN / ENVIRONMENT_BLOCKED.
- Browser: NOT_RUN / ENVIRONMENT_BLOCKED.

### Engineering Validation
- FIT bounded-screening method boundary: PASS_SOURCE.
- Current FIT design authority: intentionally false / NOT_A_DESIGN_CHECK.
- Current FIT code compliance: intentionally false / NOT_A_CODE_COMPLIANCE_CHECK.
- Future route: separate qualified assessment required.

### Explicitly Not Validated
- any new design/code assessment method;
- project/client acceptance of a governing design code basis;
- independent code/design reviewer approval.

## Recommended Forward Sequence

1. Merge/qualify #539 separately once its Production Freeze gates pass.
2. Merge this authority-boundary clarification after #539 or replay it on main.
3. If actual design/code compliance is wanted, open a new engineering-method PR defining the governing code/procedure, acceptance criterion, applicability, inputs/masters, independent benchmark and reviewer approval.

## Next-Agent Handover

Do not flip FIT design/code booleans. Treat current FIT as production bounded screening only. Start from this branch and execute the new focused test + full FIT release suite in a normal checkout. If those pass, complete stacked PR handover; any true design/code authority belongs to a separate qualified assessment.
