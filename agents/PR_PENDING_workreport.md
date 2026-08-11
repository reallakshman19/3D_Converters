# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Add a small dependency-free web tool under `engineering/hp-class-standardization/` for ASME B31.3-2024 Chapter IX piping-class standardization, publish it on one draft PR, and maintain the engineering handover. |
| Source task / issue | User-directed engineering tooling task, 2026-08-11. |
| PR number | PENDING |
| Branch | `agent/hp-class-standardization-tool` |
| Base commit | `4530b4a98c3b6d6713665228bf3ca8e953a95018` |
| Current HEAD | Base commit before report/tool changes |
| PR status | NOT_OPENED |
| Current stage | Stage 1 — report initialization + technical findings |
| Last completed stage | Prior B31.3-2024 source/method validation |
| Engineering status | IN_PROGRESS |
| Validation status | B31.3-2024 class process validated; web-tool validation NOT_RUN |
| Current blocker | No licensed BPVC VIII-3 KD-2/KD-3 equations/fatigue curves are available, so the tool must not invent authoritative `Seq` or `Ni`. |
| Exact next action | Implement the static tool, run focused checks, update this report, open a draft PR, then rename the report to the allocated PR number. |

## Handover in 60 Seconds

- **What is now true:** scope stops at piping-class standardization/class release. The class chain is `K302.3 -> K304.1.1 -> K304.1.2 -> K304.8.3 -> K304.8.2 -> BPVC VIII-3 KD-2/KD-3 -> class envelope`.
- **What is being worked on:** a GitHub-hostable calculator that computes the B31.3-2024 class-side quantities and keeps licensed KD `Seq`/`Ni` as explicit controlled entries.
- **What remains unfinished:** production files, focused validation, draft PR, report rename/synchronization, and licensed KD numerical closure.
- **What must not be assumed:** `Delta Sp/2` is not automatically final `Seq`; generic fatigue curves are not Code authority; `-12.5%` tolerance is not universal; nominal OD is not automatically the controlling Chapter IX design diameter.
- **Highest-risk remaining item:** `RISK-001` — unsupported KD data being mistaken for Code-authoritative fatigue life.
- **Exact next action:** implement and validate the static class calculator without hidden fatigue defaults.

## Mission and Engineering Intent

### Mission

Expose the validated ASME B31.3-2024 Chapter IX piping-class standardization method as a dependency-free HTML/CSS/JavaScript tool suitable for GitHub Pages or any static host.

### User / Engineering Consequence

The tool should make standard class pressure-design and pressure-fatigue inputs repeatable and auditable while preventing an engineer from mistaking a partial B31.3 calculation for full BPVC VIII-3 fatigue qualification.

### Scope

Included:

- K302.3 material/strength inputs.
- K304.1.1 allowances/minimum-wall control.
- K304.1.2 straight-pipe internal-pressure wall, 2024 Eq. (34a) OD/minimum-wall route.
- Eq. (35a) pressure-rating QA for a selected minimum wall.
- K304.8.3 Eq. (37) pressure-stress endpoints/range.
- K304.8.3(c) `2*Syt` elastic/inelastic gate.
- Candidate nominal-wall comparison.
- Explicit licensed-KD input fields for `Seq` and `Ni` and usage `n/Ni` when `Ni` is supplied.
- CSV export and print.

Excluded:

- Actual line routing/support/thermal-flexibility analysis.
- Project-system CAESAR modeling.
- Local component FEA.
- Vibration/HCF final assessment.
- Embedded proprietary/licensed KD fatigue equations or curves.
- Automatic universal PQ-A/final system acceptance.

### Governing Engineering Principles

1. Static pressure design and fatigue qualification are separate gates.
2. Guaranteed/minimum dimensions and actual purchase tolerances are controlled inputs.
3. Preserve `Pmin`, `Pmax`, temperature, wall, material, geometry and cycle count.
4. K304.8.3 supplies pressure-stress information; K304.8.2 routes fatigue processing to BPVC VIII-3 KD-2/KD-3.
5. No hidden/default engineering authority.
6. No candidate wall is released merely because static pressure and Eq. (37) checks pass.
7. The class claim must remain bounded.

### Important Constraints

