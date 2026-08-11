# High Pressure Piping Class Standardization Tool

Dependency-free static web application for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## Workflow

1. **Design Basis** - Code/material/product identity, dimensions, allowances and pressure-design inputs.
2. **Static Wall** - K304.1.1/K304.1.2 pressure wall, Eq. (35a) rating QA and candidate-wall pass/fail.
3. **Pressure Cycles** - editable `Pmin`, `Pmax`, `Tmin`, `Tmax`, cycle-average `Syt` and lifetime count `n`.
4. **KD Qualification** - controlled KD-2 pressure stress-state package, source-gated KD-312 `Seq`, approved fatigue-curve `Ni`, cumulative usage and fracture/KD-4 disposition.
5. **Class Envelope** - bounded piping-class release review. The application stops here.

## Controlled sources

- B31.3-2024: `reallaksh19/Common` commit `00f47512e96780ebab10416dcc9354f719346457`, blob `3395ececce7731053dd0f6317008b4cd77446b78`.
- BPVC VIII-3 Article KD-2: commit `4dd651abbc86310077eaace6caa8b6788c1a6697`, blob `8f20cd0dab683d28359e02207f6f65b834144ec9`.
- BPVC VIII-3 Article KD-3: commit `f4d49f2a47d970ae0abf913b537193e324556177`, path `kd-3.pdf`, blob `e6abaddb7833eb0a61c9460ae39201e2252dc596`, size `1179548` bytes.

The exact KD-3 binary is source-locked, but the application does not infer its edition or project applicability. Source edition, project VIII-3 edition and compatibility remain explicit reviewer gates.

## Implemented engineering calculations

### B31.3 class side

- K304.1.2 Eq. (34a) straight-pipe pressure wall for the 2024 OD/minimum-wall route.
- K304.1.1 allowances/minimum-wall comparison.
- Eq. (35a) selected-wall pressure-rating QA.
- Multiple pressure-cycle blocks.
- K304.8.3 Eq. (37) pressure stress for every candidate wall x cycle block.
- Per-block `2*Syt` elastic/inelastic gate.

### KD-2 pressure-only package

For the uniform straight-pipe pressure-only model, the app derives closed-end elastic principal stresses at each cycle endpoint:

- circumferential/hoop stress;
- axial stress;
- radial stress.

It also reports the pressure-only stress-intensity range for comparison with K304.8.3. KD-2 edition, route, model, limit-check calculation ID and approval remain controlled evidence fields.

### Controlled automatic KD-312 `Seq`

Stage 12 adds a pressure-only processor for the case where principal stress directions remain unchanged.

For each wall x cycle block, the application calculates:

- signed `S12`, `S23`, `S31` at both cycle endpoints;
- `Salt_12`, `Salt_23`, `Salt_31` from the algebraic stress-difference ranges;
- associated plane-normal stress at both endpoints;
- a reviewer-selectable elastic average associated-mean descriptor, not less than zero;
- the controlling `Seq` and stress pair when an approved automatic route is selected.

Available `Seq` modes:

1. **Manual licensed Seq** - reviewer enters the final checked value.
2. **Mean-stress effects incorporated in selected fatigue curve** - automatic `Seq = Salt` for each pair, with the maximum pair controlling. This is enabled only after source/route/curve identification and explicit reviewer approval.
3. **Explicit normalized mean-stress correction** - applies a generic reviewer-controlled form using the entered coefficient, reference-cycle count and correction-term limit. The reference amplitude is obtained from the approved fatigue-curve points by log-log interpolation. No Code-specific coefficient, reference count or limit is preloaded.

Automatic `Seq` is deliberately blocked if:

- the project/source VIII-3 edition gate is not closed;
- the KD-2 route is not elastic pressure-only uniform straight pipe;
- credited residual/prestress effects are present;
- the selected route lacks a controlled source/reference or approval;
- the explicit route lacks approved fatigue-curve data/parameters;
- the K304.8.3 case requires an inelastic/special route.

Changing-principal-axis KD-313 processing is not implemented.

### Controlled fatigue-curve `Ni`

The reviewer may use:

- **Manual licensed Ni**, or
- **Automatic Ni from controlled fatigue-curve points**.

Automatic curve mode accepts reviewer-entered `N, Sa(MPa)` points and requires:

- positive finite values;
- at least two points;
- unique `N` and `Sa` values;
- strictly decreasing `Sa` as `N` increases;
- curve ID/source reference;
- approved transcription;
- approved log-log interpolation basis.

Exact curve points are returned directly. Intermediate points use log-log interpolation. **No extrapolation is performed.** No ASME fatigue-curve values are embedded in the repository.

### Cumulative usage

For approved rows:

`Ui = ni / Ni`

and the class candidate summary reports:

`U = sum(Ui)`

along with all remaining release blockers.

## Engineering authority boundary

This application does not:

- treat `Delta Sp/2` as automatically equal to final `Seq`;
- infer a KD-312 material/mean-stress route from a material name;
- embed proprietary fatigue-curve values;
- extrapolate fatigue life outside approved curve data;
- perform changing-axis KD-313 processing;
- perform inelastic/elastic-plastic KD analysis;
- perform routed-system CAESAR, local FEA or vibration/HCF acceptance.

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

## Validation

Local validation performed for Stage 12:

- `node --check app.js`: PASS.
- `node --check ui.js`: PASS.
- static DOM-ID compatibility: PASS.
- B31.3 reference regression: PASS.
- `Salt` / associated-mean reference benchmark: PASS.
- mean-embedded automatic `Seq` benchmark: PASS.
- synthetic explicit-mean route benchmark: PASS.
- reverse curve interpolation for reference amplitude: PASS.
- no-extrapolation behavior: PASS.
- project/source edition mismatch gate: PASS.
- credited residual/prestress automatic-route block: PASS.

Browser E2E is not available in the current execution environment because local/file navigation is administrator-blocked in the installed headless browser.
