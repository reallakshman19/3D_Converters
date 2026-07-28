# Material → CII Material Code Authority

## Problem

Material text and CII Material Code were previously resolved through exact, suffix, and containment comparisons. A saved Material Code override always won, even when the visible Material carried stronger and contradictory engineering evidence.

Example:

```text
Material:      ASTM A790 UNS S31803
Saved code:    193  (A358-304CL1)
Expected code: 338  (A790 duplex grade entry)
```

The supplied Material Map currently spells the code-338 entry as `A790-S32803`. The resolver treats `S32803` as a known master alias for engineering designation `S31803` while preserving A789/A790 specification discrimination.

## Identity model

Each material is decomposed into normalized surface text, specification family, grade/designation, canonical aliases, and alphanumeric evidence tokens.

## Match hierarchy

1. Surface exact: `1.000`.
2. Specification + canonical grade exact: `0.995`.
3. Curated known master alias with exact specification: `0.980`.
4. Grade exact where one side lacks a specification: `0.930`.
5. Same specification and one-character grade distance: `0.900`.
6. Token/Dice fuzzy comparison: accepted only above threshold and only with adequate winning margin.

Defaults:

```text
acceptance threshold:          0.86
override correction threshold: 0.92
ambiguity margin:              0.04
```

Weak and ambiguous results remain review-required.

## Override policy

- A Material Code explicitly keyed to the material identity is a pinned user decision and is preserved; conflicts remain visible for review.
- A class-, line-, branch-, or class-size-scoped Material Code override is validated against the visible Material.
- Strong, unique material evidence corrects a conflicting stale scoped override.
- Consistent overrides are retained.
- Weak evidence never replaces an override automatically.

## Preview and run authority

Material Code authority is applied after bore/wall authority and before Rating authority. Standalone run parity consumes the corrected Preview row, so the same Material Code is written into enriched XML.

## Weight Match Rating

Weight Match consumes Preview Rating snapshot schema v2. The live displayed Preview table is primary, with normalized branch, line+bore, line+class, and unambiguous line-key matching. Rating is not re-derived in normal Weight Match mode.