- B31.3-2024 connected source: `reallaksh19/Common`, commit `00f47512e96780ebab10416dcc9354f719346457`, PDF blob SHA `3395ececce7731053dd0f6317008b4cd77446b78`.
- Reporting protocol: `CodingRules.md`, commit `43eccc27967ecec7d67513c08255398b496be5ce`.
- Target repo/base: `reallaksh19/3D_Converters` at `4530b4a98c3b6d6713665228bf3ca8e953a95018`.
- No lowercase `engineering/` path was present on the inspected base; this PR creates it as explicitly requested.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Validate B31.3-2024 source artifact | HIGH | VALIDATED | Prior | Connected commit/blob recorded |
| Correct 2024 K304.1.2 basis | HIGH | VALIDATED | Prior | Eq. (34a) P/S exponential route |
| Correct K304.8.3(c) gate | HIGH | VALIDATED | Prior | `S > 2*Syt` escalation basis |
| Stop at class release | HIGH | ACCEPTED | Prior | Explicit scope decision |
| Initialize living report | HIGH | IN_PROGRESS | 1 | This file |
| Implement static calculator | HIGH | NOT_STARTED | 4 | Planned production files |
| Run focused validation | HIGH | NOT_STARTED | 5 | Reference values defined below |
| Open draft PR | HIGH | NOT_STARTED | 6 | Branch created |
| Calculate licensed `Seq`/`Ni` internally | HIGH | BLOCKED | External | Licensed KD inputs unavailable |
| CAESAR benchmark | MEDIUM | DEFERRED | Future | Not required for class release |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | confirmed defect | HIGH | DONE | Earlier method omitted K304.1.2 before fatigue. | Historical |
| ISS-002 | confirmed defect | HIGH | DONE | Earlier method used older `1.155 P/S` pressure-wall form instead of validated 2024 basis. | Historical |
| ISS-003 | confirmed defect | HIGH | DONE | Earlier method used an outdated K304.8.3 escalation criterion. | Historical |
| RISK-001 | engineering/release risk | CRITICAL | BLOCKED | Unsupported KD equation/curve would invalidate a fatigue release claim. | YES |
| RISK-002 | engineering/release risk | HIGH | ACCEPTED | Treating `Delta Sp/2` as final `Seq` without licensed KD processing may be wrong. | YES |
| RISK-003 | engineering/release risk | HIGH | ACCEPTED | Using nominal OD or a universal product tolerance can alter pressure-design results. | YES |
| DEC-001 | deliberate decision | HIGH | ACCEPTED | Scope stops at piping-class standardization/class release. | YES |
| DEC-002 | deliberate decision | HIGH | ACCEPTED | CAESAR is not required in this PR. | YES |
| DEC-003 | deliberate decision | HIGH | ACCEPTED | No candidate wall is automatically PQ-A without controlled KD evidence. | YES |
| DEC-004 | deliberate decision | HIGH | ACCEPTED | Tool is dependency-free static HTML/CSS/JS with no hidden fatigue curve/default `Seq`/`Ni`. | YES |
| QST-001 | unresolved question | HIGH | BLOCKED | Exact BPVC VIII-3 edition paired to future production use. | External |
| QST-002 | unresolved question | HIGH | BLOCKED | Exact material/fatigue-curve category for production class release. | External |
| QST-003 | unresolved question | HIGH | BLOCKED | Exact licensed KD equivalent-alternating-stress rule/factors. | External |
| QST-004 | unresolved question | HIGH | BLOCKED | Exact licensed KD fatigue curve/data that determines `Ni`. | External |
| QST-005 | unresolved question | MEDIUM | BLOCKED | Actual purchase-spec OD/wall tolerances for production release. | External |
| IMP-001 | improvement opportunity | HIGH | ACCEPTED | Provide explicit controlled KD entry fields and source-reference fields. | YES |
| IMP-002 | improvement opportunity | MEDIUM | DEFERRED | Add CAESAR BM-01/BM-02 benchmark library after an independent KD engine is approved. | Future |

## Information Required to Close `Seq` and `Ni`

The tool will not hide this boundary. To calculate an auditable final `Seq`, the engineering process still needs: exact B31.3/BPVC VIII-3 editions; material specification/grade/product condition; cycle endpoints (`Pmin`, `Pmax`, endpoint temperatures); guaranteed minimum wall and `ci/co`; complete stress state/principal-stress information; associated mean stress as defined by the governing KD route; proportionality/principal-direction information where applicable; any SCF/local peak treatment; elastic/inelastic route; material properties and correction/penalty factors explicitly required by the selected KD equations; and exact equation/source identifiers.

