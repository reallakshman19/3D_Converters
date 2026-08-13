# PR452 — Vibration Master Source Inventory Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Finish issue #450's controlled-source **table** recovery path without manufacturing engineering values. |
| PR / branch | `#452` / `agent/vibration-master-source-inventory` |
| Original base | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current upstream main | `092e4055650f605e0b6602388158a34e487e3804` |
| Stage 5E implementation head before this report | `575522e7e3372052f2cf03cb71d05ff457f952bf` |
| PR status | DRAFT / OPEN / MERGE NOT AUTHORIZED |
| Current stage | **Stage 5E — TABLE SOFTWARE PATH IMPLEMENTED / VALIDATED** |
| Validation | Stage 5D table reconciliation `8/8 PASS`; Stage 5E branch-exact normalization `11/11 PASS`; normalization CLI smoke PASS. |
| Remaining table boundary | Live EI table population still requires a runtime that can reach Owner `127.0.0.1:8765` and `/Common`; this runtime cannot. No live EI values are claimed here. |

## Handover in 60 Seconds

Controlled source remains:

```text
reallaksh19/Common
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10,348,594
retrieval 9e11e1b4ab1ee55f1ad5fd24a8e82994a5442872
adopted provenance fb549185b9b27edc2379734240320a85c5bef9f6
```

The **table software pipeline is now complete through typed candidate normalization**:

```text
controlled PDF
  -> API search
  -> explicit caller page selection
  -> bounded API conversion + evidence
  -> exact-string table candidate reconciliation
  -> explicit reviewed semantic mapping
  -> typed table master candidate
  -> QUALIFICATION_REQUIRED
```

No stage silently promotes authority. The final Stage 5E record remains:

```text
sourceState    = TABLE_MASTER_CANDIDATE_NORMALIZED
recoveryAction = QUALIFICATION_REQUIRED
qualificationStatus = NOT_QUALIFIED
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

### Stage 5E behavior

`normalize-vibration-master-tables.mjs` accepts only Stage 5D `TABLE_CANDIDATE_RECOVERED` records and a `VibrationMasterTableSemanticMapping.v1` document whose mappings are explicitly `REVIEWED` and pinned to exact `masterId`/optional `selectionId`, `tableBlockId`, source Git blob, Markdown SHA and page range.

Every source row needs explicit disposition (`header`, `data`, `ignore`). Header rows require exact literal expectations. Every semantic field explicitly names the source `C#` coordinate, field name, value type and unit. Supported typing is intentionally narrow: `string`, `decimal`, `enum`. Decimal parsing accepts only strict finite decimal syntax. Enums require an explicit exact allow-list. Raw source strings are retained next to typed values.

The normalizer contains no unit conversion, interpolation, nearest-row fallback, default substitution, expression evaluation, inferred header, inferred field name or inferred unit path. Appendix B is emitted only with `OPTIONAL_ASSUMPTION_LIBRARY`, never as an engineering default. T2.8 can proceed only when Stage 5D actually recovered a table.

### Table families covered

```text
EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1
EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1
EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1
EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1
EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1
EI_AVIFF.T4.WALL_MODIFIER.v1
EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1
```

Charts/curves and rule/flowchart recovery remain deliberately deferred by the user's table-first instruction.

## Exact Stage 5E Evidence

GitHub blobs of branch-exact validated files:

```text
scripts/normalize-vibration-master-tables.mjs
  49cd8ddc92a20862f3f05413e65eb2028d14c527
  198 physical lines

tests/support/vibration-master-table-normalization-fixtures.mjs
  3b48543346ba50a1e8d75634f32a2cb124cf37fe

tests/vibration-master-table-normalization.test.mjs
  2346e6f550a2061689747869fda4f8516d852703

tests/vibration-master-table-normalization-policy.test.mjs
  539e278ecb73e9ccabf1c8259ef296a4a1b46f2f

package.json
  76bfbee4e658d46c4ceaa5fb83408acb629b03d4

scripts/verify-vibration-fit-release.mjs
  eea1512c2fc2eacded05576ad709b5e09500f8d2
```

The branch-exact reconstructed blobs matched those GitHub IDs before execution.

