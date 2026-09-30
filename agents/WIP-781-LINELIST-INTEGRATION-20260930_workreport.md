# WIP-781-LINELIST-INTEGRATION-20260930 — Line List custody + mapping integration repair

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
ISSUE: #781
PLAN: PLAN_UPDATE rev 2 / issue comment 5903852328
BRANCH: agent/issue-781-linelist-custody-mapping-integration-20260930
REPORT_BASIS_HEAD: 3976929fd0d012fae5c3bf4014eb10af7e8ab332
LIVE_MAIN_LAST_CHECKED: 3976929fd0d012fae5c3bf4014eb10af7e8ab332
PROTOCOL: V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: IMPLEMENT
MUTATION_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: baseline / backup gate
CURRENT_BLOCKER: repository-native pre-edit backups not yet executed for planned existing JS files
HIGHEST_RISK: corrupting APPLIED-vs-DRAFT mapping authority while trying to improve mapping UX
EXACT_NEXT_ACTION: execute node utils/backup.js save against exact branch bytes for planned existing JS targets, commit backup evidence, then add real-layout regression before production edits
```

## Handover in 60 seconds

Owner reported that Line List mapping remains weak after #780/#781 and that the UI stays at `Mapping status: MODIFIED — NOT APPLIED ... revision 6` while Preview continues to show old applied headers and 15 rows. Source review on current main identified three combined-state defects:

1. Auto-map/edit correctly creates a DRAFT while Preview intentionally remains on APPLIED mapping. Apply must create one new dataset/revision before Preview changes.
2. Persisted IndexedDB datasets can lose session-only `rawRows`; current worker remap rejects them even though normalized Line List rows still retain `_raw` source objects. This can make a post-reload draft unrecoverable.
3. Persisted sheet names survive reload but manual sheet switching depends on in-memory `importSources`, so the selector can silently no-op after reload.
4. Real workbook semantic labels span a deeper vertical header band than the current 4/5-row probes; existing synthetic tests are too compressed.

Repair must preserve explicit APPLIED-vs-DRAFT authority and PR780 metadata-only custody.

## Coordination

Open PR #792 (Issue #787 Mode B UI) touches mode selector/review shell paths, not intended master-mapper/worker/import paths. Classification: `SAFE` for exact-file overlap; shared XML→CII authority means exact-head regression is still required.

## Intended patch boundary

Planned production targets, subject to final minimal-patch confirmation:

- `tabs/xml-cii-2019-standalone/workers/master-dataset-service.js` + docs mirror — recover Line List raw remap basis from persisted normalized `_raw` rows.
- `tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js` + docs mirror — consume strong bounded header-band mapping evidence.
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js` + docs mirror — consume same header-band mapper for UI auto-map and improve draft/apply status wording without changing authority.
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js` + docs mirror — prevent restored-session sheet selector silent no-op.
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js` + docs mirror — expose restored-session sheet-switch limitation explicitly.
- new pure `<300 line` helper for Line List header-band inference if that remains the smallest reusable design.
- additive focused tests matching the reported `__EMPTY_*` layout and restored remap/sheet behavior.

## Protected invariants

- Preview/calculations use APPLIED mapping only.
- Auto-map/manual selector edits remain DRAFT until explicit Apply.
- Apply advances APPLIED mapping revision exactly once.
- Dataset-backed full master arrays remain absent from persistent main-thread state/config.
- No full workbook/raw duplicate persistence is introduced.
- Worker remains owner of dataset normalization/remap/search.
- Source/docs runtime mirrors remain aligned.
- Unrelated Mode B/topology and engineering numerical authority are unchanged.

## Current hypothesis + falsifier

### H1 — remap after restore
Persisted Line List normalized rows retain `_raw`, so worker remap can reconstruct source rows without persisting a second full raw dataset.

Falsifier: IndexedDB-restored normalized rows do not contain complete `_raw` objects for every row, or remapping from `_raw` changes normalized output relative to session `rawRows`.

### H2 — reported mapping
A bounded multi-row column-header band (roughly first 12–16 non-empty rows) is sufficient to distinguish `Density/Gas`, `Density/Liquid`, `Density/Mixed`, line identity, piping class, pressure, temperature, material, bore, From/To for the reported workbook without hard-coding column IDs.

Falsifier: a real-layout fixture still ambiguously maps generic density/line sequence or assigns a field without strong label/value evidence.

## Acceptance

Reported layout must resolve to:

```text
lineSeqNo      = ''
lineKey1       = __EMPTY_1
lineKey2       = __EMPTY_2
pipingClass    = __EMPTY_21
rating         = ''
material       = __EMPTY_26
convertedBore  = __EMPTY_20
p1             = __EMPTY_22
hydroPressure  = __EMPTY_31
t1             = __EMPTY_24
t2             = __EMPTY_11
t3             = __EMPTY_25
insThk         = __EMPTY_28
density        = ''
densityGas     = __EMPTY_12
densityLiquid  = __EMPTY_13
densityMixed   = __EMPTY_14
phase           = __EMPTY_7
from            = __EMPTY_3
to              = __EMPTY_4
```

Flow acceptance:

```text
fresh import -> Linelist selected -> correct dataset rows
Auto Map -> dirty DRAFT
Apply Mapping -> new dataset + revision N+1 -> dirty cleared
Preview -> immediately uses new APPLIED headers/data
reload -> metadata-only restore
post-reload Line List remap -> succeeds from governed persisted raw basis
post-reload sheet switch -> never silently no-ops; explicitly requires source re-import when workbook bytes are unavailable
```

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Current-main source RCA | PASS | SOURCE_INSPECTION | IMPLEMENTATION_COUPLED |
| Real-layout mapping regression | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED |
| Restored Line List remap regression | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED |
| Sheet-selector restored-session behavior | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED |
| Existing Issue #776 authority suite | NOT_RUN | NOT_OBSERVED | mixed |
| Browser WSW + 10k/50k/100k scale | NOT_RUN | NOT_OBSERVED | mixed |

## Appendix A — implementation qualification

### A1 Production trace — 20/20
`renderColumnMapping()` shows `effectiveDraftFieldMap()` while `appendPreview()` and `previewColumns()` use `appliedFieldMap()`. Auto-map stages a draft; `applyCurrentDraft()` delegates dataset-backed apply to worker remap; successful `commitDatasetReadyMaster()` advances revision and removes the draft.

### A2 Failure isolation — 20/20
The dirty status itself is not a bug; it proves the draft/applied split. The defects are (a) weak real-layout mapping evidence, (b) restored dataset remap requiring session-only raw rows, and (c) restored sheet selector retaining UI state without a live workbook job.

### A3 Authority / invariant — 20/20
Do not auto-promote drafts. Do not use draft mapping for Preview. Do not restore full resident master arrays. Remap must create a new dataset and revision atomically.

### A4 Independent validation — 19/20
Use a source-derived real-layout fixture based on the user-provided header/value structure, assert exact semantic mapping, compare remap from session raw rows vs persisted `_raw` reconstruction, and run existing authority/browser suites. Limitation: user workbook bytes are not attached in this chat, so the fixture reproduces the supplied structure rather than the exact binary workbook.

### A5 Minimal patch — 19/20
Add one pure header-band helper, wire it at both UI and worker map-resolution boundaries, add Line List persisted-row remap recovery, and make unavailable sheet switching explicit. No change to calculation/writer/topology authority.

Total: 98/100; all challenges >= 19/20. Implementation authorized.
