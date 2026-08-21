# PR694 — HP Engineering Review Report Export — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #694
BRANCH: agent/hp-engineering-review-report
BASE: main
BASE_SHA_AFTER_REPLAY: 54a4f56e36c2025320ea464630fbffac9accc71d
PREDECESSOR_PR: 692 (MERGED)
PREDECESSOR_MERGE: 82cd3ddf5562f3fe990fe5f718d7d8e13e23357a
CURRENT_STAGE: DRAFT_READY_FOR_NATIVE_VALIDATION
MERGE_AUTHORITY: NOT_GRANTED_FOR_PR694

## Mission

Add one reproducible engineer-facing HP Piping Class review dossier without creating a second numerical method.

```text
current canonical HpPipingClassProject/v2
  -> production-review validation
  -> existing canonical HP orchestrator
  -> existing hp-piping-class-result-export/v1
  -> existing result CSV/JSON round-trip gate
  -> hp-piping-class-engineering-review-report/v1
     -> standalone HTML
     -> machine-readable JSON
```

## Production outputs

```text
<class>-<revision>.hp-engineering-review.html
<class>-<revision>.hp-engineering-review.json
```

HTML is standalone and print-ready. It embeds the complete machine-readable report JSON in an `application/json` script payload.

## Report contents

- project ID / class ID / revision;
- B31.3 and VIII-3 edition identity;
- canonical units;
- design pressure and class allowances;
- spectrum, design life, operating states, governed cycles;
- deterministic class product review matrix;
- required nominal wall / pressure rating / margin / selected fatigue wall / cumulative U;
- cycle state pair, n, pressure range, CORE Salt, user Salt, external Seq/N and Ui;
- existing external KD `calculationBasis` custody including calculation reference and checker identity;
- canonical warnings/advisories;
- visible review-only authority limitations.

## Numerical ownership

`tabs/hp-piping-class-engineering-review-report.js` does not implement Chapter IX or KD equations.

It imports:

```text
buildHpPipingClassResultExport
sortHpPipingClassResultRows
verifyHpPipingClassResultRoundTrip
```

The UI enhancer re-runs the existing canonical orchestrator at export time. No report value is independently recomputed using pressure/thickness/fatigue formulae.

## Fail-closed report transaction

Report creation blocks when:

```text
canonical result is incomplete / result.ok != true
project/result projectId mismatch
project/result classId mismatch
project/result revision mismatch
nativeCoreKd3Qualified != false
codeCompliance != false
canUseForDesignAuthority != false
calculationMode != USER_CALCULATED_KD3
existing result export round-trip != PASS
report schema/purpose/authority is tampered on JSON parse
```

Important distinction:

```text
STATIC_REFERENCE_FAIL     REPORTABLE ENGINEERING RESULT
FATIGUE U > 1             REPORTABLE ENGINEERING RESULT
CALCULATION_BLOCKED       REPORT TRANSACTION BLOCKED
IDENTITY/AUTHORITY DRIFT  REPORT TRANSACTION BLOCKED
```

A report does not turn an unfavorable engineering result into an application error.

## Authority boundary

```text
calculationMode = USER_CALCULATED_KD3
nativeCoreKd3Qualified = false
codeCompliance = false
canUseForDesignAuthority = false
reportPurpose = ENGINEERING_REVIEW_ONLY
```

The HTML visibly states:

```text
REVIEW ONLY · NO DESIGN AUTHORITY
Native CORE KD-3 / KD320 not qualified
Code compliance not established
```

## Authored focused tests

`tests/hp-piping-class-engineering-review-report.test.mjs` covers:

1. NPS4 reference numerical/custody projection;
2. result-export round-trip prerequisite;
3. report JSON round-trip;
4. standalone HTML numerical and authority tokens;
5. embedded JSON equality;
6. static-reference FAIL remains reportable;
7. project/result identity mismatch blocks;
8. project/result authority promotion blocks;
9. report schema/authority tampering blocks.

`tests/hp-piping-class-engineering-review-report-ui.test.mjs` covers:

- active route composition/cleanup;
- canonical re-evaluation at export time;
- HTML/JSON buttons only on the result matrix;
- existing result-export numerical custody;
- no `Math.exp`/`Math.log` duplicate pressure math;
- visible review-only and external-KD-custody language.

## Validation truth

```text
current-main replay                         PASS
branch ancestry                             PASS (behind 0 before PR open)
changed implementation/test/CI paths        PASS (6 intended before recovery)
source-level numerical ownership audit      PASS
source-level authority audit                PASS
authored report contract suite              AUTHORED_NOT_EXECUTED
native report Node suite                    NOT_RUN
HP Real Workbench PR workflow               PENDING_RECONCILIATION
FULL_APP report download                    NOT_RUN
full repository regression                  NOT_RUN
```

Do not promote authored tests to PASS without execution.

## Changed-file ledger

Engineering/test/CI:

```text
.github/workflows/hp-piping-class-real-workbench.yml
tabs/engineering-workspace-tab.js
tabs/hp-piping-class-engineering-review-report.js
tabs/hp-piping-class-engineering-review-report-enhancer.js
tests/hp-piping-class-engineering-review-report.test.mjs
tests/hp-piping-class-engineering-review-report-ui.test.mjs
```

Recovery:

```text
agents/PR694_workreport.md
agents/status/PR694.yaml
agents/claims/PR694.yaml
```

## Next action

1. Mark PR ready so the existing checkout-based HP Real Workbench gate may trigger.
2. Inspect workflow jobs/logs if a run appears.
3. Fix any native report contract or route-wiring failure.
4. Browser-check Review Envelope -> Export review HTML/JSON -> filenames/content.
5. Reconcile exact PR head/current main/statuses/reviews.
6. Do not merge without explicit owner authorization for PR694.

## Appendix A — takeover qualification

1. Why is STATIC_REFERENCE_FAIL reportable while CALCULATION_BLOCKED is not?
2. Which existing contract owns numerical product/cycle values used in the report?
3. Why does report export re-run the canonical orchestrator instead of using HTML text already on screen?
4. Which authority fields must always remain false?
5. What external KD custody is retained in the report?
6. Why does the standalone HTML embed the full report JSON?
7. Which validations remain NOT_RUN?
