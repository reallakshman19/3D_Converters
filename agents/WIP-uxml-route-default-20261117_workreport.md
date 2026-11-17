# WIP-uxml-route-default-20261117 — step 10 "UXML route" on by default (UXML plan step 6, second half)

## Mission and scope
Owner, 17 Nov 2026: "ok proceed" on (1) the live test of the step-10 switch and (2) making the UXML route the default once that test passes.
Change: the switch is on in every browser unless it was unticked there (localStorage `xmlCii.uxmlRoute` = 'off'). Label "UXML route".
Without browser storage (Node tests, scripts, workers) the route stays off: today's route, as those callers expect.
Unchanged: today's route still runs first; its parity check must pass on the UXML XML or the Run is held; Mode B always uses today's route.
Classification: ENGINEERING_CRITICAL runtime default; Owner approved it.

## Live test (before this change, live Pages main 6ede0bf3d, EF-05 public model, full runXmlCii2019Workflow)
| Run | CII SHA-256 | Lines | Note |
|---|---|---|---|
| switch off | b22e012cc9b31c31… | 15,742 | today's route |
| switch on | b22e012cc9b31c31… | 15,742 | "parity PASS"; only ElementLengthMm differs on 184 nodes (Owner 16 Nov) |

Earlier (PR 426): 7 models (G30, G30-NOJSON, G30-CUSTOM, RMS-BLOW-1, ACTIVE-AUDIT, BM2, EF05) CII byte-equal; the transfer-protected BM2 file keeps its values (XCU PR 283).

## Validation of this change
| Check | Status | Observation |
|---|---|---|
| tests/xml-cii-uxml-route.test.mjs | PASS 3/3 | on by default; 'off' turns it off; no storage -> off |
| x4, x5a, active-restraint-audit, mode-b-preview-occurrence, unmatched-atta-default-rest-closure | 72 pass, 1 fail | the 1 failure ("deployed UI chain selects the fresh restraint-closure runner") reads the old `tabs/` copy, untouched here; fails on main too |
| Browser, local server: step 10 checkbox ticked by default; untick stores 'off', re-tick clears it | PASS | |
| Browser, local server: full Run of EF-05 with no stored choice | PASS | UXML route ON in the log, CII SHA b22e012c… (same as today) |

## EXACT_NEXT_ACTION
Local commit on branch feat/uxml-route-default-20261117 (base main 6ede0bf3d). Owner word to push + open a draft PR, then merge word; then check live step 10 shows "UXML route" ticked.
