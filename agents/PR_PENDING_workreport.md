# Issue #450 — Vibration Master Source Inventory Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the controlled source-inventory gate required by issue #450 as the first production step toward governed vibration master-data recovery. |
| Source task / issue | `reallaksh19/3D_Converters#450` |
| PR number | `PENDING` |
| Branch | `agent/vibration-master-source-inventory` |
| Base commit | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current HEAD | report initialization commit pending GitHub response |
| PR status | NOT_OPENED |
| Current stage | Stage 1 — Report initialization + technical findings |
| Last completed stage | None |
| Engineering status | INVESTIGATING |
| Validation status | NOT_RUN |
| Current blocker | Controlled EI PDF bytes are not present in this repository; the implementation must require the caller to supply the exact pinned binary and must fail closed on any other bytes. |
| Exact next action | Allocate the draft PR, synchronize this report to its PR number, then verify repository state before production implementation. |

## Handover in 60 Seconds

### What is now true

Issue #450 explicitly requires `scripts/inventory-vibration-master-sources.mjs` and `ValidationRecords/VibrationMasters/source-inventory-v1.json` as the immediate first action. The controlled governing source is pinned in `reallaksh19/Common` at commit `fb549185b9b27edc2379734240320a85c5bef9f6`; `EI - AVIFF Guidelines 2nd Edition.pdf` is Git blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, size `10,348,594` bytes.

### What is being worked on

A deterministic, fail-closed source inventory that verifies the exact source bytes, extracts layout-preserved PDF text, locates the source sections/tables/figures needed by #450, classifies text-vs-figure recovery work, and writes hash/source-locator evidence only.

### What remains unfinished

No production code has been changed yet. No exact controlled-PDF extraction has been executed by this PR yet. No master values have been published.

### What must not be assumed

Public mirrors may assist navigation only. They are not source authority. Worked-example values are not master-generation input. Source discovery does not authorize screening or design use.

### Highest-risk remaining item

False source confidence: accepting a same-title/re-exported PDF, ambiguous section heading, or mirror-derived locator as authoritative would violate the issue's anti-drift requirements.

### Exact next action

Create the draft PR from this report-only branch, rename/synchronize the work report, then inspect the exact baseline files used by existing AIV controlled-source extraction before implementing the inventory.

## Mission and Engineering Intent

### Mission

Deliver the first executable gate in issue #450: a reproducible inventory of controlled EI source availability and locator readiness for the remaining vibration mechanisms.

### User / engineering consequence

The inventory determines which master-recovery work can proceed from a pinned controlled source and which work must remain `BLOCKED_SOURCE`. It prevents engineering tables, curves, rules, or equations from being created from memory, retained target values, or uncontrolled web copies.

### Scope

Current PR scope:

- exact source Git-blob and byte-size verification for the governing EI PDF;
- deterministic `pdftotext -layout` extraction;
- source section/table/figure discovery for the master families named in #450;
- classification of text/table/rule material versus figure/image digitization work;
- stable source inventory schema/output;
- focused tests for source-byte mismatch, locator ambiguity, missing anchors, and classification behavior;
- package command and work-report/evidence updates required to make the capability usable.

### Governing engineering principles

- Controlled source bytes are mandatory before authoritative extraction.
- Missing/ambiguous locators fail closed.
- Public mirrors are navigation/reconciliation assistance only.
- No reverse engineering from benchmark targets.
- Inventory/extraction does not grant numerical, screening, or design authority.
- No silent fallback or fuzzy source matching.

### Explicit non-goals

- No production SBC, valve-transient, cavitation/flashing, thermowell, reciprocating/PD, rotating-stall, corrugation, slug, or advanced-deadleg calculator in this stage.
- No curve digitization values in this stage.
- No active/published master promotion.
- No `.github/workflows/*` changes.
- No authority transition.

### Important constraints

Follow `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`. New JS modules should normally remain under 300 physical lines and functions under 40 logical lines. New abstractions must have a real production consumer in the same PR.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

