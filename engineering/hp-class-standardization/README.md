# High Pressure Piping Class Standardization Tool

Dependency-free static HTML/CSS/JavaScript calculator for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## Current scope

The tool stops at the bounded class-release review boundary. It implements:

- K304.1.2 Eq. (34a) straight-pipe pressure wall for the 2024 OD/minimum-wall route;
- K304.1.1 allowances/minimum-wall check;
- Eq. (35a) selected-wall pressure-rating QA;
- multiple pressure-cycle blocks (`Pmin`, `Pmax`, `Tmin`, `Tmax`, cycle-average `Syt`, `n`);
- K304.8.3 Eq. (37) pressure stress for every candidate-wall x cycle-block combination;
- K304.8.3(c) `2*Syt` elastic/inelastic gate;
- pressure-only closed-end elastic stress tensors for uniform straight pipe as a controlled KD-2 input package;
- explicit KD-2 source/edition/analysis/evidence placeholders and release gate;
- explicit licensed KD-3 `Seq`, `Ni`, source/evidence placeholders;
- `Ui = ni/Ni` and cumulative `U = sum(Ui)` only from complete approved `Ni` evidence;
- fracture-mechanics/KD-4 review placeholder;
- CSV export and print.

It does **not** perform routed-system fatigue, CAESAR system analysis, local FEA, vibration/HCF assessment, automatic KD-3 fatigue curves, or final piping-system Code acceptance.

## Controlled source references

### B31.3-2024

User-supplied Chapter IX PDF in `reallaksh19/Common`:

- commit: `00f47512e96780ebab10416dcc9354f719346457`
- PDF blob: `3395ececce7731053dd0f6317008b4cd77446b78`

### BPVC VIII-3 Article KD-2

User-supplied KD-2 PDF in `reallaksh19/Common`:

- commit: `4dd651abbc86310077eaace6caa8b6788c1a6697`
- PDF blob: `8f20cd0dab683d28359e02207f6f65b834144ec9`

The GitHub connector identifies the exact binary artifact, but does not decode its protected PDF text. Therefore the app intentionally leaves **KD-2 source edition/year** as a controlled field instead of inferring it from a third-party mirror.

## KD-2 implementation boundary

The app now computes the pressure-only elastic stress state for a uniform closed-end straight pipe at each cycle endpoint:

```text
sigma_r     = -P
sigma_theta = P (ro^2 + ri^2) / (ro^2 - ri^2)
sigma_z     = P ri^2 / (ro^2 - ri^2)
```

with:

```text
ro = D / 2
ri = ro - (T - c)
c  = ci + co
```

For each cycle block it records:

- `sigma_z`, `sigma_theta`, `sigma_r` at `Pmin`;
- `sigma_z`, `sigma_theta`, `sigma_r` at `Pmax`;
- component ranges;
- pressure-only principal stress-intensity range.

For the uniform pressure-only case, the calculated stress-intensity range agrees with the K304.8.3 Eq. (37) pressure-stress range within numerical precision. This is an analytical mechanics cross-check and a useful **input package** for the controlled KD-2 analysis.

The tool does **not** claim that these tensor calculations complete Article KD-2. Before class-release eligibility, the UI requires controlled entries for:

- KD-2 source edition/year;
- analysis route;
- stress-model basis;
- geometry/discontinuity status;
- residual/prestress treatment;
- KD-2 stress-category / limit-check calculation ID;
- review/approval checkbox.

Any inelastic, local-discontinuity, FEA or special route remains blocked from the automatic straight-pipe class path until the relevant controlled evidence is supplied.

## KD-3 authority boundary

B31.3-2024 K304.8.2 refers detailed fatigue processing to BPVC VIII-3 KD-2/KD-3. This repository still does not contain a controlled KD-3 equivalent-alternating-stress equation set or licensed fatigue-curve data. Therefore:

- `Delta Sp / 2` is a descriptor only;
- it is not silently set equal to `Seq`;
- `Seq` and `Ni` remain explicit controlled entries;
- the app calculates usage only after positive `Ni`, a source/calculation ID and explicit evidence approval are present;
- the final state is **Eligible for class-release review**, not automatic Code acceptance.

## Reference example

Reference values remain:

- `D = 114.3 mm`
- `Pdesign = 20 MPa`
- pressure cycle `2 -> 20 MPa`
- `S = 138 MPa` demonstration input
- `Syt = 225 MPa` demonstration input
- `ci = 3 mm`, `co = 0`
- purchase minus tolerance `12.5%` demonstration input
- candidate walls `13.49, 17.12, 22.00 mm`

For the 13.49 mm candidate:

- Eq. (34a) `t = 7.7104 mm`
- `tm = 10.7104 mm`
- required nominal wall `= 12.2404 mm`
- guaranteed minimum `T = 11.8038 mm`
- Eq. (35a) rating `= 23.086 MPa`
- `Sp(2) = 14.0666 MPa`
- `Sp(20) = 140.6655 MPa`
- `Delta Sp = 126.5990 MPa`
- analytical pressure-only `Delta SI = 126.5990 MPa`

## Running

No build step is required. Open `index.html` directly or serve this directory from GitHub Pages / another static host.

## Focused validation

1. `node --check app.js`.
2. All static `byId()` references resolve to HTML IDs.
3. No external scripts/fetch/XHR dependency.
4. Reference pressure-design values remain unchanged.
5. Pressure-only analytical `Delta SI` matches Eq. (37) `Delta Sp` for the reference straight-pipe case.
6. Blank/unapproved KD-2 package blocks class-release eligibility.
7. Blank/unapproved KD-3 `Seq/Ni` evidence blocks class-release eligibility.
8. Cumulative usage is arithmetic only from approved `Ni` inputs.
