# InputXML / PSI116 XML → CII 2019 — Mode A Preview Authority Restoration Addendum

**Date:** 2026-08-14  
**Scope:** Phase 4 Preview only, plus the core service-process fallback numeric guard used by Preview.  
**Baseline:** `56f5a639edbfc629b5977abff7475ecada4a6d37`  
**Governing document:** `docs/InputxmltoCII2019Fixplan.md`

This addendum records the exact authority delta implemented by the accompanying PR. It does not change Mode A separate-model architecture, Weight Match mechanics, support/restraint authority, or conversion-model merging policy.

## 1. Smart Map Select All

`✨ Smart Map — Unmapped Lines` now exposes **Select All**.

- It selects every currently visible workbench row.
- It does not invent or auto-fill a missing `Map To` value.
- Existing Apply validation still blocks submission while any selected row lacks a target.
- `Accept All Exact` remains the separate safe bulk-exact action.

## 2. Process authority correction

A service-derived process fallback is review/suggestion authority, not a permanent manual override.

Historical behavior could persist fallback values under `overrides.processData[lineKey]`. After a later exact/explicit Smart Map line mapping, Preview would still see the stale value as a generic `override`, allowing a value such as `T1=260` to outrank the now-authoritative mapped Line List row.

The corrected precedence is:

```text
explicit Process From / explicit manual Preview value
  > exact/explicit mapped Line List process fact
  > service-process fallback suggestion
  > configured default
```

When an exact/mapped line is present, fallback-owned fields are removed. Explicit Process From fields and Preview fields marked manual are protected.

## 3. Numeric-only service-process fallback

P1, Hydro/Test Pressure, T1, T2, T3 and Density are numerically consumed process fields. Service fallback now accepts only a numeric value (with optional trailing units).

Examples:

```text
260 °C       -> 260
4,140 kPa(g) -> 4140
Water        -> rejected
Steam        -> rejected
```

This prevents labels such as `Water` from becoming a pressure override.

## 4. DTXR actions restored in Consolidated Preview

Overall / Consolidated Preview now exposes the two existing DTXR engineering actions:

1. **Update Wall thickness based on DTXR**
2. **Fetch Rating as per DTXR**

They execute as Mode A fan-out: each enabled XML is evaluated and updated independently through its own source-local configuration. No DTXR evidence or override crosses source boundaries.

The existing Consolidated Preview undo snapshot is used for these bulk actions.

## 5. Individual Preview tool visibility

Individual `Preview / Review` sections are lazy-rendered. Previously the native DTXR and B31.3 controls were not visible until a manual `Build Preview` click.

When an engineer explicitly expands an Individual Mode A Preview, it now auto-builds that source once. This restores visibility of the native controls:

- **Update Wall thickness based on DTXR**
- **Fetch Rating as per DTXR**
- **Update wall thickness as per B31.3 Sec II**
- JSON Trace staged-source control and normal rebuilt Preview controls remain native.

The B31.3 action is intentionally not duplicated into the consolidated toolbar because its design basis remains source-specific.

## 6. Qualification status

This change repairs Preview authority and accessibility. It does not, by itself, establish full CII numerical parity or production authorization.

Required evidence remains:

- exact-head browser proof;
- project-master check for a representative steam line such as `S8810371`;
- Preview → exact engine-input parity for P1/Hydro/T1/T2/T3/Density;
- final CII process-property parity where those quantities are emitted/consumed;
- existing geometry, OD/property and weight-conservation qualification gates.
