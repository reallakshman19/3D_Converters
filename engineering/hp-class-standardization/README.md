# High Pressure Piping Class Standardization Tool

A dependency-free static web calculator for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## Scope

This tool intentionally stops at the class-release boundary. It calculates and records:

- K304.1.2 Eq. (34a) straight-pipe pressure wall for the OD/minimum-wall route;
- K304.1.1 allowance addition and minimum selected-wall comparison;
- Eq. (35a) inverse pressure-rating QA for candidate minimum walls;
- K304.8.3 Eq. (37) pressure stress at `Pmin` and `Pmax`;
- pressure-stress range and half-range descriptor;
- K304.8.3(c) `2*Syt` elastic/inelastic gate;
- controlled entry of licensed BPVC VIII-3 `Seq`, `Ni`, source/calculation ID and evidence approval;
- `n/Ni` usage when a positive controlled `Ni` is supplied;
- CSV export and print.

It does **not** perform routed-system fatigue, CAESAR system analysis, local FEA, vibration/HCF assessment, or final system Code acceptance.

## Engineering authority boundary

B31.3-2024 K304.8.2 refers the alternating-stress fatigue calculation to BPVC Section VIII Division 3 Articles KD-2/KD-3. This repository does not contain a licensed KD fatigue equation/curve data set. Therefore:

- `Delta Sp / 2` is displayed only as a pressure-only alternating-stress descriptor;
- the tool does not silently set it equal to final `Seq`;
- no generic fatigue curve is embedded;
- `Seq` and `Ni` must be entered from the controlled licensed KD calculation;
- the result is shown as **KD blocked / not released** until `Seq`, `Ni`, a source reference and explicit evidence approval are present;
- even with those inputs, the tool reports **Eligible for class-release review**, not automatic Code acceptance.

## Source control

The engineering method was validated against the user-supplied B31.3-2024 Chapter IX PDF in `reallaksh19/Common`:

- commit: `00f47512e96780ebab10416dcc9354f719346457`
- PDF blob SHA: `3395ececce7731053dd0f6317008b4cd77446b78`

Exact licensed Code text and approved project data control.

## Equations implemented

### K304.1.2 Eq. (34a), 2024 OD/minimum-wall route

```text
t = (D - 2 co) / 2 * [1 - exp(-P/S)]
```

Then:

```text
tm = t + ci + co
```

The tool converts `tm` to a required nominal purchase wall using the **entered** minus tolerance. The tolerance is an explicit user input, not a universal default assumption.

### Eq. (35a) pressure-rating QA

```text
P = S * ln[(D - 2 co) / (D - 2(T - ci))]
```

`T` is the guaranteed/minimum wall derived from the entered candidate nominal wall and entered purchase minus tolerance.

### K304.8.3 Eq. (37)

```text
Sp = P D^2 / { 2 (T - c) [D - (T - c)] }
c = ci + co
```

The tool evaluates this at `Pmin` and `Pmax` and reports `Delta Sp` plus `Delta Sp / 2` as a descriptor.

### K304.8.3(c) gate

The tool compares maximum Eq. (37) `Sp` with the entered `2*Syt` threshold and flags the inelastic route when exceeded.

## Reference example

The **Load reference example** button visibly loads demonstration values only:

- `D = 114.3 mm`
- `Pdesign = 20 MPa`
- `Pmin/Pmax = 2/20 MPa`
- `Tmin/Tmax = 40/200 C`
- `S = 138 MPa` — demonstration input only
- `Syt = 225 MPa` — demonstration input only
- `ci = 3 mm`, `co = 0`
- minus tolerance `12.5%` — demonstration input only
- cycle count `500`
- candidate nominal walls `13.49, 17.12, 22.00 mm`

Expected key results for the 13.49 mm candidate are approximately:

- Eq. (34a) `t = 7.7104 mm`
- `tm = 10.7104 mm`
- required nominal wall with the entered 12.5% tolerance `= 12.2404 mm`
- guaranteed minimum `T = 11.8038 mm`
- Eq. (35a) pressure rating `= 23.09 MPa`
- Eq. (37) `Sp(2 MPa) = 14.07 MPa`
- Eq. (37) `Sp(20 MPa) = 140.67 MPa`
- `Delta Sp = 126.60 MPa`
- half-range descriptor `= 63.30 MPa`

Production calculations must replace all demonstration material/dimensional inputs with approved data.

## Information needed to close `Seq` and `Ni`

At minimum, the controlled fatigue package needs the governing BPVC VIII-3 edition, exact material/condition, full cycle endpoint stress state, associated mean-stress data required by the applicable KD route, any required SCF/penalty/modulus corrections, exact KD equation references, the applicable design fatigue curve identifier/data, interpolation/range rules and the actual cycle count.

## Running the tool

No build step or dependency installation is required.

Open `index.html` directly in a browser or serve this folder from any static host. The files are compatible with GitHub Pages because all assets are relative and there are no server-side dependencies.

## Validation

Focused validation should include:

1. JavaScript syntax check.
2. Independent comparison against the reference results above.
3. Blank KD fields remain blocked/not released.
4. Entering `Ni` calculates only `n/Ni`; no hidden fatigue curve is used.
5. No external scripts, libraries, APIs or network dependencies.
