# XML→CII 2019 Standalone RCA / Robust Fix Work Report

## Recovery header

- Repository: `reallaksh19/3D_Converters`
- Work ID: `WIP-XMLCII-RCA-20260916`
- Branch: `agent/xml-cii-standalone-rca-20260916`
- Basis main: `e16fe79fd0a2d542cc2475c9e4a40f9aa6fc701f`
- Intent: IMPLEMENT + INVESTIGATE
- Criticality: ENGINEERING_CRITICAL
- Mutation authority: WRITE_ALLOWED by user request; merge authority NOT GRANTED
- Current state: RCA complete enough for isolated fixes; implementation starting

## Handover in 60 Seconds

User reported six coupled XML→CII Standalone defects: line-list master field discovery, rigid/valve/flange weight review and empirical health, 10k+ piping-class import failure, regex tester confidence/sample usability, Preview B31.3 blocking, and branch→line auto-detection. Live-main source inspection establishes that these are separate authority/lifecycle defects, not one parser bug.

Current governing diagnoses:

1. **Line-list fields:** synthetic SheetJS `__EMPTY_*` semantic-label handling omits `From`/`To` and generic density semantics; core mapping omits From/To and contains an invalid generic-density fallback. Existing line-sequence mappings are not revalidated by the core detection order.
2. **Weights:** CII kg→N factor is applied once at the writer boundary. Dominant GLRD failure is stale/saved kg override authority superseding a newer catalog suggestion before the writer. Existing roadmap X003 independently records the same trace. Old post-run subset validator is implementation-coupled and can compare an accepted value to the same selected catalog candidate, while the empirical A1/A2 ±30% validator is separate from Weight Match rows.
3. **Large masters:** successful parse is followed by redundant localStorage writes (normalized + raw + workbook). Storage quota failures escape and are mislabeled as parse failures.
4. **Regex tester:** displayed percentage is a composite confidence score, not necessarily exact-match coverage. Branch sample selector renders every source branch although format clusters already exist.
5. **B31.3:** strict design authority intentionally blocks when governed material-factor/OD/unit/corrosion inputs are unresolved. UI needs explicit blockers and should resolve governed values from line-list/piping-class/material masters where unique; benchmark-only values must remain non-authoritative.
6. **Auto-detect:** current detector only proposes transformations whose outputs are exact loaded line-list keys. Structural/wildcard family inference is absent. A guessed mapping such as `P4110010 -> P4110001` is unsafe when multiple loaded `P41100xx` keys exist; robust inference must be uniqueness-gated and expose ambiguity rather than silently pick a key.

## Live ground truth / coordination

- `main` SHA: `e16fe79fd0a2d542cc2475c9e4a40f9aa6fc701f`
- Open PRs inspected before implementation. PR614 is scale-test-only; stale Batch-C search PRs do not claim these mapping/weight/master-runtime files; support-gap work is isolated.
- `agents/MASTER_INDEX.md` is absent on current main.
- No merge authority inferred or granted.

## Authority / invariants

- Do not change the current standalone `--weight-scale 10` compatibility contract to mask a wrong accepted kg value.
- Preserve separate facts: source weight, automatic candidate, Weight Match decision, final review decision, allocated physical-component mass, exported child mass.
- Weight empirical validation is read-only validation, never weight authority.
- Branch→line mapping may only auto-apply a derived non-exact family rule when the configured/generalized rule resolves to exactly one loaded authoritative line-list key; otherwise require review.
- B31.3 benchmark-only values cannot become design authority.
- Large-master persistence failure must not invalidate successfully parsed authoritative in-memory rows.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Live main / open PR grounding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | GitHub live state inspected |
| Weight scale writer trace | PASS | SOURCE_INSPECTION | INDEPENDENT_REPRODUCTION | JS runner sends kg; worker passes `--weight-scale 10`; writer scales once |
| GLRD stale-override diagnosis | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | `docs/Overall_roadmap.md` X003 records CII/10 == stale override kg example |
| Empirical ±30% validator exists | PASS | SOURCE_INSPECTION | IMPLEMENTATION_COUPLED | report schema exposes all row validations in `report.rows` |
| Browser/runtime regression | NOT_RUN | NOT_OBSERVED | NONE | no local checkout/browser execution in connector environment yet |
| Repository test suite | NOT_RUN | NOT_OBSERVED | NONE | run via CI after PR commit where available |

## Backup policy note

Repository policy requires `node utils/backup.js save` before editing existing files. This connector environment does not expose a working checkout/terminal for that command. Before every existing-file mutation, preserve the exact pre-change blob in a branch-local backup path (or equivalent immutable Git object reference) and record the limitation. This is an environment-blocked substitute, not a claim that the native backup command ran.

## Exact next action

Implement isolated changes with focused tests: line-list semantic field detection/normalization first, then compact fail-soft master persistence, then empirical row health integration and weight lifecycle authority guards, then uniqueness-gated branch family suggestions/regex UX diagnostics, then B31.3 blocker surfacing. Create a draft PR only after source-level tests/CI evidence are attached. Do not merge.
