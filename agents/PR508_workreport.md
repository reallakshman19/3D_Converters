# PR508 — SBC Type-3 Master-Assisted Facility Workflow

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
PR: #508
BRANCH: agent/sbc-master-assisted-stage2
BASE: agent/ei-master-pack-stage1
BASE_SHA: 9ed5acbf2e6ab20746c93650ea167e1a59893f3d
PARENT_PR: #507 OPEN / DRAFT / UNMERGED
MAIN_AT_START: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
MERGE_AUTHORITY: NOT_GRANTED
```

## Mission / Outcome

Upgrade the merged SBC Type-3 user-input candidate pattern so engineers enter physical SBC/project information instead of source-recoverable intermediate EI terms.

Delivered custody:

```text
physical project inputs
 -> Stage-1 candidate EI masters
 -> automatic C / E / location / 1.42 rule
 -> exact manual D/F/G chart reads while T3-1..T3-4 stay quarantined
 -> single shared Type-3 max/min combination seam
 -> facility-scoped candidate SBC LOF
```

The result remains non-authorizing. No curve digitization is activated and no screening/design authority is changed.

## Source truth / protected conflict

Pinned source package:

```text
reallaksh19/Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921
P0_SBC_Master_Data.md blob 5312c9e2cf86af9e940ba722fcbee64702aeccd3
EI_AVIFF_Guidelines_2nd_Edition_Examples.md blob c050cd90802c27241c510c6f0ac43bfaf7a89e9d
```

Controlled EI PDF identity retained from merged evidence:

```text
reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10,348,594 bytes
```

Merged PR505 proves the supplied T3 curve digitization conflicts with Worked Example D7:

```text
T3-1: 1.5 in / 1.285714 m -> expected 0.2, supplied 0.4
T3-3: 1.5 in / 2.3 m      -> expected 0.6, supplied 0.7
T3-4: 1.5 in / 1.4 m      -> expected 0.2, supplied 0.3
```

Permanent Stage-2 invariant:

```text
T3-1..T3-4 master status = BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation   = false
masterPublicationAuthorized = false
```

D/F/G therefore remain explicit project/user engineering rows with exact x/y/unit matching.

## Qualified non-curve candidate evidence consumed

Merged PR484 supplies candidate geometry/location scoring and span rules. Parent PR507 supplies the governed master registry plus Table T3-1/T3-2/T3-3 candidate records.

### Geometry C

When first-span unsupported mass exists, Flowchart T3-3 C is the arithmetic mean of five candidate scores:

1. fitting type;
2. branch length to unsupported mass;
3. valve/flange configuration;
4. parent pipe schedule;
5. minimum SBC diameter.

When no unsupported mass exists, source semantics set C=0.

### Minimum-span E

```text
modifiedMinimumSpan = actualFirstSpan * fittingSpanFactor
modifiedMinimumSpan < Table T3-2 limit  -> E = 0.7
modifiedMinimumSpan >= Table T3-2 limit -> E = 0.2
```

### Location

```text
main-line LOF unknown -> main-line assessment LOF = 1.0; LOFLOC = 1.0
main-line LOF >= 1    -> LOFLOC = 1.0
main-line LOF < 1     -> mean(location score, parent-schedule score)
```

### Main-line rule

```text
mainlineAdjusted = mainlineLof * 1.42
SBC LOF = min(mainlineAdjusted, overallModifier)
```

## Worked-example oracle — D7

```text
Weldolet                       0.9
branch length 700 mm           0.9
one valve < ANSI 900           0.5
parent Sch 120 -> Sch 80       0.5
minimum SBC diameter 1.5 in    0.6
C = mean                       0.68

fitting span factor            0.7
first span                     0.9 m
modified minimum span          0.63 m
Table T3-2 1.5-in limit        1.3 m
E                              0.7

