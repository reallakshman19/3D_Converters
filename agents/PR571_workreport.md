# PR571 — VIB-COVERAGE-01 recovery-first workreport

Issue: #570
PR: #571
Branch: `agent/vib-coverage-01`
Base SHA: `24080a49647c7802ff8ab496ccd37421b8d53b68`
Current PR head at allocation: `09f83385fe5ab0165a552cd86d86ddfd93322fe6`
Criticality: `ENGINEERING_CRITICAL`
PR state: `DRAFT`
Merge authority: `OWNER_ONLY`
Takeover disposition: `CONTINUE`

## Mission

Machine-enforce explicit vibration mechanism identification, required-assessment coverage and family completeness without inventing T1 rules, changing numerical methods, or performing EI main-line aggregation.

## Current implementation

New contract files:

```text
converters/vibration/mechanisms/coverage-identification.js
converters/vibration/mechanisms/coverage.js
```

New focused falsification suite:

```text
tests/vibration-mechanism-coverage.test.mjs
```

Current contracts provide:

```text
VibrationMechanismIdentification.v1
RequiredAssessmentSet.v1
MechanismCoverage.v1
AssessmentCompleteness.v1
```

Completeness states:

```text
COMPLETE
INCOMPLETE
NOT_APPLICABLE
```

Identification dispositions:

```text
REQUIRED
NOT_APPLICABLE
UNRESOLVED
```

The implementation consumes explicit identification evidence. It contains no T1 automatic applicability rules and no vibration equations/coefficient values.

## Appendix A qualification

Recorded before production mutation in `agents/WIP-VIB-COVERAGE-01_workreport.md`:

```text
A1 Production Trace             19/20
A2 Current Failure Isolation    19/20
A3 Authority / Invariant        20/20
A4 Independent Validation       18/20
A5 Minimal Next Patch           18/20
TOTAL                           94/100
DISPOSITION                     QUALIFIED_FOR_VIB_COVERAGE_IMPLEMENTATION
```

## Current falsification coverage

The focused test freezes these expectations:

```text
no identification evidence -> INCOMPLETE
REQUIRED + missing assessment -> INCOMPLETE
REQUIRED + NOT_IMPLEMENTED/not evaluated -> INCOMPLETE
REQUIRED + stale result -> INCOMPLETE
REQUIRED + candidate when SCREENING required -> INCOMPLETE
explicit NOT_APPLICABLE evidence -> NOT_APPLICABLE coverage
UNRESOLVED -> INCOMPLETE
all required current SCREENING assessments -> COMPLETE
all explicit non-applicable -> NOT_APPLICABLE
unknown mechanism -> fail closed
duplicate/contradictory identification -> fail closed
wrong facility scope -> fail closed
required-set identity independent of input ordering
identification evidence change -> new required-set identity
```

## Size-rule correction

The first draft of `coverage.js` exceeded the repository `<300` physical-line rule. Before PR allocation it was split into:

```text
coverage-identification.js  <240 lines
coverage.js                 <260 lines
coverage test               <250 lines
```

The oversized state is historical only; current PR head complies.

## Active overlap classification

Observed open work at start:

```text
PR #479 FIT run evidence                 SAFE for initial new paths
PR #539 FIT authority/console projection SAFE for initial new paths
PR #560 roadmap docs                     SAFE for initial new paths
PR #546 SBC Type-3 freeze/source work    FORBIDDEN / DO NOT ABSORB
```

No existing shared production file has been edited yet.

## Protected invariants

- no automatic T1 engineering classification;
- no numerical method/equation/coefficient changes;
- no benchmark target/tolerance changes;
- no authority promotion;
- no Product Freeze inference;
- no universal vibration score;
- missing assessment != NOT_APPLICABLE;
- candidate != required SCREENING coverage;
- stale != current coverage;
- static UI mechanism labels are not completeness authority;
- no EI main-line aggregation in this PR slice;
- no PR #546 technical work.

## Validation truth

```text
Live source grounding                  PASS
Appendix A qualification               PASS
New-file physical-line guard           PASS
Focused Node test execution            NOT_RUN / connector-only environment
Syntax execution                       NOT_RUN / connector-only environment
Existing mechanism regression          NOT_RUN / connector-only environment
FIT/AIV release suites                 NOT_RUN / outside first checkpoint + environment
Browser validation                     NOT_APPLICABLE to pure first checkpoint
Existing-file backup CLI               NOT_APPLICABLE so far; no pre-existing file edited
```

No `NOT_RUN` item is treated as PASS.

## Changed-file ledger

```text
agents/WIP-VIB-COVERAGE-01_workreport.md
agents/PR571_workreport.md
converters/vibration/mechanisms/coverage-identification.js
converters/vibration/mechanisms/coverage.js
tests/vibration-mechanism-coverage.test.mjs
```

`agents/PR571_workreport.md` is the current recovery authority after PR allocation. The WIP report is historical qualification evidence.

## Highest risk

The next integration step could accidentally make static UI catalogue state or generic qualification strings into engineering identification authority. Integration must continue to consume explicit identification evidence and current registered mechanism assessment contracts only.

## EXACT_NEXT_ACTION

Use a native checkout at PR #571 head, run:

```bash
node --check converters/vibration/mechanisms/coverage-identification.js
node --check converters/vibration/mechanisms/coverage.js
node tests/vibration-mechanism-coverage.test.mjs
```

If all PASS, execute mandatory `node utils/backup.js save ...` before any edit to `converters/vibration/mechanisms/index.js`, `tabs/vibration-integrity-mechanisms.js`, or existing tests; then wire the smallest integration proving the facility cannot claim complete assessment without `AssessmentCompleteness.v1 = COMPLETE`.
