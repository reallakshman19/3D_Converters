# PR615 Stage 7 — Measurement-Driven Roadmap + Resizable Right Rail

## Scope

Stage 7 makes the existing non-binding vibration roadmap consume validated project measurement evidence and improves the right-side rail interaction.

```text
validated .vibproj measurementEvidence
  -> selected-line presentation state
  -> Basic Measurement / Specialist Measurement roadmap nodes

right rail
  -> collapse toward the right
  -> adjustable desktop width
```

No screening/applicability/result/RCA authority is created.

## Grounding

```text
WORK_INTENT       IMPLEMENT
CRITICALITY       ENGINEERING_CRITICAL
PR                #615
BRANCH            agent/vibration-eit-roadmap-20260818
START_HEAD        acdafae62987c89c8f4f43e2826e4589e50075a1
START_MAIN        eef94949961970171d1366f5b6a9d421b3cc0d9f
MERGE_AUTHORITY   NOT_GRANTED
```

PR615 already owns `converters/vibration/project/**`, `converters/vibration/roadmap/**`, and the three `tabs/vibration-roadmap-*` presentation paths. Active FIT/AIV/SBC workspaces and the shared Engineering Calculations tab remain excluded.

## Falsifier / acceptance

1. A selected-line measurement session must make `basic-measurement` display `DATA`, not RESULT/COMPLETE.
2. A derived signal product bound to that selected-line session must make `specialist-measurement` display `DATA`, not RCA or screening authority.
3. Evidence on another line must not light the selected line.
4. Explicit external roadmap states may overlay evidence state without evidence deciding applicability.
5. The right rail must expose a left-edge resize separator, clamp width, and collapse to a compact tab at the far right.
6. Keyboard resizing must be supported in addition to pointer drag.
7. Responsive stacked layouts must disable desktop resize behavior.

## Authority invariants

```text
MEASUREMENT_EVIDENCE_NE_SCREENING_RESULT
ROADMAP_DATA_STATE_NE_ASSESSMENT_COMPLETE
ROADMAP_RESIZE_NE_ENGINEERING_STATE
COLLAPSE_RESIZE_PRESENTATION_ONLY
NO_SHARED_TAB_MUTATION
NO_MECHANISM_WORKSPACE_MUTATION
```
