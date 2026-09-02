# Vibration Roadmap UI-012 — Viewport / Scroll / Visual Evidence Audit

STATE: BROWSER_EVIDENCE_RUNNING
BASELINE: PR #712 candidate `fe39c311cf1fa84ccb81fa1e75a53c30b33a14e1`
BRANCH: `audit/vibration-ui-012-viewport-20260902`
AUTHORITY: PRESENTATION_ACCESSIBILITY_AUDIT_ONLY

## Mission

Close UI-012 using rendered Chromium evidence rather than source inference.

Audit targets:

- intermediate desktop viewport heights;
- sticky rail containment;
- nested internal-scroll wheel handoff;
- focus scrolling into the internal rail viewport;
- horizontal clipping/overflow;
- keyboard focus indicator visibility;
- rendered color contrast via axe-core;
- responsive transition screenshots around 1180 px and 900 px.

## Viewport matrix

```text
1440 x 900
1280 x 720
1280 x 550
1181 x 640
1179 x 640
 899 x 700
 768 x 640
```

## Evidence package

The hosted workflow `Vibration Roadmap UI-012 Viewport Audit` produces:

- one full-page screenshot for every matrix viewport;
- a dedicated short-desktop nested-scroll handoff screenshot;
- `ui012-report.json` with measured geometry, focusability, focus indicators, color-contrast findings and scroll handoff observations.

The artifact is named `vibration-ui-012-browser-evidence`.

## Authority boundary

This audit does not determine engineering applicability, assessment completeness, screening/design authority, project persistence authority, calculation execution eligibility, or numerical correctness. The right rail remains guidance/linking only.

No production UI change is included in this audit branch. Any remediation must be driven by an observed browser finding and taken as a separately reviewable change.

## Current disposition

```text
source concern                   KNOWN
rendered browser audit           RUNNING
screenshot evidence              RUNNING
contrast evidence                RUNNING
scroll handoff evidence          RUNNING
production remediation           NOT_STARTED
```
