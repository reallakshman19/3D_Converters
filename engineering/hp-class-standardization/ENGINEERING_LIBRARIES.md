# Configurable Engineering Libraries

Production entry point:

`engineering/hp-class-standardization/engineering-library.html`

This page wraps the controlled authority-package workspace and adds two editable engineering-data tables. Both tables start empty. The repository contains **no preloaded material properties, pipe dimensions, wall tolerances, or proprietary Code data**.

## Material / Property Table

Each row contains:

- material specification;
- grade;
- condition;
- temperature, °C;
- allowable stress `S`, MPa;
- yield strength `Syt`, MPa;
- row source/reference.

The library also requires a material source reference and source version.

### Applying material data

1. Enter/import the controlled temperature points.
2. Select one material/grade/condition group.
3. Enter the design temperature used for `S`.
4. Click **Apply material to calculator**.

The workspace evaluates:

- `S` at the entered design temperature;
- `Syt` at the average temperature of every pressure-cycle block.

An exact table point is used directly. Otherwise the workspace performs linear interpolation only between two bracketing controlled temperature points for the same material/grade/condition.

**Extrapolation is prohibited.** If the design temperature or any cycle-average temperature falls outside the entered range, no material values are applied.

## Pipe-Product / Dimension Table

Each row contains:

- NPS / product tag;
- product specification;
- design diameter / maximum OD basis, mm;
- nominal wall, mm;
- product-specific minus wall tolerance, %;
- row source/reference.

The library also requires a product source reference and source version.

### Applying product data

Select one exact row and click **Apply selected product row to calculator**.

The selected row explicitly sets:

- calculator `D`;
- product specification;
- minus wall tolerance;
- tolerance source string;
- candidate-wall list, replaced with the selected nominal wall.

No nearest-size lookup, schedule inference, universal `-12.5%` assumption, or prior-wall carryover is performed.

## Library JSON

Schema:

`hp-piping-engineering-libraries/v1`

Use **Export libraries JSON** and **Import libraries JSON** to move the editable tables between sessions/reviewers.

Export requires all stored rows to be valid and requires:

- library ID;
- revision;
- preparer;
- material source/version;
- product source/version.

The engineering-library JSON is intentionally separate from `hp-piping-class-authority-package/v1`. This preserves the already validated authority-package schema and keeps reusable engineering datasets distinct from one class-calculation record.

## Authority Boundary

The library workspace is an input convenience layer only.

- It does not change the B31.3/KD calculation equations.
- It does not approve user-entered data.
- It does not embed ASME tables.
- It does not extrapolate material properties.
- Values reach the calculator only after an explicit **Apply** action.
- Normal calculator validation/recalculation still governs the class result.
