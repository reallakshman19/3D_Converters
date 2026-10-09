# Golden example — IMPLEMENTATION_PLAN

```text
IMPLEMENTATION_PLAN — rev 1

BASIS
- programme: #210 / PB-0004
- child issue: #232
- main: <exact SHA>
- three-pass packet: <comment ref>

MY UNDERSTANDING
The canonical falsifier declaration is correct; the executable mutation registry is missing one bounded mutation.

OWNED OUTCOME
Make the declared missing-unit falsifier executable without changing canonical academic truth.

SOURCE TRUTH
- canonical declaration: <path/ref>
- mutation registry: <path/ref>

APPROACH
Use the existing generic mutation helper and register exactly the missing case.

PLAN SLICES
- STEP-F-01 — trace declaration → registry — PASS — maps AC-F-01
- STEP-F-02 — implement bounded mutation — PENDING — maps AC-F-01, AC-F-02
- STEP-F-03 — focused + neighboring validation — PENDING — maps AC-F-02, AC-F-03

DEPENDENCIES
NONE

FALSIFIER
If removing the required unit does not produce SYMBOL_FIELD_MISSING, the assumed mutation/validator path is wrong.

VALIDATION
- declared falsifier
- neighboring missing-unit cases
- generated-artifact freshness
- relevant full discovery

PRESERVE
- canonical declaration unchanged
- unrelated mutation cases unchanged

UNCERTAINTIES
NONE currently proved.

EXPECTED NEXT OBSERVABLE
Focused exact-head falsifier evidence or a contradictory validator observation.

CONSUMER / HANDOFF
#215 consumes the merged producer result for final P5 revalidation.
```

Plan publication is not approval.
