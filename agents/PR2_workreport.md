# PR2 — Standalone restraint audit delivery

HANDOVER_READINESS: READY for delivery of the qualified audit/opt-in software profile
PR_RECOVERY_STATE: RECOVERABLE
WORK_INTENT: HANDOVER / DELIVERY
WORKING_BRANCH: codex/xmlcii2019-restraint-audit
CRITICALITY: ENGINEERING_CRITICAL
REPORT_BASIS_HEAD: fd00c841db7e7a737759a55bfff1af20a9fc4082
MAIN_HEAD_LAST_CHECKED: cf5d5ccb611a487e1f549b59c2886c87af9114eb
MERGE_AUTHORITY: Owner explicitly requested push to remote v0.6 and merge on 2026-11-15
ENGINEERING_ACCEPTANCE: NOT_GRANTED by merge; unqualified source cases remain held
APPENDIX_A_STATUS: NOT_REQUIRED for this delivery-only stage; further engineering implementation requires fresh qualification

## Mission and delivered behavior

PR: https://github.com/reallakshman19/3D_Convertersv0.6/pull/2
PR_HEAD_OBSERVED: fd00c841db7e7a737759a55bfff1af20a9fc4082
GROUNDING_EPOCH: GE-20261115-PR2-DELIVERY
REPORT_SYNC: CURRENT; subsequent planned commit is recovery metadata only

The reviewed branch has been pushed. GitHub reports mergeable=true with mergeable_state=unstable because broader checks are failing. Reviews are empty; no independent review is claimed. Sampled failures were reconciled against the unchanged base as recorded below. Branch-protection administrative details are unavailable to the connector; use the normal merge API, without an override/admin-bypass request. The native PR state/head/merged/merge_commit_sha fields are authoritative for merge completion; this repository report pins implementation/recovery evidence and does not predict its own merge SHA.

Deliver XML to CII 2019 Standalone restraint traceability after JSON enrichment, configured Step 7/8 parity and separately opt-in occurrence-preserving collection. The default physical-vertex option remains off. No runtime/writer switch, new geometry, numerical tolerance weakening, workflow edit, master-data change or general legacy cutover is included.

The audit links original XML occurrence/JSON member, actual selected rule, before/after values, input/config/output identities and actual CII slots. Downloads and stale-run guards are integrated into Output/Run. Original-source native Python replay and CII checks challenge the optional source-member collection. Explicit coordinate and attachment policies retain original identity and existing XML default authority; see the user guide.

## Current evidence and limitations

Exact normalized Git-index tree `921faf5eaf4d93404d2aeabafe262066d13d0b6e` was exported into a clean candidate directory and passed304/304 checks. Every selected exported file was compared with its Git-index blob; runtime root/docs bytes matched. Public validation.json records the candidate/source hashes. Subsequent delivery-report/validation receipt additions are metadata only and do not alter those tested implementation blobs.

| Status | Observation / oracle | Evidence |
| --- | --- | --- |
| PASS | LOCAL_EXECUTION; mixed literal, implementation-coupled and independent native/source reconstruction | 304 checks in the recorded local suite; reproducible filenames in agents/evidence/WIP-XMLCII-AUDIT-20261115/regression-files.json |
| PASS | LOCAL_EXECUTION; actual native CII and original-source audit | Qualified zero-datum attachment case, same-kind/same-value slots, six-slot capacity, native census and rehashed audit corruption challenges |
| PASS | LOCAL_EXECUTION; syntax, mirrored bytes and source hashes | Root/docs runtime parity; original private inputs and reference version unchanged |
| NOT_RUN | NOT_OBSERVED | Distinct-author review, accepted native Final UI and CAESAR II application acceptance |
| FAIL / qualification held | LOCAL_EXECUTION; independent native replay | A private source case retains an original-authored/configured-profile mismatch; original data and fail-closed guard remain unchanged |
| FAIL / qualification held | LOCAL_EXECUTION | Translated mandatory-attachment fixture reaches an unchanged downstream staged-position hold; general translated CII acceptance is not claimed |

