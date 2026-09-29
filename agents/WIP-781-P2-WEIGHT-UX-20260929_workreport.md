# WIP-781-P2-WEIGHT-UX-20260929 — Issue #781 Weight Match authority-state UX

## Basis

```text
ISSUE = #781
STEP = STEP-781-04
PLAN = IMPLEMENTATION_PLAN rev 1 / issuecomment-5893573324
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-781-p2-weight-ux-20260929
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Current-head RCA

The numerical lifecycle is already governed by `rigid-weight-authority.js`; this slice does not change it.

The shared Weight Match renderer currently pre-populates the weight field from the best candidate and labels the row `Proposed · Suggested`. That is technically non-authoritative until an explicit candidate click or field edit/confirm triggers persistence, but the presentation does not make the distinction sufficiently obvious. The same shared renderer is loaded by the XML→CII 2019 Standalone adapter.

Current transition in source:

```text
candidate displayed / field prefilled
  -> Proposed · Suggested
explicit candidate click OR edit/confirm
  -> Accepted · Match-1
```

The issue is therefore presentation/interaction semantics, not weight calculation or authority resolution.

## Required correction

Presentation must expose these states unambiguously:

```text
Candidate matched ✓ / Suggested weight: <value>
Engineering status: NOT ACCEPTED
[Accept as Match-1]

then after explicit acceptance:
Accepted Match-1 ✓
```

Existing candidate evidence such as method, confidence/rank, length delta, bore/rating context remains visible. Merely rendering or pre-filling a suggestion must not promote it.

## Non-goals / falsifiers

- do not change Final > Match-1 > legacy > source-XML resolution precedence;
- do not alter Match-1 provenance/fingerprint/staleness semantics;
- do not auto-accept a preferred/exact candidate merely because it was matched;
- do not make `Suggested` a numerical authority state;
- do not combine this slice with material-code or Mode B work.

## Acceptance targets

- AC-781-20: suggestion is visibly distinct from accepted Match-1 authority;
- AC-781-21: weight resolution precedence unchanged;
- AC-781-22: Match-1 provenance/fingerprint/staleness unchanged;
- AC-781-23: no displayed candidate is silently promoted.

## Exact next action

Back up the shared renderer + docs mirror, implement presentation-only state wording/explicit acceptance affordance, and qualify against existing weight-authority and deployment-parity regressions.
