# Bend Radius Publication Policy

Config control:

```text
Bend radius: 1.5D
```

Default: OFF.

OFF:
- remove `BendRadius` from enriched XML;
- write zero in the CII BEND radius field;
- CAESAR owns its default bend-radius behavior.

ON:
- for ELBO endpoint 0, publish `BendRadius = 1.5 * OD`;
- prefer `EffectiveOutsideDiameter` if present, otherwise `OutsideDiameter`;
- block if no positive OD is available;
- write the same `1.5D` basis to the CII BEND radius field.

This replaces the previous incorrect zero/missing fallback of `1.0 * OD` in the CII writer.
