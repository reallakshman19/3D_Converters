# High Pressure Piping Class Standardization Tool

Dependency-free static web application for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## Entry points

- `authority-package.html` — recommended controlled production entry point. It wraps the merged calculator and adds versioned JSON authority-package import/export.
- `index.html` — calculator-only view with no persistence layer.

Serve the directory through GitHub Pages or another same-origin static HTTP host. The authority-package wrapper accesses `index.html` through a same-origin iframe; direct `file://` behavior is browser-dependent and is not the supported production path.

## Workflow

1. **Design Basis** — Code/material/product identity, dimensions, allowances and pressure-design inputs.
2. **Static Wall** — K304.1.1/K304.1.2 pressure wall, Eq. (35a) rating QA and candidate-wall pass/fail.
3. **Pressure Cycles** — editable `Pmin`, `Pmax`, `Tmin`, `Tmax`, cycle-average `Syt` and lifetime count `n`.
4. **KD Qualification** — controlled KD-2 pressure stress-state package, source-gated KD-312 `Seq`, approved fatigue-curve `Ni`, cumulative usage and fracture/KD-4 disposition.
5. **Class Envelope** — bounded piping-class release review. The application stops here.

## Controlled sources

- B31.3-2024: `reallaksh19/Common` commit `00f47512e96780ebab10416dcc9354f719346457`, blob `3395ececce7731053dd0f6317008b4cd77446b78`.
- BPVC VIII-3 Article KD-2: commit `4dd651abbc86310077eaace6caa8b6788c1a6697`, blob `8f20cd0dab683d28359e02207f6f65b834144ec9`.
- BPVC VIII-3 Article KD-3: commit `f4d49f2a47d970ae0abf913b537193e324556177`, path `kd-3.pdf`, blob `e6abaddb7833eb0a61c9460ae39201e2252dc596`, size `1179548` bytes.

The exact KD-3 binary is source-locked, but the application does not infer its edition or project applicability. Source edition, project VIII-3 edition and compatibility remain explicit reviewer gates.

## Controlled authority package

`authority-package.html` adds a transport layer around the unchanged calculator. The package schema is:

`hp-piping-class-authority-package/v1`

A package contains:

- package ID, revision, project/class reference, preparer/checker and lifecycle;
- exact B31.3/KD source manifest;
- design/material/product inputs;
- pressure-cycle spectrum;
- KD-2/KD-3 route/evidence controls;
- fatigue-curve data entered by an authorized reviewer;
- fracture/KD-4 disposition;
- row-level source/approval evidence;
- an audit-only snapshot of displayed results.

### Import authority boundary

Import follows this sequence:

1. Parse JSON.
2. Validate schema and the exact B31.3/KD source manifest.
3. Reject the package before calculator mutation if validation fails.
4. Restore controlled engineering inputs/evidence and cycle rows.
5. Run the merged calculator.
6. Restore manual row values/source/approval only where the recalculated `wall.toFixed(4)-cycleId` key matches exactly.
7. Run the merged calculator again so manual/automatic `Seq`/`Ni` combinations resolve through the current calculation engine.

The exported `snapshot` is **audit-only**. It is not consumed by import and cannot override calculated values.

For `approved-record` lifecycle, `Checked by` is required. The package mechanism does not provide cryptographic signing or external document-control approval.

## Implemented engineering calculations

### B31.3 class side

- K304.1.2 Eq. (34a) straight-pipe pressure wall for the 2024 OD/minimum-wall route.
- K304.1.1 allowances/minimum-wall comparison.
- Eq. (35a) selected-wall pressure-rating QA.
- Multiple pressure-cycle blocks.
- K304.8.3 Eq. (37) pressure stress for every candidate wall × cycle block.
- Per-block `2*Syt` elastic/inelastic gate.

### KD-2 pressure-only package

For the uniform straight-pipe pressure-only model, the app derives closed-end elastic principal stresses at each cycle endpoint:

- circumferential/hoop stress;
- axial stress;
- radial stress.

It also reports the pressure-only stress-intensity range for comparison with K304.8.3. KD-2 edition, route, model, limit-check calculation ID and approval remain controlled evidence fields.

### Controlled automatic KD-312 `Seq`

For each wall × cycle block, the application calculates:

- signed `S12`, `S23`, `S31` at both cycle endpoints;
- `Salt_12`, `Salt_23`, `Salt_31` from algebraic stress-difference ranges;
- associated plane-normal stress at both endpoints;
- a reviewer-selectable elastic average associated-mean descriptor, not less than zero;
- the controlling `Seq` and stress pair when an approved automatic route is selected.

Available `Seq` modes:

1. **Manual licensed Seq** — reviewer enters the checked value.
2. **Mean-stress effects incorporated in selected fatigue curve** — automatic `Seq = Salt` only after explicit source/route/curve approval.
3. **Explicit normalized mean-stress correction** — generic reviewer-controlled coefficient, reference-cycle count and correction-term limit, using the approved curve for reference amplitude. No Code-specific coefficient is preloaded.

Automatic `Seq` is blocked when the approved pressure-only elastic/uniform route is not applicable. Changing-principal-axis KD-313 processing is not implemented.

### Controlled fatigue-curve `Ni`

The reviewer may use manual licensed `Ni` or automatic `Ni` from controlled fatigue-curve points.

Automatic curve mode requires positive finite `N, Sa(MPa)` values, at least two points, unique values, strictly decreasing `Sa` with increasing `N`, source/curve identification, approved transcription and approved log-log interpolation. Exact points are honored and intermediate points use log-log interpolation. **No extrapolation is performed.** No ASME fatigue-curve values are embedded in the repository.

### Cumulative usage

For approved rows:

`Ui = ni / Ni`

The candidate summary reports cumulative `U = sum(Ui)` and all remaining release blockers.

## Engineering authority boundary

This application does not:

- treat `Delta Sp/2` as automatically equal to final `Seq`;
- infer a KD-312 route from a material name;
- embed proprietary fatigue-curve values;
- extrapolate fatigue life outside approved curve data;
- perform changing-axis KD-313 processing;
- perform inelastic/elastic-plastic KD analysis;
- perform routed-system CAESAR, local FEA or vibration/HCF acceptance;
- treat imported result snapshots as calculation authority.

The intended release wording is bounded:

> Pressure-fatigue prequalified within the stated pressure, temperature, cycle, minimum-wall and component envelope.

Do not represent the result as a universally fatigue-qualified piping class.

## Reference regression

For the controlled NPS 4 reference case (`D=114.3 mm`, `Pdesign=20 MPa`, `S=138 MPa`, `ci=3 mm`, `co=0`, `-12.5%` illustrative purchase tolerance, candidate wall `13.49 mm`, pressure cycle `2 -> 20 MPa`):

- `t = 7.7103935 mm`
- `tm = 10.7103935 mm`
- Eq. (35a) rating `= 23.0861209 MPa`
- `Sp(2 MPa) = 14.0665546 MPa`
- `Sp(20 MPa) = 140.6655462 MPa`
- `Delta Sp = 126.5989916 MPa`
- pressure-only `Delta SI = 126.5989916 MPa`
- controlling pressure-only `Salt = 63.2994958 MPa`
- controlling elastic associated-mean descriptor `= 27.6830252 MPa`
- mean-embedded automatic route: `Seq = 63.2994958 MPa`.

## Validation baseline

Merged PR #437 established syntax/static validation and the engineering regression above. PR #439 deliberately leaves `app.js`, `index.html`, `ui.js` and `styles.css` unchanged and adds the authority-package transport layer around them.
