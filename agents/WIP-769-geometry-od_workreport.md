# Issue 769 — geometry OD work report

## Executive state

- Route: `WP-769-GEOMETRY` / `EP-769-02` on `agent/issue-769-geometry-od-20260917`.
- Owner qualification: `ODR-769-0005`; candidate receipts: `DISC-769-02`, `QUAL-769-02`, `TC-769-02`.
- Base: stacked on the Issue #769 FBLI repair branch at `4e37e97929ddb5af0c7f5765545646454a20ca84`; main remained `9f0925454652cd963364c066c2bb7b8828275afd` at the material gate.
- PR #417 write overlap: none.

## Work completed

Browser-side OD authority is implemented in `converters/xml-cii2019-core/outside-diameter-resolver.js` at `afea9b9e3a48eb36714df9bbd1a94ba06e5839e3`.

The resolver now:

- keeps positive raw `OutsideDiameter` values unchanged;
- pairs `FLAN` / `VALV` / `RIGID` endpoint 1/2 rows by `ComponentRefNo`;
- resolves each endpoint's `EffectiveOutsideDiameter` from the outward connected side, not from its component sibling;
- permits the two outward sides to differ, so a legitimate side-specific size transition is not flattened;
- leaves unknown/unpaired and `REDU` rows outside this effective-OD rule;
- counts effective-OD writes in `appliedCount` so the production caller retains the returned XML.

Focused JS regression contract: `tests/xml-cii-outside-diameter-effective-authority.test.js` at `735e1a753a6e9a1c83fe72510f8dad011d645315`.

Python regression contract: `converters/scripts/test_xml_to_cii2019_effective_od.py` at `ec342b5b608af116fec6dcd06ac95a114c99774d`.

## Validation truth

- Supporting isolated exact-resolver reconstruction: PASS. This is not `TEST-OD-JS` because it was not executed from a repository checkout using the declared test command.
- `TEST-OD-JS`: NOT_RUN.
- `TEST-OD-PY`: NOT_RUN.
- `TEST-OD-SCOPE`: PASS by current changed-path versus PR #417 inventory.
- Exact repository-native v2.5 validators: NOT_RUN; no executable private checkout is exposed by the connected tool surface.

## Remaining material gap

`converters/scripts/xml_to_cii2019.py` still needs the qualified Python consumer change:

1. add optional `effective_outside_diameter` state to `XmlNode` without breaking existing constructors;
2. parse `<EffectiveOutsideDiameter>` as optional positive engineering authority while retaining raw `outside_diameter`;
3. make `_element_outside_diameter` prefer a positive effective value on whichever node already owns the edge OD, otherwise fall back to raw OD.

The GitHub contents connector available in this session can replace that ~1800-line file only as a complete-file payload; it does not provide a surgical patch/write operation or executable private checkout. The large-file rewrite was deliberately not attempted because it would create disproportionate collateral-diff risk without executable validation.

## Boundaries

No PR #417 coordinate/topology file is changed. No orientation/reversed-length, bore-unit, support, weight, mapping, regex, B31.3, or master-import logic is changed. Merge remains Owner-only.
