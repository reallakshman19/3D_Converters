# WIP-uxml-review-fixes-20261117 — step 10 fixes from the 17 Nov high-effort review

## Mission and scope
Owner, 17 Nov 2026: "Use a high reviewer", then the fix round. 3D_Converters part:
- N4.1: with site data blocked, reading localStorage throws; uxmlRouteOn and the step-10 switch read it outside their try,
  so step 10's Run buttons were left without handlers. Now read inside the try; blocked -> the default (UXML route on).
- N1.3: the Run record is written before the CII engine runs. It now carries `outcome`: 'held' (parity failed, no CII) or
  'released-to-engine'; the review page (XCU) shows it first.
- N4.4: stale "off by default" comment.
Not changed: other step-10 code that also reads localStorage outside a try (xml-cii-output-run-readiness.js:66,
xml-cii-workflow-ui-adapter.js:17 use `typeof localStorage`, which throws too when blocked) — reported, not in scope.

## Validation
| Check | Status | Observation |
|---|---|---|
| tests/xml-cii-uxml-route.test.mjs (+ blocked-storage case), tests/xml-cii-uxml-run-record.test.mjs | PASS 6/6 | |
NOT RUN: browser Run with blocked site data (other step-10 code reads storage too).

## EXACT_NEXT_ACTION
Owner push word -> draft PR with XCU fix PR.
