# FIT Independent Bounded-Screening Review v1

Status: **REVIEW TEMPLATE — NO AUTHORITY UNTIL COMPLETED AGAINST ONE EXACT CANDIDATE SHA**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Review schema: `FitIndependentScreeningReview.v1`  
Method revision: `ei-aviff2-fit-reference-v2`

## 1. Purpose

This review is the independent vibration-engineering gate before any future bounded `BENCHMARK_ONLY -> SCREENING` authority proposal.

It is deliberately fail-closed. A review cannot be treated as complete unless it is tied to the exact candidate SHA that passed the controlled release and browser/file acceptance gates.

A completed review may recommend **bounded screening only**. It cannot authorize design use.

## 2. Candidate identity

Reviewer shall record:

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

The reviewer shall directly inspect the controlled source set, not only repository transcription:

```text
Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI full guidance PDF blob     9d3eccc56429411e17c07a579bdebbd13cb0bdc5
EI examples PDF blob          3e2517d0df527a051084fc02e69cb7afa31f8d47
worked-example DOCX blob      ceee15ed5f7f320045d5f3979024e2e8664613f2
```

Required direct decisions:

- [ ] T2.2 page/table/equation mapping reviewed against `FIT-Engineering-Method-Specification-v1.md`.
- [ ] Applicable official errata reviewed and every applicable item dispositioned.
- [ ] Project adoption/basis reviewed and approved for the proposed bounded scope.
- [ ] D2 span and D4 revised DOCX scenario differences accepted as explicit limitations or otherwise dispositioned.
- [ ] Controlled source precedence accepted.

Reviewer notes:

```text
____________________________________________________________________
____________________________________________________________________
```

## 4. Bounded scope review

Proposed diameter scope:

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
- [ ] LIQUID and GAS process paths accepted.
- [ ] MULTIPHASE `AGGREGATE_EFFECTIVE` path accepted.
- [ ] MULTIPHASE `COMPONENT_DERIVED` path accepted.
- [ ] Explicit multiphase resolution rule accepted when both representations coexist.

## 5. Manual Data Blockers policy review

The user-facing workspace provides:

```text
Engineering Basis
Source Data
Data Blockers
```

Manual missing engineering data use `VibrationFitDataBlockerCsv.v1`.

Required decisions:

- [ ] Data Blockers are accepted as a fill-only missing-data mechanism.
- [ ] Existing source data remain authoritative and cannot be silently overwritten.
- [ ] Source mass-flow versus manual velocity, or source velocity versus manual mass-flow, collision rule accepted.
- [ ] ACTIVE rows require value/source/unit where dimensional.
- [ ] HOLD/RESOLVED rows are audit-only; blank pending values cannot become synthetic zero.
- [ ] Manual values participate in stale-result detection and reproducibility evidence.
- [ ] Method/domain decisions such as `SUPPORT_SIZE_FAMILY` are not user-enterable blocker data.
- [ ] QST-003 cannot be bypassed through Data Blockers.

## 6. Numerical/evidence review

Reviewer shall confirm the evidence package covers:

- [ ] five controlled EI D2/D4 published examples;
- [ ] independent standard STIFF;
- [ ] independent standard MEDIUM_STIFF;
- [ ] independent standard MEDIUM_SMALL;
- [ ] independent standard MEDIUM_LARGE;
- [ ] independent FLEXIBLE_SMALL threshold/advanced cases;
- [ ] independent FLEXIBLE_LARGE advanced case;
- [ ] support-boundary inclusivity;
- [ ] aggregate/component multiphase equivalence/resolution rules;
- [ ] central SI/US invariance across all six support families;
- [ ] advanced `Hz <-> rpm` invariance;
- [ ] unsupported unit fail-closed behavior;
- [ ] complete-XLSX Elements and full-byte SHA-256 anti-bypass controls;
- [ ] dual audit/engineering hashes and run-evidence export.

## 7. Exact-candidate software evidence

All items below must refer to the same candidate SHA recorded in Section 2.

```text
47/48? controlled suite count must be read from the exact candidate manifest.
Do not copy a historical count into the approval record.
```

Required evidence:

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

Select one:

```text
[ ] GO_BOUNDED_SCREENING
[ ] NO_GO
[ ] CONDITIONAL_REVIEW_REQUIRED
```

Design authority must remain:

```text
NOT_AUTHORIZED
```

Conditions/comments:

```text
____________________________________________________________________
____________________________________________________________________
```

Reviewer signature/approval reference:

```text
____________________________________________________________________
```

## 9. Machine-checkable gate

The repository exposes:

```text
createFitIndependentScreeningReviewTemplate()
validateFitIndependentScreeningReview()
assertFitIndependentScreeningReviewComplete()
```

A complete machine-readable review requires:

- a 40-character exact candidate SHA;
- named independent reviewer and independence statement;
- all direct source/errata/project decisions complete;
- bounded scope and QST-003 exclusion accepted;
- manual-data fill-only/non-override policy accepted;
- exact candidate release/browser/XLSX/Data-Blockers/evidence gates all `PASS`;
- `screeningRecommendation = GO_BOUNDED_SCREENING`;
- `designAuthorityRecommendation = NOT_AUTHORIZED`.

Failure of any item produces `FIT_INDEPENDENT_SCREENING_REVIEW_INCOMPLETE` and must block a future authority transition.
