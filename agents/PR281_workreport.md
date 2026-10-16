# PR281 — XML229 G0 offline consistency seam — recovery-first work report

**PR:** https://github.com/reallakshman19/3D_Converters/pull/281 (**OPEN / DRAFT**). **Parent:** #274, owner-intake #229, independent-Worker aim #226. **Base:** `main@9944a5bf521cb67dcabf887d8a5ccce61d4857d2`. **Candidate before this report commit:** `5b24c0631e9323669cb4869c699f2f7de67e7c99`; re-read live PR head after any change. **Owner instruction:** 2026-10-16 start implementation; no merge/deploy/native output authorization.

## Scope and status

A bounded read-only implementation, **not** production integration or engineering proof. New files only:
- `contracts/xml229-evidence-v1/audit.mjs` pure shape / cross-receipt structural inspector; non-authorizing
- `scripts/xml229-audit-evidence.mjs` offline CLI; exit 0=consistent submitted fields, 2=inconsistent, 3=incomplete, 1=invalid/read
- `tests/xml229-evidence-audit.test.mjs` seven synthetic positive/negative Node scenarios
- `docs/architecture/xml229-g0-evidence-audit.md` usage, trust limits, G0–G7 handoff
- `agents/WIP-XML229-G0EVIDENCE-20261016_workreport.md` original auditable takeover
- this PR-numbered report

There are no changes to main Worker/client, UI/DOM, scorer, Run/qualification logic, native converter, package scripts or CI workflows.

## Source-level findings (A1–A5)

A1: existing XML229 source receipt, complete Preview facts, GC-PW Match-1/Final, hashed intent, physical engine-input transfer and native-byte witness are **separate** contracts; the last two never attest native physical-slot consumption. A2: screenshot 41/423/2961 is complete fact **population**, not resolved mass; 0/0/0/423 weight counts need original `<Weight>` and candidate-coverage investigation; old main changes visible readiness DOM without canonical report update. A3: no joined false authority, no source/mass rewriting, no imaginary Final; no CII release from hash/byte witness. A4: local Node22.16.0 exact-file self-contained `node --test tests/xml229-evidence-audit.test.mjs`: **7/7 PASS**. Independently verified GitHub blob SHAs match local for audit, CLI, tests, docs and WIP report; **actual served browser, private source/master, native engine** = NOT_RUN. A5: next permitted change is a source-bound G0 evidence and agreed G1 contract shape, not a native gate bypass.

## Validation and current live constraints

- `PR281@5b24c063` generated GitHub Actions; earliest inspection showed several PASS, some IN_PROGRESS and some FAIL on repository-wide XML-CII/C05 workflows. **Exact final-head CI=NOT_VERIFIED; do not claim all green.** Recheck after this report-only commit and classify red jobs against main before accepting.
- Existing PRs: #273 open draft (mature UI); #276 open draft (integrated readiness); #278 and #279 merged **into #276 only**; #280 open draft on #276. No integration PR conflicts created by this isolated new-file change.
- G0 Owner asset hash/private input/candidate coverage, exact two Output error strings (#275), G1 approved receipt interface, G2 Worker performance, G3 review completion, G4 canonical UI, G5 actual native physical slot, G6 cutover, G7 Owner source-specific acceptance are **OPEN**.
- **Work-specific v3.6 `relay/AIM/<WORK>.yaml` and matching approved label-bound plan are not supplied.** Cannot claim canonical v3.6 task, child-issue evidence or qualified phase progression. Do not invent these. Owner/Coordinator HOLD, native governed Run gate and OWNER_ONLY merge remain.

## Highest risk and falsifier

This audit checks caller-supplied records; it does **not** re-hash live source/master bytes, validate cryptographic provenance of exported receipts, or prove native CII lineage. It always returns `authoritative:false` and `nativeCiiReleaseAuthorized:false`; even a structurally `CONSISTENT` result is not release approval. An actual current-basis evidence chain or Worker read may later differ; that does not justify changing the audit to output `ready` automatically.

**EXACT_NEXT_ACTION:** Reconcile final GitHub CI exact latest head and independently compare against untouched main for failing checks. Capture real Owner-served asset URL/hash, permitted redacted readiness export and candidate distribution. Obtain work-specific v3.6 label/plan and exclusive integrator/Worker/native write leases before any shared runtime or engineering semantics mutation. Post progress on #274, retain draft; no merge/deploy.
