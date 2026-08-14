# PR485 — SBC Figures T3-1…T3-4 Digitization

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: 9cbb17aef922b8b6485862017dec001a26db9170
REPORT_BASIS_HEAD: 9cbb17aef922b8b6485862017dec001a26db9170
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR485-001
CURRENT_STAGE: Stage 2 — PR allocation / figure-source qualification
CURRENT_BLOCKER: exact controlled EI PDF bytes cannot currently be rendered in this runtime
HIGHEST_RISK: publishing visually digitized curve points without reproducible axis calibration, independent second-pass agreement, or controlled-source reconciliation
EXACT_NEXT_ACTION: locate readable EI 2nd-edition copies of Figures T3-1…T3-4 and capture exact titles, pages, axes, units/scales and series labels from PDF screenshots before any point digitization; hard-stop if any figure is not resolution-qualified.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #485
Branch: `agent/vibration-t3-span-curve-digitization`
Source issue: #450
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE` — #484 explicitly excludes Figures T3-1…T3-4; no other live curve-digitization PR found.

## Mission

Recover Figures T3-1…T3-4 as a governed piecewise point dataset with explicit figure/series identity, axis calibration, interpolation rule, source provenance, two independent digitization passes, reconciliation evidence, and forbidden extrapolation.

Target:
```text
docs/Masters/Vibration/ei-aviff-t3-sbc-span-curves.candidate.json
```

Required process:
```text
pinned source page
→ deterministic high-resolution render
→ identify axes / units / linear-vs-log scales
→ digitization pass A
→ independent digitization pass B
→ compare points
→ engineering reconciliation
→ publish piecewise point dataset
```

## Controlled source

```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
execution/render status = BLOCKED_ENVIRONMENT
```

Secondary/public copies may be used only for figure navigation, calibration feasibility and candidate digitization. They do not satisfy the controlled-source reconciliation gate.

## Scope

IN:
- Figures T3-1, T3-2, T3-3, T3-4 only;
- exact title/page/axis/scale/series identification;
- deterministic pixel-to-axis calibration;
- two independent digitization passes;
- point-by-point reconciliation and tolerance receipt;
- piecewise interpolation only where justified by graph semantics;
- extrapolation forbidden;
- candidate/provenance/test artifacts.

OUT:
- non-curve T3 tables/rules already in #484;
- polynomial or fitted surrogate equations;
- production SBC calculator integration;
- T2.8/T2.9/T4 changes;
- #452 Markdown/v1 path;
- workflows/dependencies;
- authority promotion;
- merge.

## Authority Freeze

```text
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
masterValuesPublished = false
publicationState      = CANDIDATE at maximum
qualificationStatus   = NOT_QUALIFIED until controlled-source reconciliation
```

## Hard-stop criteria

Stop candidate point publication if any figure lacks:
- readable x/y axis labels and units;
- confirmed linear/log scale;
- distinguishable series labels/curves;
- reproducible calibration anchors;
- sufficient source image resolution for the recorded digitization tolerance;
- independent pass-B agreement within a predeclared tolerance.

## Validation contract

Every material check records STATUS / OBSERVATION / ORACLE. Image-based candidate digitization is not engineering authority by itself; controlled source remains separately required.

## Appendix A

`APPENDIX_A_STATUS: CURRENT`

A1 trace every series/point to exact figure/page; A2 prove axis/series identity before digitizing; A3 preserve candidate/control/authority separation; A4 independently reproduce digitization using separate pixel picks/calibration; A5 minimal patch contains curve candidate + provenance/reconciliation + focused validation only.

## Roadmap

1. Report initialization — COMPLETE.
2. Draft PR allocation/report migration — IN_PROGRESS.
3. Figure-source qualification: titles/pages/axes/scales/series/resolution.
4. Digitization pass A.
5. Independent digitization pass B.
6. Reconciliation/tolerance decision.
7. Candidate/provenance/test commit if and only if hard-stop criteria pass.
8. Controlled-source reconciliation remains separate.

No merge is authorized.