Focused Stage 5E validation:

```text
node --check scripts/normalize-vibration-master-tables.mjs
PASS

node --test \
  tests/vibration-master-table-normalization.test.mjs \
  tests/vibration-master-table-normalization-policy.test.mjs

11 tests / 11 PASS / 0 FAIL
```

Exact package-command smoke:

```text
npm run normalize:vibration-master-tables -- \
  --candidates candidates.json \
  --mapping mapping.json \
  --out normalized.json

PASS -> VibrationMasterTableNormalizedCandidates.v1
        TABLE_MASTER_CANDIDATE_NORMALIZED
        QUALIFICATION_REQUIRED
        NOT_QUALIFIED
        NONE / NOT_AUTHORIZED / false
```

Stage 5D remains previously validated `8/8 PASS`; Stage 5E did not modify the Stage 5D reconciler.

## Operator Sequence for Live Table Population

In a runtime that can reach the controlled API/source:

```bash
npm run recover:vibration-master-sources-via-api -- \
  discover --api http://127.0.0.1:8765 \
  --out /tmp/vibration-master-api-discovery.json

npm run recover:vibration-master-sources-via-api -- \
  convert --api http://127.0.0.1:8765 \
  --selection /tmp/vibration-master-table-selections.json \
  --review-dir /tmp/vibration-master-table-review \
  --out /tmp/vibration-master-table-conversion.json

npm run reconcile:vibration-master-tables -- \
  --selection /tmp/vibration-master-table-selections.json \
  --conversion /tmp/vibration-master-table-conversion.json \
  --review-dir /tmp/vibration-master-table-review \
  --out /tmp/vibration-master-table-candidates.json

npm run normalize:vibration-master-tables -- \
  --candidates /tmp/vibration-master-table-candidates.json \
  --mapping /tmp/vibration-master-table-mapping.json \
  --out /tmp/vibration-master-table-normalized.json
```

The semantic mapping is a reviewed engineering artifact; software does not generate it from table layout.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

Existing AIV authority remains independent.

## Changed-File Ledger

The whole PR currently has 18 changed files. Stage 5E adds/updates the normalizer, two focused tests, one synthetic fixture, package/release wiring and this report. No `.github/workflows/*` file is changed.

Two inert marker files were created during a connector write-path correction:

```text
agents/PR452_stage5e_gate.md
agents/PR452_workreport_stage5e_note.tmp
```

Both contain documentation only and no executable/engineering data. Deletion was attempted through the GitHub connector but the delete action was safety-blocked, so they are explicitly ledgered rather than hidden or force-removed. They have no runtime or authority effect.

## Engineering Invariants

- exact controlled source identity remains authoritative;
- no mirror-derived values or benchmark reverse engineering;
- no automatic page, table-block, header, field, unit or type inference;
- no unit conversion/interpolation/nearest-row/default substitution;
- raw source strings stay attached to typed values;
- mapping identity must match Git blob, Markdown SHA, page range and table block;
- Appendix B remains optional assumptions only;
- no curve/chart/rule work in this stage;
- authority remains `NONE / NOT_AUTHORIZED / false`.

## Mission Status

| Work item | Status |
|---|---|
| Source identity/equivalence | VALIDATED |
| API search/conversion bridge | VALIDATED `10/10` |
| Table candidate reconciliation | VALIDATED `8/8` |
| Table semantic normalization | **IMPLEMENTED / VALIDATED `11/11`** |
| Table operator command | PASS smoke |
| Live controlled EI table values | NOT_RUN in this runtime |
| T3 curves | DEFERRED |
| Rule/flowcharts | DEFERRED |
| Full release suite | NOT_CLAIMED |
| Authority review | NOT_RUN |
| Merge authorization | NONE |

## Next-Agent Handover

The table software work should not be extended with guessed EI values. The next table action is **live execution** of the four-command sequence against the controlled PDF, followed by human/reviewer-authored semantic mappings for the exact recovered tables. Only after those candidates are source-backed and qualified should an authority-review stage be considered. Do not begin T3 curve digitization or rule/flow extraction until the table work is accepted as complete by the user.
