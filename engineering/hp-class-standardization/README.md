# High Pressure Piping Class Standardization Tool

A dependency-free static web application for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## UI model

The application is organized as an engineering qualification workflow instead of one long calculator:

1. **Design Basis** — Code, material/product identity, dimensions, allowances and pressure-design inputs.
2. **Static Wall** — K304.1.1/K304.1.2 pressure-wall requirement, Eq. (35a) rating QA and candidate-wall pass/fail.
3. **Pressure Cycles** — editable `Pmin`, `Pmax`, `Tmin`, `Tmax`, cycle-average `Syt` and lifetime `n`.
4. **KD Qualification** — KD-2 stress-analysis package plus controlled KD-3 `Seq`/`Ni` evidence and cumulative usage.
5. **Class Envelope** — candidate-wall summary and bounded class-release review status.

A persistent reviewer rail shows the current Code path, evidence completeness and exact release blockers.

### Visual authority convention

- **Calculated** results: normal/blue result cards.
- **Engineer-controlled inputs**: amber input zones.
- **Licensed / approval evidence**: purple evidence zones.
- **Blocking / special routes**: grey, amber or red status indicators.

This separation is deliberate: the application must never make an assumed value look like a Code-calculated result.

## Scope

Implemented:

- K304.1.2 Eq. (34a) straight-pipe pressure wall for the B31.3-2024 OD/minimum-wall route.
- K304.1.1 allowance addition and selected minimum-wall comparison.
- Eq. (35a) inverse pressure-rating QA.
- Multiple pressure-cycle blocks.
- K304.8.3 Eq. (37) pressure stress for every candidate wall × cycle block.
- Per-block `2*Syt` elastic/inelastic gate.
- Analytical closed-end pressure-only straight-pipe stress states (`sigma_z`, `sigma_theta`, `sigma_r`) for the controlled KD-2 package.
- Pressure-only `Delta SI` mechanics benchmark.
- Controlled KD-2 source/route/limit-check/approval fields.
- Controlled KD-3 `Seq`, `Ni`, source/calculation ID and evidence approval fields.
- `Ui = ni/Ni` and cumulative `U = ΣUi` arithmetic only from complete approved `Ni` evidence.
- Fracture-mechanics/KD-4 review/evidence gate.
- Qualification CSV export and print.
- Workflow navigation and dynamic evidence/release-blocker rail.

Not implemented:

- embedded licensed KD-3 mean-stress / equivalent alternating-stress equations;
- embedded licensed design fatigue curves or automatic `Ni`;
- automatic KD-2 edition-specific stress-category/limit logic;
- routed-system/CAESAR analysis;
- local FEA;
- vibration/HCF;
- final piping-system Code acceptance.

## Engineering authority boundary

B31.3-2024 K304.8.2 sends detailed fatigue processing to BPVC Section VIII Division 3 KD-2/KD-3.

The application therefore does **not**:

- silently set `Delta Sp/2 = Seq`;
- invent a KD-3 fatigue curve;
- derive `Ni` from generic data;
- infer the KD-2 edition/year from a third-party mirror;
- treat analytical Lamé pressure tensors as automatic KD-2 approval;
- automatically declare PQ-A or final Code acceptance.

Missing evidence remains visibly blocked.

## Controlled source identity

### B31.3-2024

- repository: `reallaksh19/Common`
- commit: `00f47512e96780ebab10416dcc9354f719346457`
- PDF blob SHA: `3395ececce7731053dd0f6317008b4cd77446b78`

### BPVC VIII-3 Article KD-2

- repository: `reallaksh19/Common`
- commit: `4dd651abbc86310077eaace6caa8b6788c1a6697`
- PDF blob SHA: `8f20cd0dab683d28359e02207f6f65b834144ec9`
- edition/year remains an explicit controlled field until confirmed from the source.

Exact licensed Code text and approved project data control.

## Equations currently implemented

### K304.1.2 Eq. (34a)

```text
t = (D - 2 co) / 2 * [1 - exp(-P/S)]
```

Then:

```text
tm = t + ci + co
```

### Eq. (35a) pressure-rating QA

```text
P = S * ln[(D - 2 co) / (D - 2(T - ci))]
```

### K304.8.3 Eq. (37)

```text
Sp = P D^2 / { 2 (T - c) [D - (T - c)] }
c = ci + co
```

### Pressure-only straight-pipe analytical stress state

For the effective bore/OD geometry, the app generates the closed-end thick-cylinder pressure state at each cycle endpoint:

```text
sigma_z
sigma_theta
sigma_r
```

and calculates a pressure-only stress-intensity range `Delta SI`. For the reference straight-pipe case this reproduces the K304.8.3 `Delta Sp` benchmark.

## Reference example

The **Load reference example** action uses demonstration values only:

- `D = 114.3 mm`
- `Pdesign = 20 MPa`
- `Pmin/Pmax = 2/20 MPa`
- `Tmin/Tmax = 40/200 C`
- `S = 138 MPa` — demonstration input only
- `Syt = 225 MPa` — demonstration input only
- `ci = 3 mm`, `co = 0`
- minus tolerance `12.5%` — demonstration input only
- cycle count `500`
- nominal walls `13.49, 17.12, 22.00 mm`

Expected 13.49 mm reference values:

- `t = 7.7104 mm`
- `tm = 10.7104 mm`
- required nominal wall `= 12.2404 mm`
- guaranteed minimum `T = 11.8038 mm`
- Eq. (35a) rating `= 23.09 MPa`
- `Sp(2 MPa) = 14.07 MPa`
- `Sp(20 MPa) = 140.67 MPa`
- `Delta Sp = 126.60 MPa`
- pressure-only `Delta SI = 126.60 MPa`

Production calculations must replace all demonstration material/dimensional inputs with approved values.

## Running

No build step or package installation is required.

Open `index.html` directly, or serve the directory using any static host / GitHub Pages. All assets are local:

```text
index.html
styles.css
app.js
ui.js
```

## Validation

Minimum focused validation after any engineering or UI change:

1. `node --check app.js`
2. `node --check ui.js`
3. Verify the Stage 8 reference values above.
4. Verify blank KD-2/KD-3/fracture evidence remains visibly blocked.
5. Verify navigation preserves all input/calculation state.
6. Verify there are no external scripts, libraries, API calls, `fetch` or XHR dependencies.
7. Verify CSV export remains available from the Class Envelope step.
