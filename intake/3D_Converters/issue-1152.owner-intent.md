# STAGE 1 — Independent successor reconstruction intake (Agent A → Runner B)

> **ACCESS_CLASS: STAGE1_OWNER_AND_ORIGINAL_SOURCE_ONLY**
>
> This is a **preparation/intake artifact**, NOT a new LFJ engineering responsibility, transfer of permission, implementation plan written by Agent A for Runner B, or authority to edit code. The governing Owner remains the sole source of product intent. A real controller must enforce Stage-1 read restrictions before claiming blind reconstruction.

## Owner's requirement (WHAT / WHY, not Agent A's solution)

The `XML → CII 2019` standalone application must process original large staged JSON source efficiently, including 30MB+ inputs, while retaining **all original bytes, source hierarchy, identifiers and source-to-result provenance**. Resolver/Enrichment and downstream engineering consumers need configurable, domain-specific fields such as `DTXR`, `DTXR_POS`, `DTXR_PS`, branch identity, `SPREF`, `*SUP*`-related support properties, geometry/position and component references. The system must not repeatedly materialize, clone, persist or send the entire source merely to answer each consumer stage. **The Owner asks for a smarter indexing/storage architecture, not permission to remove original facts or change established engineering behavior.**

Retain real live Resolver Build, engineering match semantics, original XML input, both Node-wise Trace and Evidence Tree CSV results; distinct Enrichment/PSI/XML requirements; and Preview/Weight authority boundaries. Source-only correctness is not an end-user release.

### Original direction on succession (Owner, 9 October 2026)

> Runner starts near 70% of agent life, assessed from agent health; its first stage sees broad repository context, task, Owner intent, initial commit, what/why, pending actions, known issues, parked work, source inputs and golden fixtures **without present PR statistics or Agent A's method**. Runner independently reconstructs the next plan, then receives current implementation/evidence in Stage 2 for critical reconciliation. Only an exclusive execution-controller promotion transfers write rights.

This is the current Owner's instruction, not a statement that any automatic controller already exists.

## Authorized Stage-1 repository/reference inputs

**Original source baseline** (not a live working head):
- `reallaksh19/3D_Converters@1205639a43e9ce1589360479d2558678aebcfab7`
- Protocol candidate provenance: `reallaksh19/Common@13989969f6b7e432c4f7c1ddfe975449dba53593:skills/engineering-pr-delivery-v3.2` (V3.2 recorder and reconstruction semantics; V3.2 candidate status must be respected)
- Read **only baseline originals relevant to task contracts**: `tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js`, `xml-cii-resolver-json-trace.js`, `xml-cii-json-trace-fields.js`, `xml-cii-json-hierarchy-scope.js`, `xml-cii-trace-export.js`, `stagedjson-enrichment/stagedjson-branch-context.js`, `stagedjson-enrichment/stagedjson-enrichment-engine.js`, `converters/xml-cii2019-core/source-schema-adapter.js`, and high-level `lfj/` neutral-engine contracts AS OF BASELINE. Read no new revisions initially.
- Programme intent/roadmap synopsis (not the mutable current issue text): source custody and hierarchy → consumer-driven facts → exact XML engineering matching → two CSVs + source-basis/cancellation → true deployed browser application → separate Enrichment acceptance → 30MB+ assurance. Dependencies must be re-derived; these words are milestones, not a prescribed architecture.

## Golden/source inputs (read-only originals)

- `Benchmarks/1885Sjson/Sjson.json` — 733806 bytes, SHA-256 `6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288`
- `Benchmarks/1885Sjson/FirstpassXML` — authentic potential paired XML; verify engineering match suitability independently
- `Benchmarks/1885Sjson/ExpectedXML` — distinct authentic XML; do not presume it pairs semantically with every staged JSON source
- `Benchmarks/1885_NC/1885_NC.json` — 10232634 bytes, SHA-256 `89f9c2ab7a9f1df15c1b9e1e0e30a8ca6c97ef994dcd56aec86c3a90f7d71646`
- `Benchmarks/1885_NC/1885_NC.topology.input.xml` — authentic original large XML; check its actual pairing
- Existing authentic fixture manifests and expected engineering outputs in `Benchmarks/1885Sjson/`, scoped to their actual authoritativeness. Synthetic/generated XML is an adversarial test supplement, never a substitute for authentic golden outputs.

