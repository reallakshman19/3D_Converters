# Weight Validation App Integration

The standalone Weight Match phase now appends a read-only empirical validation report that calls the reusable API from `converters/empirical-weight/index.js`.

Consumer code does not duplicate Approach 1 equations or Approach 2 matrix formulas. The report uses `createEmpiricalWeightValidator()` and flags only deviations with absolute magnitude greater than 30%.

The report offers abnormal-only CSV and full audit JSON downloads and stores the latest report on `stateRef.current.empiricalWeightValidationReport` for later evidence-package integration.

This report is not weight authority and does not write Weight Match, source XML, `RigidMatch1`, `Rigidmatch2`, or CII output.
