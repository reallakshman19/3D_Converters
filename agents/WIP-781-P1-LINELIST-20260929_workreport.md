# WIP-781-P1-LINELIST-20260929 — Issue #781 semantic line-list worksheet selection

## Basis

```text
ISSUE = #781
PLAN = IMPLEMENTATION_PLAN rev 1 / issuecomment-5893573324
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-781-p1-linelist-sheet-20260929
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Current defect

Current XLSX import returns a worker `SHEETS` event, then the UI unconditionally selects `sheetNames[0]`. Manual worksheet changes already use the worker and commit a fresh dataset; they are not being rewritten unless current-head reproduction proves another defect.

## Intended correction

For `lineList` workbook imports only:

1. exact normalized `linelist` sheet name;
2. aliases `line list` / `line-list`;
3. bounded worker-side semantic sample scored through the existing line-list normalization/mapping machinery;
4. first-sheet fallback when semantic evidence is insufficient.

Only `suggestedSheet`/diagnostic metadata crosses the worker boundary. Full workbook rows remain worker/dataset-owned; no persistent main-thread master arrays are introduced.

## Falsifiers

- semantic selection requires full workbook-row materialization on the UI thread;
- unrelated master types change their default first-sheet behavior;
- a saved mapping alone can make an unrelated sheet win without populated semantic evidence;
- manual sheet selection no longer commits the selected worker dataset;
- PR780 dataset/scale regressions fail newly.

## Exact next action

Back up the three existing runtime surfaces, add bounded worksheet sampling and a pure semantic selector, return `suggestedSheet` from `SHEETS`, then qualify name priority, semantic fallback, first-sheet fallback, non-line-list behavior, and manual selection preservation.
