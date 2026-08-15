# PR505 — SBC P0 Governed Master Gate

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: 505
BASE_MAIN: 0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
PR_HEAD_LAST_CHECKED: 527ece0629eb94373457e72d79eafac997d4cf9f
BRANCH: agent/sbc-p0-governed-master
BRANCH_RELATION: ahead 8 / behind 0
CHANGED_FILES: 6
CRITICALITY: ENGINEERING_CRITICAL
CURRENT_STAGE: bounded implementation complete / source conflict unresolved
HIGHEST_RISK: publishing the supplied T3-1..T3-4 digitization despite independent D7 contradictions
EXACT_NEXT_ACTION: obtain corrected/reproducible T3-1..T3-4 curve geometry that reproduces D7, then replace the blocked source pack and rerun the source gate before any master/runtime activation.
```

## Mission / Outcome

User supplied:

`reallaksh19/Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921/docs/EI data`

PR505 does **not** promote the supplied curve pack. It adds a permanent fail-closed qualification gate and release regression so an inconsistent chart digitization cannot silently become an SBC governed master.

Current production Type-3 calculation semantics are preserved. No equation/runtime authority changes were made.

## Source Reconciliation

### PASS — non-curve table parity

The supplied P0 dataset matches the already-merged #484 candidate values for all rows in:

- Table T3-1 fitting span factors — 15 rows;
- Table T3-2 first-span minimum lengths — 8 rows;
- Table T3-3 between-main-lines minimum lengths — 8 rows.

Pinned current candidate blobs:

```text
T3-1 fitting factors   1c21cd7c856cd9656c50aeb0c6a0d5fc1e0dd319
T3-2 first-span limits 9da7aa1b4df520ad000bae4a034da2460a899629
T3-3 between-main      86dd78e684c3497ae968c69abf276cc69ccb07f1
```

These remain `CANDIDATE / NONE / NOT_AUTHORIZED`; cross-repo parity does not promote master authority.

### PASS — final SBC combination semantics

Pinned worked examples D5/D6/D7 prove:

```text
mainLineAdjusted = mainLineLof * 1.42
SBC LOF = min(mainLineAdjusted, SBC Modifier)
```

Independent expected results:

```text
D5 = min(1.0 * 1.42, 0.66) = 0.66
D6 = min(0.49 * 1.42, 0.70) = 0.6958 ~= 0.696
D7 = min(1.0 * 1.42, 0.70) = 0.70
```

Therefore the product-formula sentence in `P0_SBC_Master_Data.md` is explicitly rejected as conflicting with the worked examples. Current `type3-user-data.js` already uses the worked-example-correct minimum rule and was not modified.

### FAIL — supplied curve pack versus D7

Worked Example D7 independently requires:

```text
T3-1: D=1.5 in, modified first span=0.9/0.7=1.285714... m -> LOFGEOM(D)=0.2
T3-3: D=1.5 in, mass span=2.3 m                    -> LOFGEOM(F)=0.6
T3-4: D=1.5 in, no-mass span=1.4 m                 -> LOFGEOM(G)=0.2
```

Applying the supplied P0 threshold rows and its stated threshold logic yields:

```text
T3-1 -> 0.4  FAIL
T3-3 -> 0.7  FAIL
T3-4 -> 0.3  FAIL
```

One independent contradiction is sufficient to block publication; this pack has three.

## Implemented Capability

### `converters/vibration/sbc/t3-p0-source-gate.js`

- pins exact `Advanced_Analysis` commit and source blobs;
- preserves the worked-example minimum combination rule;
- evaluates the supplied D7-relevant threshold rows exactly;
- returns `BLOCKED_SOURCE_DATA_CONFLICT` when D7 parity fails;
- `assertSbcT3P0MasterPublicationQualified()` throws `SBC_T3_P0_MASTER_NOT_QUALIFIED` instead of allowing publication;
- authority remains NONE / NOT_AUTHORIZED / design false.

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

`scripts/verify-vibration-fit-release.mjs` now includes the source-gate regression. Controlled manifest increases from 53 to **54 test files**.

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

No missing value becomes zero. No interpolation or extrapolation is introduced. No source conflict is hidden by fitting/reconstructing curves to the worked example.

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
UI runtime
master resolver
engineering equations
screening/design authority
```

## Backup / Recovery Ledger

Repository-local `node utils/backup.js save` is environment-blocked because this connector runtime has no authenticated checkout. Exact pre-edit Git blobs are retained as recovery evidence; the backup CLI is **NOT_RUN**.

```text
type3-user-data.js pre-edit/current 69215382db2fabaae8356370ca5760def19d4cba
facility.js pre-edit/current        f723aace9c7c7fcbedfcb0fcab64c528dcc1f046
verify-vibration-fit-release pre-edit efef2b3a397fc19f5593c6c766bf80bf893f2dff
verify-vibration-fit-release current  edf6df76bf9689eb7401fd2d12287da1ec939495
```

## Validation Ledger

| Check | STATUS | OBSERVATION | ORACLE / limitation |
|---|---|---|---|
| live main / branch compare | PASS | `ahead 8 / behind 0`; merge base current main | GitHub |
| changed-file audit | PASS | 6 intended files | GitHub compare |
| T3-1/T3-2/T3-3 table parity | PASS | all supplied rows match existing candidates | supplied pinned P0 dataset |
| D5/D6/D7 final combination | PASS | bounded Node execution: 0.66 / 0.6958 / 0.7 | independent worked examples |
| supplied curve pack vs D7 | FAIL (expected gate result) | bounded Node execution: 0.4 / 0.7 / 0.3 vs 0.2 / 0.6 / 0.2 | independent D7 worked example |
| publication guard | PASS_SOURCE_CONTRACT | code throws `SBC_T3_P0_MASTER_NOT_QUALIFIED` on failed qualification | source inspection |
| exact new Node test file | NOT_RUN | no authenticated repository checkout | n/a |
| exact 54-file FIT/VIB release suite | NOT_RUN | no authenticated repository checkout | n/a |
| browser acceptance | NOT_RUN | no browser checkout | n/a |

Do not reinterpret the expected curve-qualification FAIL as a product regression. The product safety behavior is to **block** publication on that failure.

## Coordination

- #484 is merged and supplies the matching non-curve candidate tables.
- #485 is merged and previously recorded the missing-curve-image hard stop; PR505 adds new evidence that the newly supplied digitization cannot clear that stop.
- #480 remains stale open/draft source inventory and should not be merged as a substitute for PR505.
- No overlap with FIT equations or AIV runtime authority.

## Appendix A — Implementation Takeover Qualification

### A1 Production Trace
`facility.js -> calculateSbcType3FromUserEngineeringData -> resolveBlockedVibrationData`. Current production still consumes explicit project input unless an independently governed value is supplied.

### A2 Current Failure Isolation
The unresolved blocker is specifically T3-1..T3-4 curve geometry/data. The current final Type-3 combination rule is independently supported and is not the failure.

### A3 Authority / Invariant
Do not publish the Advanced_Analysis curve thresholds until a corrected source representation reproduces D7. Preserve `designAuthority=false` and `screeningAuthority=NOT_AUTHORIZED`.

### A4 Independent Validation
D7 is the immediate curve oracle. Any replacement digitization must reproduce its three stated chart readings without tuning the expected results to implementation output, then be boundary-tested across all nominal sizes.

### A5 Next Minimal Patch
Replace only the rejected curve candidate representation after controlled source recovery. Rerun the source gate; only a PASS may unlock a separate runtime/master-publication PR.

## Merge State

PR505 is draft/open/mergeable. Merge is **NOT AUTHORIZED**.
