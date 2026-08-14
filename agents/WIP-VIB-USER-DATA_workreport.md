# WIP-VIB-USER-DATA — User Engineering Data fallback for blocked vibration masters

## Recovery header

- Source task: Owner direction following #450 / merged #484/#485
- Branch: `agent/vibration-user-engineering-data`
- Base: `main@638af071b70d4b27676ba385004382aa0a5a35e6`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Recovery state: CONTINUE
- Coordination: COORDINATION_REQUIRED but no exact-file overlap found with active #499/#480/#483
- Merge authority: OWNER_ONLY / NOT AUTHORIZED

## Mission

Replace master-data dead ends with an explicit, fail-closed **User Engineering Data** path. When a governed vibration master is unavailable, a user may enter the required project-specific value/table row in a separate Vibration Integrity tab. User entries remain project evidence and must never be promoted silently to engineering master, screening, or design authority.

First concrete consumer boundary: SBC T3 curve-dependent values for Figures T3-1...T3-4. The generic contract must also support future valve-transient, cavitation, thermowell and other blocked-data requests without embedding numerical defaults.

## Protected invariants

- governed/active master value wins when available;
- user data is used only through an explicit resolver request;
- exact matching only; no nearest-row lookup, interpolation or extrapolation;
- missing, invalid or duplicate/ambiguous rows fail closed as NOT_READY / AMBIGUOUS;
- every user row carries mechanism, blocker ID, scope/record identity, value/unit and source/basis fields;
- user data authority = `USER_SUPPLIED_PROJECT_INPUT` only;
- `engineeringAuthority = NONE`, `screeningAuthority = NOT_AUTHORIZED`, `designAuthority = false`;
- no changes to FIT/AIV equations, current AIV authority, master/source-register files or active PR branches.

## Appendix A — implementation authorization

### A1 Production trace — 19/20

Current Vibration Integrity UI is `tabs/vibration-integrity-tab.js` -> `tabs/vibration-integrity-view.js`; only FIT is executable. SBC is explicitly `NOT_IMPLEMENTED` in `tabs/vibration-integrity-mechanisms.js`. Merged #484 provides non-curve SBC candidate tables/rules while #485 leaves T3-1...T3-4 curve geometry blocked.

### A2 Failure isolation — 20/20

The immediate blocker is not an equation defect: required plotted/master values may be unavailable. Forcing guessed/digitized values would violate #450 anti-drift rules. The safe alternative is an explicit project-input contract with exact-match resolution and visible provenance.

### A3 Authority / invariant — 20/20

User-entered values cannot become master authority, cannot silently override a governed value, and cannot authorize screening/design. No interpolation/extrapolation is permitted by the generic resolver.

### A4 Independent validation — 18/20

Planned tests use synthetic user rows and independent expected resolver states: governed-master precedence, exact-match success, mismatch NOT_READY, duplicate AMBIGUOUS, invalid numeric rejection and UI/static wiring. No retained EI target is used as an oracle.

### A5 Minimal patch — 19/20

New generic model/resolver + new UI view + focused controller/view wiring + tests. Existing source/master datasets remain untouched.

**Qualification: 96/100; minimum 18/20 — PASS.**

## Validation ledger

- Live main / overlap grounding: PASS by GitHub inspection
- Pre-edit backups via `node utils/backup.js`: NOT_RUN / connector-only runtime; exact pre-edit Git blob SHAs will be recorded before each existing-file edit as rollback evidence
- Native Node tests: NOT_RUN
- Browser acceptance: NOT_RUN

## EXACT_NEXT_ACTION

Create the generic user-data contract/resolver and editable User Engineering Data tab, wire minimal controller/view state, add focused regressions, reconcile exact branch diff to current main, open a draft PR, and keep all runtime validation truthfully classified.
