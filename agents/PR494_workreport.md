# PR494 — AIV Vertical Scroll Work Report

## Recovery header

| Field | Current state |
|---|---|
| Mission | Add vertical scrolling to the AIV workspace without changing engineering state, calculation authority, topology, persistence, or exports. |
| Work intent | IMPLEMENT |
| Criticality | STANDARD — presentation/layout only. |
| PR | `#494` — DRAFT / OPEN / NOT MERGED |
| Branch | `agent/aiv-vertical-scroll` |
| Grounded base | `main@82f932f5762fd380cf1fce48d5a51c66c403905f` |
| Exact implementation/handoff head before this report refresh | `32a9bc86f667c6fe92cb2cbddd239612127e4f18` |
| Base drift at implementation head | ahead / behind to be rechecked before merge; PR was mergeable after WIP→PR handoff. |
| Coordination | SAFE — no current open PR owns this AIV vertical-scroll surface. |
| REPORT_BASIS_HEAD | `32a9bc86f667c6fe92cb2cbddd239612127e4f18` |
| Merge authority | NOT AUTHORIZED for this new PR. |
| EXACT_NEXT_ACTION | On a functioning browser/native checkout, run `npm run verify:aiv-canvas-release` and verify mouse-wheel/trackpad vertical scrolling through long AIV content; keep PR draft until owner disposition. |

## Handover in 60 Seconds

The app shell intentionally sets `#tab-content`, persistent tab panels, `.app-shell`, and `.app-content` to `overflow:hidden`. AIV previously had no vertical overflow owner, so long workbench content could be clipped. PR494 fixes only the AIV presentation layer: `tabs/vibration-aiv-scroll.css` makes `.aivq-root` a flex-filling scroll container using `min-height:0` and `overflow-y:auto`. Global `styles/tabs.css` is intentionally unchanged.

The AIV stylesheet aggregator imports the new scroll layer after existing AIV styles, and `vibration-aiv-workspace-browser.js` bumps the qualification stylesheet cache key to `aiv-qualification-13`. A focused static regression pins the shell/AIV overflow ownership and cache-bust path, and is included in `verify:aiv-canvas-release` through `verify:aiv-eit-export`.

Hosted workflows on implementation/handoff head `32a9bc86...` were created but did not execute any steps:

```text
Vibration AIV Controlled Source Qualification
run 31813339002 / job 94808971803 / steps=null

Topology Edit Support Reprojection
run 31813338928 / job 94808971517 / steps=null
```

Classification: `NOT_RUN / INFRASTRUCTURE_BLOCKED`; neither is a product-test FAIL or PASS.

## Authority / negative assurance

Unchanged:

- AIV numerical kernel and equations;
- screening/readiness/assumption gates;
- `screeningResultScope = ASSESSMENT`;
- `designAuthority=false`;
- topology and physical-distance authority;
- working-table authority;
- persistence and engineering exports;
- SVG presentation/engineering boundary.

No global tab-shell CSS was modified.

## Changed-file ledger

| Path | Change | Purpose |
|---|---|---|
| `tabs/vibration-aiv-scroll.css` | added | AIV-local vertical scroll ownership. |
| `tabs/vibration-aiv-qualification.css` | modified | Import scroll layer after current AIV styles. |
| `tabs/vibration-aiv-workspace-browser.js` | modified | Bump stylesheet URL cache key so browsers load the new import. |
| `tests/vibration-aiv-scroll-layout.test.mjs` | added | Pin scroll ownership and cache-bust contract. |
| `package.json` | modified | Include scroll regression in existing AIV release suite. |
| `agents/PR494_workreport.md` | added | Recovery-first handoff. |

Pre-edit recovery blobs for existing files:

```text
tabs/vibration-aiv-qualification.css    d10a69d1b3c61e2754f314c43513a246f5d0366e
tabs/vibration-aiv-workspace-browser.js d622e4d3b79c02535e37053b11b372fc4cb8535e
package.json                             d8e22212022b73f72525122c6cc380077c7f20b6
```

The repository backup CLI could not be executed because this connector workflow has no native checkout; exact immutable Git blobs above are the recovery anchors.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Ground current base | PASS | GitHub source/ref inspection | NONE |
| Root-cause isolation | PASS | Global shell clips panels; AIV root lacked vertical overflow | IMPLEMENTATION_COUPLED |
| Scope/changed-file reconciliation | PASS | AIV presentation/test/report scope only | NONE |
| Focused regression present and release-wired | PASS | GitHub source inspection | IMPLEMENTATION_COUPLED |
| Hosted AIV workflow | NOT_RUN / INFRASTRUCTURE_BLOCKED | run `31813339002`, job `94808971803`, `steps=null` | IMPLEMENTATION_COUPLED |
| Hosted topology workflow | NOT_RUN / INFRASTRUCTURE_BLOCKED | run `31813338928`, job `94808971517`, `steps=null` | IMPLEMENTATION_COUPLED |
| Native `npm run verify:aiv-canvas-release` | NOT_RUN | No native checkout in this connector runtime | IMPLEMENTATION_COUPLED |
| Real-browser vertical scroll | NOT_RUN | Browser acceptance unavailable here | NONE |

## Active items

- `IMP-001` CLOSED — AIV root now owns vertical scroll.
- `RISK-001` CONTROLLED — global tab shell unchanged.
- `RISK-002` OPEN — native/browser execution still required for interaction acceptance.

## Appendix A

NOT_REQUIRED — STANDARD presentation-only change; no engineering-critical implementation takeover is involved.
