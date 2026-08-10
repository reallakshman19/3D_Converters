# ASME B31.3 Thickness Calculation API

**Implementation scope:** ASME B31.3-2024, straight metallic pipe, internal pressure, para. 304.1.2 equation 3a implementation envelope.  
**Public ASME edition page checked:** 2026-08-10 — <https://www.asme.org/codes-standards/find-codes-standards/b31-3-process-piping>  
**Design authority status:** software implementation is benchmarked; licensed-code-text engineering review is still required before this module is used as final design authority.

## 1. Purpose

This module provides a reusable calculation boundary for B31.3 straight-pipe pressure design. It is deliberately separate from existing XML/CII wall-thickness resolvers. Existing source, DTXR, piping-class, and schedule evidence remains source authority unless a consumer explicitly chooses to compare it with this calculation API.

The API does **not** embed ASME material/property tables. The caller supplies the design factors and material-dependent values `S`, `E`, `W`, and `Y`.

## 2. Import

```js
import {
  calculateB313Thickness,
  evaluateB313ProvidedWall,
  selectB313NominalWall,
  createB313ThicknessCalculator,
} from './converters/b313-thickness/index.js';
```

## 3. Primary calculation

```js
const result = calculateB313Thickness({
  edition: '2024',
  designPressure: 10,
  pressureUnit: 'MPa',
  outsideDiameter: 273.05,
  lengthUnit: 'mm',
  allowableStress: 138,
  stressUnit: 'MPa',
  qualityFactorE: 1.0,
  weldStrengthReductionW: 1.0,
  coefficientY: 0.4,
  corrosionAllowance: 3.0,
  mechanicalAllowance: 0,
  erosionAllowance: 0,
  negativeMillTolerance: {
    basis: 'percent',
    value: 12.5,
  },
});
```

The implemented pressure-design expression is recorded in the result trace as:

```text
t = P*D / (2*(S*E*W + P*Y))
```

The calculation then applies caller-supplied corrosion, mechanical, erosion, and other allowances:

```text
t_required_minimum = t + total_allowance
```

## 4. Negative manufacturing / mill tolerance

A bare number is intentionally rejected:

```js
negativeMillTolerance: 0.125 // INVALID: ambiguous
```

The tolerance basis must be explicit.

### Percentage basis

```js
negativeMillTolerance: {
  basis: 'percent',
  value: 12.5,
}
```

`value` is percentage points, therefore `12.5` means 12.5%, not 0.125% and not a fraction.

The required nominal thickness is:

```text
T_required = t_required_minimum / (1 - tolerancePercent/100)
```

For an offered nominal wall `T`:

```text
T_min_as_manufactured = T * (1 - tolerancePercent/100)
```

### Absolute basis

```js
negativeMillTolerance: {
  basis: 'absolute',
  value: 0.8,
  unit: 'mm',
}
```

or:

```js
negativeMillTolerance: {
  basis: 'absolute',
  value: 0.03125,
  unit: 'in',
}
```

The required nominal thickness is:

```text
T_required = t_required_minimum + toleranceAbsolute
```

For an offered nominal wall `T`:

```text
T_min_as_manufactured = T - toleranceAbsolute
```

Both bases use the same final adequacy invariant:

```text
T_min_as_manufactured >= t_required_minimum
```

The API echoes the original tolerance basis and normalized tolerance in the result so downstream evidence can retain the exact engineering assumption.

## 5. Provided-wall evaluation

```js
const result = evaluateB313ProvidedWall({
  ...designInputs,
  providedNominalThickness: 15.09,
  providedThicknessUnit: 'mm',
});
```

Relevant output:

```js
{
  ok: true,
  status: 'PASS',
  pass: true,
  requiredMinimumThicknessMm: 12.6144,
  requiredNominalThicknessMm: 14.4165,
  providedNominalThicknessMm: 15.09,
  minimumAsManufacturedThicknessMm: 13.20375,
  marginMm: 0.5893,
  utilization: 0.9554,
  nominalMarginMm: 0.6735,
  nominalUtilization: 0.9554,
}
```

`status` is based on minimum as-manufactured wall, not simply nominal-wall comparison.

## 6. Nominal-wall / schedule selection

The API does not own a B36.10/B36.19 table. A caller supplies candidate nominal walls from its approved dataset:

```js
const selected = selectB313NominalWall({
  ...designInputs,
  candidates: [
    { schedule: '40', wallThicknessMm: 9.27 },
    { schedule: '60', wallThicknessMm: 12.7 },
    { schedule: '80', wallThicknessMm: 15.09 },
    { schedule: '100', wallThicknessMm: 18.26 },
  ],
});
```

Candidates are normalized, sorted by wall thickness, and the thinnest candidate whose minimum as-manufactured wall satisfies the calculated requirement is selected.

If none pass, the function returns `NO_ADEQUATE_NOMINAL_WALL`.

## 7. Reusable calculator

```js
const b313 = createB313ThicknessCalculator({
  edition: '2024',
  pressureUnit: 'MPa',
  stressUnit: 'MPa',
  lengthUnit: 'mm',
  qualityFactorE: 1,
  weldStrengthReductionW: 1,
  coefficientY: 0.4,
  negativeMillTolerance: { basis: 'percent', value: 12.5 },
});

const result = b313.calculate({
  designPressure: 10,
  outsideDiameter: 273.05,
  allowableStress: 138,
  corrosionAllowance: 3,
});
```

This is intended for modules that share project or piping-class defaults but calculate many pipe cases.

## 8. Supported units

Pressure/stress:

- `Pa`
- `kPa`
- `MPa`
- `bar`
- `psi`
- `ksi`

Length:

- `mm`
- `cm`
- `m`
- `in`, `inch`, `inches`

Internally the API uses MPa and mm.

## 9. Fail-closed scope

The API rejects rather than guesses when:

- edition is not B31.3-2024;
- pressure mode is external;
- Chapter IX/high-pressure fluid service is requested;
- `P/(S*E)` exceeds the implemented equation envelope;
- calculated pressure-design thickness is not less than `D/6`;
- required `P`, `D`, `S`, `E`, `W`, or `Y` inputs are invalid or absent;
- `E` or `W` is not in `(0,1]`;
- `Y` is not in `[0,1]`;
- an allowance is negative;
- manufacturing tolerance is missing, ambiguous, negative, or at least 100% for percentage basis.

Bends, branch reinforcement, fittings, external pressure, and Chapter IX calculations require separate APIs.

## 10. Result provenance

A successful result records:

```js
{
  standard: 'ASME B31.3',
  edition: '2024',
  paragraph: '304.1.2',
  equation: '3a',
  provenance: {
    factorAuthority: 'CALLER_SUPPLIED',
    standardStatusChecked: '2026-08-10',
    qualification: 'SOFTWARE_IMPLEMENTED_CODE_TEXT_ENGINEERING_REVIEW_REQUIRED'
  }
}
```

No result should be interpreted as having resolved material properties or code-table values unless a separate, qualified resolver supplied them.

## 11. Existing wall-authority boundary

This module does not replace:

- `converters/xml-cii2019-core/dtxr-wall-thickness-resolver.js`;
- piping-class wall evidence;
- direct source wall values;
- approved project schedule data.

A later adoption PR should compare those source values with the B31.3 calculated requirement and report `PASS`, `FAIL`, margin, and provenance. It should not silently overwrite source wall thickness.

## 12. Validation

See `docs/B313ThicknessValidation.md` and the frozen benchmark dataset:

```text
Benchmarks/B313Thickness/b313-thickness-benchmarks.json
```
