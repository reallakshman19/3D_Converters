# WIP-769-v25-postmerge-repair

## Purpose

Issue #769 post-merge repair under `engineering-pr-delivery-v2.5`.

## Current state

- Branch: `agent/issue-769-postmerge-repair-20260917`
- Material basis before v2.5 relay: `57fb8105885e6f7693b203da9951ca1aae66dbee`
- Production mutation: NOT STARTED under v2.5.
- Current material authority: READ_ONLY pending independent candidate takeover.
- First bounded material WP: `WP-769-FBLI`.
- First EP: `EP-769-01`.
- Open PR #417 coordinate/topology scope is protected and excluded.

## RCA boundary

Current patched wrapper only admits raw `FLAN` and `RIGID` to length-bearing negative-node renumbering. Reported blind flange `FBLI` with `NodeNumber=-1` therefore remains negative and is subsequently discarded by the base parser's positive-node gate. The robust repair boundary is canonical component-family classification before negative-node eligibility/filtering, not a downstream one-off exception.

## Historical benchmark ledger

- BM-001 PASS
- BM-002 PARTIAL_PASS_SCALE_PATH
- BM-003 PASS
- BM-004 NOT_RUN_ENVIRONMENT_BLOCKED
- BM-005 PARTIAL_PASS_11K
- BM-006 PASS
- BM-007 PASS
- BM-008 PASS
- BM-009 NOT_RUN_ENVIRONMENT_BLOCKED

## Next action

An independent zero-chat candidate must satisfy `DISC`, `QUAL`, and `TC` for `SERIAL:EP-769-01`, then run the v2.5 material-write gate. Only after that may the production FBLI slice be implemented.

## Merge authority

OWNER_ONLY. No merge is authorized by this WIP record.
