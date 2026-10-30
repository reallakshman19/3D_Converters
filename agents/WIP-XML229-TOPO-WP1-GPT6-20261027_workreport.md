# WIP-XML229-TOPO-WP1-GPT6-20261027 — Standalone topology inspection WP1

Date: 2026-10-27. Engineering-critical feature, read-only geometry view, no mutation authority.

## Current truth
- Production base `main`: `0e14160cb985247d97ee6ae673387f061eeed1f7` (observed through GitHub API).
- Donor `main`: `e97bef94f05e387e32888db77e6ec925251402b7` (read-only reference).
- Branch: `feat/xml229-topology-workspace-wp1-20261027`; created from exact production main.
- Scope: explicit PSI116 XML file -> original-source occurrence scene -> actual `topologyPreFinalOnly` analysis -> projected-3D pan/orbit/zoom/fit and source-qualified picking/search/inspection; no transaction selection or native writer in WP1.
- Existing 5B blob in both repositories: `db8a404a5d668b21ae34d3508f800fc1684eb0e4`.

## Coordination
- PR #329 open: engine.js and shared XML229 orchestration overlap *by authority*. Do not edit engine or orchestration; reuse exported `runXmlCii2019StandaloneEngineJob`.
- PR #335 open: downstream emitted native CII short simplification. Strictly out of scope.
- Older WIP source-byte/topology-run claims are already merged PR344/345; their claim files remain as history. Do not resurrect their work or weaken newline custody.
- Claim classification: COORDINATION_REQUIRED shared engine calling interface; SAFE for new isolated files provided shared modules remain untouched.
- Canonical Common delivery skill path referenced by root AGENTS.md was inaccessible through current GitHub connector (404); root `AGENTS.md` and `.agents/AGENTS.md` inspected. Refresh that protocol when locally available.

## Intended changed paths
- `topology-workspace.html`, `docs/topology-workspace.html`
- `tabs/topology-workspace/*.mjs`, `docs/tabs/topology-workspace/*.mjs`, matching CSS
- `tests/xml229-topology-workspace-wp1.test.mjs` (new)
- This report and `agents/claims/WIP-XML229-TOPO-WP1-GPT6-20261027.yaml`.
- No existing production source, workflow file, 5B panel, engine, mass matcher, native writer, PSI116 numerical policy or owner logic may be changed for WP1.

## Baseline execution
Command `node --experimental-vm-modules --test tests/xml229-topology-only-engine.test.mjs`.
- Local checkout `git clone --depth=1 https://github.com/reallakshman19/3D_Converters.git checkout`: exit 128; stdout empty; stderr: `fatal: unable to access 'https://github.com/reallakshman19/3D_Converters.git/': Could not resolve host: github.com`.
- Attempt to execute baseline without checkout: exit 1; stdout empty; stderr: `Could not find 'tests/xml229-topology-only-engine.test.mjs'`.
- Product baseline STATUS=NOT_RUN, not FAIL; no real engine or browser PASS is claimed. Local logs with SHA256 retained in conversation artifact `xml229-wp1-evidence` (not committed).
- Historical passing tests on PR344/345 are not substitutes for this branch's execution.

## Safety invariants
The selected File text alone is the source; no DOM/localStorage scan, no normalization before text SHA. The independent topology engine job is `topologyPreFinalOnly: true`, `sourceKind: 'xml'`, `analyzeTopology: true`, `generateTopoFix: false`, and excludes O1, masters, Final packet, native CII. The canvas is projection only: neither connectivity inference nor NodeNumber labels confer mutation authority. Every display occurrence has explicit original branch and node ordinals and source SHA. Late asynchronous results must fail closed on source generation changes.

## Investigation and falsifier
Existing 5B `makeProjector` uses a rotated 2D projection of 3D positions; `buildTopology` may infer links via rays and suppress helper route rows. A minimal isolated scene/navigation adapter can reuse the projection formulation but must never import the inferred engineering graph. Falsify by a duplicate-label/coincident-position fixture yielding distinct pickable source occurrences and a real engine plan digest matching exact source text.

## Validation
- GitHub source and PR inspection: PASS (read-only; listed SHAs/files).
- Local engine baseline: NOT_RUN (checkout blocked).
- WP1 Node and Chromium journeys: NOT_RUN until files available and execution setup confirmed.
- Private Owner 245-plan evidence: NOT_AVAILABLE (no approval implied).
- All masses, Final acceptance, native emission and ownership checks: NOT_APPLICABLE in WP1; existing downstream guards untouched.

## EXACT_NEXT_ACTION
Add minimal source-qualified scene parser, existing-5B-based projection with hit-list/picking, standalone host and test fixture on this branch; then run Node/Chromium and the real topology-only baseline from an actual checkout or existing CI. Do not claim full WP1 acceptance without the real no-master browser engine journey.
