# FIT Independent Bounded-Screening Review v1

Status: **REVIEW TEMPLATE — NO AUTHORITY UNTIL COMPLETED AGAINST ONE EXACT CANDIDATE SHA**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Review schema: `FitIndependentScreeningReview.v1`  
Method revision: `ei-aviff2-fit-reference-v2`

## 1. Purpose

This review is the independent vibration-engineering gate before any future bounded `BENCHMARK_ONLY -> SCREENING` authority proposal. It is deliberately fail-closed and must be tied to the exact candidate SHA that passed the controlled release and browser/file acceptance gates.

A completed review may recommend **bounded screening only**. It cannot authorize design use.

## 2. Candidate identity

```text
Candidate Git SHA: ________________________________________
Review date:       ________________________________________
Reviewer name:     ________________________________________
Reviewer role:     ________________________________________
Organization:      ________________________________________
```

Independence statement:

```text
____________________________________________________________________
____________________________________________________________________
```

The reviewer should not be the author of the production FIT implementation or its benchmark outputs.

## 3. Direct source review

Directly inspect the controlled source set, not only repository transcription:

```text
Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI full guidance PDF blob     9d3eccc56429411e17c07a579bdebbd13cb0bdc5
EI examples PDF blob          3e2517d0df527a051084fc02e69cb7afa31f8d47
worked-example DOCX blob      ceee15ed5f7f320045d5f3979024e2e8664613f2
```

Required decisions:

- [ ] T2.2 page/table/equation mapping reviewed against `FIT-Engineering-Method-Specification-v1.md`.
- [ ] Applicable official errata reviewed and every applicable item dispositioned.
- [ ] Project adoption/basis reviewed and approved for the proposed bounded scope.
- [ ] D2 span and D4 revised DOCX scenario differences accepted as explicit limitations or otherwise dispositioned.
- [ ] Controlled source precedence accepted.

## 4. Bounded scope review

```text
60 mm <= Dext <= 219.1 mm      candidate
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate
```

Required decisions:

- [ ] Bounded diameter scope accepted.
- [ ] QST-003 exclusion accepted; no interpolation/nearest-family/manual family override allowed.
- [ ] `1 Hz < fn <= 3 Hz` advanced-frequency boundary accepted.
- [ ] Standard/advanced branch coverage accepted.
- [ ] LIQUID and GAS paths accepted.
- [ ] MULTIPHASE `AGGREGATE_EFFECTIVE` path accepted.
- [ ] MULTIPHASE `COMPONENT_DERIVED` path accepted.
- [ ] Explicit multiphase resolution rule accepted when both representations coexist.

## 5. Manual Data Blockers policy review

The workspace provides:

```text
Engineering Basis
Source Data
Data Blockers
```

Manual missing engineering data use `VibrationFitDataBlockerCsv.v1`.

Required decisions:

- [ ] Data Blockers accepted as fill-only missing-data input.
- [ ] Existing source data remain authoritative.
- [ ] Source mass-flow/manual velocity and source velocity/manual mass-flow collision rule accepted.
- [ ] ACTIVE rows require value/source/unit where dimensional.
- [ ] HOLD/RESOLVED rows are audit-only; blank pending values cannot become synthetic zero.
- [ ] Manual values participate in stale-result detection and reproducibility evidence.
- [ ] Method/domain decisions such as `SUPPORT_SIZE_FAMILY` are not blocker data.
- [ ] QST-003 cannot be bypassed through Data Blockers.

## 6. Numerical/evidence review

Confirm evidence covers:

- [ ] five controlled EI D2/D4 examples;
- [ ] independent STIFF, MEDIUM_STIFF, MEDIUM_SMALL and MEDIUM_LARGE standard branches;
- [ ] independent FLEXIBLE_SMALL threshold/advanced cases;
- [ ] independent FLEXIBLE_LARGE advanced case;
- [ ] support-boundary inclusivity;
- [ ] aggregate/component multiphase resolution;
- [ ] central SI/US invariance across all six support families;
- [ ] advanced `Hz <-> rpm` invariance;
- [ ] unsupported unit fail-closed behavior;
- [ ] Elements and complete-XLSX SHA-256 anti-bypass controls;
- [ ] dual audit/engineering hashes and run-evidence export.

## 7. Exact-candidate software evidence

The current PR499 controlled manifest contains **48 test files**. The reviewer must nevertheless verify the count from the exact candidate manifest and must not reuse a historical test count.

All evidence below must refer to the same SHA recorded in Section 2:

- [ ] `npm run verify:vibration-fit-release` = PASS.
- [ ] Real-browser acceptance = PASS.
- [ ] Complete five-sheet XLSX acceptance = PASS.
- [ ] Hidden/non-Elements XLSX tamper rejection = PASS.
- [ ] Elements-only CSV limited-mode acceptance = PASS.
- [ ] Operating/enrichment CSV acceptance = PASS.
- [ ] Data Blockers import/edit/template/status/collision acceptance = PASS.
- [ ] Engineering Basis -> Source Data exact-cell navigation = PASS.
- [ ] Cell/row/table revert acceptance = PASS.
- [ ] Topology authority downgrade/non-restoration after revert = PASS.
- [ ] Readiness/run stale-state behavior = PASS.
- [ ] Register CSV export = PASS.
- [ ] Run-evidence JSON export and dual-hash verification = PASS.

## 8. Decision

```text
[ ] GO_BOUNDED_SCREENING
[ ] NO_GO
[ ] CONDITIONAL_REVIEW_REQUIRED
```

Design authority must remain:

```text
NOT_AUTHORIZED
```

Conditions/comments and approval reference:

```text
____________________________________________________________________
____________________________________________________________________
```

## 9. Machine-checkable gate

The repository exposes:

```text
createFitIndependentScreeningReviewTemplate()
validateFitIndependentScreeningReview()
assertFitIndependentScreeningReviewComplete()
```

A complete record requires an exact 40-character candidate SHA, named independent reviewer, direct source/errata/project decisions, bounded scope/QST-003 acceptance, manual-data policy acceptance, exact-candidate release/browser/XLSX/Data-Blockers/evidence `PASS`, `screeningRecommendation = GO_BOUNDED_SCREENING`, and `designAuthorityRecommendation = NOT_AUTHORIZED`.

Failure of any item produces `FIT_INDEPENDENT_SCREENING_REVIEW_INCOMPLETE` and must block a future authority transition.
