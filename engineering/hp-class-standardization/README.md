# High Pressure Piping Class Standardization Tool

A dependency-free static web calculator for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## Scope

This tool intentionally stops at the class-release boundary. It currently supports:

- K304.1.2 Eq. (34a) straight-pipe pressure wall for the OD/minimum-wall route;
- K304.1.1 allowance addition and minimum selected-wall comparison;
- Eq. (35a) inverse pressure-rating QA for candidate minimum walls;
- multiple pressure-cycle blocks with `Pmin`, `Pmax`, `Tmin`, `Tmax`, cycle-average `Syt` and cycle count `n`;
- K304.8.3 Eq. (37) pressure stress for every candidate-wall × cycle-block combination;
- pressure-stress range and `Delta Sp / 2` descriptor;
- K304.8.3(c) `2*Syt` elastic/inelastic gate per pressure-cycle block;
- explicit placeholders for the governing BPVC VIII-3 edition, material/product sources, KD route, fatigue-curve ID and evidence package;
- controlled entry of licensed `Seq`, `Ni`, KD source/calculation ID and evidence approval for each wall × cycle block;
- `Ui = ni/Ni` and cumulative `U = sum(Ui)` when all required licensed `Ni` values are supplied and approved;
- a controlled fracture-mechanics/KD-4 review-status placeholder and evidence ID;
- CSV export and print.

It does **not** perform routed-system fatigue, CAESAR system analysis, local FEA, vibration/HCF assessment, automatic licensed KD fatigue processing or final system Code acceptance.

## Engineering authority boundary

B31.3-2024 K304.8.2 refers the detailed alternating-stress fatigue calculation to BPVC Section VIII Division 3 Articles KD-2/KD-3. This repository does not contain a licensed KD equation/curve data set. Therefore:

- `Delta Sp / 2` is displayed only as a pressure-only descriptor;
- the tool does not silently set it equal to final `Seq`;
- no generic fatigue curve is embedded;
- `Seq` and `Ni` remain controlled external inputs;
- `Ui` and cumulative `U` are arithmetic only, based on user-supplied approved `Ni`;
- missing KD evidence, an inelastic block, incomplete authority metadata or an unassessed fracture-mechanics gate prevents class-release eligibility;
- even a complete set reports **Eligible for class-release review**, not automatic Code acceptance.

## Stage 7 placeholders

The UI now records placeholders for future controlled libraries/automation:

1. **Material library** — Table K-1/K-1C and temperature-dependent properties.
2. **Product library** — NPS/OD/wall and purchase tolerances.
3. **KD engine** — licensed mean-stress / equivalent-alternating-stress equations.
4. **Fatigue curve library** — licensed design-curve data/interpolation for automatic `Ni`.
5. **Special-route evidence** — inelastic and KD-4 outputs remain external controlled evidence.

These placeholders are intentionally visible so missing engineering authority cannot be mistaken for a completed calculation.

## Source control

The engineering method was validated against the user-supplied B31.3-2024 Chapter IX PDF in `reallaksh19/Common`:

- commit: `00f47512e96780ebab10416dcc9354f719346457`
- PDF blob SHA: `3395ececce7731053dd0f6317008b4cd77446b78`

Exact licensed Code text and approved project data control.

## Equations implemented

### K304.1.2 Eq. (34a), 2024 OD/minimum-wall route

```text
t = (D - 2 co) / 2 * [1 - exp(-P/S)]
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

For each cycle block the app evaluates `Sp(Pmin)`, `Sp(Pmax)`, `Delta Sp`, `Delta Sp/2`, and checks maximum `Sp` against the entered `2*Syt` threshold for that block.

### Usage arithmetic

When licensed `Ni` is supplied and evidence is approved:

```text
Ui = ni / Ni
Utotal = sum(Ui)
```

The app does not derive `Ni`.

## Reference example

The **Load reference example** button loads demonstration values only:

- `D = 114.3 mm`
- `Pdesign = 20 MPa`
- `S = 138 MPa` demonstration input only
- `ci = 3 mm`, `co = 0`
- minus tolerance `12.5%` demonstration input only
- candidate nominal walls `13.49, 17.12, 22.00 mm`
- cycle `C1`: `Pmin/Pmax = 2/20 MPa`, `Tmin/Tmax = 40/200 C`, `Syt = 225 MPa`, `n = 500`

Expected key results for the 13.49 mm candidate remain approximately:

- Eq. (34a) `t = 7.7104 mm`
- `tm = 10.7104 mm`
- required nominal wall with the entered 12.5% tolerance `= 12.2404 mm`
- guaranteed minimum `T = 11.8038 mm`
- Eq. (35a) pressure rating `= 23.09 MPa`
- Eq. (37) `Sp(2 MPa) = 14.07 MPa`
- Eq. (37) `Sp(20 MPa) = 140.67 MPa`
- `Delta Sp = 126.60 MPa`
- half-range descriptor `= 63.30 MPa`

Production calculations must replace all demonstration values with approved data.

## Running the tool

No build step or dependency installation is required. Open `index.html` directly in a browser or serve the folder from any static host/GitHub Pages.

## Validation expectations

1. `node --check app.js` passes.
2. The 13.49 mm reference values above are reproduced.
3. Adding multiple cycle blocks creates one pressure-fatigue row per wall × block.
4. Blank or unapproved KD fields keep the wall blocked.
5. Entered `Ni` values produce only `n/Ni` and cumulative arithmetic.
6. Any inelastic block prevents automatic class-release eligibility.
7. Unassessed fracture-mechanics status prevents release eligibility.
8. No external scripts, libraries, APIs or network dependencies are present.
