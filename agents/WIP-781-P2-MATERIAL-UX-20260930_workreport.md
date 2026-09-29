# WIP-781-P2-MATERIAL-UX-20260930 — Issue #781 material suggestion presentation

## Basis

```text
ISSUE = #781
STEP = STEP-781-05
PLAN = IMPLEMENTATION_PLAN rev 1 / issuecomment-5893573324
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-781-p2-material-ux-20260930
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Current-head RCA

`xml-cii-adapted-preview-material-authority.js` already separates authoritative material code from review evidence. When process/Line List material exists but the fuzzy resolver does not meet the strong authority threshold, it deliberately returns:

- `materialCode: ''`;
- `materialCodeNeedsReview: true`;
- `materialCodeCandidates: [...]`;
- `materialCodeMatchedMaterial`, confidence, reasons and resolution method.

The editable Preview table currently renders the Material Code cell through the generic badge renderer using only `row.materialCode`, `row.materialCodeMethod`, review flag, and process material text. Therefore an intentionally blank authoritative `materialCode` displays only a generic review state; the already-computed candidate evidence is invisible.

The defect is presentation, not material authority resolution.

## Intended correction

Render the strongest existing `materialCodeCandidates[0]` directly in the Material Code cell when all of the following are true:

1. authoritative `row.materialCode` is blank;
2. `row.materialCodeNeedsReview === true`;
3. candidate evidence exists.

Example presentation:

```text
—
Suggested: 106 / A106-B
review required · 90%
```

The suggestion must remain visually distinct and must not be written into `row.materialCode`, config overrides, B31.3 input authority, or any persisted suggestion field.

## Preserve / falsifiers

- do not introduce `materialCodeSuggested` or another parallel authority state;
- do not promote candidate `106` merely because it is first-ranked;
- authoritative `materialCode` remains blank when the resolver says evidence is insufficient;
- B31.3 continues to fail closed for unresolved material authority;
- piping-class fallback remains governed by existing documented preconditions;
- existing manual material-code override remains explicit authority/review behavior.

## Acceptance targets

- AC-781-24: unresolved material displays candidate evidence without becoming calculation authority;
- AC-781-25: authoritative `materialCode` stays blank when evidence is insufficient;
- AC-781-26: B31.3 remains fail-closed for unresolved material authority;
- AC-781-27: no redundant suggestion field/state is introduced.

## Exact next action

Back up the editable Preview table/runtime mirror, add presentation logic that reads existing `materialCodeCandidates`, and qualify it against material-authority plus B31.3 fail-closed regressions.