## Agent A's WHAT / WHY briefing (no HOW, no PR statistics)

- Addressed the **scalability question**: a full original source is required for provenance and eventual full output, but consumer stages should not need another complete source clone every time.
- Investigated the risk of **semantic divergence** between source-field indexing and actual downstream Resolver rules, including dynamic configured aliases, support matching, hierarchy and branch identity.
- Investigated the difference between a passing **source-only benchmark** and a **user-actual Build with correct CSV and engineering outputs**.
- Pending outcome: independent qualification of actual original-XML-to-JSON matching and real deployed Build/download path; large-source recovery, cancellation, stale-config/source handling and 30MB+ acceptance.
- Known negative knowledge: similarly named fields do not automatically have the same engineering meaning; original inputs may not form a valid positive pair; copied or simulated browser fixture success is not evidence of actual deployed behavior.
- Parked/out of immediate standalone release scope: separately governed Enrichment consumer integration; cross-repository deployment of neutral LFJ; unrelated Preview/Weight redesign. Keep source/fixture requirements, do not silently re-scope the Owner's eventual whole programme.

## Mandatory independent reconstruction output (STAGE 1)

Runner B MUST, **before any Stage-2 exposure**:
1. Read allowlisted original modules and golden inputs, draw its **own** downstream consumer/data/custody/authority graph, state what the Owner actually expects and what constitutes real product delivery.
2. Answer three repository-grounded challenges:
   - Which original source modules and functions govern XML/node matching, source branch/hierarchy semantics and both CSV outputs? Give exact baseline paths/source evidence.
   - What facts/aliases/relationships are required by actual downstream consumers, and which apparently simple source-field optimizations could change outcomes? Include falsifiable counterexamples and configurable behavior.
   - What are the minimum independent original-source/real-Chromium tests that separate full source custody, engineering match parity, actual exports and deployment? Identify credible positive and negative goldens.
3. Independently write and **FREEZE** a new `IMPLEMENTATION_PLAN` in Runner B's own separate GitHub issue (or an immutable plan artifact): task decomposition per V3.2, exact scope, dependencies, semantic acceptance, source/fixture oracles, preliminary ROI assessment, parked work and changes that would require Owner approval.
4. Record `STAGE1_PLAN_FROZEN` with actual issue URL/commit and content digest. Do not peek at current PR/issue statuses to form or revise this frozen baseline.

## Prohibited Stage-1 data (enforce outside text)

**Do not expose to Runner B during Stage 1:** Agent A's current branch/head/diff, PR numbers/stats/titles/descriptions, Agent A's implementation strategy or acceptance claims, current issue comments, current task evidence/checks, ad hoc agent plan, live source against the baseline, current workflow runs/CI, or materialized replacement proposals. Merely writing these rules in GitHub cannot enforce them; **a trusted runner/controller must provide a restricted snapshot/read surface**. A GitHub issue can be publicly readable, so the controller must not mistake this instruction for access control.

## Stage-2 release and promotion gate

AFTER a frozen independent plan is read back, a controller may show exact live source/material/evidence and Agent A's final `HANDOVER_CONTEXT` for reconciliation. Runner B must identify what the original plan got right/wrong, independently inspect the existing code and real tests, update its own implementation issue and optionally roadmap, allocate missed Medium-ROI and absorbed High-ROI opportunities, and decompose the next bounded work under V3.2.

**Promotion is separate**: controller revokes Agent A's writer lease, verifies fencing on actual repository actions, issues a new exclusive epoch to Runner B, then B may edit. Until then: `EXECUTION_ADMISSION=READ_RECONSTRUCT_ONLY`; no primary write transfer. Never infer promotion from an issue comment, handover text or runner response.

**INTAKE STATUS:** published by Agent A. Runner B not yet instantiated, blind plan not frozen, Stage 2 not released, no exclusive promotion evidenced.