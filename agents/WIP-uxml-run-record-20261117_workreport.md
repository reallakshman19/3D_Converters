# WIP-uxml-run-record-20261117 — step 10 "Download Run record" (UXML plan, traceability; Owner aims 1 and 3)

## Mission and scope
Owner, 17 Nov 2026: "Yes, build it" on the plan "Run keeps its changes". Each Run on the UXML route keeps a Run record:
that Run's own supports-stage provenance (rule and source of every support value, restraint and engineering value), the
XML the CII engine received, hashes (source XML, stage input, CII input, staged JSON, support config), parity result,
how it compares with today's route, and the transfer-protected values with whether each was kept. Step 10 shows
"Download Run record" after a Run (hidden before, and when the route is off). The XML and the CII do not change.
Opens in XML_Compare_Utilities review page section 4, "Open a Run record" (separate PR there).

Files: v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-run-record.js (new), ui-adapted/xml-cii-uxml-run-record-button.js
(new), xml-cii-uxml-route.js (keeps the stage result, remembers the record), ui-adapted/xml-cii-adapted-events-mode-a-
consolidated-review-v2.js (button; records cleared when a Run starts), tests/xml-cii-uxml-run-record.test.mjs (new).
Records live in memory for the last Run only; nothing is uploaded.

## Validation
| Check | Status | Observation |
|---|---|---|
| tests/xml-cii-uxml-run-record.test.mjs + route + transfer-protection | PASS 13/13 | |
| callers (x4, x5a, active-restraint-audit, mode-b-preview-occurrence, unmatched-atta-default-rest-closure) | 78 pass, 1 fail | the 1 failure reads the old `tabs/` copy; fails on main too |
| Node, route on G30 / EF-05 / transfer-protected BM2 | PASS | record XML = CII input XML, hashes match, 0 unexplained; 150 / 173 / 1,531 support rows; 0.2 / 2.1 / 1.2 MB; BM2: 10 of 10 transfer values kept |
| Browser, local server, EF-05 full runXmlCii2019Workflow, route on | PASS | CII b22e012cc9b31c31, 15,742 lines (= today); 1 record; button hidden before, shown after |
| Same, route off | PASS | same CII; no record |
| Browser, step 10 (Mode A) | PASS | button beside the ticked "UXML route" box, hidden before a Run |
| A full Run from the step-10 button itself | NOT_RUN | the workflow API Run above covers the record; the button's refresh after a UI Run is not exercised |

## EXACT_NEXT_ACTION
Local commit only. Owner word to push + open draft PR; then merge word; then a live Run and download.
