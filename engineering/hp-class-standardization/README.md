# High Pressure Piping Class Standardization Tool

Dependency-free static web application for the **piping-class standardization** portion of ASME B31.3-2024 Chapter IX.

## Workflow

1. **Design Basis** — Code/material/product identity, dimensions, allowances and pressure-design inputs.
2. **Static Wall** — K304.1.1/K304.1.2 pressure-wall requirement, Eq. (35a) rating QA and candidate-wall pass/fail.
3. **Pressure Cycles** — editable `Pmin`, `Pmax`, `Tmin`, `Tmax`, cycle-average `Syt` and lifetime `n`.
4. **KD Qualification** — KD-2 stress-analysis package, source-controlled KD-3 fatigue evidence, `Ni` evaluation and cumulative usage.
5. **Class Envelope** — bounded class-release review status.

The app stops at piping-class standardization; actual routed-system fatigue/CAESAR/FEA/HCF acceptance is outside scope.

## Implemented calculation/control scope

- B31.3-2024 K304.1.2 Eq. (34a) straight-pipe pressure wall.
- K304.1.1 allowances/minimum-wall check.
- Eq. (35a) selected minimum-wall pressure-rating QA.
- Multiple pressure-cycle blocks.
- K304.8.3 Eq. (37) pressure stress for every wall × cycle block.
- Per-block `2*Syt` elastic/inelastic gate.
- Analytical closed-end pressure-only straight-pipe stress states (`sigma_z`, `sigma_theta`, `sigma_r`) for the controlled KD-2 package.
- Pressure-only `Delta SI` mechanics benchmark.
- KD-2 source/route/model/limit-check/approval controls.
- Exact supplied KD-3 artifact identity plus source/project-edition compatibility gate.
- Controlled final `Seq` input per wall × cycle case.
- Two `Ni` modes:
  - manual licensed `Ni`; or
  - automatic `Ni` from reviewer-entered licensed fatigue-curve points.
- `Ui = ni/Ni` and cumulative `U = sum(Ui)`.
- Fracture/KD-4 review gate.
- CSV evidence export and print.

## Controlled fatigue-curve engine

The application **does not contain ASME fatigue-curve values**. In automatic mode an authorized reviewer supplies the applicable licensed curve points as `N, Sa(MPa)` pairs, identifies the curve/source, confirms the project/source VIII-3 compatibility, and approves the transcription and interpolation basis.

The parser requires:

- at least two positive points;
- unique `N` and `Sa` values;
- strictly decreasing `Sa` as `N` increases.

Automatic `Ni` uses log-log interpolation only after the reviewer confirms that interpolation basis is applicable to the selected controlled curve. Exact curve points return the exact entered `N`. Values outside the entered stress-amplitude range are **blocked; the tool never extrapolates**.

`Seq` remains a controlled licensed input. The application does not silently set `Delta Sp/2 = Seq` and does not yet automate the edition-specific KD-312 associated-mean/equivalent-alternating-stress calculation.

## Controlled source identities

### B31.3-2024

- repo: `reallaksh19/Common`
- commit: `00f47512e96780ebab10416dcc9354f719346457`
- blob: `3395ececce7731053dd0f6317008b4cd77446b78`

### BPVC VIII-3 Article KD-2

- repo: `reallaksh19/Common`
- commit: `4dd651abbc86310077eaace6caa8b6788c1a6697`
- blob: `8f20cd0dab683d28359e02207f6f65b834144ec9`

### BPVC VIII-3 Article KD-3

- repo: `reallaksh19/Common`
- commit: `f4d49f2a47d970ae0abf913b537193e324556177`
- path: `kd-3.pdf`
- blob: `e6abaddb7833eb0a61c9460ae39201e2252dc596`
- size: `1179548` bytes

The connector identifies the exact KD-3 binary but does not decode its body in this environment. Therefore source edition/year, exact KD-312 route and licensed curve values remain reviewer-controlled evidence rather than inferred data.

## Reference regression

For the controlled NPS 4 example (`D=114.3 mm`, `Pdesign=20 MPa`, `S=138 MPa`, `ci=3 mm`, `co=0`, illustrative `12.5%` minus tolerance, 13.49 mm nominal wall):

- pressure wall `t = 7.7103935 mm`
- minimum wall `tm = 10.7103935 mm`
- required nominal wall `= 12.2404497 mm`
- Eq. (35a) pressure rating `= 23.0861209 MPa`
- `Sp(2 MPa) = 14.0665546 MPa`
- `Sp(20 MPa) = 140.6655462 MPa`
- `Delta Sp = 126.5989916 MPa`
- analytical pressure-only `Delta SI = 126.5989916 MPa`

Stage 11 validation also uses synthetic, non-Code fatigue points to test the interpolation engine. For `(N=100, Sa=1000)` and `(N=10000, Sa=100)`, `Seq=316.227766 MPa` returns `Ni=1000` by log-log interpolation. Out-of-range inputs are rejected with no extrapolation; duplicate/invalid points are rejected.

## Remaining authority work

- Confirm project BPVC VIII-3 edition/addenda and the supplied KD-3 source edition/year.
- Validate the exact applicable KD-312 route for final `Seq`.
- Provide/approve the actual material-specific fatigue curve data and any required correction/penalty factors.
- Confirm exact KD-2 edition-specific limits where automation is desired.
- Replace illustrative material/product inputs with controlled production data.

Exact licensed Code text and approved project data control.