To obtain `Ni`, the process additionally needs: final Code fatigue ordinate; exact material fatigue-curve category/identifier; curve equation or tabulated points; temperature applicability; any modulus/mean-stress/plasticity treatment required by that route; interpolation rule; valid range/limits; and actual cycle count `ni` for usage.

## Stage Roadmap and Stage Protocol

### Stage 1 — Report Initialization + Technical Findings

**Current truth:** target branch exists from the exact current `main` base. Production files are not yet added.

**Objective:** record engineering authority, risks and implementation roadmap before production changes.

**Expected scope/files:** `agents/PR_PENDING_workreport.md` only.

**Engineering rationale:** calculation behavior must not precede documentation of Code limits and missing licensed authority.

**Planned validation:** verify branch/base and existing `agents/` convention.

**Known risks:** `RISK-001` to `RISK-003`.

### Stage 2 — PR Allocation + Report Synchronization

After the PR number is allocated, rename this file to `agents/PR<NUMBER>_workreport.md` and refresh current-state sections.

### Stage 3 — Changed-File / Repository-State Verification

Verify the new engineering path does not collide with existing production paths and confirm no unrelated files are changed.

### Stage 4 — Static Tool Implementation

Expected files:

- `engineering/hp-class-standardization/index.html`
- `engineering/hp-class-standardization/styles.css`
- `engineering/hp-class-standardization/app.js`
- `engineering/hp-class-standardization/README.md`

Expected behavior:

- Inputs: `D`, `Pdesign`, `Pmin`, `Pmax`, `S`, `Syt`, `ci`, `co`, wall tolerance, cycles, candidate walls.
- Calculate K304.1.2 Eq. (34a), K304.1.1 `tm`, nominal wall required for entered tolerance, Eq. (35a) pressure rating, Eq. (37) `Sp` at pressure endpoints/range, half-range descriptor and `2*Syt` gate.
- `Seq`/`Ni` are user-controlled licensed-KD entries, never hidden defaults.
- If positive `Ni` is supplied, calculate `Ui = ni/Ni`; status remains engineering-review controlled.
- Export CSV and print.

Edge cases:

- invalid/nonpositive dimensions or material stress;
- `T-c <= 0`;
- invalid Eq. (35a) logarithm domain;
- `Pmax < Pmin`;
- missing/invalid candidate walls;
- missing KD entries.

### Stage 5 — Focused Validation

Planned checks:

- JavaScript syntax.
- No external dependencies/network calls.
- Independent reference calculations for 13.49, 17.12 and 22.00 mm candidates.
- Blank KD fields remain blocked/not-released.
- Entered `Ni` computes usage only; no hidden fatigue curve.
- CSV export serialization and print handler inspection.

### Stage 6 — Draft PR Publication + Final Synchronization

Open draft PR, rename report, compare actual PR changed files with the ledger, and update validation/handover.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living mission control/handover | YES | PASS — created before production implementation |
| `engineering/hp-class-standardization/index.html` | 4 | 4 | Calculator UI | YES | NOT_RUN |
| `engineering/hp-class-standardization/styles.css` | 4 | 4 | Responsive presentation | NO | NOT_RUN |
| `engineering/hp-class-standardization/app.js` | 4 | 4 | Calculation/export behavior | YES | NOT_RUN |
| `engineering/hp-class-standardization/README.md` | 4 | 4 | Engineering basis, limits and usage | YES | NOT_RUN |

No unrelated files are authorized.

## Engineering Decisions and Invariants

### DEC-001 — Class Boundary

**What must remain true:** this tool standardizes bounded class pressure/fatigue inputs; it does not perform final routed-system fatigue acceptance.

**Where enforced:** UI scope notice, README, release-status logic.

**How validated:** no routing/support/thermal system inputs or acceptance path.

**Whether this PR changes it:** no; it implements the boundary.

### DEC-004 — No Hidden KD Authority

**What must remain true:** no BPVC VIII-3 `Seq`, fatigue curve, `Ni`, or final Code acceptance is invented.

**Where enforced:** explicit licensed-KD entry fields and blocked status when missing.

**How validated:** code inspection and blank-KD test.