This PR does not change those boundaries.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Living work report | P0 | IN_PROGRESS | 1 | `agents/PR_PENDING_workreport.md` |
| Draft PR allocation / report synchronization | P0 | NOT_STARTED | 2 | pending |
| Baseline changed-file/repository verification | P0 | NOT_STARTED | 3 | pending |
| Controlled source inventory script | P0 | NOT_STARTED | 4 | issue #450 immediate action |
| Focused source-inventory tests | P0 | NOT_STARTED | 4 | pending |
| Source inventory evidence record | P0 | NOT_STARTED | 5 | `ValidationRecords/VibrationMasters/source-inventory-v1.json` planned |
| Exact controlled-PDF execution | P0 | NOT_STARTED | 5 | requires exact pinned PDF bytes |
| Release/authority review | P1 | NOT_STARTED | 6 | authority remains frozen |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-001 | Risk | P0 | ACTIVE | Same-name or re-exported EI PDF must never pass source identity. | YES |
| RISK-002 | Risk | P0 | ACTIVE | Mirror-derived page/table text must never become source authority. | YES |
| RISK-003 | Risk | P0 | ACTIVE | T3-1…T3-4 require image/curve recovery; text extraction alone is insufficient. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | Inventory output is evidence/readiness only and cannot promote engineering authority. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Exact source identity is `Common@fb549185…`, blob `9d3e…bdc5`, 10,348,594 bytes. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Public-mirror text may seed locator expectations only; exact controlled extraction must independently confirm them. | YES |
| QST-001 | Question | P0 | INVESTIGATING | Exact PDF page offsets versus printed-page numbering must be established from the pinned binary, not inferred from mirror pagination. | YES |
| QST-002 | Question | P1 | INVESTIGATING | T2.8/T2.9 table/equation locators need exact controlled-source confirmation before master extraction begins. | YES |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

**Current truth**

- Base main is `c8aa2786e08a7669b913d0a055ad4c15c6d36b0e`.
- Issue #450 defines the source inventory as the immediate first action.
- Existing AIV source extraction already demonstrates byte verification + `pdftotext -layout` + hash-manifest patterns.
- Controlled EI source metadata is known; exact PDF bytes are external to this repository.

**Objective**

Establish durable mission control, findings, risks, scope, authority freeze and implementation sequence before production changes.

**Expected scope/files**

- `agents/PR_PENDING_workreport.md`

**Engineering rationale**

The coding protocol requires the work report before production implementation, and this issue is engineering-evidence-sensitive.

**Planned implementation**

Create this report, then allocate a draft PR so subsequent commits remain on one traceable PR.

**Expected behavior**

A new agent can identify the source task, authority boundary, immediate implementation stage and blockers without conversation history.

**Edge cases**

PR number is not yet assigned; the report must be renamed immediately after allocation.

**Planned validation**

Confirm branch/base identity and inspect actual PR changed-file list after allocation.

**Known risks**

None beyond report synchronization drift.

### Stage 2 — PR allocation + report synchronization

Create the draft PR, rename this file to `agents/PR<NUMBER>_workreport.md`, and update mission control with the assigned PR and current HEAD.

### Stage 3 — Changed-file / repository-state verification

Verify baseline source-extraction patterns, package scripts, existing validation conventions, and actual changed files before touching production code.

### Stage 4 — Controlled source inventory implementation

Implement the smallest production-capable inventory path and focused regression tests. The command must require a supplied controlled PDF path, verify Git blob + size, locate required anchors deterministically, and fail closed on ambiguity/missing anchors.

### Stage 5 — Inventory execution + evidence

Run against the exact controlled source when bytes are available in the execution environment. Write `ValidationRecords/VibrationMasters/source-inventory-v1.json` with source identity, locator/classification results, hashes, tool version, and unchanged authority. If exact source execution is unavailable, record `NOT_RUN` rather than manufacturing a PASS.

### Stage 6 — Closure / handover

Run focused checks, reconcile changed-file ledger, update PR/report, document remaining blocked master-recovery stages, and leave the PR draft unless explicitly instructed otherwise.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living engineering work report before production code. | YES | repository/PR verification pending |

## Engineering Decisions and Invariants

### DEC-001 — Inventory is not authority

**What must remain true:** source location/extraction readiness cannot itself grant calculation, screening, or design authority.

**Where enforced:** inventory schema/qualification fields and work-report authority freeze.

**How validated:** focused tests will assert frozen authority fields and no production master publication.

**Does this PR change it:** No.

### DEC-002 — Exact source bytes before authoritative extraction

**What must remain true:** expected Git blob and expected byte size must both match the supplied PDF before source extraction can be accepted.

