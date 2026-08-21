# WIP-VIB-MATRIX-RUN-CURRENTNESS-20260821 — Facility Matrix Run Currentness

HANDOVER_READINESS: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: IMPLEMENTATION
MAIN_HEAD_LAST_CHECKED: 1d0e9245f9a6333ce43fb8085602ec112241a411
PREDECESSOR_PR: 686 (MERGED)
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission
Prevent Mechanical, SBC and AIV caches from an earlier facility run from appearing current in the live mechanism matrix after a later identical FIT rerun.

## Authority boundary
- presentation/currentness projection only;
- no mechanism equation, coefficient, source/master or screening threshold changes;
- no applicability or AssessmentCompleteness authority;
- no EI main-line aggregation change;
- no execution/navigation/calculation/persistence blocking authority;
- right rail remains advisory/linking only;
- retain existing STALE_RESULT inspection behavior when the whole facility result is stale.

## Planned slice
- add one non-authorizing facility mechanism-cache currentness projector;
- add one shared matrix-context builder used by the main register and roadmap bridge;
- replace duplicated raw-cache matrix contexts;
- add falsifiers for identical rerun, scenario drift, AIV run mismatch, retained stale evidence and authority non-promotion.

## Validation truth
Repository-native tests and browser validation remain NOT_RUN until actually executed.
