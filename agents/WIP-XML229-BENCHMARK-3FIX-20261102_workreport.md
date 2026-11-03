# WIP-XML229-BENCHMARK-3FIX-20261102

MISSION: Study the relevant Benchmarks folder and ground the Owner's three problems in actual node/coordinate, nodal-restraint/mutation and rigid-split/second-pass examples; provide a focused WBS.

STATE: SUPPORTING_EVIDENCE_NATIVE_OWNERSHIP_WBS_PRIORITY.
CLASSIFICATION: ENGINEERING_CRITICAL analysis/planning; read-only source inspection and new documentation/analysis artifacts.
ROLE: Coder, thread `01a19b55-87a6-7a80-bfa9-252bfa853be6`; selection survives Compact.
TAKEOVER_AUTHORITY: READ_ONLY. Appendix A remains incomplete/unscored. No production writer or distinct reviewer appointed.

## Current truth and decisions

- Owner's latest instruction: study the benchmark folder to understand the three stated problems. The prior terminology question is superseded by source study; do not repeat it. The saved private run bundle remains unavailable. Public benchmark work can continue without treating that bundle as an artificial prerequisite.
- Active plan: [three-problem WBS](../docs/architecture/xml229-benchmark-three-problem-wbs-20261102.md). This provides the current sequence; the previous 30-package architecture proposal and capture-first next action are historical. A ledger rewrite is conditional on demonstrated need.
- Local branch/head inspected: `fix/xml229-inst-rigid-20261031`, `a658ed0305a1745181938155b7f1c554f98ae283`. Source inspected at pinned V6 `5c39dd7bdbb7f2f63a686823b72bdb81909d52af`, through the earlier qualified snapshot and direct Git blobs. No fresh live GitHub main/PR/overlap clearance is claimed by this study.
- EF original has 1654 node records, including 810 `-1` and 11 `-2`; exact branch-scoped co-location is common. EF nodes 50/60 and BM2 20/30 are concrete same-XYZ/different-ref examples. OLET source has `-1/70/-1` component occurrences at a shared position. Repeated positive branch junctions and protected separate connections must be distinguished.
- EF enriched node 90 has `+Y/GUI` with gaps `0/6`; node 160 has `+Y/GUI/LIM` with gaps `0/20/20`. BM_CII native CII has six slots per RESTRANT block. A shared node can carry multiple independent restraint records.
- Literal InputXML/native code differences are recorded for BM_CII 35/255. The actual imported mutation rows/source dialect need qualification; the observed mismatch with a default table is not proof of a selected-run defect.
- Current split preparation promotes existing eligible negative endpoints to numbered nodes. Its allocation loop writes NodeNumber/Rigid; other cleanup stages can remove records. Whole-pipeline coordinate/connectivity preservation remains to reproduce.
- ASIM staged archive and EF examples share some refs but have different branch/position values; their exact pairing/transform is not established merely by tag or filename.

## Hypothesis and falsifier

Hypothesis: the required behavior can be expressed as two node-consistency passes surrounding split preparation, with full per-node restraint lists carried through configured mutation and the existing second weight pass. First isolate any incorrect boundary in existing code before proposing a new representation.

Falsifier: a source-qualified case produces an unjustified node alias, lost/extra or differently valued restraint slot, moved endpoint, disconnected junction, lost nonzero physical component, duplicate/shifted mass owner, or newly generated CII disagreement. Preserve independent expected values and the failing case.

Highest risk: merging by coordinate or by sentinel alone can change physical connectivity; collapsing records by restraint type alone can erase different gaps/directions on one node. A second risk is applying the wrong numeric mutation dialect or applying a rule twice.

## Authority and invariants

Preserve source bytes/privacy, branch/occurrence/endpoint identity, physical connections, coordinates/units, per-slot type/stiffness/gap/friction/direction and connected-node references, accepted mass ownership and zeros, Final approval basis, runtime/writer/canvas custody and mandatory failure guards. No new source correction, engineering binding, tolerance change, ledger schema, workflow edit, agent, timer, commit/PR, merge/deploy/release is authorized or performed here.

Production mutation still requires fresh live Git/GitHub grounding, relevant overlap/claim resolution, qualified takeover and one-writer custody. Public literal observations do not qualify the unavailable exact private run.

