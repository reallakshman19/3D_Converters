# Phase 4 Preview — B31.3 wall update

## Purpose

Phase 4 Preview exposes the explicit action:

```text
Update wall thickness as per B31.3 Sec II
```

The action does not run automatically. It updates a Preview wall-thickness override only when all required engineering inputs for that row are resolved and both calculation/selection APIs succeed.

## API custody

The action deliberately contains no pressure-thickness equation in the UI.

Runtime chain:

```text
Preview row
  -> resolve row DN / source-XML OD / design pressure / corrosion allowance
  -> exact material + T1 controlled design basis (S, E, W, Y)
  -> calculateB313Thickness()
  -> selectPipeWallForCalculation()
  -> Preview wallThickness override
```

`calculateB313Thickness()` is the reusable ASME B31.3-2024 straight-pipe API originally developed on PR #420. This adoption branch reuses its production module blobs exactly rather than retyping the equation in Preview code.

`selectPipeWallForCalculation()` is supplied by the merged pipe-wall master API from PR #422 and selects the minimum adequate nominal wall from the canonical project master.

## Fixed manufacturing tolerance

For this Preview action:

```text
negative mill/manufacturing tolerance = 12.5%
```

The UI does not expose this as a variable setting. The composer sends the typed API input:

```js
{
  basis: 'percent',
  value: 12.5,
}
```

The B31.3 API therefore produces:

```text
t   = pressure-design thickness
ntm = required minimum after allowances (t + C)
required nominal = nominal/ordered wall after 12.5% negative tolerance
```

The selected project-master wall must be at least the required nominal wall.

## Controlled design basis

The existing piping-class master contains material, schedule/wall, rating and corrosion data, but it does not establish ASME allowable stress `S` or the B31.3 `E`, `W`, and `Y` factors.

Accordingly the Preview action fails closed unless an exact material + T1 basis supplies:

- allowable stress `S` and unit;
- quality factor `E`;
- weld joint strength reduction factor `W`;
- coefficient `Y`;
- controlled source/reference.

Pressure unit and pipe dimension standard may be explicitly supplied in that basis. `AUTO` is permitted only where the runtime can resolve the value unambiguously from line-list/source/material evidence.

The ASTM A106 Grade B benchmark used to qualify the B31.3 API is **not** a default material-property table and is never applied to unrelated rows.

## Outside-diameter custody

The calculation uses an OD from the row's source XML, not a naked DN-to-OD substitution.

For a row:

1. the pipe-wall master provides the canonical DN OD as a disambiguation/reference value;
2. all positive OD candidates on that source branch are inspected;
3. the source-XML candidate nearest the DN reference is selected only when it is within the governed parity tolerance;
4. otherwise the row is not updated.

This specifically protects branch/fitting cases where a different endpoint OD is present on the same branch.

### Retained DN50 source-data warning

The canonical project master currently retains the PR #422 source warning:

```text
NPS 2 / DN50
OD(mm) = 60
OD(in) = 1.9 -> 48.26 mm
SOURCE_OD_UNIT_PARITY_MISMATCH
```

The Preview action does not silently correct that master row. For a DN50 XML branch containing `60.3 mm` and an unrelated `26.7 mm` endpoint, the OD-custody regression requires `60.3 mm` to be selected as the row calculation OD because it matches the DN master reference within tolerance, while `26.7 mm` is rejected as unrelated size evidence.

## Pressure-unit custody

Pressure value and pressure unit are separate authorities.

Priority:

1. explicit design-basis pressure unit;
2. unambiguous line-list pressure column label matching the Preview P1 value (for example `Pressure Max kPa(g)` -> `KPA`);
3. source XML `<PressureUnits>` only when P1 provenance is XML;
4. otherwise fail closed.

No implicit assumption that every Preview P1 is Pa, kPa, bar or MPa is allowed.

## Wall update and provenance

For every successful row the action writes:

```text
config.overrides.wallThickness[wallKey]
config.overrides.__b313WallEvidence[wallKey]
```

The evidence record retains:

- material / T1 basis key;
- controlled source reference;
- S, E, W, Y;
- pressure source and pressure-unit source;
- source-XML OD and DN-reference parity;
- 12.5% negative mill tolerance;
- complete B31.3 calculation result;
- complete pipe-wall selection result and master provenance.

The Preview provenance badge is:

```text
✓ B31.3
```

A successful B31.3 wall update supersedes the active DTXR wall override marker for that wall key. Unsuccessful rows are not modified.

## Audit report

Every click produces:

```text
xml-cii-b313-preview-wall-update-report/v1
```

with counts for input, updated and non-updated rows and a row-level decision record.

Successful rows show OD, P/unit, corrosion, required nominal wall, selected wall, schedule/equivalent schedules and margin. Non-updated rows show the exact fail-closed reason, for example missing design basis, unresolved pressure unit, OD parity mismatch, B31.3 applicability failure, or no adequate project-master wall.

The latest report is retained as:

```text
stateRef.current.b313WallUpdateReport
```

## Authority boundary

This is an explicit Preview engineering action, not automatic wall authority.

It does not:

- silently invent Section II allowable stresses;
- use the A106 benchmark as a global default;
- change corrosion allowance or design pressure;
- alter the pipe-wall master;
- suppress PR #422 master warnings;
- bypass B31.3 API applicability checks;
- convert a failed row into a guessed schedule.

PR #420's controlled-code engineering review gate remains applicable to the B31.3 calculation module. Reusing the API in Preview does not by itself convert software arithmetic qualification into final design authority.
