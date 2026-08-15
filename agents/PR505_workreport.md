# PR505 — SBC P0 Governed Master Gate

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: 505
BASE_MAIN: 353d905a7af3bc566ba5572771fa2d16c1617a48
PR_HEAD_BEFORE_THIS_REPORT_REFRESH: c08ff1bb433e60225d68109b66cde30ea460fb80
BRANCH: agent/sbc-p0-governed-master
BRANCH_RELATION: ahead 10 / behind 0
CHANGED_FILES: 6
CRITICALITY: ENGINEERING_CRITICAL
CURRENT_STAGE: fail-closed source qualification gate complete / curve geometry unresolved
HIGHEST_RISK: publishing the supplied T3-1..T3-4 digitization despite independent D7 contradictions
EXACT_NEXT_ACTION: obtain a controlled readable render of Figures T3-1..T3-4 or a corrected independent digitization that reproduces D7; only then replace the rejected curve representation and rerun the source gate before any runtime/master activation.
```

## Mission / Outcome

User supplied the pinned candidate package:

`reallaksh19/Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921/docs/EI data`

PR505 deliberately does **not** promote its T3 curve values. It adds a permanent fail-closed qualification gate and release regression so a contradictory chart digitization cannot silently become a governed SBC master.

Current production Type-3 calculation semantics are preserved. No calculation equation, runtime resolver, UI behavior, screening authority or design authority is changed.

## Live Reconciliation

Initial base was `0fb4be2a03aa455efe5d476c8a8ba4e82b732b95`.

While PR505 was active, main advanced via AIV PR #504 to:

`353d905a7af3bc566ba5572771fa2d16c1617a48`

PR #504 changes AIV master/UI paths plus `package.json`; it does not overlap PR505's six paths. PR505 was reconciled with a two-parent commit `c08ff1bb433e60225d68109b66cde30ea460fb80`, using current main as the base tree and restoring the six PR505 blobs. Final compare before this report refresh:

```text
status       ahead
ahead_by     10
behind_by    0
merge_base   353d905a7af3bc566ba5572771fa2d16c1617a48
changed      6 intended files
```

## Source Reconciliation

### PASS — non-curve table parity

The supplied P0 dataset matches the already-merged #484 candidate values for every row in:

- Table T3-1 fitting span factors — 15 rows;
- Table T3-2 first-span minimum lengths — 8 rows;
- Table T3-3 between-main-lines minimum lengths — 8 rows.

Pinned candidate blobs:

```text
T3-1 fitting factors   1c21cd7c856cd9656c50aeb0c6a0d5fc1e0dd319
T3-2 first-span limits 9da7aa1b4df520ad000bae4a034da2460a899629
T3-3 between-main      86dd78e684c3497ae968c69abf276cc69ccb07f1
```

These stay `CANDIDATE / engineeringAuthority=NONE / screeningAuthority=NOT_AUTHORIZED`. Cross-repo parity is evidence, not authority promotion.

### PASS — final SBC combination semantics

Pinned EI worked examples D5/D6/D7 prove:

```text
mainLineAdjusted = mainLineLof * 1.42
SBC LOF = min(mainLineAdjusted, SBC Modifier)
```

Independent examples:

```text
D5 = min(1.0 * 1.42, 0.66) = 0.66
D6 = min(0.49 * 1.42, 0.70) = 0.6958 ~= 0.696
D7 = min(1.0 * 1.42, 0.70) = 0.70
```

Therefore the product-formula sentence in `P0_SBC_Master_Data.md` is rejected as conflicting with the worked examples. Existing `converters/vibration/sbc/type3-user-data.js` already uses the worked-example-correct minimum rule and was not modified.

### FAIL — supplied curve pack versus D7

Worked Example D7 independently requires:

```text
T3-1: D=1.5 in, modified first span=0.9/0.7=1.285714... m -> LOFGEOM(D)=0.2
T3-3: D=1.5 in, mass span=2.3 m                    -> LOFGEOM(F)=0.6
T3-4: D=1.5 in, no-mass span=1.4 m                 -> LOFGEOM(G)=0.2
```

Applying the supplied P0 threshold rows and their stated threshold logic yields:

```text
T3-1 -> 0.4  FAIL
T3-3 -> 0.7  FAIL
T3-4 -> 0.3  FAIL
```

One contradiction is sufficient to block publication; the supplied pack has three.

### SECONDARY SOURCE RECOVERY — CORROBORATION ONLY

A public text rendering of the EI 2nd Edition was inspected after the source-gate implementation. It independently corroborates:

- Figure T3-1 axis: modified span 0..4.5 m; diameter 0.25..2.00 in; LOF labels 0.7/0.6/0.4/0.2;
- Figure T3-2 axis: modified span 0..8 m; same diameter domain; LOF labels 0.7/0.6/0.4/0.2;
- Figure T3-3 axis: modified span 0..3.5 m; same diameter domain; LOF labels 0.7/0.6/0.4/0.2;
- Figure T3-4 axis: modified span 0..6 m; same diameter domain; LOF labels 0.7/0.6/0.4/0.3;
- D7 text explicitly states the same chart readings: T3-1 1.5 in/1.286 m -> 0.2; T3-3 1.5 in/2.3 m -> 0.6; T3-4 1.5 in/1.4 m -> 0.2.

However, that HTML rendering does not expose calibrated curve-line geometry/coordinates. The attempted PDF download/render path was unavailable in this runtime. This secondary source may corroborate the conflict but **cannot** authorize a replacement curve master. No curve reconstruction was performed from D7 alone.

## Implemented Capability

### `converters/vibration/sbc/t3-p0-source-gate.js`

- pins exact `Advanced_Analysis` commit and source blobs;
- preserves the worked-example minimum combination rule;
- evaluates the supplied D7-relevant threshold rows deterministically;
- returns `BLOCKED_SOURCE_DATA_CONFLICT` when D7 parity fails;
- `assertSbcT3P0MasterPublicationQualified()` throws `SBC_T3_P0_MASTER_NOT_QUALIFIED` instead of allowing publication;
- authority remains NONE / NOT_AUTHORIZED / design false / master-data false.

### `ValidationRecords/VibrationMasters/advanced-analysis-sbc-p0-qualification-v1.json`

Machine-readable receipt containing table parity, formula disposition, all three D7 conflicts, publication decision and required resolution.

### `scripts/validate-vibration-sbc-p0-master.mjs`

Operator validation command. It prints the qualification envelope and exits non-zero when publication is blocked.

### `tests/vibration-sbc-p0-source-gate.test.mjs`

Pins:
- exact source object identities;
- all 15 T3-1 fitting-factor rows;
- all 8 T3-2 rows;
- all 8 T3-3 rows;
- D5/D6/D7 combination oracles;
- exact rejected candidate outputs 0.4 / 0.7 / 0.3;
- fail-closed publication error code.

### Coordinated release gate

`scripts/verify-vibration-fit-release.mjs` includes the source-gate regression. Controlled manifest increases from 53 to **54 test files**.

## Authority / Invariants

```text
new SBC master engineeringAuthority = NONE
screeningAuthority                  = NOT_AUTHORIZED
designAuthority                     = false
masterDataAuthority                 = false
curve runtime activation            = false
manual User Engineering Data        = retained
current Type-3 combination formula  = unchanged
```

No missing value becomes zero. No interpolation or extrapolation is introduced. No source conflict is hidden by fitting/reconstructing curves to worked-example points.

## Changed-File Ledger

```text
ValidationRecords/VibrationMasters/advanced-analysis-sbc-p0-qualification-v1.json  NEW
agents/PR505_workreport.md                                                    NEW
converters/vibration/sbc/t3-p0-source-gate.js                                 NEW
scripts/validate-vibration-sbc-p0-master.mjs                                  NEW
scripts/verify-vibration-fit-release.mjs                                      +1 test path
tests/vibration-sbc-p0-source-gate.test.mjs                                   NEW
```

No changes to:

```text
converters/vibration/sbc/type3-user-data.js
converters/vibration/sbc/facility.js
SBC UI runtime
master resolver
engineering equations
screening/design authority
AIV PR504 files
```

## Backup / Recovery Ledger

Repository-local `node utils/backup.js save` is environment-blocked because this connector runtime has no authenticated checkout. Exact Git blobs are retained as recovery evidence; the backup CLI is **NOT_RUN**.

```text
type3-user-data.js current               69215382db2fabaae8356370ca5760def19d4cba
facility.js current                      f723aace9c7c7fcbedfcb0fcab64c528dcc1f046
verify-vibration-fit-release pre-edit    efef2b3a397fc19f5593c6c766bf80bf893f2dff
verify-vibration-fit-release PR505       edf6df76bf9689eb7401fd2d12287da1ec939495
workreport pre-this-refresh              e37f97a9b03639f80045ccaa5c85d635614e4cb5
```

## Validation Ledger

| Check | STATUS | OBSERVATION | ORACLE / limitation |
|---|---|---|---|
| live main / branch reconcile | PASS | current main `353d905...`; two-parent reconcile; ahead 10 / behind 0 | GitHub |
| changed-file audit | PASS | 6 intended files; no #504 overlap | GitHub compare / PR504 paths |
| T3-1/T3-2/T3-3 table parity | PASS | all supplied rows match existing candidates | pinned supplied P0 dataset |
| D5/D6/D7 final combination | PASS | bounded Node execution: 0.66 / 0.6958 / 0.7 | independent worked examples |
| supplied curve pack vs D7 | FAIL (expected gate result) | bounded Node execution: 0.4 / 0.7 / 0.3 vs 0.2 / 0.6 / 0.2 | independent D7 worked example |
| secondary figure axes/D7 text | PASS_CORROBORATION | public text rendering independently agrees on axes and D7 readings | secondary/non-authorizing source |
| calibrated curve geometry recovery | NOT_RUN / UNAVAILABLE | PDF/image render could not be obtained | no geometry, no digitization |
| publication guard | PASS_SOURCE_CONTRACT | code throws `SBC_T3_P0_MASTER_NOT_QUALIFIED` on failed qualification | source inspection |
| exact new Node test file | NOT_RUN | no authenticated repository checkout | n/a |
| exact 54-file FIT/VIB release suite | NOT_RUN | no authenticated repository checkout | n/a |
| browser acceptance | NOT_RUN | no browser checkout | n/a |

Do not reinterpret the expected curve-qualification FAIL as a product regression. The safe product behavior is to **block** publication on that failure.

## Coordination

- #484 merged: matching non-curve candidate T3 tables.
- #485 merged: prior curve-image hard stop; PR505 shows the newly supplied digitization still cannot clear it.
- #480 remains stale open/draft source inventory and should not substitute for PR505.
- #504 merged while PR505 was active; exact-file overlap = none; PR505 reconciled to current main with all #504 changes preserved.
- No overlap with FIT equations or AIV numerical authority.

## Appendix A — Implementation Takeover Qualification

### A1 Production Trace
`facility.js -> calculateSbcType3FromUserEngineeringData -> resolveBlockedVibrationData`. Current production still consumes explicit project input unless an independently governed value is supplied.

### A2 Current Failure Isolation
The unresolved blocker is specifically T3-1..T3-4 curve geometry/data. The current final Type-3 combination rule is independently supported and is not the failure.

### A3 Authority / Invariant
Do not publish the Advanced_Analysis curve thresholds until a corrected controlled representation reproduces D7. Preserve `designAuthority=false` and `screeningAuthority=NOT_AUTHORIZED`.

### A4 Independent Validation
D7 is the immediate curve oracle. Any replacement digitization must reproduce its three stated readings without tuning the oracle to implementation output, then receive boundary/interpolation testing across the full nominal-size domain.

### A5 Next Minimal Patch
Replace only the rejected curve candidate representation after controlled figure recovery. Rerun the source gate; only a PASS may unlock a separate runtime/master-publication change.

## Merge State

PR505 is draft/open. Merge is **NOT AUTHORIZED**.