## Validation

| STATUS | OBSERVATION | ORACLE |
| --- | --- | --- |
| PASS | Read-only script examined literal branch/node records, EF member values and native BM_CII six-slot structure; generated JSON read back. | No production converter imports; direct parsing/record examination. Historical fixture acceptance unqualified. |
| PASS | Seven core source files byte-equal pinned Git blobs. | Raw Git bytes and independent digests. |
| FAIL byte identity | Initial nine-file assertion failed on sideload XML. Examination found CRLF-only differences for sideload XML and JSON; both remain FAIL in the evidence. | Original bytes and expectations preserved; no fixture rewrite or weakened exactness claim. |
| PASS | Plan IDs/dependencies, evidence consistency, local links, source preservation and new-file scope checked before handoff. | Author checks; distinct review NOT_RUN. |
| NOT_RUN | New converter runs, first failure isolation, production repair, engineering numerical acceptance and browser/native end-to-end acceptance. | Required future qualified source/run evidence. Prior 27-Python/7-Node baseline results are retained in the intake report and were not rerun. |

The study script is an analysis tool under `agents/evidence`; it does not mutate benchmark files or import the converter. Reproduce to a fresh output path, for example `python agents/evidence/xml229_benchmark_study_20261102.py --output .local-test-tmp/xml229-benchmark-study-recheck.json`. Do not overwrite saved evidence or rerun unchanged checks merely for a checkpoint.

## Changed-file ledger

All six are new files:

1. `docs/architecture/xml229-benchmark-three-problem-wbs-20261102.md` — observed examples, three workstreams, dependencies and acceptance.
2. `agents/evidence/xml229_benchmark_study_20261102.py` — reproducible literal analysis, separate from production.
3. `agents/evidence/xml229-benchmark-study-20261102.json` — exact source identities, census and XML/CII observations; seven exact-byte PASS and two FAIL.
4. `agents/WIP-XML229-BENCHMARK-3FIX-20261102_workreport.md` — recovery state and exact next action.
5. `agents/status/WIP-XML229-BENCHMARK-3FIX-20261102.yaml` — study/plan state.
6. `agents/claims/WIP-XML229-BENCHMARK-3FIX-20261102.yaml` — new analysis/document scope; no production claim.

Prior eight WBS/intake documents and existing dirty `.backups/log.json` remain untouched. No MASTER_INDEX exists locally. Actual changed files must be reconciled before closing.

## Resource and continuity receipts

Metric: reported input including cached input plus output; not billing. At 11:01:35 UTC the requested preceding window was 10:56:35–11:01:35; comparable cumulative samples at 10:53:05/10:59:49 gave B=207067 (input 202298, output 4769; cached input 168704). Forecast for the bounded read-only benchmark batch was P=350000, below 5B, with reporting-boundary/active-request uncertainty. At 11:05:43 UTC, B=426155 for the immediately preceding window; at 11:11:30 UTC, B=683139 (input 673954, output 9185; cached 644992), preceding window 11:06:30–11:11:30, sample bracket 11:05:44–11:10:53. Forecast for finishing evidence/plan/readback was P=600000, below 5B. Recheck before expanding or starting a further five-minute batch; do not reuse these windows later.

Context helper repeatedly returned UNKNOWN because last-token counters were inconsistent. No zero/percentage or new threshold crossing was inferred. Prior actual Compact notice and receipt persist; checkpoint housekeeping is separately authorized. Effort check: actual MAX satisfies HIGH. No agents or timers exist.

Owner priority update: the Owner selected `docs/architecture/xml229-native-ownership-wbs-20261102.md` first. Its recovery report/status now govern the active sequence. This study remains supporting evidence; earlier assertions here that the three-part plan superseded the architecture WBS describe the preceding state. Preserve the three engineering requirements and all literal/failed/NOT_RUN evidence. No separate mutation-first task is active.

EXACT_NEXT_ACTION: Read `agents/WIP-XML229-OWNERSHIP-WBS-20261102_workreport.md` and support its WBS 0.1 trace from existing physical-vertex/member candidates to the governed native consumer. Do not start a competing implementation or repeat the terminology/private-folder questions.
