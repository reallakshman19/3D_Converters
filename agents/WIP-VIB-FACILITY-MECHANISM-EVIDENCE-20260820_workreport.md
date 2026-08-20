# WIP-VIB-FACILITY-MECHANISM-EVIDENCE-20260820 — Facility Mechanism Evidence Envelope

HANDOVER_READINESS: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: IMPLEMENTATION
MAIN_HEAD_LAST_CHECKED: db5f9e250edfa6fa01097b02ff71b1737ea78436
PREDECESSOR_PR: 684 (MERGED)
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission
Add a non-authorizing facility mechanism-evidence envelope layered on the existing FIT run snapshot/evidence so current Mechanical, SBC, and facility-linked AIV evidence can be proven to belong to the same FIT facility run and scenario-set snapshot.

## Authority boundary
- preserve existing FIT run/evidence contracts unchanged in identity;
- projection/evidence only; no new applicability, completeness, numerical, aggregation, screening or design authority;
- right panel remains guidance/linking only;
- stale/foreign mechanism evidence must be surfaced, never silently admitted as current;
- no equation, coefficient, master/source, process-actualization or mechanism-method changes.

## Intended slice
- new `converters/vibration/facility/mechanism-evidence.js`;
- minimal integration into `tabs/vibration-integrity-run-evidence.js`;
- focused falsifiers for exact scenario basis, full scenario-set currentness, standalone AIV exclusion, stale Mechanical/SBC exclusion, and authority preservation.

## Validation truth
Repository-native tests and browser validation are NOT_RUN until actually executed.