**Where enforced:** planned source identity assertion in the inventory script.

**How validated:** wrong-blob and wrong-size regression cases.

**Does this PR change it:** It adds enforcement for the new inventory path without changing existing AIV behavior.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Branch/base verification | NOT_RUN | n/a | pending Stage 2/3 |
| Focused inventory unit tests | NOT_RUN | n/a | pending Stage 4 |
| Inventory command synthetic fixture | NOT_RUN | n/a | pending Stage 4 |
| Exact controlled-PDF inventory execution | NOT_RUN | n/a | pending Stage 5 |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Controlled source repository/commit/path identified | PASS | issue #450 + GitHub source metadata |
| Controlled source Git blob identified | PASS | `9d3eccc56429411e17c07a579bdebbd13cb0bdc5` |
| Controlled source byte size identified | PASS | `10,348,594` bytes |
| T3 source family exists in 2nd edition | PASS for navigation only | public-mirror navigation; exact source extraction still pending |
| T3-1…T3-4 require figure/curve recovery | PASS for classification | issue #450 + mirror navigation; exact source hash pending |
| Exact printed/PDF page mapping | NOT_RUN | requires controlled extraction |

### Explicitly Not Validated

- exact page hashes for any pending master source;
- exact PDF page offsets for printed T3/T4/T2.8/T2.9 pages;
- any recovered numerical table value;
- any digitized curve point;
- any screening/design authority.

## Known / Deferred Work and Forward Sequence

### Open risks

- `RISK-001` exact-byte substitution risk;
- `RISK-002` uncontrolled mirror contamination risk;
- `RISK-003` chart/text extraction insufficiency for T3 figures.

### Open engineering questions

- `QST-001` exact PDF-page mapping;
- `QST-002` exact controlled T2.8/T2.9 locator confirmation.

### Recommended Forward Sequence

1. Complete this source-inventory gate.
2. Recover/reconcile SBC text tables first because they unlock deterministic table masters.
3. Digitize T3-1…T3-4 independently with recorded tolerance and reconciliation.
4. Recover T2.8 valve-closure characteristic data, T2.9 `FL`, and T4-1 `FM` only after exact source locators are pinned.
5. Build the generic master resolver only when at least one recovered master is production-consumed in the same PR/stage, preserving the CodingRules action-first gate.

## Next-Agent Handover

| Item | Current state |
|---|---|
| Current stopping point | Report-only branch; no production code changed. |
| PR / branch / HEAD | PR pending / `agent/vibration-master-source-inventory` / report initialization commit pending response |
| Last completed stage | None |
| Current active stage | Stage 1 |
| Start here | Allocate draft PR and synchronize report filename/state. |
| Do not redo | Source identity discovery from issue #450 and Common metadata. |
| Do not assume | Mirror text is authoritative; exact page mapping is known; source extraction has run. |
| Files currently involved | `agents/PR_PENDING_workreport.md` only |
| Known failing checks | None; checks not run yet. |
| Validation still required | All Stage 3–5 validation. |
| Open QST-* items | QST-001, QST-002 |
| Important deferred IMP-* items | None yet. |
| Highest-risk remaining item | Exact source bytes and locator anti-drift. |
| Exact next recommended action | Open draft PR, rename report, then inspect AIV extraction/test patterns and baseline changed files. |
| Required reading | issue #450; `Common@43eccc…/CodingRules.md`; `scripts/extract-aiv-ei-t27-source.mjs`; `scripts/extract-aiv-ei-d23-source.mjs` |

## Stage Execution Log

### Stage 1 — Report initialization + technical findings

**Implementation performed:** created the living report before production changes; recorded source identity, authority freeze, risks, decisions, open questions and staged roadmap.

**Changed files and reasons:** `agents/PR_PENDING_workreport.md` — required by governing CodingRules before production implementation.

**Deviations from plan:** none.

**Actual behavior / edge cases:** PR number remains pending until GitHub allocation.

**Validation performed:** source metadata cross-check only; code checks not yet applicable.

**New findings:** exact controlled binary is external to this repository, so the inventory command must accept a supplied PDF path and fail closed when absent/mismatched.

**Remaining risks:** RISK-001 through RISK-003.

**Stage decision:** PARTIAL — report exists; Stage 1 closes after PR allocation state is synchronized.

**Handover delta:** work is now durable in-repository and ready for PR allocation.