Previously documented readiness/topology baseline failures are separate from this qualified suite. Historical green logs were preserved, not relabelled as broader acceptance. Author wrote the implementation and tests; independent algorithms/native replay are not distinct-author review.

Broader remote CI is not fully green. The sampled native Python source-transfer workflow's two failures reproduce under both a clean base export and the exact candidate: test_3430_current_saved_mapper_regex_and_mutation_pass_to_native_xml and test_authoritative_xml_restraint_conflicts_and_stale_replacement. The C05 ledger references commitdb926a1ecf6ae2dd72735d9ab9c03e029c9e4239 absent from this imported repository. The consumer mirror failure flags workflow-shell-mode-a-easy-bulk-v6.js; both source/docs blobs are unchanged from base and were already unequal. See ci-baseline.json. These sampled origins are PREEXISTING; other unexamined failures remain UNKNOWN_ORIGIN. No broad CI-green claim, workflow change, test suppression or engineering acceptance follows from the requested merge.

## Scope, custody and overlap

Repository is reallakshman19/3D_Convertersv0.6. Live main matched the initial base at publication preparation. Draft PR #1 at2671f708bcd30013c954cfb5b5b39201c71d2b9d overlaps the Step 7 table changes; this delivery includes the locally reconciled complete audit implementation. PR #1's additional reference-version changes are not part of this delivery. Its future integration requires a fresh comparison; it is not implicitly merged or closed here.

Existing copied original-repository integration claims are retained; no ownership takeover is inferred. One local author/writer, no delegated agents, no runtime/writer authority change. Existing backups and private source/run artifacts remain local and are excluded from publication. No private source files, output reports, personal paths or chat records are included in this PR.

## Changed-file ledger

The selected code ledger is agents/evidence/WIP-XMLCII-AUDIT-20261115/changed-files.json. It includes root/docs runtime mirrors, bounded audit/vertex/coordinate/attachment helpers, the native replay helpers and loader inventory, Step 7/8 mapping fixes, Output/Run transport/panel integration, focused tests and five test-launcher portability corrections. Documentation and sanitized delivery records accompany the patch. Backup logs, generated browser artifacts, private WIP reports and private datasets are excluded.

Source adaptation provenance: selected source-index/member-binding/materializer concepts were inspected at original-repository PR398 commit1eea3f65dd053704a9a02561f6f89e135a0b7699, including inherited PR392/393/394 modules. This is a limited adaptation, not a merge of that draft stack. Canonical numbering/new rigid splits, contraction, accepted weight second-pass changes and the full Issue391 plan are not claimed implemented.

## Reproduce

PowerShell from repository root:

```powershell
$auditTestFiles = Get-Content -Raw agents/evidence/WIP-XMLCII-AUDIT-20261115/regression-files.json | ConvertFrom-Json
node --experimental-vm-modules --test @auditTestFiles
```

Linux/macOS can pass the same JSON filename list as arguments to Node. The portable native launcher uses PYTHON when provided, otherwise python on Windows and python3 elsewhere. VM modules are required by explicit test fixtures.

## Delivery and follow-up

Current hypothesis: bounded optional-profile behavior is deliverable with existing holds; merge does not qualify the private source case or broaden engineering acceptance. Falsifiers include a default-mode regression, absent original-source census, changed original geometry, disabled fail-closed guard, or new PR check failure caused by this patch.

Highest risk remains confusing configuration-derived defaults with source design intent or treating a successful software merge as source-specific engineering acceptance. The optional path stays disabled for unqualified inputs. Follow-up work must ground original-authored field precedence and downstream mandatory-position translation independently before activation.

EXACT_NEXT_ACTION: read native PR2 state/head/merge receipt from GitHub. For an open PR, merge only the exact authorized head through normal repository rules; after merge, retain optional-mode/source qualification holds and ground original-authored/native replay precedence before any further engineering activation. The PR body/native merge fields record final delivery outcome without a self-referential report SHA requirement.