**Whether this PR changes it:** this PR creates the first web implementation.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| JavaScript syntax check | NOT_RUN | PENDING | Run after Stage 4 |
| Static HTML/CSS/JS smoke check | NOT_RUN | PENDING | Run after Stage 4 |
| No-external-dependency inspection | NOT_RUN | PENDING | Run after Stage 4 |
| CSV/print behavior inspection | NOT_RUN | PENDING | Run after Stage 4 |
| PR changed-file comparison | NOT_RUN | PENDING | Run after draft PR creation |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| B31.3-2024 source identity | PASS | Connected Common commit/blob recorded above |
| 2024 K304.1.2 process | PASS | Eq. (34a) P/S exponential basis |
| Eq. (35a) QA route | PASS | Planned production calculation |
| K304.8.3 Eq. (37) route | PASS | Planned production calculation |
| `2*Syt` gate | PASS | Planned production calculation |
| No automatic final `Seq` | NOT_RUN | Validate after implementation |
| No automatic final `Ni` | NOT_RUN | Validate after implementation |
| Final licensed KD fatigue life | NOT_RUN | External licensed data absent |

### Explicitly Not Validated

- Exact production Table K-1/K-1C material row/value.
- Exact production `Syt`.
- Actual product OD/wall tolerance.
- Exact BPVC VIII-3 edition and KD equations.
- Exact KD fatigue curve, `Seq`, `Ni`, cumulative usage.
- Final PQ-A class release.

## Known / Deferred Work and Forward Sequence

### Open risks

`RISK-001`, `RISK-002`, `RISK-003`.

### Open engineering questions

`QST-001` through `QST-005`.

### Recommended Forward Sequence

1. Implement this static class calculator with visible authority boundaries.
2. Validate against independent numeric reference cases.
3. Publish the draft PR and synchronize the work report.
4. In a later engineering change, obtain controlled BPVC VIII-3 data and close one straight-pipe KD case independently.
5. Only then consider an optional CAESAR benchmark.

## Process Notes / Lessons Learned

- Chapter IX equation forms are edition-sensitive; plausible older formulas must not be reused without edition verification.
- A referenced external Code is an authority boundary, not permission to invent missing coefficients or curves.
- “Not checked” must remain “not checked”; blocked engineering evidence is preferable to a false pass.
- Class prequalification and final piping-system fatigue are different deliverables.

## Next-Agent Handover

### Current stopping point

Branch is created and the pre-implementation report is being established. Production tool files have not yet been added.

### PR / branch / HEAD

- PR: PENDING
- Branch: `agent/hp-class-standardization-tool`
- Base/current pre-change HEAD: `4530b4a98c3b6d6713665228bf3ca8e953a95018`

### Last completed stage

Prior B31.3-2024 source/method validation.

### Current active stage

Stage 1, then Stage 4 implementation.

### Start here

Add the four files under `engineering/hp-class-standardization/` using the equations and authority boundaries above, run the focused checks, update this report, open the draft PR, then rename the report to the actual PR number.

### Do not redo

- Do not reintroduce actual-system analysis.
- Do not use the older `1.155 P/S` Eq. (34a) form.
- Do not replace the `2*Syt` gate with an older criterion.

### Do not assume

- `Delta Sp/2 == Seq`.
- A generic fatigue curve is acceptable.
- CAESAR FAT is KD compliance.
- `-12.5%` is universal.
- nominal OD is the controlling purchase-spec maximum dimension.

### Files currently involved

- `agents/PR_PENDING_workreport.md`
- `engineering/hp-class-standardization/index.html`
- `engineering/hp-class-standardization/styles.css`
- `engineering/hp-class-standardization/app.js`
- `engineering/hp-class-standardization/README.md`

### Known failing checks

None; production checks are currently NOT_RUN.

### Validation still required

Tool syntax/smoke/reference checks, PR file-ledger comparison, and all externally controlled licensed KD items listed above.

### Open QST-* items

`QST-001` through `QST-005`.

### Important deferred IMP-* items

`IMP-002` optional CAESAR BM-01/BM-02.

### Highest-risk remaining item

`RISK-001` — unsupported KD values being presented as Code authority.

### Exact next recommended action

Implement `engineering/hp-class-standardization/app.js` and its UI/README without any licensed-fatigue default data.

### Required reading

- B31.3-2024 Chapter IX: K302.3, K304.1.1, K304.1.2, K304.8.1, K304.8.2, K304.8.3.
- Governing BPVC VIII-3 KD-2/KD-3/KD-4 when future licensed data are available.
- `CodingRules.md` at commit `43eccc27967ecec7d67513c08255398b496be5ce`.
