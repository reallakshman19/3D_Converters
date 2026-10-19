# XML229 — production-native candidate handoff WP1/WP2 (nonreleasing)

Base: main@635aa1d2ae4b3fe469a0446fb082bc842b20f857.
Owner instruction: start fixing production wiring after PR #311 source-level review.

## Implemented on draft
- Ordinary governed Run continues to throw XML229_GOVERNED_NATIVE_CII_HELD.
- Separate, explicitly nonreleasing button on the real Run UI; requires current original-Blob GC-PW Worker.
- Reads canonical Final intent and enforces complete eligible source-bound masses.
- Uses existing workflow branch-format/Parity logic. Before native Python, calls a new source-bound Worker mass writer that maps every original physical occurrence to one exact parity XML node and replaces only that node's Weight with its current accepted Final/source kg. It then reruns R2 attestation on the exact resulting engine-input XML, checking staged JSON digest, source generation, InputBasis, immutable Final intent, original occurrence census and False native release flags.
- Runs existing Pyodide native converter only after attestation; clears staged JSON from the already enriched XML invocation to avoid a second JSON enrichment pass.
- Rereads Final intent to reject concurrent decision drift. Only aggregates and CII SHA-256 are shown; candidate CII bytes and original identifiers are never put in application state, downloaded or reported.
- Added Node 22/24 workflow and negative tests for real Worker XML mass rewriting, source identity ambiguity, stale/Match-1-only decisions and exact converter handoff; matched source/docs served copies.
- No converter mass writer, class policy, historical accepted Match-1 values, engineering release gate or deployment altered.

## Still blocked — not falsely claimed delivered
1. Current parity enrichment alone does not prove approved Final kg. This PR now adds actual source-correct Final/source mass application in the Worker before the native converter, with exact R2 re-attestation. Repeated ambiguous component signatures, missing or stale Final decisions and unsupported geometry fail closed; no auto-allocation by score.
2. Native Python process data, bend processing, cleanup, retained element mapping and split allocations after the CLI input need independently authored original-to-native geometry/output proof. PR #311 observer is only first-party evidence.
3. No general VALV / INST / unmatched FLAN ownership policy is approved. Do not auto-classify every positive physical as rigid.
4. Owner private full census, 125 historical Match-1 engineering dispositions, independent G5/I03, formal acceptance and owner release signoff are still outstanding.
5. Existing governed HOLD, XML-only testing route and user downloads remain unchanged. No merge or release is requested.

## Bounded acceptance
- Actual UI candidate can invoke actual native engine only after Worker source/Final attestation.
- Missing, forged, stale, incomplete or changed source/review evidence denies engine execution.
- Normal Run continues held and no candidate CII bytes escape.
- Hosted CI, independent reviewer and real Chromium qualification needed before merge.

## WP3 — actual retained-model / native CII integration (2026-10-19)

Extended the SAME draft on top of source-correct R2 Final-to-engine XML transfer:

- Candidate-only Python CLI switch writes a private JSON witness of the actual retained native edges and each emitted ELEMENTS-to-RIGID pointer. It reads real CII sections, verifies pointer uniqueness, no unreferenced RIGID records, native endpoints and scale consistency.
- Ordinary Python converter output does not change without the optional witness switch. Controlled real Python CLI regression compares candidate and ordinary CII bytes for RIGID/VALV/INST.
- Pyodide engine loads/reads the candidate sidecar only when requested. The ordinary normalized workflow drops the private witness; original identities and native CII bytes do not enter UI state.
- Independent JS challenge parses actual CII CONTROL, ELEMENTS, RIGID and UNITS; checks the first-party retained model witness against emitted CII bytes, SHA and the full R2 source physical census. Matches by branch, original/native node source number, component type/ref, endpoint and position.
- Physical owners without native mass are classified as RETAINED_OWNER_NOT_FOUND, AMBIGUOUS_RETAINED_EDGE or NATIVE_MASS_RULE_REQUIRED. Unclaimed positive native slots are separately counted. UI shows observed/unresolved aggregates; all native release flags remain false.
- No automatic RIGID fabrication for VALV, INST or unmatched FLAN. No native mass-writing/geometry policy changed.

Evidence limit: a first-party runtime witness + independent second-path CII structural readback is real application integration, but is NOT an independently authored G5/I03 source-to-retained child lineage or Owner's complete private basis acceptance. Draft, nonreleasing.

## WP4 — source-first executable Run hook repair and real-Worker browser qualification (2026-10-19)

- Found a CRITICAL actual app wiring gap: the candidate wrapper passed runtime.engineRunner but the real XML workflow service called runXmlCii2019StandaloneEngineJob directly. Earlier standalone candidate mocks were insufficient. Corrected XML workflow service to invoke the injected engine custody port AFTER branch-format+parity, defaulting to unmodified native engine when no port is provided. Both source and docs copies updated.
- Added public API→real service→engineRunner positive and refusal tests (not just a simulated runWorkflow stub); the existing parity-closure tests now run in the dedicated Node 22/24 matrix.
- Fail-closed candidate rejects all analyzeTopology/generateTopoFix/useTopoFixForCii options because that path can replace converter input after R2 mass attestation; no unverified TopoFix geometry passes.
- Separated genuine Chromium tests: prior root/docs UI HOLD test, a current GC-PW source-mass 35kg→exact R2 Worker rewrite test, and a bounded real current-Worker→parity→Pyodide candidate test. Source 35 kg synthetic positive is **Source authority**, not an independently accepted Final Match-2 decision.
- Full Pyodide browser test carries a 180s Node-host independent deadline to prevent a deadlocked browser from consuming the entire workflow. Synthetic live Worker readiness waits for the actual session, not the default UI blank-weight filter.
- Python native witness is unlinked from the persistent Pyodide virtual FS immediately after reading. Raw witnesses and CII text are not stored by the production candidate UI.

### Acceptance boundaries

- Focused actual workflow hook and Python/JS contract tests passed on the previous head (20b1012c); exact latest-head CI may be running. Do not describe queued jobs as green.
- Chromium UI HOLD smoke passed at 20b1012c. Full current Worker→R2→native Pyodide end-to-end acceptance is NOT yet confirmed; do not treat its running/timeout result as a pass.
- The prior 15 broad CI failures include confirmed legacy hard-coded merge-base and narrow C05 scope guards; **overall PR is not green**.
- No native mass policy for VALV/INST/noneligible FLAN/splits, no independently authored G5/I03 or Owner-private all-source acceptance, no production release.
