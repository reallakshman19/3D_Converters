# XML229 ownership — WBS 0 intake and baseline reconciliation

Date: 02 November 2026 (Asia/Dubai). Status: READ-ONLY INTAKE; Owner confirms saved bundle unavailable, fresh capture route required.

This is the execution addendum to the [30-package WBS](xml229-native-ownership-wbs-20261102.md). It records new evidence found after that plan's snapshot; it does not implement or approve the proposed ledger. Recovery: [intake work report](../../agents/WIP-XML229-OWNERSHIP-INTAKE-20261102_workreport.md).

## Current baseline and changed starting point

| Item | Current observation | Consequence |
| --- | --- | --- |
| Main at intake | `5c39dd7bdbb7f2f63a686823b72bdb81909d52af`, merge of [PR #389](https://github.com/reallakshman19/3D_Converters/pull/389) | V6, rather than the WBS's historical V5 snapshot, is the pinned diagnosis baseline. Refresh again before product mutation. |
| Existing local branch | `fix/xml229-inst-rigid-20261031` / `a658ed0305a1745181938155b7f1c554f98ae283` | Fetched main is 523 commits ahead, zero behind; merge base equals local HEAD. This branch and its existing local changes were preserved. |
| V6 repair head | `11c55bbbbb6178b32ac31ed475b8bd954d474032` | Typed BRANCH custody and bounded route-status diagnostics are already merged; do not duplicate the repair. |
| Open ledger RFC | [PR #390](https://github.com/reallakshman19/3D_Converters/pull/390), initially `20aa88eac2d293af02480f854985dafd6dfb86be`, refreshed to `808ff2d611eb7eed32ecdea548f3e7248d9b6403` | Same architectural scope as WBS 2–6. The intervening commit modifies only `docs/architecture/xml229-canonical-support-ownership-ledger-rfc.md`; its full delta was read. No product implementation, design adoption or writer custody established. |
| Owner case described by the RFC | V6 still HELD with 21 mandatory ambiguities at 0.5 mm, ten sampled | This is attributed RFC/PR evidence, not a locally reproduced Owner run. Inspect all 21 from the exact source basis before claiming resolution. |
| Distinct design review | PR390 review-list response was empty | No independent approval inferred. This intake is authored source assessment. |

The earlier 9/56 narrative remains historical evidence. Do not predict 21 → 9 or 21 → 0 from focused tests. The RFC describes five sampled malformed carrier declarations, four other coincident ambiguous pairs and claim 244 with distinct-position candidates; eleven mandatory claims were omitted from the bounded sample. Actual private source records must qualify those descriptions.

## Source trace established at the pinned V6 commit

- `xml229_prefinal_restraint_source.py:205–241` resolves source restraints using branch scores, tag matches and distance, then selects the leading eligible group or tag entry.
- `xml_to_cii2019_master_addon.py:404–474` parses carrier declarations and requires the currently supported `=digits/digits` grammar, classifies malformed/conflicting/missing/duplicate/wrong-branch references and builds original branch-scoped route evidence.
- The same addon's `_position_bound_dtxr` begins at line 673 and applies a separate native ownership decision. A carrier declaration is not silently discarded merely because PS points at one candidate.

These current source boundaries substantiate the RFC's concern about two ownership decisions. They do not prove which candidate owns any of the private 21 claims. The ledger contract, route/port semantics, manual engineering binding authority and pre-Final topology changes still require their planned design/engineering decisions. A unique geometric candidate or a schema's `proof.kind` field cannot self-attest ownership.

The refreshed RFC adds a governed EnrichedXML artifact distinct from its private ownership proof. Carry this proposal into WBS 4.3/5.1/6.1/6.2 design review: bind source/JSON/config/accepted Final/ordinal map/ledger to frozen exact EnrichedXML bytes; the native writer consumes those bytes without another rematch; independently reconcile existing authored restraints, all configured restraint properties and non-support engineering fields. Generated `DTXR_POS`/`DTXR_PS` labels do not prove source ownership. Proposed `XML229.GovernedEnrichedXML.v1` is not adopted by this intake. Current `xml_to_cii2019_runtime_custody.py:382–393` was inspected and already copies exact consumed XML bytes for export without rerunning enrichment; the wider proposed governed artifact contract remains unimplemented/unqualified.

## Validation completed and limits

| STATUS | OBSERVATION | ORACLE / limit |
| --- | --- | --- |
| PASS | 27 existing Python staged-position tests, Python 3.12.14, exact V6 source bytes | Existing synthetic and public-source regression expectations; not independent Owner engineering acceptance. |
| PASS | 7 existing Node ambiguity-export tests, Node 22.23.2 | Existing source-safe diagnostic contracts, including V6; not actual-CII qualification. |
| PASS | Five byte comparisons: addon, patched converter, Final mass binding, runtime custody and diagnostic JS against docs mirrors | Source identity comparison only. |
| PASS | Source snapshot: 786 files exported from verified Git blobs; each object's Git blob identity checked and bytes read back | Qualified partial source snapshot, not a full checkout, deployed app or Owner source bundle. |
| PASS | V6 [owner-proof CI](https://github.com/reallakshman19/3D_Converters/actions/runs/41420547731) has successful Python 3.11 and 3.12 jobs at `11c55bb` | Remote completed step summaries verified. No claim that every repository workflow passed. |
| NOT_RUN locally | Existing full native CLI Node suite invokes `python3`; that Windows app alias cannot execute here | No alias, shim, test substitution, production runtime change or weakened assertion was introduced. Remote owner-proof steps are separate evidence. |
| NOT_RUN | Exact 21-claim Owner replay, complete private census, Pyodide/Chromium Owner qualification and independent actual-CII reconciliation | Requires the private selected basis; existing public tests cannot substitute. |

The first Python run executed 27 tests with three errors because the partial snapshot lacked two public fixtures. Those exact pinned Git blobs were added; the unchanged suite then passed all 27. The failed attempt remains in the local log. No tolerance, implementation or expected output was modified.

Windows Git rejected the tracked name `Benchmarks/XML->CII2019` during full worktree, sparse/no-checkout and archive attempts. The failed sparse attempt left a registration and a directory containing only its `.git` pointer. Both were removed after checking the resolved target, its sole file and the pointer's exact repository metadata destination; final worktree inventory contains only the original worktree. No Git path protection was disabled. The successful alternative exported selected blobs without building an index. Snapshot and complete blob manifest:

`D:/CodeD/3D_Converter/.local-test-tmp/xml229-v6-intake-source-5c39dd7b/INTAKE_SOURCE_MANIFEST.json`

Local evidence logs in that snapshot: `INTAKE_python.log` (initial missing-fixture failure), `INTAKE_python_final.log` (27 PASS), and `INTAKE_node.log` (7 PASS). Temporary files stayed in its `INTAKE_TMP/python` directory. Source files, fixtures and assertions were not patched.

## Initial CI triage (WBS 0.3)

The historical V5 readiness run [41408604097](https://github.com/reallakshman19/3D_Converters/actions/runs/41408604097) had successful canonical worker readiness jobs on Node 22 and 24, but two browser jobs failed. Logs for jobs `125156222299` and `125156222319` identify the same failure: a 60-second wait for `[data-p4-weight-root] [data-p4-instrument-advisory]`, from `xml229-ef05-instrument-safety-e2e.mjs:11` called by the EF05 native E2E script. This demonstrates a browser assertion/availability failure before that path completed governed native qualification; it does not establish the underlying UI defect's cause or excuse it.

No repair or waiver was attempted. The other previously observed CI failures remain untriaged. Relevant browser/release gates must be assessed on the eventual implementation candidate; a historical XML-only CII or mass result does not approve governed output.

## Private input manifest (WBS 0.2)

The Owner answered that the saved bundle is not there. Do not request the same existing folder again. Availability of the raw original XML/JSON and a still-open application run is UNKNOWN; inspect the existing capture/export facilities before defining a fresh controlled capture. The following table specifies the evidence a new same-run bundle must contain. Do not post raw source contents or copy private inputs into public evidence. Byte identity, format meaning and Owner acceptance are separate facts.

| Required input | Current custody / qualification | Required intake evidence |
| --- | --- | --- |
| Owner-selected original XML | PENDING | Absolute private path, byte SHA256, size, source selection and dialect/units. |
| Owner-selected original staged JSON | PENDING | Exact bytes or archive/member identity, byte SHA256, size, original hierarchy and selection. |
| Effective support/position configuration and overrides | PENDING | Exact same-run export, transform/tolerance and configuration fingerprint; distinguish raw-byte and canonical digests. |
| Effective master basis | PENDING | Same-run master identities/digests and field mappings; no replacement with convenient defaults. |
| Finalized XML plus retained-original-ordinal lineage basis | PENDING | Exact bytes, accepted source correspondence and explicit approved topology edits if any. |
| Accepted Final physical packet and acceptance context | PENDING | Source/config/master/Final binding, accepted mass owners, intent and Owner acceptance provenance. |
| Actual V6 receipt and full private claim census, if already saved | PENDING | Revision, mode, basis identity, all mandatory members and conflict reasons; the ten-row public sample is insufficient. |

Available local files are public test material, not a qualified replacement for that bundle:

- `Benchmarks/EF-05-PRO.TEST.xml`: 898252 bytes, SHA256 `2573883480af904096dea2663c9cf585be2db28dd047785397b4d61edee0a030`.
- `Benchmarks/ASIM-1836_managed_stage-2.zip`: 599137 bytes, SHA256 `b0dc26ace4a718087cbc5d107c963a471c95f20a51d56d8559a9415d98be9353`.
- `.local-test-tmp/owner-input-checks/manifest.json`: four XML test input records; no accepted Final/config/selected JSON authority was established by it.

## Package disposition and next step

| WBS | Disposition |
| --- | --- |
| 0.1 | Live baseline, drift and scope overlap inspected. Product writer and independent reviewer remain unassigned; no full overlap clearance or implementation qualification claimed. |
| 0.2 | Private input checklist prepared; exact Owner basis pending. |
| 0.3 | Relevant readiness failure localized to the browser assertion; broader triage and current-candidate qualification pending. |
| 1.1–1.3 | Use the qualified current V6 baseline for exact-source replay/census after 0.2. Preserve the historical V5 comparison only where byte-identical inputs establish correspondence. |
| 2–6 | Reconcile/adopt or revise PR390's RFC under the planned design decisions; do not create a competing ledger implementation. |

Overlap classification is `COORDINATION_REQUIRED`, not a demonstrated active write claim. PR390 is a design artifact; other open native/Final/Preview work still needs refreshed heads, actual claims and custody before any production edit. Appendix A remains incomplete: exact Owner failure isolation and independent expected attachment evidence are missing. Continue source intake and unaffected inspection; retain engineering release HELD.

**Next actor/action:** Coder inspects existing same-run private capture/export routes under the fresh resource gate, then revises WBS 0.2 for a fresh controlled capture. Ground actual original-source/live-run availability and preserve Owner engineering acceptance as a separate requirement. No engineering binding, source correction, runtime/writer/canvas change, merge, deployment or release is implied.
