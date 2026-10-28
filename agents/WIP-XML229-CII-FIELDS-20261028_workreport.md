# XML229 CII fixed-column verification — follow-up to merged PR348

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED (direct Owner continuation; new current-main task)
REPORT_BASIS_HEAD: bc823becf208187a1fdb819518d28d7938eafe8b
MAIN_HEAD_LAST_CHECKED: bc823becf208187a1fdb819518d28d7938eafe8b
GROUNDING_EPOCH: GE-CII-FIELDS-20261028-1
CURRENT_STAGE: VALIDATE / DRAFT DELIVERY
CURRENT_BLOCKER: Fix is a local candidate; exact-head CI and private Owner trial remain pending.
HIGHEST_RISK: Accepting malformed CII while correcting the reader.
EXACT_NEXT_ACTION: Publish bounded candidate and inspect exact-head native Node22/24 and Python CI, then request Owner integration/trial without weakening release gates.

## Owner evidence and live grounding

Owner audit: 98 Final masses, 686 facts, zero unresolved, eligible intent. Native requested at seq487 and failed at seq503 after about 48.6 seconds with CII_ELEMENTS_FORMAT_INVALID. No CII released. Do not re-enter masses or bypass verification.

PR348 is merged; live main bc823bec includes the attempt telemetry, which now identifies the native failure. Current issue is distinct from Run dispatch. Root AGENTS.md, .agents/AGENTS.md and engineering delivery skill continue to apply. MASTER_INDEX absent in prior grounding. PR311 remains source-owner inventory only and explicitly excludes native writer/public UI; no exact parser claim. Open PR312 overlaps native mass verification, requiring reconciliation before integration; PR329 owns older orchestration, not these parser files. Their branches and protected PR346 remain untouched. Classification ENGINEERING_CRITICAL / new bounded IMPLEMENT, not takeover.

## Source trace and falsification

- xml_to_cii2019.py::_row emits first field width15 then width13, concatenated with no extra separator. _format_auto_float(-0.01) is -1.000000E-02 (13 characters).
- Actual writer emitted an 80-column ELEMENTS row containing 20.0000-1.000000E-02. Whitespace split gives five tokens, while column slicing gives six correct numeric values.
- xml229_native_final_mass_binding.py::emitted_sections and _cii_elements both split these rows and reproduce the exact reported CII_ELEMENTS_FORMAT_INVALID. LOCAL_EXECUTION / SOURCE-BASED_REPRODUCTION. Owner private bytes unavailable, so this is a proven defect reproducing the code, not a proven inspection of the private failing row.
- The independent JS reader repeats the same whitespace assumption and would reject this output next. Both consumers require correction; the writer stays unchanged.
- New RED Python actual-writer tests: nine signed scientific/axis cases fail on the pinned parser; malformed NaN coordinate currently escapes validation. Independent JS cases fail analogously. Compact legacy fixture remains a supported contract.

## Scope and safeguards

Only two parser files plus root/docs mirrors, focused Python/JS/native CLI tests and recovery records. Do not change formatting, CII bytes, geometry, units, accepted masses, pointers, ownership, comparison tolerances, release authority or workflows. Fixed-width parsing must validate each finite numeric field and reject overflow, blank/merged fields, bad exponent and nonfinite values. Preserve compact whitespace fixtures without a fallback that rescues malformed full-width records. Existing mass, pointer, source custody, unclaimed-owner and independent emitted-byte negatives remain mandatory.

## Validation and continuation qualification

A1 source trace: original accepted Final -> actual native writer -> Python emitted record decoder -> independent JS decoder -> publication. A2 exact native-writer row above is the minimal falsifier; a decoder that still rejects it fails. A3 no writer or authority change; malformed CII remains held. A4 manually expected node/pointer/mass and public real CLI fixture, separate from the private model. A5 surgical parsing correction in emitted_sections/_cii_elements/parseNativeCii, paired mirrors, unchanged writer SHA and test expectations outside the signed-field defect. Self assessment only; future successor must independently qualify under root Appendix A. No engineering certification or merge authority follows.

New source/test validation pending. Private model NOT_RUN. One next action above.

## Implementation and local validation

Both readers now decode native 80-column rows by first width15 and five width13 cells. Compact rows shorter than80 retain the six-token contract. Malformed full-width records do not fall back to whitespace. All six inspected numeric cells must have valid decimal/E syntax and finite values; rows over80 reject. Existing pointer bounds, owner uniqueness, source/output SHA, accepted-mass and release checks remain intact. Both Python readers share the bounded local decoder; the independent JS reader implements the same documented column contract separately. No source mass or CII writer/formatter is modified.

Tests: Python FixedWidthCiiTests 3/3 PASS including nine actual-writer signed-scientific axis subcases, finite-number and malformed-column negatives; JS independent parser 8/8 PASS; actual Python CLI/source-to-independent-JS checks 4/4 PASS including the formerly failing signed displacement and subsequent mass-tamper rejection. LOCAL_EXECUTION; numerical expectations are explicit synthetic source/Final inputs, not private engineering acceptance. Root/docs two production pairs synchronized. Full Python suite initially could not complete in the connector-materialized subset due missing runtime dependencies and original EF05 fixture; actual CLI dependencies were then retrieved and targeted real-native checks passed. Full fixture suite awaits complete-checkout CI; do not count the incomplete invocation as PASS.

Changed paths: converters/scripts/xml229_native_final_mass_binding.py and docs mirror (decode only); converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs and docs mirror (independent decoder); tests/xml229-native-final-mass-consumption.test.py (new class in existing CI entrypoint); tests/xml229-native-cii-independent-reconciliation.test.mjs (signed axes and malformed bytes); tests/xml229-native-cii-real-cli-e2e.test.mjs (actual negative-coordinate conversion and tampered mass); this report. No workflow, original fixture, writer, runtime action or UI diff.

Private failing row NOT_OBSERVED. Same failure code reproduced with actual current writer, so this is a source-backed compatible correction; private 98-owner outcome remains NOT_RUN. No merge or release authorization.
