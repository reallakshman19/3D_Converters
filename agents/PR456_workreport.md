# PR #456 Work Report — AIV flare-network authoring and generated calculation tables

## Status

- PR: #456
- Branch: `agent/aiv-flare-network-authoring`
- Base: `main` at `23d06cf52ba362a3895651f631b79429c493fef8`
- Issue: #455
- State: DRAFT / implementation complete for graph-authoring + generated-table slice
- Merge: NOT REQUESTED / NOT PERFORMED

## User outcome

The AIV workspace can represent a drawn flare network and use that engineering graph to generate the three AIV calculation working tables automatically.

```text
flare-network SVG/editor
→ AivFlareNetwork.v1
→ AivGeneratedInputSet.v1
   ├─ AivSourceCsv.v2
   ├─ AivAssessmentCsv.v1
   └─ AivSourceAssessmentCsv.v1
→ AivAssumptionProfile.v1 for blank process/geometry cells
→ AIV readiness
→ registered VIB.AIV.ACOUSTIC screening calculation
```

## Engineering distance authority

The upgrade deliberately does **not** make screen pixels engineering distance.

```text
SVG x/y                           presentation only
segment.physicalLength            explicit engineering property
Source→Assessment Physical Distance
                                  sum of explicit segment lengths on one unique directed graph path
```

Rules:

- dragging a node changes only `presentation.x/y`;
- segment engineering length remains unchanged by drag/stretch;
- one unique path + every length known => generated APPLICABLE relationship and distance;
- multiple routes => `AMBIGUOUS_PATH` / generated relationship remains UNRESOLVED;
- missing length => `UNRESOLVED_LENGTH` / distance blank;
- disconnected Source/Assessment => no generated applicable relationship;
- no shortest visual route is chosen.

## Implemented contracts

### `AivFlareNetwork.v1`

File: `converters/vibration/aiv/aiv-flare-network.js`

Contains:

- network/revision/provenance;
- node kinds: Source, Assessment, Junction, Connection, Boundary, Off-page;
- Source and Assessment engineering property bags;
- directed pipe segments;
- explicit segment length in m/mm;
- separate presentation coordinates;
- duplicate/dangling/self-edge/invalid-length validation;
- deterministic path resolution.

### `AivGeneratedInputSet.v1`

File: `converters/vibration/aiv/aiv-flare-network-table-generator.js`

Produces existing exact working-table contracts without a parallel AIV API:

- `AivSourceCsv.v2`;
- `AivAssessmentCsv.v1`;
- `AivSourceAssessmentCsv.v1`.

Generated relationship evidence retains exact contributing segment IDs and records `EXPLICIT_SEGMENT_ENGINEERING_LENGTH_SUM` as the distance authority.

### Authored topology source

Files:

- `converters/vibration/aiv/aiv-flare-network-topology.js`
- `converters/vibration/aiv/aiv-readiness-tables.js`
- `converters/vibration/aiv/aiv-topology-view-model.js`

Adds `FLARE_NETWORK` as a first-class AIV topology input format. It is **not** disguised as the certified five-sheet 3D EDIT exchange. Imported topology keeps its existing complete-exchange requirement.

## Live UI integration

Files:

- `tabs/vibration-aiv-flare-network-svg.js`
- `tabs/vibration-aiv-flare-network-view.js`
- `tabs/vibration-aiv-flare-network-controller.js`
- `tabs/vibration-aiv-flare-network-state.js`
- `tabs/vibration-aiv-input-view.js`
- `tabs/vibration-aiv-qualification-tab.js`

Implemented:

- add Source / Assessment / Junction / Connection / Boundary / Off-page node;
- connect directed pipe segment;
- set/clear explicit segment engineering length;
- edit m/mm unit;
- delete segment;
- node delete with referential-integrity protection;
- drag nodes for presentation layout;
- live redraw of connected segment geometry during drag;
- graph edit transaction regenerates all AIV tables/topology and clears stale readiness/results;
- manual table/import edits visibly switch out of auto-generated mode;
- next graph edit intentionally regenerates the tables;
- relationship canvas consumes the same authored topology identities/lines through state fallback.

The UI explicitly displays whether `AUTO-GENERATED TABLE MODE` or `TABLE/IMPORT MODE` is active.

## D.2.3 generated-network regression

The test fixture represents:

```text
AIV-D23-RELIEF-SOURCE
    │
    │ D23-PATH-001 = explicit engineering length 0.8 m
    ▼
AIV-D23-WELDOLET-01
```

The intended executable regression path is:

```text
AivFlareNetwork.v1
→ generated tables
→ existing CSV parsers
→ calculateAiv(... qualificationMode='screening')
```

Pinned values:

- generated distance: `0.8 m`;
- relief raw PWL: `164.6851759525391 dB`;
- attenuation: `0.3116883116883117 dB`;
- first-point PWL: `164.3734876408508 dB`;
- Assessment LOF: `0.29`;
- Line/Case LOF: `1.48`, retained non-authoritative.

## Readiness regression

A minimal drawn Source → 0.8 m segment → Assessment network is projected to `FLARE_NETWORK`, missing process/geometry cells are resolved by the existing visible assumption profile, and the expected readiness result is one `READY_FOR_QUALIFICATION` relationship.

## Multi-source regression

Two Source nodes reaching the same Assessment + Operating Case generate two Source→Assessment rows with a common automatic simultaneous-source group while preserving both Source Canonical IDs.

Existing AIV multi-source benchmark targets remain:

- `160 + 160 → 163.0102999566398 dB`;
- `160 + 150 → 160.41392685158226 dB`.

## Added focused tests

- `tests/vibration-aiv-flare-network.test.mjs`
- `tests/vibration-aiv-flare-network-authoring.test.mjs`
- `tests/vibration-aiv-flare-network-canvas-mode.test.mjs`
- `tests/vibration-aiv-flare-network-svg.test.mjs`
- `tests/vibration-aiv-flare-network-readiness.test.mjs`

Package command:

```bash
npm run verify:aiv-flare-network
```

The command is also appended to:

```bash
npm run verify:aiv-canvas-release
```

## Validation status

Repository-native execution: **NOT_RUN** in this agent runtime because there is no mounted repository checkout. Do not interpret the presence of test files as PASS evidence.

Real-browser drawing acceptance: **NOT_RUN** in this agent runtime.

The implementation was source-reviewed for:

- no AIV numerical equations in the flare-network SVG/editor modules;
- no pixel-to-engineering-distance conversion;
- unique-path/missing-length fail-closed rules;
- graph/table authority switching;
- module sizes under the normal 300-line target for newly added modules.

## Remaining before closing #455

- native `npm run verify:aiv-flare-network`;
- native `npm run verify:aiv-canvas-release`;
- real-browser add/connect/drag/edit/delete acceptance;
- real-browser confirmation that generated table rows update immediately;
- real-browser D.2.3 Run AIV acceptance from the drawn network;
- browser export evidence should include network revision/path segment IDs in a later export-hardening slice if not already consumed by the existing result package.

## Permanent authority boundary

```text
AIV screening result scope = ASSESSMENT
designAuthority = false
SVG pixels = never engineering physical distance
```