D manual curve read            0.2
F manual curve read            0.6
G manual curve read            0.2
LOFLOC                         1.0
main-line assessment LOF       1.0
multiplier                     1.42
final SBC LOF                  0.7
```

Independent no-mass regression retained:

```text
C = 0
D from T3-2 manual row = 0.4
E = 0.2
LOFLOC = mean(BEND 0.9, Sch40 0.7) = 0.8
main-line LOF = 0.2
mainlineAdjusted = 0.284
final SBC LOF = 0.284
```

## Implementation

### Candidate master pack

`converters/vibration/masters/ei-aviff-sbc-t3-noncurve-candidate.js`

Adds candidate-only typed records for:

- Flowchart T3-3 geometry scoring;
- Flowchart T3-9 location scoring;
- Table T3-2 minimum-span disposition rule;
- worked-example combination/main-line rules.

Flowchart datasets are classified as source type `RULE`, not table authority. Candidate inspection remains explicitly non-authorizing.

### Master-assisted calculator

`converters/vibration/sbc/type3-master-assisted.js`

- normalizes schedule policy using the documented next-lower standard schedule (`120 -> 80`);
- classifies branch-length and valve/flange categories;
- calculates C, E, location and 1.42 rule from candidate masters;
- generates exact D/F/G curve requests;
- resolves user curve values only at exact scope + blocker + x + y + units;
- re-checks Stage-1 curve quarantine in the completed result;
- fails closed with structured NOT_READY results.

### Shared numerical custody

`converters/vibration/sbc/type3-user-data.js`

Extracts `combineSbcType3Terms()` so legacy and master-assisted paths use one final max/min chain. The seam rejects `null`, `undefined` and blank numeric terms. Only the documented no-mass C branch produces C=0.

### Facility / mechanism routing

- `converters/vibration/sbc/facility.js` accepts a precomputed master-assisted result only when its `scopeId` exactly equals the facility scope.
- `converters/vibration/mechanisms/sbc.js` preserves candidate qualification and records mixed candidate-master + project-input evidence.
- `tabs/vibration-integrity-mechanisms.js` accepts per-scope precomputed result and mode maps.
- `tabs/vibration-integrity-view.js` passes those maps into the synchronous matrix.

A wrong-scope cached result becomes `INVALID_PRECOMPUTED_SCOPE` and cannot create `candidateGoverning`.

### UI workflow

`tabs/vibration-integrity-sbc-master-assisted-controller.js` owns per-scope physical state, mode, curve-row generation, cache and invalidation.

`tabs/vibration-integrity-sbc-type3-view.js` exposes:

- first-span unsupported mass yes/no;
- fitting type;
- branch length to mass;
- valve class/configuration;
- parent schedule;
- minimum SBC diameter;
- first/subsequent spans;
- optional location and main-line LOF;
- Generate/refresh D/F/G rows;
- Evaluate master-assisted Type-3.

The legacy explicit-intermediate workflow remains available under a separate fallback section and explicitly removes the scope from master-assisted mode.

Editing physical data or user curve data invalidates the cached candidate result for that scope.

## Authority / negative assurance

Unchanged:

```text
FIT implementationState = IMPLEMENTED_SCREENING
FIT screeningAuthority  = SCREENING
SBC implementationState = IMPLEMENTED_CANDIDATE_USER_INPUT
SBC engineeringAuthority = NONE
SBC screeningAuthority   = NOT_AUTHORIZED
SBC designAuthority      = false
SBC masterDataAuthority  = false
fullScreeningGoverningEstablished = false
```

No changes to:

- FIT equations or qualified screening bounds;
- AIV code or authority;
- T3 curve master activation;
- T3 curve interpolation/extrapolation/reconstruction;
- engineering export semantics;
- workflow files.

## Backup / recovery ledger

Repository-local backup CLI is unavailable because the connector runtime has no authenticated checkout.

```text
node utils/backup.js save ... = NOT_RUN / ENVIRONMENT_BLOCKED
```

Exact pre-edit Git blobs are compensating rollback evidence:

```text
converters/vibration/sbc/type3-user-data.js       69215382db2fabaae8356370ca5760def19d4cba
converters/vibration/sbc/facility.js              f723aace9c7c7fcbedfcb0fcab64c528dcc1f046
converters/vibration/mechanisms/sbc.js            fe0a15b8cb32b0d1e16ae41f0fd2e934b88a2557
tabs/vibration-integrity-mechanisms.js            c3f79911c2fb9f183d296ee0a674fc199bbd0285
tabs/vibration-integrity-sbc-type3-view.js        85146c0a72cea36d7c9a37d24fe355356da95c01
tabs/vibration-integrity-user-data-shell.js       ebd5880cf2a567701704d08eaac5fae1fc04e274
tabs/vibration-integrity-view.js                  7101c2d2f6eb7d03dc056c16ba8757e6fa2e416d
```

All other production/test files in this PR are new.

## Changed-file ledger

```text
agents/PR508_workreport.md                                      NEW
converters/vibration/masters/ei-aviff-sbc-t3-noncurve-candidate.js NEW
converters/vibration/mechanisms/sbc.js                         MODIFIED
converters/vibration/sbc/facility.js                           MODIFIED
converters/vibration/sbc/type3-master-assisted.js              NEW
converters/vibration/sbc/type3-user-data.js                    MODIFIED
tabs/vibration-integrity-mechanisms.js                         MODIFIED
tabs/vibration-integrity-sbc-master-assisted-controller.js     NEW
tabs/vibration-integrity-sbc-type3-view.js                     MODIFIED
tabs/vibration-integrity-user-data-shell.js                    MODIFIED
tabs/vibration-integrity-view.js                               MODIFIED
tests/vibration-sbc-master-assisted-facility.test.mjs          NEW
tests/vibration-sbc-t3-noncurve-master-stage2.test.mjs         NEW
tests/vibration-sbc-type3-combination-guard-stage2.test.mjs    NEW
tests/vibration-sbc-type3-master-assisted.test.mjs             NEW
```

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Live parent #507 grounding | PASS | #507 head `9ed5ac...`, unchanged | GitHub |
| Main grounding | PASS | `main@0b03855...` at checkpoint | GitHub |
| Stacked compare | PASS | Stage2 ahead of parent, behind 0 | GitHub compare |
| Appendix A takeover qualification | PASS | 97/100, all sections >=19/20 | repository/source trace |
| D7 source semantics | PASS | C=.68, E=.7, D=.2, F=.6, G=.2, LOF=.7 | pinned worked example |
| D6 location rule | PASS | BEND .9 + Sch40 .7 -> .8 | merged candidate evidence |
| No-mass candidate oracle | PASS | final LOF=.284 | independent constructed regression |
| Curve quarantine preserved | PASS | no runtime curve value/activation introduced | PR505 + Stage1 contract |
| Missing-is-not-zero guard | PASS_SOURCE | direct numerical seam rejects null/undefined/blank | source inspection + regression |
| Scope isolation | PASS_SOURCE | precomputed result scope checked before matrix use | source inspection + regression |
| Module-size target | PASS_SOURCE | new JS: 107 / 285 / 177 lines, all <300 | GitHub compare |
| Bounded reconstructed domain smoke | PASS | D7=.7; no-mass=.284; coordinate/schedule failures close | local reconstructed execution |
| Repository-native focused Node tests | NOT_RUN | connector-only runtime has no checkout | NONE |
| Repository-native full vibration release | NOT_RUN | Stage2 is stacked; not wired into parent release manifest yet | NONE |
| Real-browser acceptance | NOT_RUN | browser runtime unavailable | NONE |
| Hosted exact-head workflow | NOT_RUN | to be rechecked after final report commit | NONE |

`PASS_SOURCE` is not represented as executed test PASS.

## Appendix A — implementation takeover qualification

### A1 Production Trace — 19/20
Facility cell -> exact scope -> User Engineering Data workspace -> master-assisted async evaluator -> cached exact-scope result -> synchronous mechanism matrix has been traced. One point withheld for unavailable real-browser execution.

### A2 Failure Isolation — 20/20
Recoverable non-curve intermediate user burden is separated from the independently unresolved curve-source conflict. No curve source is inferred or reconstructed.

### A3 Authority / Invariant — 20/20
FIT screening authority is isolated from SBC candidate authority; candidate masters remain non-active/non-authorizing and a higher SBC LOF cannot replace `screeningGoverning`.

### A4 Independent Validation — 19/20
D5/D6/D7/D8 source/worked-example oracles and an independent no-mass case drive regression design. One point withheld for repository-native execution not available here.

### A5 Minimal Patch / Merge Readiness — 19/20
Stage2 is a separate stacked PR with exact parent base and no workflow/FIT/AIV broadening. One point withheld because it must be rebuilt/retargeted cleanly after parent squash merge before any eventual merge.

**Total: 97/100; all challenges >=19/20 — PASS.**

## Risks / active items

- `RISK-001 OPEN` — repository-native and browser tests are NOT_RUN.
- `RISK-002 ACTIVE` — T3-1..T3-4 curve geometry remains source-conflicted; manual D/F/G fallback is mandatory.
- `DEC-001 ACTIVE` — Stage2 remains stacked on #507; do not retarget to main before parent merge/replay.
- `DEC-002 ACTIVE` — candidate master consumption does not imply ACTIVE master publication.
- `DEC-003 ACTIVE` — no ungoverned interpolation for geometry diameter score; off-grid candidate score fails closed.

## EXACT_NEXT_ACTION

1. Recheck final PR head, parent #507 head and changed-file boundary.
2. Check exact-head GitHub workflow/status contexts; classify absent execution as NOT_RUN.
3. Keep PR draft/unmerged pending owner direction.
4. If #507 is later owner-authorized and squash-merged, rebuild PR508 on the new `main` using the exact intended Stage2 files; verify ahead/behind and changed-file boundary before any merge request.
