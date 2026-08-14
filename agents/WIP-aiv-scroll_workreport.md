# WIP-aiv-scroll — AIV Vertical Scroll Work Report

## Recovery header

| Field | Current state |
|---|---|
| Mission | Add vertical scrolling to the AIV workspace without changing engineering state, calculation authority, topology, persistence, or exports. |
| Work intent | IMPLEMENT |
| Criticality | STANDARD — presentation/layout only. |
| Repository state | NEW_PR_REQUIRED |
| Mutation authority | WRITE_ALLOWED — owner requested implementation. |
| Branch | `agent/aiv-vertical-scroll` |
| Grounded base | `main@82f932f5762fd380cf1fce48d5a51c66c403905f` |
| Coordination | SAFE — current open AIV-related PRs found do not own `tabs/vibration-aiv-workbench.css` for this scroll change. |
| REPORT_BASIS_HEAD | `82f932f5762fd380cf1fce48d5a51c66c403905f` |
| EXACT_NEXT_ACTION | Patch `.aivq-root` to own vertical scrolling, add focused CSS regression in the existing AIV workbench test, then create a draft PR. |

## Handover in 60 Seconds

The application shell sets `#tab-content`, persistent tab panels, `.app-shell`, and `.app-content` to `overflow:hidden`. The AIV root currently has width/margin/padding only and therefore does not own the required vertical scroll. The planned fix is deliberately AIV-local: make `.aivq-root` a flex-filling container with `min-height:0`, `overflow-y:auto`, and stable vertical scrollbar behavior. Do not change the global tab shell because that would affect unrelated tools.

## Authority / invariants

- No AIV equations, calculation gates, result authority, assumptions, topology, persistence, or export semantics may change.
- `TABLES = engineering source of truth` remains unchanged.
- SVG coordinates remain presentation-only.
- This change is CSS/layout only.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Ground current `main` | PASS | GitHub source inspection | NONE |
| Identify overflow owner | PASS | `styles/tabs.css` globally clips tab panels; AIV root lacks vertical overflow | IMPLEMENTATION_COUPLED |
| Focused regression | NOT_RUN | To be added/executed if available | IMPLEMENTATION_COUPLED |
| Real-browser scroll acceptance | NOT_RUN | No browser runtime available in connector path | NONE |

## Changed-file ledger

No production files changed yet.

## Active items

- `IMP-001`: AIV root must become the vertical scroll owner inside the globally clipped tab shell.
- `RISK-001`: Do not alter global `styles/tabs.css`; doing so could change scroll behavior across unrelated tabs.

## Appendix A

NOT_REQUIRED — presentation-only STANDARD change; no engineering-critical takeover authority is involved.
