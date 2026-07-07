# XML→CII 2019 Standalone UI Contract

This document acts as the formal contract for the Phase UI-1 to UI-8 implementation slices of the Standalone XML→CII 2019 Operator UI. 
The goal is to rebuild the standalone operator workspace to achieve **100% parity or better** with the original XML→CII(2019) workflow, while seamlessly introducing two new first-class features: **API execution** and **InputXML handling**.

## 1. Architectural Guardrails (Non-negotiable)
- **Do NOT modify existing XML→CII(2019)**: The old Model Converters route (`tabs/model-converters/**`) and legacy XML→CII runner must remain completely untouched.
- **API Boundary Preservation**: `runXmlCii2019Workflow(job, runtime)` remains the final API boundary. The UI is just a shell around the workflow API.
- **No Raw JSON Primary UX**: Configuration must be driven by structured UI elements (tables, inputs, forms); raw JSON serves exclusively as an advanced/debug fallback.
- **InputXML is First-Class**: InputXML sources must not be forced through the XML JSON-trace pipeline; they have their own parallel matching flows.

## 2. Legacy UI Map (Baseline for 100% Parity)
The original XML→CII(2019) interface is structured around a popup flow and a set of Model Data sub-tabs.

### Old Model Data Sub-tabs
1. **Json**: Staged JSON support data selection.
2. **Manual Restraints**: Node|PSNo.|POS|Restraint text area input.
3. **Sideload JSON Config**: Advanced JSON config for resolvers.
4. **Resolved Data**: JSON, PS, and POS matched facts.
5. **Output / Run Conversion**: Execution status and generated artifacts.
6. **Matched Audit**: Matched vs. Rejected standalone facts filtering.

### Old Process Enrichment Popup Phases
1. **1 Regex**: Branchname sample tester, Line Key, Piping Class, Size rules.
2. **2 Import Masters**: Line List, Piping Class, Material Map, Weights/Valve sources.
3. **4 Preview**: Enrichment dry run (Matched vs Rejected facts table).
4. **5 Diagnostics**: Review rejected components and system warnings.
5. **5A Weight Match**: Zero/missing weights, bore/rating/length matching, finalization.
6. **7 Support Types**: REST/GUIDE/LINESTOP/ANCHOR matching mappings.
7. **8 Config**: Full JSON editor with tabs (Header, Config, JSON, Regex, Masters, Logs, Support Mapper).
8. **6 Run**: Final invocation of the conversion pipeline.

## 3. Current Standalone Tab Deficiencies (The Gap Matrix)
The existing standalone UI (`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js`) contains structural gaps and misalignments:

- **Missing Primary Tabs**: The "0 Source Mode" and dedicated "3 XML / InputXML Source Preview" tabs do not exist.
- **Broken Phase Labels**: Disorganized numbering (e.g., `1 Regex`, `2 Import Masters`, `3 JSON Trace`, `5 Manual / Element`, `4 Preview`, `5 Diagnostics`, `8 Matched Audit`, `5A Weight Match / 9 Weight Match`, `6 Run`, `7 Support Types`, `8 Config`, `Custom Input`).
- **Feature Gap**: InputXML logic (the new feature) exists under an isolated "Custom Input" section rather than being integrated systematically as a core operating mode.
- **Missing Polish**: The "Manual / Element" phase is overloaded, and raw JSON serves as the primary fallback instead of proper forms/tables.

## 4. The Promised Operator-Grade UI Map (Tabs 0–12)
The new application workspace must unify the legacy components and the new features (InputXML/API) into 13 explicitly defined tabs:

- **Tab 0: Source Mode**: Auto-detect mode (PSI116 XML or CAESARII InputXML), select source file or paste text, show syntax validity, PIPINGELEMENT/branch counts. *(New Feature)*
- **Tab 1: Regex Tester**: Branch samples, extraction rules, preview table. *(Legacy Parity: 1 Regex)*
- **Tab 2: Import Masters**: 4 primary master cards (Line List, Piping Class, Material Map, Weights). Shows loaded row counts and write-back status. *(Legacy Parity: 2 Import Masters)*
- **Tab 3: XML / InputXML Source Preview**: Mode-aware. Shows Branches/Nodes for XML, or PIPINGELEMENT/FROM_NODE keys for InputXML. *(New Feature)*
- **Tab 4: Resolver / JSON Trace**: Shows PS/POS matching, JSON index, node resolution trace. *(Legacy Parity: Resolved Data / Json)*
- **Tab 5: Manual / Element Side-load**: Mode-aware. Manual restraints for XML; Side-load inherited/derived rules for InputXML. *(Legacy Parity: Manual Restraints / Custom Input)*
- **Tab 6: Preview**: Dry-run screen, before-and-after change review. *(Legacy Parity: 4 Preview)*
- **Tab 7: Diagnostics**: Normalized warnings/errors across master loading, resolving, and side-loads. *(Legacy Parity: 5 Diagnostics)*
- **Tab 8: Matched Audit**: Filterable table for matched and rejected facts. *(Legacy Parity: Matched Audit)*
- **Tab 9: Weight Match**: Candidate matching, bore/rating scoring, override interface. *(Legacy Parity: 5A Weight Match)*
- **Tab 10: Support Type Mapper**: REST/GUIDE/LINESTOP/ANCHOR mapper, test inputs, CII symbol preview. *(Legacy Parity: 7 Support Types)*
- **Tab 11: Config**: Structured config editor (not a raw JSON box), export/import options. *(Legacy Parity: 8 Config / Sideload JSON Config)*
- **Tab 12: Output / Run**: Pre-run checklist, mode-aware run summary, logs, downloads. *(Legacy Parity: 6 Run / Output / Run Conversion)*

## 5. State & Data Flow Map
1. **Source Context**: User loads source in Tab 0. UI sets `XML` or `InputXML` internal state.
2. **Master Context**: User loads Line List / Piping Class in Tab 2.
3. **Extraction & Resolution (Mode-Aware)**:
    - **XML Mode**: Flows through Tab 1 (Regex) -> Tab 4 (Resolver).
    - **InputXML Mode**: Skips Regex/JSON Trace, flows directly through Tab 3 (Source Preview) and Tab 5 (Side-load inheritance).
4. **Validation**: Both modes hit Tab 6 (Preview), Tab 7 (Diagnostics), and Tab 8 (Audit) utilizing common data grids.
5. **Finalization**: Weight Match (Tab 9) and Support Mapper (Tab 10) finalize physical properties.
6. **Execution**: Configuration (Tab 11) is bundled into a payload for Tab 12 (Run), calling the `runXmlCii2019Workflow` API boundary.

## 6. Execution Validation (100% Demonstration)
Each subsequent Phase PR (UI-1 to UI-8) must demonstrate that:
1. Legacy parity is met (no legacy feature is dropped).
2. InputXML functions flawlessly alongside standard XML.
3. API execution is cleanly disconnected from UI internal rendering logic.
