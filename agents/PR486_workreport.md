# PR486 — Generic Vibration Master Source Register / Extractor

## Recovery header

- Source task: #450
- PR / branch: `#486` / `agent/vibration-master-source-extractor`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Initial PR head: `85af3a1274aef10a9d7fedc8ce60e6b62c9a16d3`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: CONTINUE
- Coordination: COORDINATION_REQUIRED
- Authority invariant: source identity / locator / extraction evidence only; no numerical master values or authority promotion.

## Mission

Implement the next independent #450 rung after PR #483: a program-level vibration master source register contract plus a generic fail-closed controlled-PDF extractor that generalizes the proven AIV `pdftotext -layout` pattern.

This work must not revive superseded PR #452 behavior, must not duplicate DocumentEvidence v2 table extraction from #470/#480, and must not publish SBC/T2.8/T2.9/T4 values.

## Live grounding

Current main at allocation: `36748e381012bb52ba720cc288101948115721bb`.

Relevant live/open PR boundaries:
- #480 owns SBC source inventory / DocumentEvidence recovery planning.
- #483 owns `VibrationMaster.v1` registry/resolver framework.
- #471 owns bounded T2.8 candidate evidence.
- #479 owns FIT reproducibility/release closure.

No active PR has exact-file claims on the planned files below. Conceptual source-governance overlap with #480 requires explicit separation: PR486 provides generic program-level source register/extraction machinery; #480 remains the SBC target inventory and future reviewer-selected DocumentEvidence path.

## Appendix A — Implementation authorization

### A1 Production Trace — 19/20

Issue #450 requires exact source repository/commit/path/blob/size plus printed/PDF page, locator, extraction tool/version, page hashes and section hash before recovered master values can advance. Main already has a source-specific AIV extractor and DocumentEvidence v2 table transport, but no generic source-register/extractor contract.

### A2 Current Failure Isolation — 19/20

The missing capability is not a calculation equation. It is a reusable evidence boundary that can independently verify source bytes, extract deterministic layout text, validate explicit reviewer page selections/anchors, and emit hash-only source receipts without publishing licensed source text or engineering values.

### A3 Authority / Invariant — 20/20

Protected invariants:
- wrong Git blob or byte size hard fails;
- page selection is explicit, never guessed;
- required anchors fail on zero or unexpected occurrence count;
- extraction receipts publish hashes/metadata, not source text;
- private review text is optional/local only;
- DocumentEvidence v2 remains the table extraction/reconciliation transport;
- no candidate master is activated;
- no numerical/screening/design authority changes.

### A4 Independent Validation — 18/20

Synthetic PDF bytes/text pages and a fake `pdftotext` executable will exercise byte mismatch, deterministic page/section hashing, anchor ambiguity/missing behavior, CLI output, private-review separation, source-register state validation, and committed-register determinism. No retained EI expected value is used as an oracle.

### A5 Next-Commit / Minimal Patch — 19/20

New files only:
- `scripts/vibration-master-source-register.mjs`
- `scripts/extract-vibration-master-source.mjs`
- `docs/Masters/Vibration/source-register.json`
- `tests/vibration-master-source-extractor.test.mjs`
- this handoff file.

No existing production file needs modification for this rung.

**Qualification score: 95/100; minimum challenge 18/20 — PASS.**

## Active hypothesis / falsifier

**Hypothesis:** generic source identity/locator/hash evidence can be implemented independently of source-specific numerical values and independently of the DocumentEvidence table parser.

**Falsifier:** if implementation requires guessing a PDF page, source table value, interpolation rule, or calculation authority, stop and narrow the scope.

## Intended source-register boundary

`VibrationMasterSourceRegister.v1` records target identity, mechanism, expected source data type, explicit lifecycle state, pinned controlled source identity where known, and nullable locator fields only when not yet reconciled. Missing locator fields never imply a state; the state is explicit.

Initial entries cover the #450 program targets at source-governance level only. Ambiguous/unrecovered targets remain `RECONCILIATION_REQUIRED` or `BLOCKED_SOURCE`; no guessed locator/value is introduced.

## Planned changed-file ledger

- `scripts/vibration-master-source-register.mjs`
- `scripts/extract-vibration-master-source.mjs`
- `docs/Masters/Vibration/source-register.json`
- `tests/vibration-master-source-extractor.test.mjs`
- `agents/PR486_workreport.md`

Pre-PR WIP to retire after PR handoff is durable:
- `agents/WIP-VIBMASTER-SOURCE-EXTRACTOR_workreport.md`

## Validation ledger

- live main grounding: PASS / GitHub commit inspection / authoritative repository state
- active overlap check: PASS with coordination boundary / PR file-ledger inspection
- AIV extractor precedent inspection: PASS
- DocumentEvidence v2 boundary inspection: PASS
- Appendix A implementation authorization: PASS 95/100
- focused Node tests: NOT_RUN
- CLI extraction test: NOT_RUN
- committed source-register determinism: NOT_RUN
- exact controlled EI PDF extraction: NOT_RUN (not required to validate generic machinery)
- numerical master reconciliation: NOT_APPLICABLE
- browser validation: NOT_APPLICABLE

## Negative assurance

Must remain unchanged:
- all vibration numerical kernels;
- AIV screening authority;
- FIT authority;
- #480 inventory/evidence selections;
- #471 T2.8 candidate values/evidence;
- DocumentEvidence v2 transport contracts;
- engineering UI behavior.

## Highest risk

A generic extractor could accidentally become a second table parser or permit implicit page/anchor guessing. The implementation must keep explicit reviewer page/anchor selection and emit only deterministic extraction evidence.

## EXACT_NEXT_ACTION

Implement the two new source-governance modules, seed the value-free program source register, add synthetic/fake-`pdftotext` regression coverage, run focused Node and CLI tests locally, publish exact tested blobs to PR486, then update this report with executed evidence and retire the WIP file.