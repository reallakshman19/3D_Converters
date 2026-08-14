# WIP-aiv-scroll-fix2 — AIV Vertical Scroll Repair

## Recovery header

| Field | Current state |
|---|---|
| Mission | Repair the merged AIV vertical-scroll change after user validation showed scrolling still does not work. |
| Work intent | IMPLEMENT / DEFECT REPAIR |
| Criticality | STANDARD — presentation/layout only. |
| Branch | `agent/aiv-vertical-scroll-fix2` |
| Grounded base | `main@fd573ad8033c13bcd646eacaa807b4e45700de35` |
| User-observed result | PR494 vertical scroll fix FAILED in actual UI. |
| Root cause | `.aivq-root` was assigned `overflow-y:auto`, but its ancestor `.engineering-workspace` is the first child of bounded `.app-content` and was not itself constrained/scrolling. Nested engineering containers therefore expand to content height and the outer `.app-content { overflow:hidden }` clips the result before `.aivq-root` can develop a scroll range. |
| Authority impact | NONE — layout only. |
| Merge authority | NOT AUTHORIZED for this repair PR unless owner explicitly authorizes it. |
| EXACT_NEXT_ACTION | Move vertical-scroll ownership to the bounded `.app-content > .engineering-workspace` shell, remove the false AIV-root ownership assumption, update regression, then create a draft PR. |

## Failure analysis

The prior regression only proved CSS declarations existed. It did not prove the chosen scroll owner was a bounded flex item. Source trace now shows:

`app-content (bounded, overflow:hidden)`
`-> engineering-workspace (unbounded auto-height)`
`-> engineering-workspace-panel`
`-> engineering-console-root/layout/main/product-card`
`-> data-aiv-qualification-host`
`-> aivq-root (overflow-y:auto)`

Because the intermediate engineering workspace expands to content height, `.aivq-root` is not forced below its content height. Therefore `overflow-y:auto` on AIV root cannot create the desired viewport scrollbar.

## Planned correction

- Add a directly loaded engineering-workspace scroll stylesheet from `index.html`.
- Make `.app-content > .engineering-workspace` a flex-filling bounded scroll container using `flex:1 1 auto`, `min-height:0`, `overflow-y:auto`.
- Keep `.aivq-root` responsible only for local horizontal clipping/min-height, not vertical viewport ownership.
- Replace the prior static regression with one that pins the real parent-child layout chain and cache-visible stylesheet link.

## Authority / negative assurance

No AIV equation, readiness logic, result contract, topology, physical-distance authority, input state, persistence, or export behavior may change.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| User validation of PR494 | FAIL | Vertical scrolling does not work in actual UI | USER_SUPPLIED |
| Source root-cause trace | PASS | First bounded ancestor is `.app-content`; engineering workspace was not the scroll owner | SOURCE_INSPECTION |
| Repair regression | NOT_RUN | To be updated | IMPLEMENTATION_COUPLED |
| Native/browser acceptance | NOT_RUN | No native/browser runtime in connector path | NONE |

## Appendix A

NOT_REQUIRED — presentation-only STANDARD defect repair; no engineering-critical implementation authority involved.
